const { BOARD_SPACES, CHARACTERS, RANDOM_EVENTS, LANDMARKS } = require('./gameData');

class GameRoom {
  constructor(code) {
    this.code = code;
    this.hostId = null;
    this.clients = new Map();
    this.players = new Map(); // playerId -> player state
    this.phase = 'lobby'; // lobby, playing, minigame, gameover
    this.currentPlayerIndex = 0;
    this.turnNumber = 1;
    this.turnPhase = 'roll'; // roll, moving, landed, choosing_path, buying_landmark, minigame, event
    this.lastDiceRoll = null;
    this.turnsSinceMinigame = 0;
    this.activeMinigame = null;
    this.minigamePool = [];
    this.isPassAndPlay = false;
    this.selectedCharacters = new Set();
    this.playerOrder = [];
    this.pendingEvent = null;
    this.totalTurns = 20; // game length
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
      totems: [],
      score: 0,
    });
    return { success: true };
  }

  startGame() {
    if (this.players.size < 2) return { error: 'Need at least 2 players' };
    this.phase = 'playing';
    this.playerOrder = [...this.players.keys()];
    // Shuffle player order
    for (let i = this.playerOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playerOrder[i], this.playerOrder[j]] = [this.playerOrder[j], this.playerOrder[i]];
    }
    this.currentPlayerIndex = 0;
    this.turnPhase = 'roll';
    return { success: true };
  }

  getCurrentPlayer() {
    if (this.playerOrder.length === 0) return null;
    return this.players.get(this.playerOrder[this.currentPlayerIndex]);
  }

  rollDice(clientId) {
    const currentPlayerId = this.playerOrder[this.currentPlayerIndex];
    if (clientId !== currentPlayerId && !this.isPassAndPlay) {
      return { error: 'Not your turn' };
    }
    if (this.turnPhase !== 'roll') return { error: 'Cannot roll now' };

    const roll = Math.floor(Math.random() * 6) + 1;
    this.lastDiceRoll = roll;
    this.turnPhase = 'moving';

    const player = this.getCurrentPlayer();
    const startPos = player.position;
    let newPos = startPos + roll;

    // Wrap around the board
    if (newPos >= BOARD_SPACES.length) {
      newPos = newPos % BOARD_SPACES.length;
      player.coins += 5; // passing start bonus
    }

    // Check for branching path
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
    const currentPlayerId = this.playerOrder[this.currentPlayerIndex];
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

    this.turnsSinceMinigame++;

    switch (space.type) {
      case 'coin_gain': {
        const amount = space.amount || (Math.floor(Math.random() * 3) + 1) * 2;
        player.coins += amount;
        this.turnPhase = 'landed';
        return { type: 'coin_gain', amount };
      }
      case 'coin_loss': {
        const amount = space.amount || (Math.floor(Math.random() * 3) + 1);
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
      case 'landmark': {
        const landmark = LANDMARKS.find((l) => l.spaceIndex === position);
        if (landmark && !landmark.ownerId) {
          this.turnPhase = 'buying_landmark';
          return { type: 'landmark', landmark, canBuy: player.coins >= landmark.cost };
        }
        this.turnPhase = 'landed';
        return { type: 'landmark_owned', landmark };
      }
      case 'duel': {
        this.turnPhase = 'landed';
        return { type: 'duel' };
      }
      case 'minigame': {
        this.turnPhase = 'minigame';
        this.turnsSinceMinigame = 0;
        return { type: 'minigame_trigger' };
      }
      case 'branch': {
        this.turnPhase = 'choosing_path';
        return { type: 'branch', branches: space.branches };
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
      case 'lose_coins':
        player.coins = Math.max(0, player.coins - event.value);
        break;
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
        break;
      case 'move_backward':
        player.position = Math.max(0, player.position - event.value);
        break;
    }
  }

  buyLandmark(clientId) {
    const currentPlayerId = this.playerOrder[this.currentPlayerIndex];
    if (clientId !== currentPlayerId && !this.isPassAndPlay) return { error: 'Not your turn' };
    if (this.turnPhase !== 'buying_landmark') return { error: 'Cannot buy now' };

    const player = this.getCurrentPlayer();
    const landmark = LANDMARKS.find((l) => l.spaceIndex === player.position);
    if (!landmark) return { error: 'No landmark here' };
    if (player.coins < landmark.cost) return { error: 'Not enough coins' };

    player.coins -= landmark.cost;
    player.totems.push(landmark.id);
    landmark.ownerId = player.id;
    this.turnPhase = 'landed';
    return { success: true, landmark };
  }

  skipLandmark(clientId) {
    this.turnPhase = 'landed';
  }

  handleMinigameInput(clientId, input) {
    if (!this.activeMinigame) return;
    if (!this.activeMinigame.inputs) this.activeMinigame.inputs = {};
    this.activeMinigame.inputs[clientId] = input;
  }

  resolveMinigame(winnerId) {
    if (!winnerId) return { error: 'No winner' };
    const winner = this.players.get(winnerId);
    if (winner) {
      winner.coins += 10;
    }
    this.activeMinigame = null;
    this.turnPhase = 'landed';
    this.phase = 'playing';
    return { winnerId, reward: 10 };
  }

  endTurn() {
    // Check if minigame should trigger (every 3-4 turns)
    if (this.turnsSinceMinigame >= 3 && Math.random() > 0.5) {
      this.turnsSinceMinigame = 0;
      this.phase = 'minigame';
      this.turnPhase = 'minigame';
    }

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    if (this.currentPlayerIndex === 0) {
      this.turnNumber++;
      if (this.turnNumber > this.totalTurns) {
        this.phase = 'gameover';
        this.calculateFinalScores();
      }
    }
    this.turnPhase = 'roll';
    this.pendingEvent = null;
  }

  calculateFinalScores() {
    this.players.forEach((player) => {
      player.score = player.coins + player.totems.length * 20;
    });
  }

  getPublicState() {
    const players = {};
    this.players.forEach((p, id) => {
      players[id] = { ...p };
    });
    return {
      roomCode: this.code,
      phase: this.phase,
      players,
      currentPlayerId: this.playerOrder[this.currentPlayerIndex] || null,
      turnNumber: this.turnNumber,
      totalTurns: this.totalTurns,
      turnPhase: this.turnPhase,
      lastDiceRoll: this.lastDiceRoll,
      selectedCharacters: [...this.selectedCharacters],
      playerOrder: this.playerOrder,
      isPassAndPlay: this.isPassAndPlay,
      pendingEvent: this.pendingEvent,
      activeMinigame: this.activeMinigame,
      boardSpaces: BOARD_SPACES,
    };
  }
}

module.exports = { GameRoom };
