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
  X
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

  // Agents & Sub-dealers
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

      const allDraws = [...(data.today || []), ...(data.tomorrow || [])];
      const match = allDraws.find((d: any) => d.game_code === selectedResultGame && d.draw_date === selectedResultDate);
      if (match) {
        setCurrentDrawId(match.id);
      }
    } catch {}
  }, [selectedResultGame, selectedResultDate]);

  const fetchPrizes = useCallback(async () => {
    try {
      const data = await ApiClient.getPrizeConfig();
      if (data) {
        setPrizeConfig({
          superPrize: data.super_prize || 5000,
          boxPrize: data.box_prize || 3000,
          oneDigitPrize: data.one_digit_prize || 100,
          twoDigitPrize: data.two_digit_prize || 700,
          complementaryPrize: data.complementary_prize || 20
        });
      }
    } catch {}
  }, []);

  const fetchExistingResults = useCallback(async () => {
    try {
      const res = await ApiClient.getResults(selectedResultDate, selectedResultGame);
      const matched = res.results?.find((r: any) => r.game_code === selectedResultGame) || res.results?.[0];
      if (matched) {
        setFirstPrize(matched.first_prize || '');
        setSecondPrize(matched.second_prize || '');
        setThirdPrize(matched.third_prize || '');
        setFourthPrize(matched.fourth_prize || '');
        setFifthPrize(matched.fifth_prize || '');
        setCompNumbersStr(matched.complementary_numbers ? matched.complementary_numbers.join(', ') : '');
      } else {
        setFirstPrize('');
        setSecondPrize('');
        setThirdPrize('');
        setFourthPrize('');
        setFifthPrize('');
        setCompNumbersStr('');
      }
    } catch {
      setFirstPrize('');
      setSecondPrize('');
      setThirdPrize('');
      setFourthPrize('');
      setFifthPrize('');
      setCompNumbersStr('');
    }
  }, [selectedResultGame, selectedResultDate]);

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
    if (!window.confirm(`Delete ${u.role.toLowerCase()} "${u.username}"?`)) return;
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
      alert(isFinalPublish ? 'Results published successfully!' : 'Draft saved.');
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
      alert('Prize configuration updated');
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'results', label: 'Results', icon: Award },
    { id: 'prizes', label: 'Prizes', icon: DollarSign },
    { id: 'draws', label: 'Draws', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-800 flex flex-col">
      {/* Red Header */}
      <header className="bg-[#ff0000] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wide">Admin Console</span>
          <span className="text-xs text-white/80 font-mono">({user?.username})</span>
        </div>

        <button
          onClick={logout}
          className="text-xs font-bold text-white hover:text-gray-200 transition-colors uppercase tracking-wider flex items-center gap-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-1 overflow-x-auto py-2 text-xs font-semibold">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'bg-[#ff0000] text-white shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl w-full mx-auto p-4 flex-1">
        {/* 1. Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Overview</h2>
              <button
                onClick={fetchDashboardData}
                className="p-1.5 text-gray-500 hover:text-black transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Agents</span>
                <strong className="text-2xl font-mono text-black">{metrics.totalAgents}</strong>
              </div>
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Sub Dealers</span>
                <strong className="text-2xl font-mono text-black">{metrics.totalSubDealers}</strong>
              </div>
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Today Sale</span>
                <strong className="text-2xl font-mono text-green-600">₹{metrics.todaySale}</strong>
              </div>
              <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Today Winning</span>
                <strong className="text-2xl font-mono text-red-600">₹{metrics.todayWinning}</strong>
              </div>
            </div>
          </div>
        )}

        {/* 2. Agents */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Agents List</h2>
              <button
                onClick={() => setShowAgentModal(true)}
                className="px-3 py-1.5 bg-[#1976d2] text-white rounded text-xs font-semibold uppercase flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Agent</span>
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded overflow-x-auto shadow-sm">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px]">
                    <th className="py-2 px-3 text-left">Username</th>
                    <th className="py-2 px-3">Commission</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((ag) => (
                    <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-left font-medium">{ag.username}</td>
                      <td className="py-2 px-3 font-mono">₹{ag.sales_commission}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ag.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {ag.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResetModalUser(ag)}
                            className="text-gray-500 hover:text-black p-1"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(ag)}
                            className="text-gray-500 hover:text-red-600 p-1"
                            title="Delete"
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

            {/* Sub-dealers List */}
            <div className="pt-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Sub Dealers</h3>
              <div className="bg-white border border-gray-200 rounded overflow-x-auto shadow-sm">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px]">
                      <th className="py-2 px-3 text-left">Username</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subDealers.map((sd) => (
                      <tr key={sd.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-left font-medium">{sd.username}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            sd.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {sd.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(sd)}
                            className="text-gray-500 hover:text-red-600 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. Result Management */}
        {activeTab === 'results' && (
          <div className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Result Upload</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Game</label>
                <select
                  value={selectedResultGame}
                  onChange={(e) => setSelectedResultGame(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
                >
                  <option value="KL">KL</option>
                  <option value="DR1">DR 1</option>
                  <option value="DR6">DR 6</option>
                  <option value="DR8">DR 8</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedResultDate}
                  onChange={(e) => setSelectedResultDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">1st Price</label>
                <input
                  type="text"
                  maxLength={3}
                  value={firstPrize}
                  onChange={(e) => setFirstPrize(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5 text-center font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">2nd Price</label>
                <input
                  type="text"
                  maxLength={3}
                  value={secondPrize}
                  onChange={(e) => setSecondPrize(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5 text-center font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">3rd Price</label>
                <input
                  type="text"
                  maxLength={3}
                  value={thirdPrize}
                  onChange={(e) => setThirdPrize(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5 text-center font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">4th Price</label>
                <input
                  type="text"
                  maxLength={3}
                  value={fourthPrize}
                  onChange={(e) => setFourthPrize(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5 text-center font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">5th Price</label>
                <input
                  type="text"
                  maxLength={3}
                  value={fifthPrize}
                  onChange={(e) => setFifthPrize(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5 text-center font-mono font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Complementary Numbers (comma separated)
              </label>
              <textarea
                rows={3}
                value={compNumbersStr}
                onChange={(e) => setCompNumbersStr(e.target.value)}
                placeholder="004, 233, 650, 028, 248, 689..."
                className="w-full border border-gray-300 rounded p-2 text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handlePublishResults(false)}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold text-xs px-4 py-2 rounded uppercase"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handlePublishResults(true)}
                className="bg-[#ff0000] hover:bg-red-700 text-white font-semibold text-xs px-5 py-2 rounded uppercase"
              >
                Publish Results
              </button>
            </div>
          </div>
        )}

        {/* 4. Prize Configuration */}
        {activeTab === 'prizes' && (
          <form onSubmit={handleSavePrizes} className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Prize Amounts</h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1">SUPER Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.superPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, superPrize: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">BOX Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.boxPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, boxPrize: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Single Digit Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.oneDigitPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, oneDigitPrize: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Two Digit Prize (₹)</label>
                <input
                  type="number"
                  value={prizeConfig.twoDigitPrize}
                  onChange={(e) => setPrizeConfig({ ...prizeConfig, twoDigitPrize: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#1976d2] text-white font-semibold text-xs px-5 py-2 rounded uppercase tracking-wider"
            >
              SAVE
            </button>
          </form>
        )}

        {/* 5. Draw Management */}
        {activeTab === 'draws' && (
          <div className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Draw Schedule</h2>

            <div className="space-y-2">
              {[...(drawsOverview.today || []), ...(drawsOverview.tomorrow || [])].map((d: any) => (
                <div key={d.id} className="border border-gray-200 rounded p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-black font-semibold mr-2">{d.game_code}</strong>
                    <span className="text-gray-500 mr-2">{d.draw_date}</span>
                    <span className="text-gray-400 font-mono">({d.close_time})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.status}
                    </span>

                    <button
                      onClick={() => handleToggleDrawStatus(d.id, d.status)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[10px] font-bold uppercase"
                    >
                      {d.status === 'OPEN' ? 'Close' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create Agent */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-5 max-w-xs w-full shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase">Create Agent</h3>
              <button onClick={() => setShowAgentModal(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1">Username</label>
                <input
                  type="text"
                  value={newAgentUser}
                  onChange={(e) => setNewAgentUser(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  value={newAgentPass}
                  onChange={(e) => setNewAgentPass(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Commission (₹)</label>
                <input
                  type="text"
                  value={newAgentComm}
                  onChange={(e) => setNewAgentComm(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#ff0000] text-white font-bold uppercase rounded mt-2"
              >
                SAVE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-5 max-w-xs w-full shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">Reset Password</h3>
              <button onClick={() => setResetModalUser(null)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <p className="text-gray-600">User: <strong>{resetModalUser.username}</strong></p>
              <div>
                <label className="block text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#ff0000] text-white font-bold uppercase rounded mt-2"
              >
                SAVE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
