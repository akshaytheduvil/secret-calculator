import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { Trophy, Search } from 'lucide-react';

export const WinningReport: React.FC = () => {
  const { selectedGame } = useGame();
  const { user } = useAuth();

  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lsk, setLsk] = useState('ALL');
  const [allGame, setAllGame] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [subDealers, setSubDealers] = useState<any[]>([]);

  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalPrize: number; totalDC: number }>({ totalPrize: 0, totalDC: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
      ApiClient.listSubDealers()
        .then((res) => setSubDealers(res.subDealers || []))
        .catch(() => {});
    }
  }, [user]);

  const fetchWinningReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getWinningReport({
        fromDate,
        toDate,
        lsk,
        allGame,
        gameCode: selectedGame,
        dealerId: selectedDealerId || undefined
      });
      setRecords(res.records || []);
      setSummary(res.summary || { totalPrize: 0, totalDC: 0 });
    } catch {
      setRecords([]);
      setSummary({ totalPrize: 0, totalDC: 0 });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lsk, allGame, selectedGame, selectedDealerId]);

  useEffect(() => {
    fetchWinningReport();
  }, [fetchWinningReport]);

  const lskOptions = [
    'ALL',
    'LSK A',
    'LSK B',
    'LSK C',
    'LSK AB',
    'LSK BC',
    'LSK AC',
    'LSK SUPER',
    'LSK BOX'
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="pb-3 border-b border-zinc-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Winning Report</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">Automated winning claims and dealer commissions (DC)</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">LSK</label>
            <select
              value={lsk}
              onChange={(e) => setLsk(e.target.value)}
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {lskOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
            <div>
              <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Dealer</label>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">All Dealers</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.id}>{d.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allGame}
              onChange={(e) => setAllGame(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-600 focus:ring-emerald-500"
            />
            <span className="text-zinc-300 font-medium">All Game</span>
          </label>

          <button
            onClick={fetchWinningReport}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Show Report</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#161820] border border-zinc-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs text-zinc-400 block uppercase tracking-wider font-semibold">Total Winning Prize</span>
          <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">₹{summary.totalPrize.toLocaleString()}</span>
        </div>
        <div className="bg-[#161820] border border-zinc-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs text-zinc-400 block uppercase tracking-wider font-semibold">Total Dealer Commission (DC)</span>
          <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400">₹{summary.totalDC.toLocaleString()}</span>
        </div>
      </div>

      {/* Report Table */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Loading winning claims...</div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center bg-[#161820] rounded-3xl border border-zinc-800 text-zinc-500">
          No winning records found for selected period
        </div>
      ) : (
        <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12141a] text-zinc-400 font-mono uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Game</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Winning No.</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Count</th>
                  <th className="py-3 px-3">Dealer</th>
                  <th className="py-3 px-3">Bill No.</th>
                  <th className="py-3 px-3 text-right">Prize Amount</th>
                  <th className="py-3 px-3 text-right">DC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-800/30 text-zinc-300">
                    <td className="py-2.5 px-3 text-zinc-400">{r.date}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{r.game}</td>
                    <td className="py-2.5 px-3 font-sans text-zinc-200">{r.customer_name}</td>
                    <td className="py-2.5 px-3 font-black text-amber-400 text-sm">{r.winning_number}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                        {r.lsk_category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{r.count}</td>
                    <td className="py-2.5 px-3 font-sans text-zinc-400">{r.dealer}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{r.bill_number}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                      ₹{Number(r.winning_prize_amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                      ₹{Number(r.dc).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
