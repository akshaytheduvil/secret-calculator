import React, { useState, useEffect } from 'react';
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
import { ResultPage } from './components/results/ResultPage';
import { ManageSubDealer } from './components/agent/ManageSubDealer';
import { AdminPortal } from './components/admin/AdminPortal';

type AppView = 'calculator' | 'login' | 'games' | 'dashboard' | 'admin';

const MainApplicationContent: React.FC<{
  currentView: AppView;
  setCurrentView: React.Dispatch<React.SetStateAction<AppView>>;
}> = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated } = useAuth();
  const { selectGame } = useGame();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['booking', 'lastSale', 'salesReport', 'winningReport', 'dailyReport', 'subdealersDaily', 'results', 'commission', 'manageSubdealers'].includes(tab)) {
        return tab as ActiveTab;
      }
    } catch {}
    return 'menu';
  });

  // If authenticated as Admin, show Admin Portal
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN' && currentView !== 'calculator') {
      setCurrentView('admin');
    }
  }, [isAuthenticated, user, currentView, setCurrentView]);

  // 1. Initial Screen: Secret Calculator (unlock with 11+22)
  if (currentView === 'calculator') {
    return (
      <Calculator
        onUnlock={() => {
          setCurrentView('login');
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
          } else {
            setCurrentView('games');
          }
        }}
        onBackToCalculator={() => setCurrentView('calculator')}
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
            onSelectTab={(tab) => setActiveTab(tab)}
            onChooseGame={() => setCurrentView('games')}
          />
        )}
        {activeTab === 'booking' && (
          <NumberBooking onOpenMenu={() => setActiveTab('menu')} />
        )}
        {activeTab === 'lastSale' && (
          <LastSale onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'salesReport' && (
          <SalesReport onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'winningReport' && (
          <WinningReport onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'dailyReport' && (
          <DailyReport isSubdealerSpecific={false} onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'subdealersDaily' && (
          <DailyReport isSubdealerSpecific={true} onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'results' && (
          <ResultPage onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'commission' && (
          <CommissionReport onBack={() => setActiveTab('menu')} />
        )}
        {activeTab === 'manageSubdealers' && (
          <ManageSubDealer onBack={() => setActiveTab('menu')} />
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
    let backHandle: any = null;

    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        CapApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            handleSessionEnd();
          }
        }).then((handle) => {
          listenerHandle = handle;
        });

        CapApp.addListener('backButton', () => {
          handleSessionEnd();
        }).then((handle) => {
          backHandle = handle;
        });
      })
      .catch(() => {});

    return () => {
      if (listenerHandle?.remove) listenerHandle.remove();
      if (backHandle?.remove) backHandle.remove();
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
