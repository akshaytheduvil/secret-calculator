import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Award,
  DollarSign,
  Layers,
  KeyRound,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  X,
  Calendar,
  Edit2,
  ChevronLeft,
  Trophy,
  Percent,
  Tag,
  ToggleLeft
} from 'lucide-react';
import { TodayReport } from '../reports/TodayReport';

type AdminView =
  | 'home'
  | 'dashboard'
  | 'today'
  | 'agents'
  | 'results'
  | 'prizes'
  | 'draws'
  | 'set_dc_agent'
  | 'set_ticket_agent'
  | 'winning_report';

export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<AdminView>('home');

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

  // Edit Agent Modal
  const [editAgentModal, setEditAgentModal] = useState<any | null>(null);
  const [editComm, setEditComm] = useState('0.5');

  // Result Management
  const [selectedResultGame, setSelectedResultGame] = useState('KL');
  const [selectedResultDate, setSelectedResultDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [firstPrize, setFirstPrize] = useState('');
  const [secondPrize, setSecondPrize] = useState('');
  const [thirdPrize, setThirdPrize] = useState('');
  const [fourthPrize, setFourthPrize] = useState('');
  const [fifthPrize, setFifthPrize] = useState('');
  const [compNumbers, setCompNumbers] = useState<string[]>(Array(30).fill(''));
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

  // ── Set DC for Agent ──
  const [dcAgentSelected, setDcAgentSelected] = useState('');
  const [dcAgentGame, setDcAgentGame] = useState('KL');
  const [dcAgentTable, setDcAgentTable] = useState([
    { resultType: 'First Price', category: 'SUPER', dc: '400' },
    { resultType: 'First Price', category: 'BOX', dc: '240' },
    { resultType: 'First Price', category: '2 Digit', dc: '40' },
    { resultType: 'First Price', category: '1 Digit', dc: '20' },
    { resultType: 'Second Price', category: 'SUPER', dc: '40' },
    { resultType: 'Third Price', category: 'SUPER', dc: '20' },
    { resultType: 'Fourth Price', category: 'SUPER', dc: '20' },
    { resultType: 'Fifth Price', category: 'SUPER', dc: '20' },
    { resultType: 'Complementary', category: 'SUPER', dc: '0' }
  ]);

  // ── Set Ticket Price for Agent ──
  const [tpAgentSelected, setTpAgentSelected] = useState('');
  const [tpAgentGame, setTpAgentGame] = useState('KL');
  const [tpSingle, setTpSingle] = useState('12');
  const [tpDouble, setTpDouble] = useState('10');
  const [tpTriple, setTpTriple] = useState('10');

  // ── Winning Report ──
  const [wrAgentId, setWrAgentId] = useState('');
  const [wrDate, setWrDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wrGame, setWrGame] = useState('');
  const [wrRecords, setWrRecords] = useState<any[]>([]);
  const [wrLoading, setWrLoading] = useState(false);

  // ─── Fetch helpers ───
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
      if (match) setCurrentDrawId(match.id);
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
        const arr = Array(30).fill('');
        (matched.complementary_numbers || []).forEach((n: string, i: number) => { if (i < 30) arr[i] = n; });
        setCompNumbers([...arr]);
      } else {
        setFirstPrize(''); setSecondPrize(''); setThirdPrize('');
        setFourthPrize(''); setFifthPrize('');
        setCompNumbers(Array(30).fill(''));
      }
    } catch {
      setFirstPrize(''); setSecondPrize(''); setThirdPrize('');
      setFourthPrize(''); setFifthPrize('');
      setCompNumbers(Array(30).fill(''));
    }
  }, [selectedResultGame, selectedResultDate]);

  useEffect(() => {
    fetchDashboardData();
    fetchAgents();
    fetchDraws();
    fetchPrizes();
    const interval = setInterval(() => fetchDashboardData(), 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchAgents, fetchDraws, fetchPrizes]);

  useEffect(() => { fetchExistingResults(); }, [fetchExistingResults]);

  // ─── Handlers ───
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
      setNewAgentUser(''); setNewAgentPass('');
      fetchAgents(); fetchDashboardData();
    } catch (err: any) { alert(err.message || 'Failed to create agent'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    try {
      await ApiClient.resetAgentPassword(resetModalUser.id, newPassword);
      setResetModalUser(null); setNewPassword('');
      alert('Password reset successfully');
    } catch (err: any) { alert(err.message || 'Password reset failed'); }
  };

  const handleDeleteUser = async (u: any) => {
    if (!window.confirm(`Delete ${u.role.toLowerCase()} "${u.username}"?`)) return;
    try {
      await ApiClient.deleteUser(u.id);
      fetchAgents(); fetchDashboardData();
    } catch (err: any) { alert(err.message || 'Failed to delete user'); }
  };

  const handleSaveEditAgentComm = async () => {
    if (!editAgentModal) return;
    try {
      await ApiClient.updateAgent(editAgentModal.id, {
        salesCommission: parseFloat(editComm) || 0.5,
        isActive: editAgentModal.is_active
      });
      setEditAgentModal(null);
      fetchAgents();
      alert('Commission updated!');
    } catch (err: any) { alert(err.message || 'Failed to update'); }
  };

  const handlePublishResults = async (isFinalPublish: boolean) => {
    if (!currentDrawId) { alert('Draw record not found for selected date and game'); return; }
    const comps = compNumbers.filter(Boolean);
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
      fetchDraws(); fetchExistingResults();
    } catch (err: any) { alert(err.message || 'Failed to publish results'); }
  };

  const handleSavePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.updatePrizeConfig(prizeConfig);
      alert('Prize configuration updated');
    } catch (err: any) { alert(err.message || 'Failed to update prize config'); }
  };

  const handleToggleDrawStatus = async (drawId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await ApiClient.setManualDrawStatus(drawId, nextStatus);
      fetchDraws();
    } catch (err: any) { alert(err.message || 'Failed to update draw status'); }
  };

  // Set DC for Agent
  const handleDcAgentUserChange = (agId: string) => {
    setDcAgentSelected(agId);
    const ag = agents.find((a) => a.id === agId);
    if (ag?.winning_commission_dc != null) {
      const base = Number(ag.winning_commission_dc);
      setDcAgentTable([
        { resultType: 'First Price', category: 'SUPER', dc: String(base) },
        { resultType: 'First Price', category: 'BOX', dc: String(Math.round(base * 0.6)) },
        { resultType: 'First Price', category: '2 Digit', dc: String(Math.round(base * 0.1)) },
        { resultType: 'First Price', category: '1 Digit', dc: String(Math.round(base * 0.05)) },
        { resultType: 'Second Price', category: 'SUPER', dc: String(Math.round(base * 0.1)) },
        { resultType: 'Third Price', category: 'SUPER', dc: String(Math.round(base * 0.05)) },
        { resultType: 'Fourth Price', category: 'SUPER', dc: String(Math.round(base * 0.05)) },
        { resultType: 'Fifth Price', category: 'SUPER', dc: String(Math.round(base * 0.05)) },
        { resultType: 'Complementary', category: 'SUPER', dc: '0' }
      ]);
    }
  };

  const handleSaveDcAgent = async () => {
    if (!dcAgentSelected) { alert('Please select an agent'); return; }
    try {
      const superDC = Number(dcAgentTable[0]?.dc || 0);
      await ApiClient.updateSubDealer(dcAgentSelected, { dc: superDC });
      await fetchAgents();
      alert('DC saved for agent!');
    } catch (err: any) { alert(err.message || 'Failed to save DC'); }
  };

  // Set Ticket Price for Agent
  const handleTpAgentUserChange = (agId: string) => {
    setTpAgentSelected(agId);
    const ag = agents.find((a) => a.id === agId);
    if (ag?.custom_prices) {
      setTpSingle(String(ag.custom_prices.one_digit?.d ?? '12'));
      setTpDouble(String(ag.custom_prices.two_digit?.d ?? '10'));
      setTpTriple(String(ag.custom_prices.three_digit?.d ?? '10'));
    }
  };

  const handleSaveTpAgent = async () => {
    if (!tpAgentSelected) { alert('Please select an agent'); return; }
    const ag = agents.find((a) => a.id === tpAgentSelected);
    try {
      const existing = ag?.custom_prices || {};
      await ApiClient.updateSubDealer(tpAgentSelected, {
        customPrices: {
          three_digit: { c: existing.three_digit?.c ?? 10, d: Number(tpTriple) },
          two_digit: { c: existing.two_digit?.c ?? 10, d: Number(tpDouble) },
          one_digit: { c: existing.one_digit?.c ?? 12, d: Number(tpSingle) }
        }
      });
      await fetchAgents();
      alert('Ticket prices saved for agent!');
    } catch (err: any) { alert(err.message || 'Failed to save ticket prices'); }
  };

  // Winning Report
  const handleLoadWinningReport = async () => {
    setWrLoading(true);
    try {
      const params: Record<string, any> = { date: wrDate };
      if (wrAgentId) params.userId = wrAgentId;
      if (wrGame) params.gameCode = wrGame;
      const data = await ApiClient.getWinningReport(params);
      setWrRecords(data.records || data.winnings || data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load winning report');
    } finally {
      setWrLoading(false);
    }
  };

  // ─── HOME MENU items ───
  const menuItems: { id: AdminView; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers, color: 'bg-blue-600' },
    { id: 'today', label: "Today's Report", icon: Calendar, color: 'bg-teal-600' },
    { id: 'agents', label: 'Agents', icon: Users, color: 'bg-indigo-600' },
    { id: 'results', label: 'Result Upload', icon: Award, color: 'bg-orange-500' },
    { id: 'prizes', label: 'Prize Config', icon: DollarSign, color: 'bg-green-600' },
    { id: 'draws', label: 'Draw Control', icon: ToggleLeft, color: 'bg-purple-600' },
    { id: 'set_dc_agent', label: 'Set DC (Agent)', icon: Percent, color: 'bg-rose-500' },
    { id: 'set_ticket_agent', label: 'Set Ticket Price (Agent)', icon: Tag, color: 'bg-yellow-600' },
    { id: 'winning_report', label: 'Winning Report', icon: Trophy, color: 'bg-amber-500' }
  ];

  const viewTitle: Record<AdminView, string> = {
    home: 'Admin Console',
    dashboard: 'Dashboard',
    today: "Today's Report",
    agents: 'Agents',
    results: 'Result Upload',
    prizes: 'Prize Config',
    draws: 'Draw Control',
    set_dc_agent: 'Set DC — Agent',
    set_ticket_agent: 'Set Ticket Price — Agent',
    winning_report: 'Winning Report'
  };

  const selectedDcAgent = agents.find((a) => a.id === dcAgentSelected);
  const selectedTpAgent = agents.find((a) => a.id === tpAgentSelected);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-800 flex flex-col">
      {/* Red Header */}
      <header className="bg-[#ff0000] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          {view !== 'home' && (
            <button onClick={() => setView('home')} className="mr-1 text-white hover:text-gray-200">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-bold text-base tracking-wide">{viewTitle[view]}</span>
          {view === 'home' && <span className="text-xs text-white/80 font-medium">Welcome, {user?.username}</span>}
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold text-white hover:text-gray-200 transition-colors uppercase tracking-wider flex items-center gap-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT</span>
        </button>
      </header>

      <main className="max-w-4xl w-full mx-auto p-4 flex-1">

        {/* ── HOME SCREEN ── */}
        {view === 'home' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`${item.color} text-white rounded-xl p-5 flex flex-col items-center justify-center gap-3 shadow-sm active:scale-95 transition-transform`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="text-xs font-bold text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Overview</h2>
              <button onClick={fetchDashboardData} className="p-1.5 text-gray-500 hover:text-black transition-colors">
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

        {/* ── TODAY REPORT ── */}
        {view === 'today' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <TodayReport onBack={() => setView('home')} />
          </div>
        )}

        {/* ── AGENTS ── */}
        {view === 'agents' && (
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
                            onClick={() => { setEditAgentModal(ag); setEditComm(String(ag.sales_commission ?? '0.5')); }}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="Edit Commission"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
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

        {/* ── RESULTS ── */}
        {view === 'results' && (
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
              {[
                { label: '1st Price', val: firstPrize, set: setFirstPrize },
                { label: '2nd Price', val: secondPrize, set: setSecondPrize },
                { label: '3rd Price', val: thirdPrize, set: setThirdPrize },
                { label: '4th Price', val: fourthPrize, set: setFourthPrize },
                { label: '5th Price', val: fifthPrize, set: setFifthPrize }
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
                  <input
                    type="text" maxLength={3} value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-full border border-gray-300 rounded p-1.5 text-center font-mono font-bold text-xs"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Complementary Numbers (6–35) — 30 boxes
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {compNumbers.map((val, i) => (
                  <div key={i}>
                    <label className="block text-[9px] text-gray-400 text-center mb-0.5">{i + 6}</label>
                    <input
                      type="text" maxLength={3} value={val}
                      onChange={(e) => { const a = [...compNumbers]; a[i] = e.target.value; setCompNumbers(a); }}
                      className="w-full border border-gray-300 rounded p-1 text-center font-mono font-bold text-xs"
                      placeholder="---"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button" onClick={() => handlePublishResults(false)}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold text-xs px-4 py-2 rounded uppercase"
              >
                Save Draft
              </button>
              <button
                type="button" onClick={() => handlePublishResults(true)}
                className="bg-[#ff0000] hover:bg-red-700 text-white font-semibold text-xs px-5 py-2 rounded uppercase"
              >
                Publish Results
              </button>
            </div>
          </div>
        )}

        {/* ── PRIZE CONFIG ── */}
        {view === 'prizes' && (
          <form onSubmit={handleSavePrizes} className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Prize Amounts</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'SUPER Prize (₹)', key: 'superPrize' },
                { label: 'BOX Prize (₹)', key: 'boxPrize' },
                { label: 'Single Digit Prize (₹)', key: 'oneDigitPrize' },
                { label: 'Two Digit Prize (₹)', key: 'twoDigitPrize' }
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    value={(prizeConfig as any)[key]}
                    onChange={(e) => setPrizeConfig({ ...prizeConfig, [key]: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded p-1.5"
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="bg-[#1976d2] text-white font-semibold text-xs px-5 py-2 rounded uppercase tracking-wider">
              SAVE
            </button>
          </form>
        )}

        {/* ── DRAW CONTROL ── */}
        {view === 'draws' && (
          <div className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Draw Control</h2>
              <button onClick={fetchDraws} className="p-1.5 text-gray-500 hover:text-black">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['KL', 'DR1', 'DR6', 'DR8'] as const).map((game) => {
                const draw = [...(drawsOverview.today || []), ...(drawsOverview.tomorrow || [])].find((d: any) => d.game_code === game);
                const isOpen = draw?.status === 'OPEN';
                return (
                  <div key={game} className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-800">{game}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {draw ? (isOpen ? 'OPEN' : 'CLOSED') : 'N/A'}
                      </span>
                    </div>
                    {draw && (
                      <div className="text-[10px] text-gray-500 font-mono">{draw.draw_date} · {draw.close_time}</div>
                    )}
                    {draw && (
                      <button
                        onClick={() => handleToggleDrawStatus(draw.id, draw.status)}
                        className={`w-full py-1.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                          isOpen
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {isOpen ? 'Close Draw' : 'Open Draw'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SET DC FOR AGENT ── */}
        {view === 'set_dc_agent' && (
          <div className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase">Set DC — Agent</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Select Agent</label>
              <select
                value={dcAgentSelected}
                onChange={(e) => handleDcAgentUserChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="">Please select</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.username}</option>
                ))}
              </select>
            </div>

            {selectedDcAgent && (
              <div className="bg-blue-50 rounded p-2 text-[10px] text-blue-700">
                Current DC (SUPER): ₹{selectedDcAgent.winning_commission_dc ?? 0}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={dcAgentGame}
                onChange={(e) => setDcAgentGame(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="KL">KL</option>
                <option value="DR1">DR 1</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Set DC Values</h3>
              <table className="w-full text-center border border-gray-300 text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                    <th className="py-1 px-1 border-r border-gray-300 text-left pl-2">Result Type</th>
                    <th className="py-1 px-1 border-r border-gray-300">Category</th>
                    <th className="py-1 px-1">DC (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {dcAgentTable.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-1 px-1 border-r border-gray-200 text-left pl-2">{row.resultType}</td>
                      <td className="py-1 px-1 border-r border-gray-200">{row.category}</td>
                      <td className="py-1 px-1">
                        <input
                          type="number" step="0.01" value={row.dc}
                          onChange={(e) => {
                            const updated = [...dcAgentTable];
                            updated[idx] = { ...updated[idx], dc: e.target.value };
                            setDcAgentTable(updated);
                          }}
                          className="w-16 text-center border border-gray-200 rounded py-0.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[9px] text-gray-400 mt-1">* First Price SUPER DC is saved as the main DC for this agent</p>
            </div>

            <button
              onClick={handleSaveDcAgent}
              className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded uppercase tracking-wider"
            >
              SAVE DC
            </button>
          </div>
        )}

        {/* ── SET TICKET PRICE FOR AGENT ── */}
        {view === 'set_ticket_agent' && (
          <div className="bg-white border border-gray-200 rounded p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase">Set Ticket Price — Agent</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Select Agent</label>
              <select
                value={tpAgentSelected}
                onChange={(e) => handleTpAgentUserChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="">Please select</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.username}</option>
                ))}
              </select>
            </div>

            {selectedTpAgent && selectedTpAgent.custom_prices && (
              <div className="bg-blue-50 rounded p-2 text-[10px] text-blue-700">
                Current: 3-digit ₹{selectedTpAgent.custom_prices.three_digit?.d} | 2-digit ₹{selectedTpAgent.custom_prices.two_digit?.d} | 1-digit ₹{selectedTpAgent.custom_prices.one_digit?.d}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={tpAgentGame}
                onChange={(e) => setTpAgentGame(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="KL">KL</option>
                <option value="DR1">DR 1</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">1 Digit (A/B/C) D-Price (₹)</label>
                <input type="number" step="0.01" value={tpSingle}
                  onChange={(e) => setTpSingle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">2 Digit (AB/BC/AC) D-Price (₹)</label>
                <input type="number" step="0.01" value={tpDouble}
                  onChange={(e) => setTpDouble(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">3 Digit (SUPER/BOX) D-Price (₹)</label>
                <input type="number" step="0.01" value={tpTriple}
                  onChange={(e) => setTpTriple(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black" />
              </div>
            </div>

            <button
              onClick={handleSaveTpAgent}
              className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded uppercase tracking-wider"
            >
              SAVE PRICES
            </button>
          </div>
        )}

        {/* ── WINNING REPORT ── */}
        {view === 'winning_report' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded p-4 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 uppercase">Winning Report</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date" value={wrDate}
                    onChange={(e) => setWrDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Game (optional)</label>
                  <select
                    value={wrGame}
                    onChange={(e) => setWrGame(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
                  >
                    <option value="">All Games</option>
                    <option value="KL">KL</option>
                    <option value="DR1">DR 1</option>
                    <option value="DR6">DR 6</option>
                    <option value="DR8">DR 8</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Agent (optional)</label>
                <select
                  value={wrAgentId}
                  onChange={(e) => setWrAgentId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
                >
                  <option value="">All Agents</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.username}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleLoadWinningReport}
                disabled={wrLoading}
                className="bg-[#ff0000] hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-xs px-5 py-2 rounded uppercase tracking-wider"
              >
                {wrLoading ? 'Loading...' : 'Load Report'}
              </button>
            </div>

            {wrRecords.length > 0 && (
              <div className="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
                <table className="w-full text-center border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[10px]">
                      <th className="py-2 px-2 text-left">Bill#</th>
                      <th className="py-2 px-2">Game</th>
                      <th className="py-2 px-2">Number</th>
                      <th className="py-2 px-2">Category</th>
                      <th className="py-2 px-2">Prize (₹)</th>
                      <th className="py-2 px-2">DC (₹)</th>
                      <th className="py-2 px-2">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wrRecords.map((r: any, i: number) => {
                      const prize = Number(r.prize_amount || 0);
                      const dc = Number(r.dealer_commission || 0);
                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-left font-mono text-gray-700">{r.bill_number || r.bill_id || '—'}</td>
                          <td className="py-1.5 px-2">{r.game_code || '—'}</td>
                          <td className="py-1.5 px-2 font-mono font-bold">{r.matched_number || '—'}</td>
                          <td className="py-1.5 px-2 text-[10px]">{r.winning_category || r.lsk_category || '—'}</td>
                          <td className="py-1.5 px-2 font-mono text-green-700 font-bold">₹{prize}</td>
                          <td className="py-1.5 px-2 font-mono text-blue-700">₹{dc}</td>
                          <td className="py-1.5 px-2 font-mono font-bold text-gray-900">₹{prize + dc}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-300 font-bold text-xs">
                      <td colSpan={4} className="py-2 px-2 text-left text-gray-600">TOTAL</td>
                      <td className="py-2 px-2 font-mono text-green-700">
                        ₹{wrRecords.reduce((s: number, r: any) => s + Number(r.prize_amount || 0), 0)}
                      </td>
                      <td className="py-2 px-2 font-mono text-blue-700">
                        ₹{wrRecords.reduce((s: number, r: any) => s + Number(r.dealer_commission || 0), 0)}
                      </td>
                      <td className="py-2 px-2 font-mono text-gray-900">
                        ₹{wrRecords.reduce((s: number, r: any) => s + Number(r.prize_amount || 0) + Number(r.dealer_commission || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!wrLoading && wrRecords.length === 0 && (
              <div className="bg-white border border-gray-200 rounded p-6 text-center text-xs text-gray-400 shadow-sm">
                No winning records found. Click Load Report to fetch data.
              </div>
            )}
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
                <input type="text" value={newAgentUser} onChange={(e) => setNewAgentUser(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Password</label>
                <input type="password" value={newAgentPass} onChange={(e) => setNewAgentPass(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Commission (₹ per ticket)</label>
                <input type="text" value={newAgentComm} onChange={(e) => setNewAgentComm(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5" />
              </div>
              <button type="submit" className="w-full py-2 bg-[#ff0000] text-white font-bold uppercase rounded mt-2">
                SAVE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Agent Commission */}
      {editAgentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-5 max-w-xs w-full shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase">Edit Commission</h3>
              <button onClick={() => setEditAgentModal(null)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Agent: <strong>{editAgentModal.username}</strong></p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1">Commission (₹ per ticket)</label>
                <input type="text" value={editComm} onChange={(e) => setEditComm(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5" />
              </div>
              <button
                onClick={handleSaveEditAgentComm}
                className="w-full py-2 bg-[#ff0000] text-white font-bold uppercase rounded mt-2"
              >
                SAVE
              </button>
            </div>
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
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded p-1.5" />
              </div>
              <button type="submit" className="w-full py-2 bg-[#ff0000] text-white font-bold uppercase rounded mt-2">
                SAVE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
