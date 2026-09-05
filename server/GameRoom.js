const {
  BOARD_NODES, CHARACTERS, RANDOM_EVENTS, IDOL_SHRINES,
  ITEMS, MINIGAME_TEMPLATES, BONUS_ACHIEVEMENTS, MINIGAME_PAYOUTS,
  BOARD_HAZARDS,
} = require('./gameData');

class GameRoom {
  constructor(code) {
    this.code = code;
    this.hostId = null;
    this.clients = new Map();
    this.players = new Map();
    this.phase = 'lobby'; // lobby, playing, minigame, bonus_reveal, gameover
    this.currentPlayerIndex = 0;
    this.roundNumber = 1;
    this.totalRounds = 12;
    this.turnPhase = 'roll'; // roll, moving, choosing_fork, landed, buying_idol, shopping, duel, minigame, event
    this.lastDiceRoll = null;
    this.isPassAndPlay = false;
    this.selectedCharacters = new Set();
    this.playerOrder = [];
    this.pendingEvent = null;
    this.playersGoneThisRound = new Set();

    // ── Graph board state ──
    // Deep-copy nodes so we can mutate connections at runtime
    this.boardNodes = BOARD_NODES.map((n) => ({
      ...n,
      connections: [...n.connections],
    }));
    this.nodeMap = new Map();
    this.boardNodes.forEach((n) => this.nodeMap.set(n.id, n));

    // Disabled edges: Set of "fromId->toId" strings
    this.disabledEdges = new Set();
    // Active hazard timers: { hazardId, targetTag, roundsLeft } — -1 = permanent
    this.activeHazards = [];
    // Board event log (for TV cinematic display)
    this.pendingBoardEvent = null;

    // Idol economy
    this.idolsBoughtTotal = 0;
    this.idolPriceEscalation = 5;

    // Hazards on specific nodes (from Thornvine Trap item)
    this.nodeHazards = new Map(); // nodeId -> { ownerId, damage }

    // Moving shop tracking
    this.movingShopNodeId = 'j2'; // starts at Canopy Market

    // Minigame
    this.activeMinigame = null;
    this.minigameScores = {};
    this.pendingDuel = null;

    // Pending fork choice
    this.pendingForkOptions = null;

    // Step-by-step joystick movement
    this.movesRemaining = 0;
  }

  getPlayerCount() { return this.players.size; }

  selectCharacter(clientId, characterId, playerName) {
    if (this.phase !== 'lobby') return { error: 'Game already started' };
    if (this.players.size >= 8) return { error: 'Max 8 players' };
    if (this.selectedCharacters.has(characterId)) return { error: 'Character already taken' };
    const character = CHARACTERS.find((c) => c.id === characterId);
    if (!character) return { error: 'Invalid character' };
    this.selectedCharacters.add(characterId);
    this.players.set(clientId, {
      id: clientId, name: playerName || character.name, characterId,
      nodeId: 'start', coins: 10, idols: [], items: [], score: 0,
      minigamesWon: 0, spacesTraveled: 0, duelsWon: 0,
      bonusIdols: [], activeBonusRoll: 0,
    });
    return { success: true };
  }

  startGame(options = {}) {
    if (this.players.size < 2) return { error: 'Need at least 2 players' };
    this.totalRounds = options.rounds || 12;
    this.phase = 'playing';
    this.playerOrder = [...this.players.keys()];
    for (let i = this.playerOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playerOrder[i], this.playerOrder[j]] = [this.playerOrder[j], this.playerOrder[i]];
    }
    this.currentPlayerIndex = 0;
    this.turnPhase = 'roll';
    this.playersGoneThisRound.clear();
    return { success: true };
  }

  getCurrentPlayer() {
    return this.players.get(this.playerOrder[this.currentPlayerIndex]) || null;
  }
  getCurrentPlayerId() {
    return this.playerOrder[this.currentPlayerIndex];
  }

  // ── Graph helpers ──
  getNode(nodeId) { return this.nodeMap.get(nodeId); }

  getReachableConnections(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return [];
    return node.connections.filter((targetId) => {
      const edgeKey = `${nodeId}->${targetId}`;
      return !this.disabledEdges.has(edgeKey);
    });
  }

  // Walk `steps` along the graph (used by events like move_forward)
  walkPath(startNodeId, steps) {
    let current = startNodeId;
    for (let i = 0; i < steps; i++) {
      const reachable = this.getReachableConnections(current);
      if (reachable.length === 0) break;
      current = reachable[0]; // auto-pick first for event-driven movement
    }
    return current;
  }

  // ── Idol price ──
  getIdolPrice(shrine) {
    return shrine.baseCost + this.idolsBoughtTotal * this.idolPriceEscalation;
  }

  // ── Dynamic hazard system ──
  triggerBoardHazard() {
    // Pick a random applicable hazard
    const candidates = BOARD_HAZARDS.filter((h) => {
      if (h.effect === 'disable_edge') {
        // Only trigger if those edges are currently enabled
        const hasEnabled = this.boardNodes.some((n) =>
          n[h.targetTag] && n.connections.some((c) => !this.disabledEdges.has(`${n.id}->${c}`))
        );
        return hasEnabled;
      }
      if (h.effect === 'enable_edge') {
        // Only trigger if those edges are currently disabled
        const hasDisabled = this.boardNodes.some((n) =>
          n[h.targetTag] && n.connections.some((c) => this.disabledEdges.has(`${n.id}->${c}`))
        );
        return hasDisabled;
      }
      if (h.effect === 'relocate_shop') return true;
      return true;
    });

    if (candidates.length === 0) return null;
    const hazard = candidates[Math.floor(Math.random() * candidates.length)];

    switch (hazard.effect) {
      case 'disable_edge':
        this.boardNodes.forEach((n) => {
          if (n[hazard.targetTag]) {
            n.connections.forEach((c) => {
              this.disabledEdges.add(`${n.id}->${c}`);
            });
          }
        });
        if (hazard.duration !== 0) {
          this.activeHazards.push({ hazardId: hazard.id, targetTag: hazard.targetTag, roundsLeft: hazard.duration });
        }
        break;

      case 'enable_edge':
        this.boardNodes.forEach((n) => {
          if (n[hazard.targetTag]) {
            n.connections.forEach((c) => {
              this.disabledEdges.delete(`${n.id}->${c}`);
            });
          }
        });
        // Remove matching active hazards
        this.activeHazards = this.activeHazards.filter((h) => h.targetTag !== hazard.targetTag);
        break;

      case 'relocate_shop': {
        // Move the wandering shop to a random non-shop, non-shrine node
        const eligible = this.boardNodes.filter((n) =>
          n.type !== 'item_shop' && n.type !== 'idol_shrine' && n.type !== 'summit_shrine' &&
          n.type !== 'fork' && n.type !== 'start'
        );
        if (eligible.length > 0) {
          // Revert old shop node
          const oldNode = this.getNode(this.movingShopNodeId);
          if (oldNode && oldNode.movingShop) {
            oldNode.type = 'event'; // revert to generic
          }
          const newNode = eligible[Math.floor(Math.random() * eligible.length)];
          newNode.type = 'item_shop';
          newNode.movingShop = true;
          this.movingShopNodeId = newNode.id;
        }
        break;
      }
    }

    this.pendingBoardEvent = hazard;
    return hazard;
  }

  tickHazardTimers() {
    this.activeHazards = this.activeHazards.filter((h) => {
      if (h.roundsLeft === -1) return true; // permanent
      h.roundsLeft--;
      if (h.roundsLeft <= 0) {
        // Re-enable edges
        this.boardNodes.forEach((n) => {
          if (n[h.targetTag]) {
            n.connections.forEach((c) => {
              this.disabledEdges.delete(`${n.id}->${c}`);
            });
          }
        });
        return false;
      }
      return true;
    });
  }

  // ── Use item ──
  useItem(clientId, itemId, targetData) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    const player = this.getCurrentPlayer();
    const itemIndex = player.items.indexOf(itemId);
    if (itemIndex === -1) return { error: 'Item not in inventory' };
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return { error: 'Invalid item' };

    switch (item.effect) {
      case 'bonus_roll':
        player.activeBonusRoll = item.value;
        player.items.splice(itemIndex, 1);
        return { success: true, message: `Tailwind Charm active! +${item.value} on next roll.` };
      case 'hazard': {
        const targetNodeId = targetData?.nodeId;
        if (!targetNodeId || !this.getNode(targetNodeId)) return { error: 'Pick a valid space' };
        this.nodeHazards.set(targetNodeId, { ownerId: player.id, damage: item.value });
        player.items.splice(itemIndex, 1);
        return { success: true, message: `Thornvine Trap placed!` };
      }
      case 'steal_idol': {
        if (this.turnPhase !== 'buying_idol') return { error: 'Must be at an Idol Shrine' };
        const targetId = targetData?.targetPlayerId;
        const target = this.players.get(targetId);
        if (!target || target.idols.length === 0) return { error: 'Target has no idols' };
        const shieldIdx = target.items.indexOf('coral_shield');
        if (shieldIdx !== -1) {
          target.items.splice(shieldIdx, 1);
          player.items.splice(itemIndex, 1);
          return { success: true, message: `${target.name}'s Coral Shield blocked the steal!`, blocked: true };
        }
        const stolenIdol = target.idols.pop();
        player.idols.push(stolenIdol);
        player.items.splice(itemIndex, 1);
        return { success: true, message: `Stole an idol from ${target.name}!` };
      }
      case 'shield':
        return { error: 'Coral Shield triggers automatically' };
      default:
        return { error: 'Unknown item' };
    }
  }

  buyItem(clientId, itemId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'shopping') return { error: 'Not at a shop' };
    const player = this.getCurrentPlayer();
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return { error: 'Invalid item' };
    if (player.coins < item.cost) return { error: 'Not enough coins' };
    if (player.items.length >= 3) return { error: 'Inventory full (max 3)' };
    player.coins -= item.cost;
    player.items.push(item.id);
    return { success: true, item };
  }

  leaveShop() { this.turnPhase = 'landed'; }

  // ── Dice Roll — sets movesRemaining, player uses joystick to step ──
  rollDice(clientId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'roll') return { error: 'Cannot roll now' };

    let roll = Math.floor(Math.random() * 6) + 1;
    const player = this.getCurrentPlayer();
    if (player.activeBonusRoll > 0) {
      roll += player.activeBonusRoll;
      player.activeBonusRoll = 0;
    }
    this.lastDiceRoll = roll;
    this.movesRemaining = roll;
    this.turnPhase = 'moving';

    // Return legal directions from current node
    const legalMoves = this.getReachableConnections(player.nodeId);
    return { roll, playerId: currentPlayerId, movesRemaining: roll, legalMoves };
  }

  // ── Step: joystick-driven node-by-node movement ──
  // Player pushes toward a connected node, consuming 1 move
  moveStep(clientId, targetNodeId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'moving') return { error: 'Not in movement phase' };
    if (this.movesRemaining <= 0) return { error: 'No moves left' };

    const player = this.getCurrentPlayer();
    const reachable = this.getReachableConnections(player.nodeId);

    if (!reachable.includes(targetNodeId)) {
      return { error: 'Cannot move there — not a connected node' };
    }

    // Move one step
    player.nodeId = targetNodeId;
    player.spacesTraveled++;
    this.movesRemaining--;

    // Lap bonus if passing through start
    if (targetNodeId === 'start') {
      player.coins += 5;
    }

    // If no moves left, resolve the space they landed on
    if (this.movesRemaining <= 0) {
      const effect = this.resolveNode(player, targetNodeId);
      return {
        success: true, nodeId: targetNodeId, movesRemaining: 0,
        legalMoves: [], effect, landed: true,
      };
    }

    // Still have moves — return next legal directions
    const nextLegal = this.getReachableConnections(targetNodeId);
    if (nextLegal.length === 0) {
      // Dead end — force resolve
      const effect = this.resolveNode(player, targetNodeId);
      this.movesRemaining = 0;
      return {
        success: true, nodeId: targetNodeId, movesRemaining: 0,
        legalMoves: [], effect, landed: true,
      };
    }

    return {
      success: true, nodeId: targetNodeId, movesRemaining: this.movesRemaining,
      legalMoves: nextLegal, landed: false,
    };
  }

  resolveNode(player, nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return { type: 'none' };

    // Check for item hazard on this node
    if (this.nodeHazards.has(nodeId)) {
      const hazard = this.nodeHazards.get(nodeId);
      if (hazard.ownerId !== player.id) {
        const shieldIdx = player.items.indexOf('coral_shield');
        if (shieldIdx !== -1) {
          player.items.splice(shieldIdx, 1);
        } else {
          player.coins = Math.max(0, player.coins - hazard.damage);
        }
        this.nodeHazards.delete(nodeId);
      }
    }

    switch (node.type) {
      case 'coin_gain':
      case 'start': {
        const amount = node.amount || 3;
        player.coins += amount;
        this.turnPhase = 'landed';
        return { type: 'coin_gain', amount };
      }
      case 'coin_loss': {
        const amount = node.amount || 2;
        const shieldIdx = player.items.indexOf('coral_shield');
        if (shieldIdx !== -1) {
          player.items.splice(shieldIdx, 1);
          this.turnPhase = 'landed';
          return { type: 'coin_loss_blocked', amount };
        }
        player.coins = Math.max(0, player.coins - amount);
        this.turnPhase = 'landed';
        return { type: 'coin_loss', amount };
      }
      case 'event': {
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        this.pendingEvent = event;
        this.applyEvent(player, event);
        this.turnPhase = 'landed';
        return { type: 'event', event };
      }
      case 'idol_shrine':
      case 'summit_shrine': {
        const shrine = IDOL_SHRINES.find((s) => s.nodeId === nodeId);
        if (shrine) {
          const price = this.getIdolPrice(shrine);
          this.turnPhase = 'buying_idol';
          return { type: 'idol_shrine', shrine: { ...shrine, currentPrice: price }, canBuy: player.coins >= price };
        }
        this.turnPhase = 'landed';
        return { type: 'neutral' };
      }
      case 'item_shop': {
        this.turnPhase = 'shopping';
        return { type: 'item_shop', items: ITEMS };
      }
      case 'duel': {
        const opponents = [...this.players.values()].filter((p) => p.id !== player.id);
        if (opponents.length > 0) {
          const opponent = opponents[Math.floor(Math.random() * opponents.length)];
          this.pendingDuel = { challengerId: player.id, opponentId: opponent.id };
          this.turnPhase = 'duel';
          return { type: 'duel', opponent: { id: opponent.id, name: opponent.name, characterId: opponent.characterId } };
        }
        this.turnPhase = 'landed';
        return { type: 'neutral' };
      }
      case 'fork': {
        // Player landed exactly on a fork — they already handled it during movement
        this.turnPhase = 'landed';
        return { type: 'neutral' };
      }
      default:
        this.turnPhase = 'landed';
        return { type: 'neutral' };
    }
  }

  applyEvent(player, event) {
    switch (event.effect) {
      case 'gain_coins': player.coins += event.value; break;
      case 'lose_coins': {
        const si = player.items.indexOf('coral_shield');
        if (si !== -1) { player.items.splice(si, 1); break; }
        player.coins = Math.max(0, player.coins - event.value);
        break;
      }
      case 'swap_coins': {
        const others = [...this.players.values()].filter((p) => p.id !== player.id);
        if (others.length > 0) {
          const t = others[Math.floor(Math.random() * others.length)];
          const tmp = player.coins; player.coins = t.coins; t.coins = tmp;
        }
        break;
      }
      case 'move_forward': {
        const final = this.walkPath(player.nodeId, event.value);
        player.nodeId = final;
        player.spacesTraveled += event.value;
        break;
      }
    }
  }

  buyIdol(clientId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'buying_idol') return { error: 'Cannot buy now' };
    const player = this.getCurrentPlayer();
    const shrine = IDOL_SHRINES.find((s) => s.nodeId === player.nodeId);
    if (!shrine) return { error: 'No shrine here' };
    const price = this.getIdolPrice(shrine);
    if (player.coins < price) return { error: 'Not enough coins' };
    player.coins -= price;
    player.idols.push(shrine.id);
    this.idolsBoughtTotal++;
    this.turnPhase = 'landed';
    return { success: true, shrine, price };
  }

  skipIdol() { this.turnPhase = 'landed'; }

  resolveDuel(clientId) {
    if (!this.pendingDuel) return { error: 'No active duel' };
    const challenger = this.players.get(this.pendingDuel.challengerId);
    const opponent = this.players.get(this.pendingDuel.opponentId);
    if (!challenger || !opponent) return { error: 'Invalid duel' };
    const cRoll = Math.floor(Math.random() * 6) + 1;
    const oRoll = Math.floor(Math.random() * 6) + 1;
    const reward = 5;
    let winner, loser;
    if (cRoll >= oRoll) { winner = challenger; loser = opponent; }
    else { winner = opponent; loser = challenger; }
    const lost = Math.min(loser.coins, reward);
    loser.coins -= lost; winner.coins += lost; winner.duelsWon++;
    this.pendingDuel = null;
    this.turnPhase = 'landed';
    return { success: true, challengerRoll: cRoll, opponentRoll: oRoll, winnerId: winner.id, loserId: loser.id, reward: lost };
  }

  // ── End Turn ──
  endTurn() {
    const currentPlayerId = this.getCurrentPlayerId();
    this.playersGoneThisRound.add(currentPlayerId);
    this.pendingEvent = null;
    this.pendingBoardEvent = null;

    const allGone = this.playerOrder.every((pid) => this.playersGoneThisRound.has(pid));

    if (allGone) {
      // Round complete → trigger minigame
      this.phase = 'minigame';
      this.turnPhase = 'minigame';
      this.minigameScores = {};
      const mg = MINIGAME_TEMPLATES[Math.floor(Math.random() * MINIGAME_TEMPLATES.length)];
      this.activeMinigame = { ...mg, startedAt: Date.now() };
      return { roundEnd: true, minigame: mg };
    }

    // Next player — also maybe trigger a board hazard event
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    while (this.playersGoneThisRound.has(this.playerOrder[this.currentPlayerIndex])) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    }
    this.turnPhase = 'roll';

    // Board hazard chance: ~25% per turn after round 2
    if (this.roundNumber >= 2 && Math.random() < 0.25) {
      this.triggerBoardHazard();
    }

    return { roundEnd: false, boardEvent: this.pendingBoardEvent };
  }

  handleMinigameInput(clientId, input) {
    if (!this.activeMinigame) return;
    const score = input.score || input.taps || input.pairs || input.mashes || 0;
    if (input.reactionTime) {
      this.minigameScores[clientId] = 10000 - input.reactionTime;
    } else {
      this.minigameScores[clientId] = Math.max(this.minigameScores[clientId] || 0, score);
    }
  }

  resolveMinigame() {
    const entries = this.playerOrder.map((pid) => ({ playerId: pid, score: this.minigameScores[pid] || 0 }));
    entries.sort((a, b) => b.score - a.score);
    const rankings = entries.map((entry, index) => {
      const payout = MINIGAME_PAYOUTS[index] || 0;
      const player = this.players.get(entry.playerId);
      if (player) { player.coins += payout; if (index === 0) player.minigamesWon++; }
      return { playerId: entry.playerId, placement: index + 1, score: entry.score, payout };
    });

    this.activeMinigame = null;
    this.minigameScores = {};
    this.playersGoneThisRound.clear();
    this.roundNumber++;

    // Tick hazard timers at round boundary
    this.tickHazardTimers();

    if (this.roundNumber > this.totalRounds) {
      this.calculateBonusIdols();
      this.phase = 'bonus_reveal';
    } else {
      this.phase = 'playing';
      this.currentPlayerIndex = 0;
      this.turnPhase = 'roll';
    }
    return { rankings };
  }

  calculateBonusIdols() {
    const playerList = [...this.players.values()];
    for (const ach of BONUS_ACHIEVEMENTS) {
      let best = -1, bestPlayer = null;
      for (const p of playerList) {
        const val = p[ach.stat] || 0;
        if (val > best) { best = val; bestPlayer = p; }
      }
      if (bestPlayer && best > 0) bestPlayer.bonusIdols.push(ach.id);
    }
    this.calculateFinalScores();
  }

  calculateFinalScores() {
    this.players.forEach((p) => { p.score = p.idols.length + p.bonusIdols.length; });
  }

  finishBonusReveal() { this.phase = 'gameover'; }

  // ── Serialized graph for clients ──
  getSerializedBoard() {
    return this.boardNodes.map((n) => ({
      id: n.id, name: n.name, type: n.type, region: n.region,
      position: n.position,
      connections: n.connections.filter((c) => !this.disabledEdges.has(`${n.id}->${c}`)),
      allConnections: n.connections,
      disabled: n.connections.filter((c) => this.disabledEdges.has(`${n.id}->${c}`)),
      amount: n.amount, baseCost: n.baseCost,
      movingShop: n.movingShop || false,
      bridgeEdge: n.bridgeEdge || false,
      tidalEdge: n.tidalEdge || false,
      lavaEdge: n.lavaEdge || false,
    }));
  }

  getPublicState() {
    const players = {};
    this.players.forEach((p, id) => { players[id] = { ...p }; });

    const shrinesWithPrices = IDOL_SHRINES.map((s) => ({
      ...s, currentPrice: this.getIdolPrice(s),
    }));

    return {
      roomCode: this.code,
      phase: this.phase,
      players,
      currentPlayerId: this.playerOrder[this.currentPlayerIndex] || null,
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      turnPhase: this.turnPhase,
      lastDiceRoll: this.lastDiceRoll,
      selectedCharacters: [...this.selectedCharacters],
      playerOrder: this.playerOrder,
      isPassAndPlay: this.isPassAndPlay,
      pendingEvent: this.pendingEvent,
      pendingDuel: this.pendingDuel,
      pendingBoardEvent: this.pendingBoardEvent,
      movesRemaining: this.movesRemaining,
      legalMoves: this.turnPhase === 'moving' ? this.getReachableConnections(
        this.getCurrentPlayer()?.nodeId || 'start'
      ) : [],
      activeMinigame: this.activeMinigame,
      minigameScores: this.minigameScores,
      boardNodes: this.getSerializedBoard(),
      idolShrines: shrinesWithPrices,
      items: ITEMS,
      nodeHazards: Object.fromEntries(this.nodeHazards),
      idolsBoughtTotal: this.idolsBoughtTotal,
      playersGoneThisRound: [...this.playersGoneThisRound],
      bonusAchievements: BONUS_ACHIEVEMENTS,
      disabledEdges: [...this.disabledEdges],
      activeHazards: this.activeHazards,
    };
  }
}

module.exports = { GameRoom };
