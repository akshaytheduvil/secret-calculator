import React from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight } from 'lucide-react';
import { ActiveTab } from '../layout/AppHeader';

interface GameDashboardProps {
  onSelectTab: (tab: ActiveTab) => void;
  onChooseGame: () => void;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({
  onSelectTab,
  onChooseGame
}) => {
  const { selectedGame, gameMeta } = useGame();
  const { user, logout } = useAuth();

  const isAgent = user?.role === 'AGENT' || user?.role === 'ADMIN';

  // Menu options matching PDF 2 Page 2 / PDF 3 Page 2
  const menuItems: { id: ActiveTab | 'chooseGame'; label: string }[] = isAgent
    ? [
        { id: 'booking', label: 'Number Booking' },
        { id: 'lastSale', label: 'Last Sale' },
        { id: 'salesReport', label: 'Sales Report' },
        { id: 'winningReport', label: 'Winning' },
        { id: 'dailyReport', label: 'Daily Report' },
        { id: 'subdealersDaily', label: 'Sub Dealers Daily' },
        { id: 'results', label: 'Result' },
        { id: 'commission', label: 'My Commission' },
        { id: 'manageSubdealers', label: 'Manage Sub Dealer' },
        { id: 'chooseGame', label: 'Choose Game' }
      ]
    : [
        { id: 'booking', label: 'Number Booking' },
        { id: 'lastSale', label: 'Last Sale' },
        { id: 'salesReport', label: 'Sales Report' },
        { id: 'winningReport', label: 'Winning' },
        { id: 'dailyReport', label: 'Daily Report' },
        { id: 'results', label: 'Result' },
        { id: 'commission', label: 'My Commission' },
        { id: 'chooseGame', label: 'Choose Game' }
      ];

  const handleItemClick = (id: ActiveTab | 'chooseGame') => {
    if (id === 'chooseGame') {
      onChooseGame();
    } else {
      onSelectTab(id);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Red Header matching PDF 2 Page 2 / PDF 3 Page 2 */}
      <header
        className="px-4 py-3 flex items-center justify-between text-white"
        style={{ backgroundColor: gameMeta.themeColor }}
      >
        <span className="text-base font-bold tracking-wide">{selectedGame}</span>
        <button
          onClick={onChooseGame}
          className="text-xs font-bold tracking-wider hover:opacity-80 transition-opacity"
        >
          GAMES
        </button>
      </header>

      {/* User / Logout Row */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{user?.username}</span>
        <button
          onClick={logout}
          className="text-xs font-bold text-black hover:text-red-600 transition-colors tracking-wide"
        >
          LOGOUT
        </button>
      </div>

      {/* 2-Column Red Buttons Grid */}
      <main className="p-3 max-w-md w-full mx-auto flex-1">
        <div className="grid grid-cols-2 gap-2.5 mt-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className="bg-[#ff0000] text-white py-3 px-3 rounded-md flex items-center justify-between text-xs font-medium shadow-sm active:bg-red-700 transition-colors"
            >
              <span className="text-left font-normal leading-tight">{item.label}</span>
              <ChevronRight className="w-4 h-4 shrink-0 ml-1 text-white opacity-90" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
