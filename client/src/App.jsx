import React from 'react';
import useStore from './store';
import useWebSocket from './hooks/useWebSocket';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreenTV from './screens/GameScreenTV';
import GameScreenPhone from './screens/GameScreenPhone';
import './styles.css';

export default function App() {
  useWebSocket();
  const { screen, role, connected, notification } = useStore();

  if (!connected) {
    return (
      <div className="center-screen">
        <div className="loader" />
        <p style={{ marginTop: 20 }}>Connecting to Nakhlah Isle...</p>
      </div>
    );
  }

  let content;
  switch (screen) {
    case 'home':
      content = <HomeScreen />;
      break;
    case 'lobby':
      content = <LobbyScreen />;
      break;
    case 'game':
      content = role === 'tv' || role === 'local'
        ? <GameScreenTV />
        : <GameScreenPhone />;
      break;
    default:
      content = <HomeScreen />;
  }

  return (
    <div className="app-root">
      {content}
      {notification && <div className="notification">{notification}</div>}
    </div>
  );
}
