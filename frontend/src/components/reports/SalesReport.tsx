import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { Layers, ChevronDown, ChevronUp, Search } from 'lucide-react';

export const SalesReport: React.FC = () => {
  const { selectedGame, gameMeta } = useGame();
  const { user } = useAuth();

  // Filters
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lsk, setLsk] = useState('ALL');
  const [allGame, setAllGame] = useState(false);
  const [fullView, setFullView] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [subDealers, setSubDealers] = useState<any[]>([]);

  // Data
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedBills, setExpandedBills] = useState<Record<string, boolean>>({});

  // Fetch subordinates if Agent B or Admin A
  useEffect(() => {
    if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
      ApiClient.listSubDealers()
        .then((res) => setSubDealers(res.subDealers || []))
        .catch(() => {});
    }
  }, [user]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getSalesReport({
        fromDate,
        toDate,
        lsk,
        allGame,
        gameCode: selectedGame,
        fullView,
        dealerId: selectedDealerId || undefined
      });
      setReportData(res);
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lsk, allGame, selectedGame, fullView, selectedDealerId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleExpand = (billId: string) => {
    setExpandedBills((prev) => ({ ...prev, [billId]: !prev[billId] }));
  };

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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="pb-3 border-b border-zinc-800">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Layers className="w-5 h-5" style={{ color: gameMeta.themeColor }} />
          <span>Sales Report</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">Filter sales by date range, category, and view modes</p>
      </div>

      {/* Filter Controls Card */}
      <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* LSK Mode */}
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

          {/* Dealer Selector for B & A */}
          {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
            <div>
              <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">My Sales / Dealer</label>
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

        {/* Checkbox Toggles & Submit */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allGame}
                onChange={(e) => setAllGame(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-600 focus:ring-emerald-500"
              />
              <span className="text-zinc-300 font-medium">All Game</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fullView}
                onChange={(e) => setFullView(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-600 focus:ring-emerald-500"
              />
              <span className="text-zinc-300 font-medium">Full View</span>
            </label>
          </div>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Show Report</span>
          </button>
        </div>
      </div>

      {/* Report Display */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Loading report...</div>
      ) : !reportData || !reportData.records || reportData.records.length === 0 ? (
        <div className="p-12 text-center bg-[#161820] rounded-3xl border border-zinc-800 text-zinc-500">
          No sales records found for selected filters
        </div>
      ) : fullView ? (
        /* Full View ON: Detailed records */
        <div className="bg-[#161820] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12141a] text-zinc-400 font-mono uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Booking Number</th>
                  <th className="py-3 px-4">LSK Category</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">Count</th>
                  <th className="py-3 px-4">Dealer</th>
                  <th className="py-3 px-4">Bill Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {reportData.records.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 text-zinc-300">
                    <td className="py-2.5 px-4 font-mono font-bold text-white text-sm">{r.booked_number}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                        {r.lsk_category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">{r.game_code}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-white">{r.count}</td>
                    <td className="py-2.5 px-4 text-zinc-400">{r.dealer}</td>
                    <td className="py-2.5 px-4 font-mono text-amber-400">{r.bill_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Full View OFF: Compact bill summary */
        <div className="space-y-3">
          {reportData.records.map((bill: any) => {
            const isExpanded = expandedBills[bill.id];
            return (
              <div
                key={bill.id}
                className="bg-[#161820] border border-zinc-800 rounded-2xl p-4 shadow-lg cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => toggleExpand(bill.id)}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400 text-sm">{bill.bill_number}</span>
                    <span className="text-zinc-400 font-medium">({bill.customer_name})</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">
                      {bill.game_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-400">
                      Total Count: <strong className="text-white font-mono">{bill.total_count}</strong>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-400 mb-2">
                      <div>Draw Date: <strong className="text-white">{bill.draw_date}</strong></div>
                      <div>Dealer: <strong className="text-white">{bill.dealer}</strong></div>
                      <div>Status: <strong className="text-emerald-400">{bill.status}</strong></div>
                    </div>
                    <div className="bg-[#12141a] rounded-xl p-2.5 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800 pb-1">
                            <th className="py-1">Number</th>
                            <th className="py-1">Category</th>
                            <th className="py-1 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {bill.items?.map((item: any, iIdx: number) => (
                            <tr key={iIdx}>
                              <td className="py-1 font-mono font-bold text-white">{item.bookedNumber}</td>
                              <td className="py-1 text-zinc-400">{item.lskCategory}</td>
                              <td className="py-1 text-right font-mono font-semibold text-white">{item.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
