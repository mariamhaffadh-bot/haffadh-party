const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GameRoom } = require('./GameRoom');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Serve static client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastToRoom(roomCode, message, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(message);
  room.clients.forEach((client) => {
    if (client.ws !== excludeWs && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  });
}

function sendTo(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message));
}

wss.on('connection', (ws) => {
  let clientId = uuidv4();
  let currentRoom = null;

  sendTo(ws, { type: 'welcome', clientId });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const room = currentRoom ? rooms.get(currentRoom) : null;

    switch (msg.type) {
      // ─── Room Management ───
      case 'create_room': {
        const code = generateRoomCode();
        const r = new GameRoom(code);
        r.hostId = clientId;
        r.clients.set(clientId, { ws, role: 'tv', id: clientId });
        rooms.set(code, r);
        currentRoom = code;
        sendTo(ws, { type: 'room_created', roomCode: code, state: r.getPublicState() });
        break;
      }

      case 'join_room': {
        const code = (msg.roomCode || '').toUpperCase();
        const r = rooms.get(code);
        if (!r) { sendTo(ws, { type: 'error', message: 'Room not found' }); break; }
        if (r.clients.size >= 9) { sendTo(ws, { type: 'error', message: 'Room is full' }); break; }
        r.clients.set(clientId, { ws, role: 'phone', id: clientId });
        currentRoom = code;
        sendTo(ws, { type: 'room_joined', roomCode: code, clientId, state: r.getPublicState() });
        broadcastToRoom(code, { type: 'player_connected', clientId, playerCount: r.getPlayerCount() }, ws);
        break;
      }

      case 'pass_and_play_create': {
        const code = generateRoomCode();
        const r = new GameRoom(code);
        r.hostId = clientId;
        r.isPassAndPlay = true;
        r.clients.set(clientId, { ws, role: 'local', id: clientId });
        rooms.set(code, r);
        currentRoom = code;
        sendTo(ws, { type: 'room_created', roomCode: code, passAndPlay: true, state: r.getPublicState() });
        break;
      }

      // ─── Lobby ───
      case 'select_character': {
        if (!room) break;
        const result = room.selectCharacter(clientId, msg.characterId, msg.playerName);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'state_update', state: room.getPublicState() });
        break;
      }

      case 'pass_and_play_add_player': {
        if (!room || !room.isPassAndPlay) break;
        const playerId = uuidv4();
        const result = room.selectCharacter(playerId, msg.characterId, msg.playerName);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        sendTo(ws, { type: 'state_update', state: room.getPublicState() });
        break;
      }

      case 'start_game': {
        if (!room || room.hostId !== clientId) break;
        const result = room.startGame(msg.options);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'game_started', state: room.getPublicState() });
        break;
      }

      // ─── Gameplay ───
      case 'roll_dice': {
        if (!room) break;
        const result = room.rollDice(clientId);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'dice_rolled', ...result, state: room.getPublicState() });
        break;
      }

      case 'choose_fork': {
        if (!room) break;
        const result = room.chooseFork(clientId, msg.chosenNodeId);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'fork_chosen', ...result, state: room.getPublicState() });
        break;
      }

      case 'buy_idol': {
        if (!room) break;
        const result = room.buyIdol(clientId);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'idol_bought', ...result, state: room.getPublicState() });
        break;
      }

      case 'skip_idol': {
        if (!room) break;
        room.skipIdol();
        broadcastToRoom(currentRoom, { type: 'state_update', state: room.getPublicState() });
        break;
      }

      case 'buy_item': {
        if (!room) break;
        const result = room.buyItem(clientId, msg.itemId);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'item_bought', ...result, state: room.getPublicState() });
        break;
      }

      case 'leave_shop': {
        if (!room) break;
        room.leaveShop();
        broadcastToRoom(currentRoom, { type: 'state_update', state: room.getPublicState() });
        break;
      }

      case 'use_item': {
        if (!room) break;
        const result = room.useItem(clientId, msg.itemId, msg.targetData);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'item_used', ...result, state: room.getPublicState() });
        break;
      }

      case 'resolve_duel': {
        if (!room) break;
        const result = room.resolveDuel(clientId, msg.choice);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'duel_resolved', ...result, state: room.getPublicState() });
        break;
      }

      case 'end_turn': {
        if (!room) break;
        const result = room.endTurn();
        if (result.roundEnd) {
          broadcastToRoom(currentRoom, { type: 'round_end_minigame', minigame: result.minigame, state: room.getPublicState() });
        } else {
          broadcastToRoom(currentRoom, { type: 'turn_ended', state: room.getPublicState() });
        }
        break;
      }

      // ─── Minigame ───
      case 'minigame_input': {
        if (!room) break;
        room.handleMinigameInput(clientId, msg.input);
        broadcastToRoom(currentRoom, { type: 'minigame_update', state: room.getPublicState() });
        break;
      }

      case 'resolve_minigame': {
        if (!room) break;
        const result = room.resolveMinigame();
        broadcastToRoom(currentRoom, { type: 'minigame_resolved', ...result, state: room.getPublicState() });
        break;
      }

      // ─── Bonus Reveal ───
      case 'finish_bonus_reveal': {
        if (!room) break;
        room.finishBonusReveal();
        broadcastToRoom(currentRoom, { type: 'game_over', state: room.getPublicState() });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.clients.delete(clientId);
        broadcastToRoom(currentRoom, {
          type: 'player_disconnected',
          clientId,
          playerCount: room.getPlayerCount(),
        });
        if (room.clients.size === 0) rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Haffadh Party server running on port ${PORT}`);
});
