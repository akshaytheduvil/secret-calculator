import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft } from 'lucide-react';

interface WinningReportProps {
  onBack?: () => void;
}

export const WinningReport: React.FC<WinningReportProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const { user } = useAuth();

  // View state: 'filter' | 'report'
  const [viewState, setViewState] = useState<'filter' | 'report'>('filter');

  // Filters
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lsk, setLsk] = useState('ALL');
  const [allGame, setAllGame] = useState(true);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [subDealers, setSubDealers] = useState<any[]>([]);

  // Data
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalPrize: number; totalDC: number }>({
    totalPrize: 0,
    totalDC: 0
  });
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
      setViewState('report');
    } catch {
      setRecords([]);
      setSummary({ totalPrize: 0, totalDC: 0 });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lsk, allGame, selectedGame, selectedDealerId]);

  const handleBack = () => {
    if (viewState === 'report') {
      setViewState('filter');
    } else if (onBack) {
      onBack();
    }
  };

  const lskOptions = ['ALL', 'SUPER', 'BOX', 'AB', 'BC', 'AC', 'A', 'B', 'C'];
  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto">
      {/* Header matching PDF 2 Page 4/5 */}
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
          <span className="font-bold text-base tracking-wide">Winning Report</span>
        </div>
      </header>

      {/* State A: Filter View (PDF 2 Page 4 Bottom) */}
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

            {/* Sub-dealer / Game Dropdown */}
            <div>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
              >
                <option value="">All Dealers</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.username}
                  </option>
                ))}
              </select>
            </div>

            {/* All Game Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={allGame}
                  onChange={(e) => setAllGame(e.target.checked)}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-0"
                />
                <span>All Game</span>
              </label>
            </div>
          </div>

          {/* Red SHOW REPORT Button */}
          <button
            onClick={fetchWinningReport}
            disabled={loading}
            className="w-full py-3 bg-[#ff0000] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded mt-8 shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'LOADING...' : 'SHOW REPORT'}
          </button>
        </main>
      )}

      {/* State B: Report Table View (PDF 2 Page 5 Top) */}
      {viewState === 'report' && (
        <div className="flex-1 flex flex-col justify-between">
          <main className="flex-1 overflow-x-auto pb-16">
            <table className="w-full text-center border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#e4e6ea] text-gray-700 font-bold border-b border-gray-300 text-[9px]">
                  <th className="py-1.5 px-1 font-semibold text-left pl-3">DATE</th>
                  <th className="py-1.5 px-1 font-semibold">GAME</th>
                  <th className="py-1.5 px-1 font-semibold">NUMBER</th>
                  <th className="py-1.5 px-1 font-semibold">DEALER</th>
                  <th className="py-1.5 px-1 font-semibold">PRICE</th>
                  <th className="py-1.5 px-1 font-semibold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400 text-xs">
                      No winning records found
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="border-b border-gray-200 text-gray-800 hover:bg-gray-50">
                      <td className="py-1.5 px-1 text-left pl-3">
                        {rec.date || rec.draw_date || (rec.created_at ? new Date(rec.created_at).toLocaleDateString() : '-')}
                      </td>
                      <td className="py-1.5 px-1 font-semibold">{rec.game || rec.game_code}</td>
                      <td className="py-1.5 px-1 font-mono font-bold">{rec.winning_number}</td>
                      <td className="py-1.5 px-1">{rec.customer_name || 'Retail'}</td>
                      <td className="py-1.5 px-1 font-mono">{rec.lsk_category || rec.prize_name || 'SUPER'}</td>
                      <td className="py-1.5 px-1 font-mono font-bold">₹ {rec.winning_prize_amount ?? rec.prize_amount ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </main>

          {/* Bottom Summary Bar matching reference screenshot */}
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#e4e6ea] border-t border-gray-300 py-1.5 px-2 grid grid-cols-4 text-center divide-x divide-gray-300 z-20 text-[10px]">
            <div>
              <span className="block text-[8px] font-semibold text-gray-500 uppercase">COUNT</span>
              <strong className="text-black">{records.length}</strong>
            </div>
            <div>
              <span className="block text-[8px] font-semibold text-gray-500 uppercase">DC</span>
              <strong className="text-black">{summary.totalDC || 0}</strong>
            </div>
            <div>
              <span className="block text-[8px] font-semibold text-gray-500 uppercase">PRICE</span>
              <strong className="text-black">₹ {summary.totalPrize || 0}</strong>
            </div>
            <div>
              <span className="block text-[8px] font-semibold text-gray-500 uppercase">TOTAL</span>
              <strong className="text-black">₹ {summary.totalPrize || 0}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
