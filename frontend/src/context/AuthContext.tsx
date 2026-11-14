import React, { createContext, useContext, useState, useCallback } from 'react';
import { ApiClient } from '../api/client';

export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'AGENT' | 'SUBDEALER';
  parent_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  dealerConfig: any | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; onSessionEnd: () => void }> = ({
  children,
  onSessionEnd
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [dealerConfig, setDealerConfig] = useState<any | null>(null);

  // Immediate manual logout without confirmation dialog
  const logout = useCallback(() => {
    const token = ApiClient.getToken();
    if (token) {
      try {
        ApiClient.logout().catch(() => {});
      } catch {}
    }
    ApiClient.clearToken();
    setUser(null);
    setDealerConfig(null);
    onSessionEnd(); // Returns immediately to Secret Calculator requiring 11+22=
  }, [onSessionEnd]);

  const login = async (username: string, password: string) => {
    const res = await ApiClient.login({ username, password });
    ApiClient.setToken(res.token);
    setUser(res.user);
    setDealerConfig(res.dealerConfig || null);
  };

  const refreshProfile = async () => {
    try {
      const res = await ApiClient.me();
      setUser(res.user);
      setDealerConfig(res.dealerConfig || null);
    } catch {
      logout();
    }
  };

  // Note: We intentionally do NOT auto-logout on beforeunload/visibilitychange
  // because on Android, switching apps triggers these events and would log out the user.
  // Session is managed explicitly: logout() on manual signout, App.tsx handles appStateChange.

  return (
    <AuthContext.Provider
      value={{
        user,
        dealerConfig,
        isAuthenticated: !!user,
        login,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
