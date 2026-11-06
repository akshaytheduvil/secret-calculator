import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  X,
  LogOut,
  Layers,
  FileText,
  Trophy,
  Calendar,
  Award,
  DollarSign,
  Users,
  Grid,
  ChevronRight
} from 'lucide-react';

export type ActiveTab =
  | 'booking'
  | 'lastSale'
  | 'salesReport'
  | 'winningReport'
  | 'dailyReport'
  | 'results'
  | 'commission'
  | 'manageSubdealers'
  | 'subdealersDaily';

interface AppHeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onChooseGame: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onSelectTab,
  onChooseGame
}) => {
  const { selectedGame, gameMeta } = useGame();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNav = (tab: ActiveTab) => {
    onSelectTab(tab);
    setDrawerOpen(false);
  };

  const navItems = [
    { id: 'booking', label: 'Number Booking', icon: Grid },
    { id: 'lastSale', label: 'Last Sale', icon: FileText },
    { id: 'salesReport', label: 'Sales Report', icon: Layers },
    { id: 'winningReport', label: 'Winning Report', icon: Trophy },
    { id: 'dailyReport', label: 'Daily Report', icon: Calendar },
    { id: 'results', label: 'Result', icon: Award },
    { id: 'commission', label: 'My Commission', icon: DollarSign }
  ];

  // Agent B specific additions
  if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
    navItems.push(
      { id: 'subdealersDaily', label: 'Sub-dealers Daily Report', icon: Calendar },
      { id: 'manageSubdealers', label: 'Manage Sub Dealer', icon: Users }
    );
  }

  return (
    <>
      {/* Header bar colored dynamically with active game theme */}
      <header
        className="text-white px-4 py-3 sticky top-0 z-30 shadow-md transition-colors duration-200"
        style={{ backgroundColor: gameMeta.themeColor }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xl tracking-wider text-white">
                {selectedGame}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 font-medium">
                {gameMeta.closingTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onChooseGame}
              className="px-2.5 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-xs font-semibold text-white tracking-wide transition-colors flex items-center gap-1"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Choose Game</span>
            </button>

            <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-1 text-xs text-white/90">
              <span className="font-mono font-medium">{user?.username}</span>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors"
              title="Immediate Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-out Menu Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-[#161820] text-zinc-100 z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between shadow-2xl border-r border-zinc-800 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Drawer Header */}
          <div
            className="p-4 text-white flex items-center justify-between shadow-sm"
            style={{ backgroundColor: gameMeta.themeColor }}
          >
            <div>
              <div className="font-bold text-base tracking-wide flex items-center gap-2">
                <span>{selectedGame} Dashboard</span>
              </div>
              <div className="text-xs text-white/80 font-mono mt-0.5">
                User: {user?.username} ({user?.role})
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-lg bg-black/20 hover:bg-black/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold border-l-4 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                  style={{
                    borderLeftColor: isActive ? gameMeta.themeColor : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className="w-4 h-4"
                      style={{ color: isActive ? gameMeta.themeColor : undefined }}
                    />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  onChooseGame();
                }}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Grid className="w-4 h-4 text-amber-400" />
                  <span>Choose Game</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </nav>
        </div>

        {/* Drawer Footer with immediate logout */}
        <div className="p-4 border-t border-zinc-800 bg-[#12141a]">
          <button
            onClick={() => {
              setDrawerOpen(false);
              logout();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Immediately</span>
          </button>
        </div>
      </div>
    </>
  );
};
