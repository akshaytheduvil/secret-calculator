import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { Calendar, Search } from 'lucide-react';

interface DailyReportProps {
  isSubdealerSpecific?: boolean; // When Agent B is accessing Sub-dealers Daily Report
}

export const DailyReport: React.FC<DailyReportProps> = ({ isSubdealerSpecific = false }) => {
  const { selectedGame, gameMeta } = useGame();
  const { user } = useAuth();

  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [allGames, setAllGames] = useState(false);
  const [dayTotal, setDayTotal] = useState(false);
  const [subDealerId, setSubDealerId] = useState('');
  const [subDealers, setSubDealers] = useState<any[]>([]);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSubdealerSpecific && (user?.role === 'AGENT' || user?.role === 'ADMIN')) {
      ApiClient.listSubDealers()
        .then((res) => setSubDealers(res.subDealers || []))
        .catch(() => {});
    }
  }, [isSubdealerSpecific, user]);

  const fetchDailyReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getDailyReport({
        fromDate,
        toDate,
        allGames,
        gameCode: selectedGame,
        dayTotal,
        subDealerId: isSubdealerSpecific ? subDealerId : undefined
      });
      setReportData(res);
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, allGames, selectedGame, dayTotal, isSubdealerSpecific, subDealerId]);

  useEffect(() => {
    fetchDailyReport();
  }, [fetchDailyReport]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="pb-3 border-b border-zinc-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: gameMeta.themeColor }} />
          <span>{isSubdealerSpecific ? 'Sub-dealers Daily Report' : 'Daily Report'}</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">Turnover, winnings, and financial balance (Bal = Win − Sale)</p>
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

          {/* Sub-dealer dropdown for Agent B Sub-dealers Daily Report */}
          {isSubdealerSpecific && (
            <div>
              <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Select Sub-dealer</label>
              <select
                value={subDealerId}
                onChange={(e) => setSubDealerId(e.target.value)}
                className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">All Sub-dealers</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.id}>{d.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allGames}
                onChange={(e) => setAllGames(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-600 focus:ring-emerald-500"
              />
              <span className="text-zinc-300 font-medium">All Games</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dayTotal}
                onChange={(e) => setDayTotal(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-600 focus:ring-emerald-500"
              />
              <span className="text-zinc-300 font-medium">Day Total</span>
            </label>
          </div>

          <button
            onClick={fetchDailyReport}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-400">Loading daily ledger...</div>
      ) : !reportData ? (
        <div className="p-12 text-center text-zinc-500 bg-[#161820] rounded-3xl border border-zinc-800">
          No daily records found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Table */}
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#12141a] border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Summary Table</h3>
              <div className="text-xs font-mono">
                <span className="text-zinc-400 mr-3">Sale: <strong className="text-white">₹{reportData.totals?.totalSale}</strong></span>
                <span className="text-zinc-400 mr-3">Win: <strong className="text-amber-400">₹{reportData.totals?.totalWin}</strong></span>
                <span className="text-zinc-400">Bal: <strong className={reportData.totals?.totalBal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  ₹{reportData.totals?.totalBal}
                </strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#14161d] text-zinc-400 uppercase border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Dealer</th>
                    <th className="py-2.5 px-4">Game</th>
                    <th className="py-2.5 px-4 text-right">Sale</th>
                    <th className="py-2.5 px-4 text-right">Win</th>
                    <th className="py-2.5 px-4 text-right">Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {reportData.summary?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 text-zinc-300">
                      <td className="py-2.5 px-4 font-sans text-white font-medium">{row.dealer}</td>
                      <td className="py-2.5 px-4 font-bold">{row.game}</td>
                      <td className="py-2.5 px-4 text-right text-white">₹{Number(row.sale).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right text-amber-400">₹{Number(row.win).toLocaleString()}</td>
                      <td className={`py-2.5 px-4 text-right font-black ${Number(row.bal) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{Number(row.bal).toLocaleString()}
                      </td>
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
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Dealer</th>
                    <th className="py-2.5 px-4">Game</th>
                    <th className="py-2.5 px-4 text-right">Sale</th>
                    <th className="py-2.5 px-4 text-right">Win</th>
                    <th className="py-2.5 px-4 text-right">Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {reportData.detailed?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 text-zinc-300">
                      <td className="py-2.5 px-4 text-zinc-400">{row.date}</td>
                      <td className="py-2.5 px-4 font-sans text-white font-medium">{row.dealer}</td>
                      <td className="py-2.5 px-4 font-bold">{row.game}</td>
                      <td className="py-2.5 px-4 text-right text-white">₹{Number(row.sale).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right text-amber-400">₹{Number(row.win).toLocaleString()}</td>
                      <td className={`py-2.5 px-4 text-right font-black ${Number(row.bal) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{Number(row.bal).toLocaleString()}
                      </td>
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
