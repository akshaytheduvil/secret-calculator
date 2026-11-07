import React from 'react';
import { useGame, GameCode } from '../../context/GameContext';
import { ChevronRight } from 'lucide-react';

interface GameSelectionProps {
  onSelectGameAndNavigate: (game: GameCode) => void;
}

export const GameSelection: React.FC<GameSelectionProps> = ({
  onSelectGameAndNavigate
}) => {
  const { selectGame } = useGame();

  const handleCardClick = (code: GameCode) => {
    selectGame(code);
    onSelectGameAndNavigate(code);
  };

  const games: { code: GameCode; label: string; bgColor: string }[] = [
    { code: 'DR1', label: 'DR 1', bgColor: 'bg-[#ff0000]' },
    { code: 'KL', label: 'KL', bgColor: 'bg-[#00e600]' },
    { code: 'DR6', label: 'DR 6', bgColor: 'bg-[#ff00ff]' },
    { code: 'DR8', label: 'DR8', bgColor: 'bg-[#0000ff]' }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header matching PDF 3 Page 1: Solid black bar with GAMES #1 */}
      <header className="bg-black text-white px-4 py-3.5 flex items-center">
        <h1 className="text-base font-bold tracking-wider">GAMES #1</h1>
      </header>

      {/* Main Content: 2x2 Grid matching reference screenshot */}
      <main className="flex-1 p-3 max-w-md w-full mx-auto">
        <div className="grid grid-cols-2 gap-3 mt-1">
          {games.map(({ code, label, bgColor }) => (
            <button
              key={code}
              onClick={() => handleCardClick(code)}
              className={`${bgColor} text-white rounded-md p-3.5 flex flex-col justify-between h-20 shadow-sm active:opacity-90 transition-opacity`}
            >
              <div className="w-full flex items-center justify-between">
                <span className="text-base font-bold tracking-wide">{label}</span>
                <ChevronRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="w-full h-[1.5px] bg-white opacity-90 mt-1" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
