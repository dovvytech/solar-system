import { useState } from 'react';
import CharacterCreator from './game/CharacterCreator';
import GameWorld from './game/GameWorld';
import { loadGame, newPlayer, clearSave, type PlayerState } from './game/types';

export default function App() {
  const [saved] = useState<PlayerState | null>(() => loadGame());
  const [player, setPlayer] = useState<PlayerState | null>(saved);
  const [inGame, setInGame] = useState(false);
  const [mode, setMode] = useState<'explore' | 'build'>('explore');

  if (inGame && player) {
    return (
      <GameWorld
        player={player}
        setPlayer={(fn) => setPlayer((p) => (p ? fn(p) : p))}
        mode={mode}
        setMode={setMode}
        onExit={() => setInGame(false)}
      />
    );
  }

  return (
    <CharacterCreator
      saved={saved}
      onStart={(name, photo) => {
        const existing = loadGame();
        const p: PlayerState = existing && existing.name === name
          ? { ...existing, photo }
          : newPlayer(name, photo);
        setPlayer(p);
        setInGame(true);
      }}
      onReset={() => {
        clearSave();
        setPlayer(null);
        window.location.reload();
      }}
    />
  );
}
