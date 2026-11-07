import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft } from 'lucide-react';

interface DailyReportProps {
  isSubdealerSpecific?: boolean;
  onBack?: () => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  isSubdealerSpecific = false,
  onBack
}) => {
  const { selectedGame, gameMeta } = useGame();
  const { user } = useAuth();

  const [viewState, setViewState] = useState<'filter' | 'report'>('filter');

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
      setViewState('report');
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, allGames, selectedGame, dayTotal, isSubdealerSpecific, subDealerId]);

  const handleBack = () => {
    if (viewState === 'report') {
      setViewState('filter');
    } else if (onBack) {
      onBack();
    }
  };

  const themeBg = gameMeta.themeColor;
  const pageTitle = isSubdealerSpecific ? 'Sub Dealers Daily' : 'Daily Report';

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto">
      {/* Header */}
      <header
        className="px-4 py-3 text-white flex items-center justify-between sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: themeBg }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base tracking-wide">{pageTitle}</span>
        </div>
      </header>

      {/* State A: Filter */}
      {viewState === 'filter' && (
        <main className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                  FROM
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                  TO
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {isSubdealerSpecific && (
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                  Sub Dealer
                </label>
                <select
                  value={subDealerId}
                  onChange={(e) => setSubDealerId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
                >
                  <option value="">All Sub Dealers</option>
                  {subDealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-6 pt-1 text-xs text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allGames}
                  onChange={(e) => setAllGames(e.target.checked)}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-0"
                />
                <span>All Game</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dayTotal}
                  onChange={(e) => setDayTotal(e.target.checked)}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-0"
                />
                <span>Day Total</span>
              </label>
            </div>
          </div>

          <button
            onClick={fetchDailyReport}
            disabled={loading}
            className="w-full py-3 bg-[#ff0000] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded mt-8 shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'LOADING...' : 'SHOW REPORT'}
          </button>
        </main>
      )}

      {/* State B: Report Table */}
      {viewState === 'report' && (
        <main className="p-3 flex-1 overflow-x-auto pb-10">
          {!reportData || !reportData.days || reportData.days.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No records found for selected period
            </div>
          ) : (
            <table className="w-full text-center border border-gray-300 text-[10px] border-collapse">
              <thead>
                <tr className="bg-[#e4e6ea] text-gray-700 font-bold border-b border-gray-300 text-[9px]">
                  <th className="py-1.5 px-1 border-r border-gray-300 text-left pl-2">DATE</th>
                  <th className="py-1.5 px-1 border-r border-gray-300">GAME</th>
                  <th className="py-1.5 px-1 border-r border-gray-300">SALE</th>
                  <th className="py-1.5 px-1 border-r border-gray-300">WIN</th>
                  <th className="py-1.5 px-1 border-r border-gray-300">COMM</th>
                  <th className="py-1.5 px-1">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {reportData.days.map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-1.5 px-1 border-r border-gray-200 text-left pl-2 font-medium">
                      {row.date}
                    </td>
                    <td className="py-1.5 px-1 border-r border-gray-200">{row.game_code || selectedGame}</td>
                    <td className="py-1.5 px-1 border-r border-gray-200 font-mono">₹{row.sale_amount}</td>
                    <td className="py-1.5 px-1 border-r border-gray-200 font-mono">₹{row.win_amount}</td>
                    <td className="py-1.5 px-1 border-r border-gray-200 font-mono">₹{row.commission}</td>
                    <td className="py-1.5 px-1 font-mono font-bold">₹{row.net_balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      )}
    </div>
  );
};
