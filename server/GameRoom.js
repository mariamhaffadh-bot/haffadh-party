const {
  BOARD_SPACES, CHARACTERS, RANDOM_EVENTS, IDOL_SHRINES,
  ITEMS, MINIGAME_TEMPLATES, BONUS_ACHIEVEMENTS, MINIGAME_PAYOUTS,
} = require('./gameData');

class GameRoom {
  constructor(code) {
    this.code = code;
    this.hostId = null;
    this.clients = new Map();
    this.players = new Map(); // playerId -> player state
    this.phase = 'lobby'; // lobby, playing, minigame, bonus_reveal, gameover
    this.currentPlayerIndex = 0;
    this.roundNumber = 1;
    this.totalRounds = 12;
    this.turnPhase = 'roll'; // roll, moving, landed, choosing_path, buying_idol, shopping, event, duel
    this.lastDiceRoll = null;
    this.isPassAndPlay = false;
    this.selectedCharacters = new Set();
    this.playerOrder = [];
    this.pendingEvent = null;
    this.playersGoneThisRound = new Set(); // tracks who has taken their turn this round

    // Idol economy: shared price escalation
    this.idolsBoughtTotal = 0; // each purchase raises cost of ALL shrines
    this.idolPriceEscalation = 5; // +5 coins per idol bought anywhere

    // Active hazards on spaces (from Thornvine Trap)
    this.hazards = new Map(); // spaceIndex -> { ownerId, damage }

    // Minigame state
    this.activeMinigame = null;
    this.minigameScores = {}; // playerId -> score
    this.minigameType = null;

    // Duel state
    this.pendingDuel = null;
  }

  getPlayerCount() {
    return this.players.size;
  }

  selectCharacter(clientId, characterId, playerName) {
    if (this.phase !== 'lobby') return { error: 'Game already started' };
    if (this.players.size >= 8) return { error: 'Max 8 players' };
    if (this.selectedCharacters.has(characterId)) return { error: 'Character already taken' };
    const character = CHARACTERS.find((c) => c.id === characterId);
    if (!character) return { error: 'Invalid character' };

    this.selectedCharacters.add(characterId);
    this.players.set(clientId, {
      id: clientId,
      name: playerName || character.name,
      characterId,
      position: 0,
      coins: 10,
      idols: [],           // purchased idol IDs
      items: [],           // held item IDs
      score: 0,
      minigamesWon: 0,
      spacesTraveled: 0,
      duelsWon: 0,
      bonusIdols: [],      // awarded at endgame
      activeBonusRoll: 0,  // extra dice from Tailwind Charm
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
    if (this.playerOrder.length === 0) return null;
    return this.players.get(this.playerOrder[this.currentPlayerIndex]);
  }

  getCurrentPlayerId() {
    return this.playerOrder[this.currentPlayerIndex];
  }

  // ─── Idol price for a given shrine ───
  getIdolPrice(shrine) {
    return shrine.baseCost + this.idolsBoughtTotal * this.idolPriceEscalation;
  }

  // ─── Use item from inventory ───
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
        const targetSpace = targetData?.spaceIndex;
        if (targetSpace == null || targetSpace < 0 || targetSpace >= BOARD_SPACES.length) {
          return { error: 'Pick a valid space to place the trap' };
        }
        this.hazards.set(targetSpace, { ownerId: player.id, damage: item.value });
        player.items.splice(itemIndex, 1);
        return { success: true, message: `Thornvine Trap placed on space ${targetSpace}!` };
      }

      case 'steal_idol':
        // Can only use at an idol shrine space during buying_idol phase
        if (this.turnPhase !== 'buying_idol') return { error: 'Must be at an Idol Shrine' };
        // Find a target who has idols
        const targetId = targetData?.targetPlayerId;
        const target = this.players.get(targetId);
        if (!target || target.idols.length === 0) return { error: 'Target has no idols' };
        // Check if target has a shield
        const shieldIdx = target.items.indexOf('coral_shield');
        if (shieldIdx !== -1) {
          target.items.splice(shieldIdx, 1);
          player.items.splice(itemIndex, 1);
          return { success: true, message: `${target.name}'s Coral Shield blocked the steal!`, blocked: true };
        }
        const stolenIdol = target.idols.pop();
        player.idols.push(stolenIdol);
        player.items.splice(itemIndex, 1);
        return { success: true, message: `Stole an idol from ${target.name}!`, stolenIdol };

      case 'shield':
        // Shield is auto-triggered, can't be manually used
        return { error: 'Coral Shield triggers automatically when attacked' };

      default:
        return { error: 'Unknown item effect' };
    }
  }

  // ─── Buy from item shop ───
  buyItem(clientId, itemId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'shopping') return { error: 'Not at a shop' };

    const player = this.getCurrentPlayer();
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return { error: 'Invalid item' };
    if (player.coins < item.cost) return { error: 'Not enough coins' };
    if (player.items.length >= 3) return { error: 'Inventory full (max 3 items)' };

    player.coins -= item.cost;
    player.items.push(item.id);
    return { success: true, item };
  }

  leaveShop(clientId) {
    this.turnPhase = 'landed';
  }

  // ─── Dice Roll ───
  rollDice(clientId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'roll') return { error: 'Cannot roll now' };

    let roll = Math.floor(Math.random() * 6) + 1;

    // Apply Tailwind Charm bonus
    const player = this.getCurrentPlayer();
    if (player.activeBonusRoll > 0) {
      roll += player.activeBonusRoll;
      player.activeBonusRoll = 0;
    }

    this.lastDiceRoll = roll;
    this.turnPhase = 'moving';

    const startPos = player.position;
    let newPos = startPos + roll;

    // Wrap around the board
    if (newPos >= BOARD_SPACES.length) {
      newPos = newPos % BOARD_SPACES.length;
      player.coins += 5; // lap bonus
    }

    player.spacesTraveled += roll;

    // Check for branch
    const targetSpace = BOARD_SPACES[newPos];
    if (targetSpace && targetSpace.type === 'branch') {
      player.position = newPos;
      this.turnPhase = 'choosing_path';
      return { roll, playerId: currentPlayerId, startPos, newPos, branch: true };
    }

    player.position = newPos;
    const effect = this.resolveSpace(player, newPos);
    return { roll, playerId: currentPlayerId, startPos, newPos, effect };
  }

  choosePath(clientId, pathIndex) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'choosing_path') return { error: 'Not choosing a path' };

    const player = this.getCurrentPlayer();
    const space = BOARD_SPACES[player.position];
    if (!space || !space.branches || !space.branches[pathIndex]) {
      return { error: 'Invalid path' };
    }
    player.position = space.branches[pathIndex];
    const effect = this.resolveSpace(player, player.position);
    return { success: true, effect };
  }

  resolveSpace(player, position) {
    const space = BOARD_SPACES[position];
    if (!space) return { type: 'none' };

    // Check for hazard on this space
    if (this.hazards.has(position)) {
      const hazard = this.hazards.get(position);
      if (hazard.ownerId !== player.id) {
        // Check shield
        const shieldIdx = player.items.indexOf('coral_shield');
        if (shieldIdx !== -1) {
          player.items.splice(shieldIdx, 1);
          this.hazards.delete(position);
          // Continue to normal space resolution with shield message
        } else {
          player.coins = Math.max(0, player.coins - hazard.damage);
          this.hazards.delete(position);
          // Still resolve the space normally after taking damage
        }
      }
    }

    switch (space.type) {
      case 'coin_gain': {
        const amount = space.amount || 3;
        player.coins += amount;
        this.turnPhase = 'landed';
        return { type: 'coin_gain', amount };
      }

      case 'coin_loss': {
        const amount = space.amount || 2;
        // Check shield
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

      case 'idol_shrine': {
        const shrine = IDOL_SHRINES.find((s) => s.spaceIndex === position);
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
        const affordable = ITEMS.filter((i) => player.coins >= i.cost);
        return { type: 'item_shop', items: ITEMS, affordable: affordable.map((i) => i.id) };
      }

      case 'duel': {
        // Pick a random opponent
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

      case 'branch': {
        this.turnPhase = 'choosing_path';
        return { type: 'branch', branches: space.branches };
      }

      case 'start': {
        player.coins += 3;
        this.turnPhase = 'landed';
        return { type: 'coin_gain', amount: 3 };
      }

      default:
        this.turnPhase = 'landed';
        return { type: 'neutral' };
    }
  }

  applyEvent(player, event) {
    switch (event.effect) {
      case 'gain_coins':
        player.coins += event.value;
        break;
      case 'lose_coins': {
        const shieldIdx = player.items.indexOf('coral_shield');
        if (shieldIdx !== -1) {
          player.items.splice(shieldIdx, 1);
          break;
        }
        player.coins = Math.max(0, player.coins - event.value);
        break;
      }
      case 'swap_coins': {
        const others = [...this.players.values()].filter((p) => p.id !== player.id);
        if (others.length > 0) {
          const target = others[Math.floor(Math.random() * others.length)];
          const temp = player.coins;
          player.coins = target.coins;
          target.coins = temp;
        }
        break;
      }
      case 'move_forward':
        player.position = Math.min(player.position + event.value, BOARD_SPACES.length - 1);
        player.spacesTraveled += event.value;
        break;
      case 'move_backward':
        player.position = Math.max(0, player.position - event.value);
        break;
    }
  }

  // ─── Buy Idol ───
  buyIdol(clientId) {
    const currentPlayerId = this.getCurrentPlayerId();
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'buying_idol') return { error: 'Cannot buy now' };

    const player = this.getCurrentPlayer();
    const shrine = IDOL_SHRINES.find((s) => s.spaceIndex === player.position);
    if (!shrine) return { error: 'No shrine here' };

    const price = this.getIdolPrice(shrine);
    if (player.coins < price) return { error: 'Not enough coins' };

    player.coins -= price;
    player.idols.push(shrine.id);
    this.idolsBoughtTotal++;
    this.turnPhase = 'landed';
    return { success: true, shrine, price };
  }

  skipIdol(clientId) {
    this.turnPhase = 'landed';
  }

  // ─── Duel resolution (simple: higher random roll wins) ───
  resolveDuel(clientId, choice) {
    if (!this.pendingDuel) return { error: 'No active duel' };

    const challenger = this.players.get(this.pendingDuel.challengerId);
    const opponent = this.players.get(this.pendingDuel.opponentId);
    if (!challenger || !opponent) return { error: 'Invalid duel' };

    const challengerRoll = Math.floor(Math.random() * 6) + 1;
    const opponentRoll = Math.floor(Math.random() * 6) + 1;
    const reward = 5;

    let winner, loser;
    if (challengerRoll >= opponentRoll) {
      winner = challenger;
      loser = opponent;
    } else {
      winner = opponent;
      loser = challenger;
    }

    const lostCoins = Math.min(loser.coins, reward);
    loser.coins -= lostCoins;
    winner.coins += lostCoins;
    winner.duelsWon++;

    this.pendingDuel = null;
    this.turnPhase = 'landed';
    return {
      success: true,
      challengerRoll,
      opponentRoll,
      winnerId: winner.id,
      loserId: loser.id,
      reward: lostCoins,
    };
  }

  // ─── End Turn → check if round is over ───
  endTurn() {
    const currentPlayerId = this.getCurrentPlayerId();
    this.playersGoneThisRound.add(currentPlayerId);
    this.pendingEvent = null;

    // Check if all players have gone this round
    const allGone = this.playerOrder.every((pid) => this.playersGoneThisRound.has(pid));

    if (allGone) {
      // Round complete → trigger minigame
      this.phase = 'minigame';
      this.turnPhase = 'minigame';
      this.minigameScores = {};
      // Pick a random minigame
      this.minigameType = MINIGAME_TEMPLATES[Math.floor(Math.random() * MINIGAME_TEMPLATES.length)];
      this.activeMinigame = { ...this.minigameType, startedAt: Date.now() };
      return { roundEnd: true, minigame: this.minigameType };
    }

    // Next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    // Skip players who already went (shouldn't happen, but safety)
    while (this.playersGoneThisRound.has(this.playerOrder[this.currentPlayerIndex])) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    }
    this.turnPhase = 'roll';
    return { roundEnd: false };
  }

  // ─── Minigame input from phones ───
  handleMinigameInput(clientId, input) {
    if (!this.activeMinigame) return;
    // Store the score/result
    const score = input.score || input.taps || input.pairs || input.mashes || 0;
    if (input.reactionTime) {
      // Lower is better for reaction, invert for ranking
      this.minigameScores[clientId] = 10000 - input.reactionTime;
    } else {
      this.minigameScores[clientId] = Math.max(this.minigameScores[clientId] || 0, score);
    }
  }

  // ─── Resolve minigame: rank all players, pay out ───
  resolveMinigame() {
    // Rank players by score descending
    const entries = this.playerOrder.map((pid) => ({
      playerId: pid,
      score: this.minigameScores[pid] || 0,
    }));
    entries.sort((a, b) => b.score - a.score);

    const rankings = entries.map((entry, index) => {
      const payout = MINIGAME_PAYOUTS[index] || 0;
      const player = this.players.get(entry.playerId);
      if (player) {
        player.coins += payout;
        if (index === 0) player.minigamesWon++;
      }
      return {
        playerId: entry.playerId,
        placement: index + 1,
        score: entry.score,
        payout,
      };
    });

    // Advance to next round
    this.activeMinigame = null;
    this.minigameScores = {};
    this.minigameType = null;
    this.playersGoneThisRound.clear();
    this.roundNumber++;

    if (this.roundNumber > this.totalRounds) {
      // Game over — calculate bonus idols
      this.calculateBonusIdols();
      this.phase = 'bonus_reveal';
    } else {
      this.phase = 'playing';
      this.currentPlayerIndex = 0;
      this.turnPhase = 'roll';
    }

    return { rankings };
  }

  // ─── Bonus Idol calculation ───
  calculateBonusIdols() {
    const playerList = [...this.players.values()];

    for (const achievement of BONUS_ACHIEVEMENTS) {
      let bestValue = -1;
      let bestPlayer = null;

      for (const player of playerList) {
        const val = player[achievement.stat] || 0;
        if (val > bestValue) {
          bestValue = val;
          bestPlayer = player;
        }
      }

      if (bestPlayer && bestValue > 0) {
        bestPlayer.bonusIdols.push(achievement.id);
      }
    }

    // Calculate final scores
    this.calculateFinalScores();
  }

  calculateFinalScores() {
    this.players.forEach((player) => {
      player.score = player.idols.length + player.bonusIdols.length;
    });
  }

  // ─── Finish bonus reveal, move to gameover ───
  finishBonusReveal() {
    this.phase = 'gameover';
  }

  getPublicState() {
    const players = {};
    this.players.forEach((p, id) => {
      players[id] = { ...p };
    });

    // Compute current idol prices
    const shrinesWithPrices = IDOL_SHRINES.map((s) => ({
      ...s,
      currentPrice: this.getIdolPrice(s),
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
      activeMinigame: this.activeMinigame,
      minigameScores: this.minigameScores,
      boardSpaces: BOARD_SPACES,
      idolShrines: shrinesWithPrices,
      items: ITEMS,
      hazards: Object.fromEntries(this.hazards),
      idolsBoughtTotal: this.idolsBoughtTotal,
      playersGoneThisRound: [...this.playersGoneThisRound],
      bonusAchievements: BONUS_ACHIEVEMENTS,
    };
  }
}

module.exports = { GameRoom };
