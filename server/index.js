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

// Room storage
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
  let clientRole = null; // 'tv' or 'phone'

  sendTo(ws, { type: 'welcome', clientId });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const code = generateRoomCode();
        const room = new GameRoom(code);
        room.hostId = clientId;
        room.clients.set(clientId, { ws, role: 'tv', id: clientId });
        rooms.set(code, room);
        currentRoom = code;
        clientRole = 'tv';
        sendTo(ws, { type: 'room_created', roomCode: code, state: room.getPublicState() });
        break;
      }

      case 'join_room': {
        const code = (msg.roomCode || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) { sendTo(ws, { type: 'error', message: 'Room not found' }); break; }
        if (room.clients.size >= 9) { sendTo(ws, { type: 'error', message: 'Room is full' }); break; }
        room.clients.set(clientId, { ws, role: 'phone', id: clientId });
        currentRoom = code;
        clientRole = 'phone';
        sendTo(ws, { type: 'room_joined', roomCode: code, clientId, state: room.getPublicState() });
        broadcastToRoom(code, { type: 'player_connected', clientId, playerCount: room.getPlayerCount() }, ws);
        break;
      }

      case 'select_character': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        const result = room.selectCharacter(clientId, msg.characterId, msg.playerName);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'state_update', state: room.getPublicState() });
        break;
      }

      case 'start_game': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room || room.hostId !== clientId) break;
        const result = room.startGame();
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'game_started', state: room.getPublicState() });
        break;
      }

      case 'roll_dice': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        const result = room.rollDice(clientId);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'dice_rolled', ...result, state: room.getPublicState() });
        break;
      }

      case 'choose_path': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        const result = room.choosePath(clientId, msg.pathIndex);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'path_chosen', state: room.getPublicState() });
        break;
      }

      case 'buy_landmark': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        const result = room.buyLandmark(clientId);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        broadcastToRoom(currentRoom, { type: 'landmark_bought', ...result, state: room.getPublicState() });
        break;
      }

      case 'skip_landmark': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        room.skipLandmark(clientId);
        broadcastToRoom(currentRoom, { type: 'state_update', state: room.getPublicState() });
        break;
      }

      case 'minigame_input': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        room.handleMinigameInput(clientId, msg.input);
        broadcastToRoom(currentRoom, { type: 'minigame_update', state: room.getPublicState() });
        break;
      }

      case 'minigame_result': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        const result = room.resolveMinigame(msg.winnerId);
        broadcastToRoom(currentRoom, { type: 'minigame_resolved', ...result, state: room.getPublicState() });
        break;
      }

      case 'end_turn': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room) break;
        room.endTurn();
        broadcastToRoom(currentRoom, { type: 'turn_ended', state: room.getPublicState() });
        break;
      }

      case 'pass_and_play_create': {
        const code = generateRoomCode();
        const room = new GameRoom(code);
        room.hostId = clientId;
        room.isPassAndPlay = true;
        room.clients.set(clientId, { ws, role: 'local', id: clientId });
        rooms.set(code, room);
        currentRoom = code;
        clientRole = 'local';
        sendTo(ws, { type: 'room_created', roomCode: code, passAndPlay: true, state: room.getPublicState() });
        break;
      }

      case 'pass_and_play_add_player': {
        if (!currentRoom) break;
        const room = rooms.get(currentRoom);
        if (!room || !room.isPassAndPlay) break;
        const playerId = uuidv4();
        const result = room.selectCharacter(playerId, msg.characterId, msg.playerName);
        if (result.error) { sendTo(ws, { type: 'error', message: result.error }); break; }
        sendTo(ws, { type: 'state_update', state: room.getPublicState() });
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
        if (room.clients.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Haffadh Party server running on port ${PORT}`);
});
