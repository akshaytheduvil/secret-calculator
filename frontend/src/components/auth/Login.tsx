import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { User } from 'lucide-react';

interface LoginProps {
  onSuccess: (role: string) => void;
  onBackToCalculator: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onBackToCalculator }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedUser, password);
      const token = ApiClient.getToken();
      if (token) {
        const profile = await ApiClient.me();
        onSuccess(profile.user.role);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        {/* Grey Avatar Circle matching reference screenshot */}
        <div className="w-24 h-24 rounded-full bg-[#e4e4e4] border-2 border-[#d0d0d0] flex items-center justify-center mb-8 shadow-inner">
          <User className="w-14 h-14 text-[#9e9e9e]" strokeWidth={1.5} />
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 p-2 text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div>
            <label className="block text-xs font-normal text-gray-500 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoFocus
              className="w-full border-b border-gray-400 focus:border-black outline-none bg-transparent py-1 text-sm text-black transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-normal text-gray-500 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-gray-400 focus:border-black outline-none bg-transparent py-1 text-sm text-black transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-3 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-bold text-xs tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'LOGIN'}
          </button>
        </form>

        <button
          type="button"
          onClick={onBackToCalculator}
          className="mt-6 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Calculator
        </button>
      </div>
    </div>
  );
};
