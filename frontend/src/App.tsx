import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame, GameCode } from './context/GameContext';
import { Calculator } from './components/calculator/Calculator';
import { Login } from './components/auth/Login';
import { GameSelection } from './components/games/GameSelection';
import { GameDashboard } from './components/dashboard/GameDashboard';
import { ActiveTab } from './components/layout/AppHeader';
import { NumberBooking } from './components/booking/NumberBooking';
import { LastSale } from './components/reports/LastSale';
import { SalesReport } from './components/reports/SalesReport';
import { WinningReport } from './components/reports/WinningReport';
import { DailyReport } from './components/reports/DailyReport';
import { CommissionReport } from './components/reports/CommissionReport';
import { TodayReport } from './components/reports/TodayReport';
import { ResultPage } from './components/results/ResultPage';
import { ManageSubDealer } from './components/agent/ManageSubDealer';
import { AdminPortal } from './components/admin/AdminPortal';

type AppView = 'calculator' | 'login' | 'games' | 'dashboard' | 'admin';

const MainApplicationContent: React.FC<{
  currentView: AppView;
  setCurrentView: React.Dispatch<React.SetStateAction<AppView>>;
}> = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { selectGame } = useGame();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['booking', 'lastSale', 'salesReport', 'winningReport', 'dailyReport', 'today', 'subdealersDaily', 'results', 'commission', 'manageSubdealers'].includes(tab)) {
        return tab as ActiveTab;
      }
    } catch {}
    return 'menu';
  });

  // Double-back-press to exit (Android)
  const backPressedOnce = useRef(false);
  const backPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centralized Mobile & Browser Back Navigation
  // Follows: Last Sale -> Menu -> Dashboard/Games -> Login -> Exit Application
  const handleBackNavigation = useCallback(() => {
    if (currentView === 'dashboard') {
      if (activeTab !== 'menu') {
        setActiveTab('menu');
        window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
      } else {
        setCurrentView('games');
        window.history.pushState({ view: 'games' }, '');
      }
    } else if (currentView === 'games' || currentView === 'admin') {
      logout();
      setCurrentView('login');
      window.history.pushState({ view: 'login' }, '');
    } else if (currentView === 'login' || currentView === 'calculator') {
      // Double-back to exit: first press shows toast, second press exits
      if (backPressedOnce.current) {
        if (backPressTimer.current) clearTimeout(backPressTimer.current);
        import('@capacitor/app')
          .then(({ App: CapApp }) => { CapApp.exitApp(); })
          .catch(() => { if (window.history.length > 1) window.history.back(); });
      } else {
        backPressedOnce.current = true;
        // Show "press again to exit" toast via a temporary DOM element
        const toast = document.createElement('div');
        toast.textContent = 'Press back again to exit';
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;';
        document.body.appendChild(toast);
        backPressTimer.current = setTimeout(() => {
          backPressedOnce.current = false;
          if (document.body.contains(toast)) document.body.removeChild(toast);
        }, 2500);
      }
    }
  }, [currentView, activeTab, logout, setCurrentView]);

  // Synchronize Browser Popstate & Capacitor Android Hardware Back Button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        if (e.state.view) {
          setCurrentView(e.state.view);
        }
        if (e.state.tab) {
          setActiveTab(e.state.tab);
        } else {
          setActiveTab('menu');
        }
      } else {
        handleBackNavigation();
      }
    };

    window.addEventListener('popstate', handlePopState);

    let capBackHandle: any = null;
    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        CapApp.addListener('backButton', () => {
          handleBackNavigation();
        }).then((handle) => {
          capBackHandle = handle;
        });
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (capBackHandle?.remove) capBackHandle.remove();
    };
  }, [handleBackNavigation, setCurrentView]);

  // If authenticated as Admin, show Admin Portal
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN' && currentView !== 'calculator') {
      setCurrentView('admin');
    }
  }, [isAuthenticated, user, currentView, setCurrentView]);

  // 1. Initial Screen: Secret Calculator (unlock with 11+22= or 5-tap top-corner)
  if (currentView === 'calculator') {
    return (
      <Calculator
        onUnlock={() => {
          setCurrentView('login');
          window.history.pushState({ view: 'login' }, '');
        }}
      />
    );
  }

  // 2. Main Login
  if (currentView === 'login') {
    return (
      <Login
        onSuccess={(role) => {
          if (role === 'ADMIN') {
            setCurrentView('admin');
            window.history.pushState({ view: 'admin' }, '');
          } else {
            setCurrentView('games');
            window.history.pushState({ view: 'games' }, '');
          }
        }}
        onBackToCalculator={() => {
          setCurrentView('calculator');
          window.history.pushState({ view: 'calculator' }, '');
        }}
      />
    );
  }

  // 3. Admin Portal
  if (currentView === 'admin' && user?.role === 'ADMIN') {
    return <AdminPortal />;
  }

  // 4. Game Selection Screen (GAMES #1)
  if (currentView === 'games') {
    return (
      <GameSelection
        onSelectGameAndNavigate={(game: GameCode) => {
          selectGame(game);
          setActiveTab('menu');
          setCurrentView('dashboard');
          window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
        }}
      />
    );
  }

  // 5. Main Game Dashboard and its individual pages
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <main className="flex-1">
        {activeTab === 'menu' && (
          <GameDashboard
            onSelectTab={(tab) => {
              setActiveTab(tab);
              window.history.pushState({ view: 'dashboard', tab }, '');
            }}
            onChooseGame={() => {
              setCurrentView('games');
              window.history.pushState({ view: 'games' }, '');
            }}
          />
        )}
        {activeTab === 'booking' && (
          <NumberBooking
            onOpenMenu={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'today' && (
          <TodayReport
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'lastSale' && (
          <LastSale
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'salesReport' && (
          <SalesReport
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'winningReport' && (
          <WinningReport
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'dailyReport' && (
          <DailyReport
            isSubdealerSpecific={false}
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'subdealersDaily' && (
          <DailyReport
            isSubdealerSpecific={true}
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'results' && (
          <ResultPage
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'commission' && (
          <CommissionReport
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
        {activeTab === 'manageSubdealers' && (
          <ManageSubDealer
            onBack={() => {
              setActiveTab('menu');
              window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
            }}
          />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'login' || v === 'games' || v === 'dashboard' || v === 'admin') {
        return v as AppView;
      }
      if (params.get('skip') === '1') {
        return 'login';
      }
    } catch {}
    return 'calculator';
  });

  const handleSessionEnd = () => {
    setCurrentView('calculator');
  };

  // Fix: Do NOT logout on app background (appStateChange isActive=false).
  // Only clear session on actual window unload (handled in AuthContext).
  // This allows users to switch apps and come back without losing their session.

  return (
    <AuthProvider onSessionEnd={handleSessionEnd}>
      <GameProvider defaultGame="DR1">
        <MainApplicationContent
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
      </GameProvider>
    </AuthProvider>
  );
};

export default App;
