import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { User, Settings, Wifi, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

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

  // Central Server configuration state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => ApiClient.getBaseUrl());
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [serverStatusMsg, setServerStatusMsg] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const checkConnection = async (urlToCheck?: string) => {
    setServerStatus('checking');
    const res = await ApiClient.checkHealth(urlToCheck);
    if (res.ok) {
      setServerStatus('connected');
      setServerStatusMsg('Connected to Central Backend (PostgreSQL)');
    } else {
      setServerStatus('error');
      setServerStatusMsg(res.message);
    }
    return res;
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await ApiClient.checkHealth(serverUrl);
      if (res.ok) {
        setTestResult({ ok: true, msg: 'Connected successfully to Central Backend!' });
      } else {
        setTestResult({ ok: false, msg: res.message });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Connection failed' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveServer = async () => {
    ApiClient.setBaseUrl(serverUrl);
    await checkConnection(serverUrl);
    setShowServerModal(false);
    setError('');
  };

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
      const errMsg = err.message || 'Invalid credentials';
      setError(errMsg);
      setPassword('');
      if (errMsg.includes('Central Backend') || errMsg.includes('server') || errMsg.includes('Unable to connect')) {
        setServerStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-12 relative">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        {/* Grey Avatar Circle matching reference screenshot */}
        <div className="w-24 h-24 rounded-full bg-[#e4e4e4] border-2 border-[#d0d0d0] flex items-center justify-center mb-4 shadow-inner">
          <User className="w-14 h-14 text-[#9e9e9e]" strokeWidth={1.5} />
        </div>

        {/* Central Server Status Pill */}
        <button
          type="button"
          onClick={() => {
            setTestResult(null);
            setShowServerModal(true);
          }}
          className="mb-6 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-gray-200 transition-colors bg-gray-50 hover:bg-gray-100"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'connected'
                ? 'bg-emerald-500'
                : serverStatus === 'checking'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-gray-600">
            {serverStatus === 'connected'
              ? 'Central Server: Connected'
              : serverStatus === 'checking'
              ? 'Connecting to Server...'
              : 'Server: Tap to Configure'}
          </span>
          <Settings className="w-3 h-3 text-gray-400 ml-0.5" />
        </button>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 p-2.5 text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded space-y-2">
            <div>{error}</div>
            {(error.includes('Central') || error.includes('backend') || error.includes('server') || error.includes('connect')) && (
              <button
                type="button"
                onClick={() => {
                  setTestResult(null);
                  setShowServerModal(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded border border-red-300 transition-colors"
              >
                <Settings className="w-3 h-3" /> Configure Central Server URL
              </button>
            )}
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

      {/* Central Server Settings Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-gray-700" />
                <h3 className="text-sm font-bold text-gray-900">Central Server Connection</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed">
              Connect your mobile app to the centralized Pick 3 backend server. All Admin, Agent, and Subdealer apps share this single central database.
            </div>

            {serverStatusMsg && (
              <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                <span className="font-semibold text-gray-700">Status:</span> {serverStatusMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Central Backend URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.220.36:5000/api"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Quick Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setServerUrl('http://192.168.220.36:5000/api')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] rounded transition-colors"
                >
                  My PC (Wi-Fi 192.168.220.36)
                </button>
                <button
                  type="button"
                  onClick={() => setServerUrl('http://localhost:5000/api')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] rounded transition-colors"
                >
                  Localhost
                </button>
                <button
                  type="button"
                  onClick={() => setServerUrl('/api')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] rounded transition-colors"
                >
                  Same Host (/api)
                </button>
              </div>
            </div>

            {/* Test Connection Result Box */}
            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-[11px] leading-tight">{testResult.msg}</div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testLoading}
                className="flex-1 py-2 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
                {testLoading ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSaveServer}
                className="flex-1 py-2 px-3 bg-black hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
