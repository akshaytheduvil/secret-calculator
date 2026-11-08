import React, { useState, useCallback } from 'react';
import { useGame, GameCode } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft } from 'lucide-react';

interface CommissionReportProps {
  onBack?: () => void;
}

export const CommissionReport: React.FC<CommissionReportProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const { user } = useAuth();

  // View state: 'filter' | 'report'
  const [viewState, setViewState] = useState<'filter' | 'report'>('filter');

  // Filters
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lsk, setLsk] = useState('ALL');
  const [gameFilter, setGameFilter] = useState<string>(selectedGame);

  // Data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCommission = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getCommissionReport({
        fromDate,
        toDate,
        gameCode: (gameFilter as GameCode) || undefined
      });
      setData(res);
      setViewState('report');
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, gameFilter]);

  const handleBack = () => {
    if (viewState === 'report') {
      setViewState('filter');
    } else if (onBack) {
      onBack();
    }
  };

  const lskOptions = ['ALL', 'SUPER', 'BOX', 'AB', 'BC', 'AC', 'A', 'B', 'C'];
  const gameOptions = ['DR 1', 'KL', 'DR 6', 'DR 8'];
  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto">
      {/* Header matching PDF 2 Page 6 */}
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
          <span className="font-bold text-base tracking-wide">My Commission</span>
        </div>
      </header>

      {/* State A: Filter View (PDF 2 Page 6 Top) */}
      {viewState === 'filter' && (
        <main className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {/* FROM & TO */}
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

            {/* LSK */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                LSK
              </label>
              <select
                value={lsk}
                onChange={(e) => setLsk(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
              >
                {lskOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* GAME */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                GAME
              </label>
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
              >
                {gameOptions.map((g) => (
                  <option key={g} value={g.replace(/\s+/g, '')}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Red SHOW REPORT Button */}
          <button
            onClick={fetchCommission}
            disabled={loading}
            className="w-full py-3 bg-[#ff0000] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded mt-8 shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'LOADING...' : 'SHOW REPORT'}
          </button>
        </main>
      )}

      {/* State B: Report View (PDF 2 Page 6 Bottom) */}
      {viewState === 'report' && (
        <main className="p-3 flex-1 overflow-x-auto space-y-4">
          {/* SUMMARY Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-800 mb-1 tracking-wider uppercase">
              SUMMARY
            </h3>
            <table className="w-full text-center border border-gray-300 text-[10px] border-collapse">
              <thead>
                <tr className="bg-[#e4e6ea] text-gray-700 font-bold border-b border-gray-300 text-[9px]">
                  <th className="py-1 px-1 border-r border-gray-300 text-left pl-2">Sub Dealer</th>
                  <th className="py-1 px-1 border-r border-gray-300">GAME</th>
                  <th className="py-1 px-1 border-r border-gray-300">TOT CNT</th>
                  <th className="py-1 px-1 border-r border-gray-300">S COM</th>
                  <th className="py-1 px-1 border-r border-gray-300">WIN C</th>
                  <th className="py-1 px-1">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {!data?.summary || data.summary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-400 text-xs">
                      No commission summary available
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.summary.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-1 px-1 border-r border-gray-200 text-left pl-2 font-medium">
                          {row.sub_dealer || user?.username}
                        </td>
                        <td className="py-1 px-1 border-r border-gray-200">{row.game}</td>
                        <td className="py-1 px-1 border-r border-gray-200 font-mono">
                          {row.tot_cnt}
                        </td>
                        <td className="py-1 px-1 border-r border-gray-200 font-mono">
                          ₹{Number(row.s_com).toFixed(2)}
                        </td>
                        <td className="py-1 px-1 border-r border-gray-200 font-mono">
                          ₹{Number(row.win_c).toFixed(2)}
                        </td>
                        <td className="py-1 px-1 font-mono font-bold">
                          ₹{Number(row.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-1 px-1 border-r border-gray-200 text-left pl-2">Total</td>
                      <td className="py-1 px-1 border-r border-gray-200"></td>
                      <td className="py-1 px-1 border-r border-gray-200 font-mono">
                        {data?.totals?.totalCnt ?? 0}
                      </td>
                      <td className="py-1 px-1 border-r border-gray-200 font-mono">
                        ₹{(data?.totals?.totalSCom ?? 0).toFixed(2)}
                      </td>
                      <td className="py-1 px-1 border-r border-gray-200 font-mono">
                        ₹{(data?.totals?.totalWinC ?? 0).toFixed(2)}
                      </td>
                      <td className="py-1 px-1 font-mono">
                        ₹{(data?.totals?.netTotal ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* DETAILED Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-800 mb-1 tracking-wider uppercase">
              DETAILED
            </h3>
            <table className="w-full text-center border border-gray-300 text-[10px] border-collapse">
              <thead>
                <tr className="bg-[#e4e6ea] text-gray-700 font-bold border-b border-gray-300 text-[9px]">
                  <th className="py-1 px-1 border-r border-gray-300 text-left pl-2">Sub Dealer</th>
                  <th className="py-1 px-1 border-r border-gray-300">GAME</th>
                  <th className="py-1 px-1 border-r border-gray-300">DATE</th>
                  <th className="py-1 px-1 border-r border-gray-300">TOT CNT</th>
                  <th className="py-1 px-1 border-r border-gray-300">SALE C</th>
                  <th className="py-1 px-1 border-r border-gray-300">WIN C</th>
                  <th className="py-1 px-1">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {!data?.detailed || data.detailed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400 text-xs">
                      No detailed commission records found
                    </td>
                  </tr>
                ) : (
                  data.detailed.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-1 px-1 border-r border-gray-200 text-left pl-2 font-medium">
                        {row.sub_dealer || user?.username}
                      </td>
                      <td className="py-1 px-1 border-r border-gray-200">{row.game}</td>
                      <td className="py-1 px-1 border-r border-gray-200">{row.date}</td>
                      <td className="py-1 px-1 border-r border-gray-200 font-mono">{row.tot_cnt}</td>
                      <td className="py-1 px-1 border-r border-gray-200 font-mono">₹{Number(row.sale_c).toFixed(2)}</td>
                      <td className="py-1 px-1 border-r border-gray-200 font-mono">₹{Number(row.win_c).toFixed(2)}</td>
                      <td className="py-1 px-1 font-mono font-bold">₹{Number(row.total).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}
    </div>
  );
};
