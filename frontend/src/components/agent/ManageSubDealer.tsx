import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import { Users, Plus, Edit2, Trash2, Power, Check, X, ShieldAlert } from 'lucide-react';

export const ManageSubDealer: React.FC = () => {
  const [subDealers, setSubDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubDealer, setEditingSubDealer] = useState<any | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [salesCommission, setSalesCommission] = useState('1.0');
  const [dc, setDc] = useState('50.0');
  const [saleLimit, setSaleLimit] = useState('50000');
  const [maxNumberCount, setMaxNumberCount] = useState('100');
  const [blockedNumbersStr, setBlockedNumbersStr] = useState('');
  const [allocGames, setAllocGames] = useState<string[]>(['DR1', 'KL', 'DR6', 'DR8']);
  const [permissions, setPermissions] = useState({
    can_book: true,
    can_view_reports: true,
    can_view_last_sale: true
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSubDealers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.listSubDealers();
      setSubDealers(res.subDealers || []);
    } catch {
      setSubDealers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubDealers();
  }, [fetchSubDealers]);

  const toggleAllocGame = (gameCode: string) => {
    if (allocGames.includes(gameCode)) {
      setAllocGames(allocGames.filter((g) => g !== gameCode));
    } else {
      setAllocGames([...allocGames, gameCode]);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setSalesCommission('1.0');
    setDc('50.0');
    setSaleLimit('50000');
    setMaxNumberCount('100');
    setBlockedNumbersStr('');
    setAllocGames(['DR1', 'KL', 'DR6', 'DR8']);
    setPermissions({ can_book: true, can_view_reports: true, can_view_last_sale: true });
    setFormError(null);
    setEditingSubDealer(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const blockedList = blockedNumbersStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingSubDealer) {
        // Edit existing subdealer
        await ApiClient.updateSubDealer(editingSubDealer.id, {
          permissions,
          allocatedGames: allocGames,
          dc: parseFloat(dc) || 0,
          maxNumberCount: parseInt(maxNumberCount) || 100,
          blockedNumbers: blockedList,
          saleLimit: parseFloat(saleLimit) || 50000,
          salesCommission: parseFloat(salesCommission) || 1.0
        });
      } else {
        // Create new subdealer
        if (!username.trim() || !password) {
          setFormError('Username and password are required');
          return;
        }
        await ApiClient.createSubDealer({
          username: username.trim(),
          password,
          permissions,
          allocatedGames: allocGames,
          dc: parseFloat(dc) || 0,
          maxNumberCount: parseInt(maxNumberCount) || 100,
          blockedNumbers: blockedList,
          saleLimit: parseFloat(saleLimit) || 50000,
          salesCommission: parseFloat(salesCommission) || 1.0
        });
      }

      setShowCreateModal(false);
      resetForm();
      fetchSubDealers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleToggleActive = async (dealer: any) => {
    try {
      await ApiClient.updateSubDealer(dealer.id, { isActive: !dealer.is_active });
      fetchSubDealers();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (dealer: any) => {
    if (!window.confirm(`Are you sure you want to delete sub-dealer "${dealer.username}"? Login access will be revoked immediately while preserving historical accounting.`)) {
      return;
    }
    try {
      await ApiClient.deleteSubDealer(dealer.id);
      fetchSubDealers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sub-dealer');
    }
  };

  const startEdit = (dealer: any) => {
    setEditingSubDealer(dealer);
    setUsername(dealer.username);
    setPassword('');
    setSalesCommission(String(dealer.sales_commission || '1.0'));
    setDc(String(dealer.winning_commission_dc || '50.0'));
    setSaleLimit(String(dealer.daily_sale_limit || '50000'));
    setMaxNumberCount(String(dealer.max_number_count || '100'));
    setBlockedNumbersStr((dealer.blocked_numbers || []).join(', '));
    setAllocGames(dealer.allocated_games || ['DR1', 'KL', 'DR6', 'DR8']);
    setPermissions(dealer.permissions || { can_book: true, can_view_reports: true, can_view_last_sale: true });
    setShowCreateModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Manage Sub Dealers</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Configure accounts, limits, game allocations, and commissions</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sub Dealer</span>
        </button>
      </div>

      {/* Sub Dealers Table */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Loading sub-dealers...</div>
      ) : subDealers.length === 0 ? (
        <div className="p-12 text-center bg-[#161820] rounded-3xl border border-zinc-800 text-zinc-500">
          No sub-dealers found. Click "Add Sub Dealer" to create one.
        </div>
      ) : (
        <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12141a] text-zinc-400 font-mono uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sales Comm</th>
                  <th className="py-3 px-4">DC</th>
                  <th className="py-3 px-4">Daily Limit</th>
                  <th className="py-3 px-4">Allocated Games</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {subDealers.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 text-zinc-300">
                    <td className="py-3 px-4 font-sans font-bold text-white text-sm">
                      {d.username}
                      {d.username === 'test' && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                          DEV TEST
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        d.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {d.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">₹{d.sales_commission}</td>
                    <td className="py-3 px-4 font-bold text-blue-400">₹{d.winning_commission_dc}</td>
                    <td className="py-3 px-4 text-white">₹{Number(d.daily_sale_limit).toLocaleString()}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex gap-1 flex-wrap">
                        {(d.allocated_games || []).map((g: string) => (
                          <span key={g} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(d)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(d)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            d.is_active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          }`}
                          title={d.is_active ? 'Deactivate (Immediate Session Invalidation)' : 'Activate'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
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
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingSubDealer ? `Edit Sub-dealer: ${editingSubDealer.username}` : 'Create New Sub-dealer'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-xs">
              {!editingSubDealer && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Username *</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. subdealer_c"
                      className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Password *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Commission and Pricing */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Sales Comm (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={salesCommission}
                    onChange={(e) => setSalesCommission(e.target.value)}
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">DC (Win Comm ₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={dc}
                    onChange={(e) => setDc(e.target.value)}
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Daily Limit (₹)</label>
                  <input
                    type="number"
                    value={saleLimit}
                    onChange={(e) => setSaleLimit(e.target.value)}
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Max Count / Num</label>
                  <input
                    type="number"
                    value={maxNumberCount}
                    onChange={(e) => setMaxNumberCount(e.target.value)}
                    className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white text-center font-mono"
                  />
                </div>
              </div>

              {/* Blocked Booking Numbers */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Block Booking Numbers (comma-separated, e.g. 786, 999)
                </label>
                <input
                  type="text"
                  value={blockedNumbersStr}
                  onChange={(e) => setBlockedNumbersStr(e.target.value)}
                  placeholder="e.g. 786, 000, 111"
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Game Allocation Checkboxes */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-2">Allocated Games</label>
                <div className="grid grid-cols-4 gap-2">
                  {['DR1', 'KL', 'DR6', 'DR8'].map((g) => {
                    const isAlloc = allocGames.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => toggleAllocGame(g)}
                        className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          isAlloc
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-800/40 border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {isAlloc ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <X className="w-3.5 h-3.5" />}
                        <span>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md"
                >
                  {editingSubDealer ? 'Save Changes' : 'Create Sub-dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
