import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Award,
  DollarSign,
  Clock,
  Layers,
  KeyRound,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  Send
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'results' | 'prizes' | 'draws'>('dashboard');

  // Dashboard Metrics
  const [metrics, setMetrics] = useState({
    totalAgents: 0,
    totalSubDealers: 0,
    todaySale: 0,
    todayWinning: 0
  });

  // Agents
  const [agents, setAgents] = useState<any[]>([]);
  const [subDealers, setSubDealers] = useState<any[]>([]);

  // Agent Form
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [newAgentUser, setNewAgentUser] = useState('');
  const [newAgentPass, setNewAgentPass] = useState('');
  const [newAgentComm, setNewAgentComm] = useState('0.5');

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Result Management
  const [selectedResultGame, setSelectedResultGame] = useState('KL');
  const [selectedResultDate, setSelectedResultDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [firstPrize, setFirstPrize] = useState('');
  const [secondPrize, setSecondPrize] = useState('');
  const [thirdPrize, setThirdPrize] = useState('');
  const [fourthPrize, setFourthPrize] = useState('');
  const [fifthPrize, setFifthPrize] = useState('');
  const [compNumbersStr, setCompNumbersStr] = useState('');
  const [currentDrawId, setCurrentDrawId] = useState('');

  // Prize Config
  const [prizeConfig, setPrizeConfig] = useState({
    superPrize: 5000,
    boxPrize: 3000,
    oneDigitPrize: 100,
    twoDigitPrize: 700,
    complementaryPrize: 20
  });

  // Draws Overview
  const [drawsOverview, setDrawsOverview] = useState<{ today: any[]; tomorrow: any[] }>({ today: [], tomorrow: [] });

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await ApiClient.getAdminDashboard();
      setMetrics(data);
    } catch {}
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const [resAgents, resSubs] = await Promise.all([
        ApiClient.listAgents(),
        ApiClient.listSubDealers()
      ]);
      setAgents(resAgents.agents || []);
      setSubDealers(resSubs.subDealers || []);
    } catch {}
  }, []);

  const fetchDraws = useCallback(async () => {
    try {
      const data = await ApiClient.getDrawOverview();
      setDrawsOverview(data);

      // Find current draw for results
      const allDraws = [...(data.today || []), ...(data.tomorrow || [])];
      const match = allDraws.find((d: any) => d.game_code === selectedResultGame && d.draw_date === selectedResultDate);
      if (match) {
        setCurrentDrawId(match.id);
      }
    } catch {}
  }, [selectedResultGame, selectedResultDate]);

  const fetchPrizes = useCallback(async () => {
    try {
      const res = await ApiClient.getPrizeConfig();
      setPrizeConfig(res);
    } catch {}
  }, []);

  const fetchExistingResults = useCallback(async () => {
    try {
      const res = await ApiClient.getResults(selectedResultDate, selectedResultGame);
      const gameRes = res.results?.find((r: any) => r.game_code === selectedResultGame);
      if (gameRes) {
        setFirstPrize(gameRes.first_prize || '');
        setSecondPrize(gameRes.second_prize || '');
        setThirdPrize(gameRes.third_prize || '');
        setFourthPrize(gameRes.fourth_prize || '');
        setFifthPrize(gameRes.fifth_prize || '');
        setCompNumbersStr((gameRes.complementary_numbers || []).join(', '));
      } else {
        setFirstPrize('');
        setSecondPrize('');
        setThirdPrize('');
        setFourthPrize('');
        setFifthPrize('');
        setCompNumbersStr('');
      }
    } catch {}
  }, [selectedResultDate, selectedResultGame]);

  useEffect(() => {
    fetchDashboardData();
    fetchAgents();
    fetchDraws();
    fetchPrizes();
  }, [fetchDashboardData, fetchAgents, fetchDraws, fetchPrizes]);

  useEffect(() => {
    fetchExistingResults();
  }, [fetchExistingResults]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentUser.trim() || !newAgentPass) return;
    try {
      await ApiClient.createAgent({
        username: newAgentUser.trim(),
        password: newAgentPass,
        salesCommission: parseFloat(newAgentComm) || 0.5
      });
      setShowAgentModal(false);
      setNewAgentUser('');
      setNewAgentPass('');
      fetchAgents();
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to create agent');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    try {
      await ApiClient.resetAgentPassword(resetModalUser.id, newPassword);
      setResetModalUser(null);
      setNewPassword('');
      alert('Password reset successfully');
    } catch (err: any) {
      alert(err.message || 'Password reset failed');
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (!window.confirm(`Are you sure you want to delete ${u.role.toLowerCase()} "${u.username}"? Login access will be terminated immediately while preserving historical accounting.`)) {
      return;
    }
    try {
      await ApiClient.deleteUser(u.id);
      fetchAgents();
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handlePublishResults = async (isFinalPublish: boolean) => {
    if (!currentDrawId) {
      alert('Draw record not found for selected date and game');
      return;
    }

    const comps = compNumbersStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await ApiClient.publishResult({
        drawId: currentDrawId,
        firstPrize: firstPrize.trim() || null,
        secondPrize: secondPrize.trim() || null,
        thirdPrize: thirdPrize.trim() || null,
        fourthPrize: fourthPrize.trim() || null,
        fifthPrize: fifthPrize.trim() || null,
        complementaryNumbers: comps,
        isPublished: isFinalPublish
      });
      alert(isFinalPublish ? 'Results published officially and reconciled!' : 'Progressive draft results saved successfully.');
      fetchDraws();
      fetchExistingResults();
    } catch (err: any) {
      alert(err.message || 'Failed to publish results');
    }
  };

  const handleSavePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.updatePrizeConfig(prizeConfig);
      alert('Prize configuration updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update prize config');
    }
  };

  const handleToggleDrawStatus = async (drawId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await ApiClient.setManualDrawStatus(drawId, nextStatus);
      fetchDraws();
    } catch (err: any) {
      alert(err.message || 'Failed to update draw status');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex flex-col">
      {/* Admin Header */}
      <header className="bg-[#14161f] border-b border-zinc-800 px-4 py-3 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black">
              A
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wide uppercase">Admin A Master Console</h1>
              <span className="text-[10px] text-zinc-400 font-mono">Logged in: {user?.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Nav Tabs */}
      <div className="bg-[#12141a] border-b border-zinc-800/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-2 text-xs font-semibold">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Layers },
            { id: 'agents', label: 'Agent Management', icon: Users },
            { id: 'results', label: 'Result Management', icon: Award },
            { id: 'prizes', label: 'Prize Configuration', icon: DollarSign },
            { id: 'draws', label: 'Draw Management', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {/* 1. DASHBOARD WITH EXACTLY 4 SUMMARY CARDS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">System Performance Overview</h2>
              <button
                onClick={fetchDashboardData}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Exactly 4 Dynamic Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1: Total Agents */}
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-semibold mb-2">
                  <span>1. Total Agents</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white">
                  {metrics.totalAgents}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Active Agent B accounts</span>
              </div>

              {/* Card 2: Total Sub-dealers */}
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-semibold mb-2">
                  <span>2. Total Sub-dealers</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white">
                  {metrics.totalSubDealers}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Subordinate POS dealers</span>
              </div>

              {/* Card 3: Today's Sale */}
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-semibold mb-2">
                  <span>3. Today's Sale</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black text-amber-400">
                  ₹{metrics.todaySale.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Turnover across all games</span>
              </div>

              {/* Card 4: Today's Winning Amount */}
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs uppercase font-semibold mb-2">
                  <span>4. Today's Winning Amount</span>
                  <Award className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-400">
                  ₹{metrics.todayWinning.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Reconciled prizes declared</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. AGENT MANAGEMENT */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-black">Agent B Management</h2>
                <p className="text-xs text-zinc-400">Create, edit, reset passwords, or delete Agent B accounts</p>
              </div>
              <button
                onClick={() => setShowAgentModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Agent B</span>
              </button>
            </div>

            {/* Agent List Table */}
            <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#12141a] text-zinc-400 uppercase border-b border-zinc-800 font-sans">
                    <tr>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Sales Commission</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {agents.map((ag) => (
                      <tr key={ag.id} className="hover:bg-zinc-800/30 text-zinc-300">
                        <td className="py-3 px-4 font-sans font-bold text-white text-sm">{ag.username}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">₹{ag.sales_commission}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ag.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {ag.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{new Date(ag.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setResetModalUser(ag)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(ag)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              title="Delete Agent B"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-dealers & Test Account List (Admin A full control) */}
            <div className="pt-6 border-t border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-200 mb-3 uppercase tracking-wider">
                All Authorized Sub-dealers (Including Dev Test Account)
              </h3>
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#12141a] text-zinc-400 uppercase border-b border-zinc-800 font-sans">
                      <tr>
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-4">Parent Agent</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {subDealers.map((sd) => (
                        <tr key={sd.id} className="hover:bg-zinc-800/30 text-zinc-300">
                          <td className="py-2.5 px-4 font-sans font-bold text-white">
                            {sd.username}
                            {sd.username === 'test' && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                                TEST ACCOUNT
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-zinc-400">{sd.parent_username || 'Root Admin'}</td>
                          <td className="py-2.5 px-4">{sd.is_active ? 'Active' : 'Inactive'}</td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            <button
                              onClick={() => handleDeleteUser(sd)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold"
                              title="Delete subdealer preserving historical reporting"
                            >
                              Delete Account
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. RESULT MANAGEMENT (Progressive Publishing) */}
        {activeTab === 'results' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="pb-3 border-b border-zinc-800">
              <h2 className="text-lg font-black">Progressive Result Management</h2>
              <p className="text-xs text-zinc-400">
                Declare 1st prize only, add 2nd-5th later, enter complementary numbers, or edit/replace results in real time
              </p>
            </div>

            <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Game</label>
                  <select
                    value={selectedResultGame}
                    onChange={(e) => setSelectedResultGame(e.target.value)}
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono font-bold"
                  >
                    <option value="DR1">DR1</option>
                    <option value="KL">KL</option>
                    <option value="DR6">DR6</option>
                    <option value="DR8">DR8</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Draw Date</label>
                  <input
                    type="date"
                    value={selectedResultDate}
                    onChange={(e) => setSelectedResultDate(e.target.value)}
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white"
                  />
                </div>
              </div>

              {/* 1st Prize */}
              <div>
                <label className="block text-amber-400 font-bold mb-1 uppercase tracking-wider">
                  ★ First Prize (3 Digits)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={firstPrize}
                  onChange={(e) => setFirstPrize(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 977"
                  className="w-full bg-[#1e2029] border border-amber-500/50 rounded-2xl py-3 px-4 text-2xl font-mono font-black text-white text-center tracking-widest focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* 2nd - 5th Prizes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">2nd Prize</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={secondPrize}
                    onChange={(e) => setSecondPrize(e.target.value.replace(/\D/g, ''))}
                    placeholder="3 digits"
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">3rd Prize</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={thirdPrize}
                    onChange={(e) => setThirdPrize(e.target.value.replace(/\D/g, ''))}
                    placeholder="3 digits"
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">4th Prize</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={fourthPrize}
                    onChange={(e) => setFourthPrize(e.target.value.replace(/\D/g, ''))}
                    placeholder="3 digits"
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">5th Prize</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={fifthPrize}
                    onChange={(e) => setFifthPrize(e.target.value.replace(/\D/g, ''))}
                    placeholder="3 digits"
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Complementary Numbers */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Last Complementary Numbers (comma-separated, e.g. 42, 99, 11, 75)
                </label>
                <textarea
                  rows={2}
                  value={compNumbersStr}
                  onChange={(e) => setCompNumbersStr(e.target.value)}
                  placeholder="e.g. 12, 34, 56, 78, 90"
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl p-3 text-white font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => handlePublishResults(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors"
                >
                  Save Progressive Draft
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishResults(true)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish & Reconcile Wins</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. PRIZE CONFIGURATION */}
        {activeTab === 'prizes' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="pb-3 border-b border-zinc-800">
              <h2 className="text-lg font-black">Prize Configuration</h2>
              <p className="text-xs text-zinc-400">Configure authoritative winning prize amounts stored in database</p>
            </div>

            <form onSubmit={handleSavePrizes} className="bg-[#161820] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">SUPER Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.superPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, superPrize: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">BOX Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.boxPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, boxPrize: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">One-digit Prize (₹ per matched position)</label>
                <input
                  type="number"
                  value={prizeConfig.oneDigitPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, oneDigitPrize: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Two-digit Prize (₹ per matched pair)</label>
                <input
                  type="number"
                  value={prizeConfig.twoDigitPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, twoDigitPrize: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Complementary Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.complementaryPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, complementaryPrize: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono font-bold"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md"
                >
                  Save Prize Values
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 5. DRAW MANAGEMENT */}
        {activeTab === 'draws' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-black">Draw Management</h2>
                <p className="text-xs text-zinc-400">View schedules, manual Open/Close overrides, and next-day rollover status</p>
              </div>
              <button
                onClick={fetchDraws}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Today's Draws */}
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Today's Draws</h3>
                <div className="space-y-2.5">
                  {drawsOverview.today?.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-2xl bg-[#12141a] border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-black text-base text-white mr-2">{d.game_code}</span>
                        <span className="text-xs text-zinc-400">Close: {d.scheduled_close_time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          d.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {d.status}
                        </span>
                        <button
                          onClick={() => handleToggleDrawStatus(d.id, d.status)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
                        >
                          {d.status === 'OPEN' ? 'Manual Close' : 'Manual Open'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tomorrow's Draws */}
              <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Tomorrow's Draws (Next-Day Assignment)</h3>
                <div className="space-y-2.5">
                  {drawsOverview.tomorrow?.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-2xl bg-[#12141a] border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-black text-base text-white mr-2">{d.game_code}</span>
                        <span className="text-xs text-zinc-400">Date: {d.draw_date}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 uppercase tracking-wider">
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Agent Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create New Agent B</h3>
            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  value={newAgentUser}
                  onChange={(e) => setNewAgentUser(e.target.value)}
                  placeholder="e.g. agent_kerala"
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  value={newAgentPass}
                  onChange={(e) => setNewAgentPass(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Sales Commission (₹ per ticket)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newAgentComm}
                  onChange={(e) => setNewAgentComm(e.target.value)}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Reset Password: {resetModalUser.username}</h3>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
