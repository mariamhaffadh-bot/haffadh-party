import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Connection
  clientId: null,
  ws: null,
  connected: false,

  // Room
  roomCode: null,
  role: null, // 'tv', 'phone', 'local'

  // Game state (from server)
  gameState: null,

  // UI
  screen: 'home', // home, lobby, game, minigame
  notification: null,

  setWs: (ws) => set({ ws }),
  setConnected: (connected) => set({ connected }),
  setClientId: (clientId) => set({ clientId }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setRole: (role) => set({ role }),
  setGameState: (gameState) => set({ gameState }),
  setScreen: (screen) => set({ screen }),

  showNotification: (text, duration = 3000) => {
    set({ notification: text });
    setTimeout(() => set({ notification: null }), duration);
  },

  send: (msg) => {
    const { ws } = get();
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  },

  reset: () => set({
    roomCode: null,
    role: null,
    gameState: null,
    screen: 'home',
  }),
}));

export default useStore;
