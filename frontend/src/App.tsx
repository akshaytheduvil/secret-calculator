import React, { useState, useEffect, useCallback } from 'react';
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

  // Centralized Mobile & Browser Back Navigation
  // Follows: Last Sale -> Menu -> Dashboard/Games -> Login -> Exit Application
  const handleBackNavigation = useCallback(() => {
    if (currentView === 'dashboard') {
      if (activeTab !== 'menu') {
        // Last Sale (or any open tab) -> Menu
        setActiveTab('menu');
        window.history.pushState({ view: 'dashboard', tab: 'menu' }, '');
      } else {
        // Menu -> Game selection
        setCurrentView('games');
        window.history.pushState({ view: 'games' }, '');
      }
    } else if (currentView === 'games' || currentView === 'admin') {
      // Dashboard/Games/Admin -> Login (terminates session)
      logout();
      setCurrentView('login');
      window.history.pushState({ view: 'login' }, '');
    } else if (currentView === 'login') {
      // Login -> Exit application
      import('@capacitor/app')
        .then(({ App: CapApp }) => {
          CapApp.exitApp();
        })
        .catch(() => {
          if (window.history.length > 1) {
            window.history.back();
          }
        });
    } else if (currentView === 'calculator') {
      import('@capacitor/app')
        .then(({ App: CapApp }) => {
          CapApp.exitApp();
        })
        .catch(() => {});
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

  useEffect(() => {
    let listenerHandle: any = null;

    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        CapApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            handleSessionEnd();
          }
        }).then((handle) => {
          listenerHandle = handle;
        });
      })
      .catch(() => {});

    return () => {
      if (listenerHandle?.remove) listenerHandle.remove();
    };
  }, []);

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
