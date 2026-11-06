import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame, GameCode } from './context/GameContext';
import { Calculator } from './components/calculator/Calculator';
import { Login } from './components/auth/Login';
import { GameSelection } from './components/games/GameSelection';
import { AppHeader, ActiveTab } from './components/layout/AppHeader';
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('booking');

  // If authenticated as Admin, show Admin Portal
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN' && currentView !== 'calculator') {
      setCurrentView('admin');
    }
  }, [isAuthenticated, user, currentView, setCurrentView]);

  // 1. Initial Screen: Secret Calculator
  if (currentView === 'calculator') {
    return (
      <Calculator
        onUnlock={() => {
          // Secret expression entered -> open login
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
            // Agent B & Sub-dealer C go to Game Selection
            setCurrentView('games');
          }
        }}
        onBackToCalculator={() => setCurrentView('calculator')}
      />
    );
  }

  // 3. Admin A Portal
  if (currentView === 'admin' && user?.role === 'ADMIN') {
    return <AdminPortal />;
  }

  // 4. Game Selection Screen (GAMES #1)
  if (currentView === 'games') {
    return (
      <GameSelection
        onSelectGameAndNavigate={(game: GameCode) => {
          selectGame(game);
          setActiveTab('booking');
          // MANDATORY: Immediately open selected game's Number Booking
          setCurrentView('dashboard');
        }}
        onOpenMenu={() => {
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // 5. Main Dashboard (Game POS & Features)
  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex flex-col">
      <AppHeader
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onChooseGame={() => setCurrentView('games')}
      />

      <main className="flex-1 pb-10">
        {activeTab === 'booking' && <NumberBooking />}
        {activeTab === 'lastSale' && <LastSale />}
        {activeTab === 'salesReport' && <SalesReport />}
        {activeTab === 'winningReport' && <WinningReport />}
        {activeTab === 'dailyReport' && <DailyReport isSubdealerSpecific={false} />}
        {activeTab === 'results' && <ResultPage />}
        {activeTab === 'commission' && <CommissionReport />}
        {activeTab === 'subdealersDaily' && <DailyReport isSubdealerSpecific={true} />}
        {activeTab === 'manageSubdealers' && <ManageSubDealer />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('calculator');

  // Mandatory Automatic Logout on application restart, minimize, backgrounding, or device sleep
  const handleSessionEnd = () => {
    setCurrentView('calculator');
  };

  useEffect(() => {
    // Listen to mobile lifecycle events if running under Capacitor
    let listenerHandle: any = null;
    let backHandle: any = null;

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // App minimized, put in background, or closed -> force session end immediately
          handleSessionEnd();
        }
      }).then(handle => { listenerHandle = handle; });

      CapApp.addListener('backButton', () => {
        // Hardware back button returns to calculator and terminates view
        handleSessionEnd();
      }).then(handle => { backHandle = handle; });
    }).catch(() => {});

    return () => {
      if (listenerHandle?.remove) listenerHandle.remove();
      if (backHandle?.remove) backHandle.remove();
    };
  }, []);

  return (
    <AuthProvider onSessionEnd={handleSessionEnd}>
      <GameProvider defaultGame="KL">
        <MainApplicationContent
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
      </GameProvider>
    </AuthProvider>
  );
};

export default App;
