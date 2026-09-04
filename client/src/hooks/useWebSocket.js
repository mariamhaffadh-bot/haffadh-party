import { useEffect, useRef } from 'react';
import useStore from '../store';

export default function useWebSocket() {
  const wsRef = useRef(null);
  const { setWs, setConnected, setClientId, setRoomCode, setRole, setGameState, setScreen, showNotification } = useStore();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = import.meta.env.DEV ? '4000' : window.location.port;
    const portPart = port ? `:${port}` : '';
    const url = `${protocol}://${host}${portPart}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setWs(ws);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

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

        case 'game_started':
          setGameState(msg.state);
          setScreen('game');
          break;

        case 'state_update':
        case 'player_connected':
        case 'player_disconnected':
        case 'dice_rolled':
        case 'path_chosen':
        case 'idol_bought':
        case 'item_bought':
        case 'item_used':
        case 'duel_resolved':
        case 'turn_ended':
        case 'minigame_update':
        case 'minigame_resolved':
        case 'round_end_minigame':
        case 'game_over':
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
