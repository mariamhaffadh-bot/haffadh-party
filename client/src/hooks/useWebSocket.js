import { useEffect, useRef } from 'react';
import useStore from '../store';

export default function useWebSocket() {
  const wsRef = useRef(null);
  const { setWs, setConnected, setClientId, setRoomCode, setRole, setGameState, setScreen, showNotification } = useStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    // In dev, connect to the server on port 4000; in production, same origin
    const port = import.meta.env.DEV ? '4000' : window.location.port;
    const portPart = port ? `:${port}` : '';
    const url = `${protocol}://${host}${portPart}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setWs(ws);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => {
        // Could implement reconnect here
      }, 2000);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'welcome':
          setClientId(msg.clientId);
          break;

        case 'room_created':
          setRoomCode(msg.roomCode);
          setRole(msg.passAndPlay ? 'local' : 'tv');
          setGameState(msg.state);
          setScreen('lobby');
          break;

        case 'room_joined':
          setRoomCode(msg.roomCode);
          setRole('phone');
          setGameState(msg.state);
          setScreen('lobby');
          break;

        case 'state_update':
        case 'player_connected':
        case 'player_disconnected':
          if (msg.state) setGameState(msg.state);
          break;

        case 'game_started':
          setGameState(msg.state);
          setScreen('game');
          break;

        case 'dice_rolled':
          setGameState(msg.state);
          break;

        case 'path_chosen':
        case 'landmark_bought':
        case 'turn_ended':
        case 'minigame_update':
        case 'minigame_resolved':
          if (msg.state) setGameState(msg.state);
          break;

        case 'error':
          showNotification(msg.message);
          break;
      }
    };

    return () => ws.close();
  }, []);
}
