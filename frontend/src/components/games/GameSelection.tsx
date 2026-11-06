import React from 'react';
import { useGame, GameCode, GAME_METADATA } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, Sparkles, Clock } from 'lucide-react';

interface GameSelectionProps {
  onSelectGameAndNavigate: (game: GameCode) => void;
  onOpenMenu?: () => void;
}

export const GameSelection: React.FC<GameSelectionProps> = ({
  onSelectGameAndNavigate,
  onOpenMenu
}) => {
  const { selectGame } = useGame();
  const { user, logout } = useAuth();

  const handleCardClick = (code: GameCode) => {
    selectGame(code);
    // MANDATORY NAVIGATION BEHAVIOR: Immediately open selected game's Number Booking!
    onSelectGameAndNavigate(code);
  };

  const gamesList: GameCode[] = ['DR1', 'KL', 'DR6', 'DR8'];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-zinc-900 flex flex-col">
      {/* Dark Header with Title GAMES #1 */}
      <header className="bg-[#12141a] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>GAMES #1</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-zinc-400 block">Logged in as</span>
            <span className="text-xs font-semibold text-emerald-400 font-mono">{user?.username}</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Immediate Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Light Grey / White Background */}
      <main className="flex-1 p-4 sm:p-8 max-w-4xl w-full mx-auto flex flex-col justify-center">
        <div className="mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-800 tracking-tight">Select Active Game</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Tap a card to enter real-time Number Booking</p>
        </div>

        {/* 2×2 Card Layout with distinct theme colors, rounded borders, and elevated shadows */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {gamesList.map((code) => {
            const meta = GAME_METADATA[code];
            
            // Distinct styling configurations
            let cardBg = '';
            let borderStyle = '';
            let shadowStyle = '';
            let textAccent = '';

            if (code === 'DR1') {
              // Red
              cardBg = 'bg-gradient-to-br from-red-500 to-rose-600 text-white';
              borderStyle = 'border-red-600/30';
              shadowStyle = 'shadow-lg shadow-red-500/25 hover:shadow-red-500/40';
              textAccent = 'text-red-100';
            } else if (code === 'KL') {
              // Green
              cardBg = 'bg-gradient-to-br from-emerald-500 to-green-600 text-white';
              borderStyle = 'border-emerald-600/30';
              shadowStyle = 'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40';
              textAccent = 'text-emerald-100';
            } else if (code === 'DR6') {
              // Magenta
              cardBg = 'bg-gradient-to-br from-fuchsia-600 to-pink-600 text-white';
              borderStyle = 'border-pink-600/30';
              shadowStyle = 'shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40';
              textAccent = 'text-pink-100';
            } else {
              // Blue (DR8)
              cardBg = 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white';
              borderStyle = 'border-blue-600/30';
              shadowStyle = 'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40';
              textAccent = 'text-blue-100';
            }

            return (
              <button
                key={code}
                onClick={() => handleCardClick(code)}
                className={`w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between items-start text-left transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98] ${cardBg} ${shadowStyle} border ${borderStyle} cursor-pointer`}
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-2xl sm:text-4xl font-black tracking-wider drop-shadow-sm font-mono">
                    {code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-xs font-semibold backdrop-blur-sm uppercase tracking-wide">
                    Active
                  </span>
                </div>

                <div className="w-full">
                  <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${textAccent}`}>
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Closes {meta.closingTime}</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/80 mt-1 font-medium">
                    Tap for Number Booking →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};
