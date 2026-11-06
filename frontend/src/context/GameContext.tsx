import React, { createContext, useContext, useState } from 'react';

export type GameCode = 'DR1' | 'KL' | 'DR6' | 'DR8';

export interface GameMetadata {
  code: GameCode;
  name: string;
  themeColor: string;
  badgeBg: string;
  closingTime: string;
}

export const GAME_METADATA: Record<GameCode, GameMetadata> = {
  DR1: {
    code: 'DR1',
    name: 'DR1 (1:00 PM)',
    themeColor: '#e53e3e', // Red
    badgeBg: 'bg-red-600',
    closingTime: '1:00 PM'
  },
  KL: {
    code: 'KL',
    name: 'KL (3:00 PM)',
    themeColor: '#38a169', // Green
    badgeBg: 'bg-emerald-600',
    closingTime: '3:00 PM'
  },
  DR6: {
    code: 'DR6',
    name: 'DR6 (6:00 PM)',
    themeColor: '#d53f8c', // Magenta
    badgeBg: 'bg-pink-600',
    closingTime: '6:00 PM'
  },
  DR8: {
    code: 'DR8',
    name: 'DR8 (8:00 PM)',
    themeColor: '#3182ce', // Blue
    badgeBg: 'bg-blue-600',
    closingTime: '8:00 PM'
  }
};

interface GameContextType {
  selectedGame: GameCode;
  gameMeta: GameMetadata;
  selectGame: (code: GameCode) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode; defaultGame?: GameCode }> = ({
  children,
  defaultGame = 'KL'
}) => {
  const [selectedGame, setSelectedGame] = useState<GameCode>(defaultGame);

  const selectGame = (code: GameCode) => {
    setSelectedGame(code);
  };

  return (
    <GameContext.Provider
      value={{
        selectedGame,
        gameMeta: GAME_METADATA[selectedGame],
        selectGame
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
