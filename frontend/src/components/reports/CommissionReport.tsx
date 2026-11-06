import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { DollarSign, Search } from 'lucide-react';

export const CommissionReport: React.FC = () => {
  const { selectedGame } = useGame();
  const { user } = useAuth();

  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lsk, setLsk] = useState('ALL');
  const [game, setGame] = useState(selectedGame);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [subDealers, setSubDealers] = useState<any[]>([]);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
      ApiClient.listSubDealers()
        .then((res) => setSubDealers(res.subDealers || []))
        .catch(() => {});
    }
  }, [user]);

  const fetchCommissionReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getCommissionReport({
        fromDate,
        toDate,
        lsk,
        gameCode: game,
        dealerId: selectedDealerId || undefined
      });
      setReportData(res);
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lsk, game, selectedDealerId]);

  useEffect(() => {
    fetchCommissionReport();
  }, [fetchCommissionReport]);

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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="pb-3 border-b border-zinc-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <span>My Commission</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Sales Commission (S COM) + Winning Commission (WIN C / DC) = TOTAL
        </p>
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

          <div>
            <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Game</label>
            <select
              value={game}
              onChange={(e) => setGame(e.target.value as any)}
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="ALL">ALL Games</option>
              <option value="DR1">DR1</option>
              <option value="KL">KL</option>
              <option value="DR6">DR6</option>
              <option value="DR8">DR8</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          {(user?.role === 'AGENT' || user?.role === 'ADMIN') ? (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Sub-dealer:</span>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="bg-[#1e2029] border border-zinc-700/80 rounded-xl py-1.5 px-3 text-white text-xs"
              >
                <option value="">All My Sub-dealers</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.id}>{d.username}</option>
                ))}
              </select>
            </div>
          ) : <div />}

          <button
            onClick={fetchCommissionReport}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Show Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-400">Calculating commissions...</div>
      ) : !reportData ? (
        <div className="p-12 text-center text-zinc-500 bg-[#161820] rounded-3xl border border-zinc-800">
          No commission records found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Table */}
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#12141a] border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Summary Table</h3>
              <div className="text-xs font-mono">
                <span className="text-zinc-400 mr-3">TOT CNT: <strong className="text-white">{reportData.totals?.totalCnt}</strong></span>
                <span className="text-zinc-400 mr-3">S COM: <strong className="text-emerald-400">₹{reportData.totals?.totalSCom}</strong></span>
                <span className="text-zinc-400 mr-3">WIN C: <strong className="text-blue-400">₹{reportData.totals?.totalWinC}</strong></span>
                <span className="text-zinc-400">TOTAL: <strong className="text-amber-400 text-sm">₹{reportData.totals?.netTotal}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#14161d] text-zinc-400 uppercase border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Sub Dealer</th>
                    <th className="py-2.5 px-4">Game</th>
                    <th className="py-2.5 px-4 text-right">TOT CNT</th>
                    <th className="py-2.5 px-4 text-right">S COM</th>
                    <th className="py-2.5 px-4 text-right">WIN C</th>
                    <th className="py-2.5 px-4 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {reportData.summary?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 text-zinc-300">
                      <td className="py-2.5 px-4 font-sans text-white font-medium">{row.sub_dealer}</td>
                      <td className="py-2.5 px-4 font-bold">{row.game}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">{row.tot_cnt}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">₹{Number(row.s_com).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right text-blue-400 font-bold">₹{Number(row.win_c).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-black text-amber-400">₹{Number(row.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#12141a] border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Detailed Table</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#14161d] text-zinc-400 uppercase border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Sub Dealer</th>
                    <th className="py-2.5 px-4">GAME</th>
                    <th className="py-2.5 px-4">DATE</th>
                    <th className="py-2.5 px-4 text-right">TOT CNT</th>
                    <th className="py-2.5 px-4 text-right">SALE C</th>
                    <th className="py-2.5 px-4 text-right">WIN C</th>
                    <th className="py-2.5 px-4 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {reportData.detailed?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 text-zinc-300">
                      <td className="py-2.5 px-4 font-sans text-white font-medium">{row.sub_dealer}</td>
                      <td className="py-2.5 px-4 font-bold">{row.game}</td>
                      <td className="py-2.5 px-4 text-zinc-400">{row.date}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">{row.tot_cnt}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">₹{Number(row.sale_c).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right text-blue-400 font-bold">₹{Number(row.win_c).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-black text-amber-400">₹{Number(row.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
