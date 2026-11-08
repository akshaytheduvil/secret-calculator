import React, { useState, useEffect, useCallback } from 'react';
import { useGame, GameCode } from '../../context/GameContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface TodayReportProps {
  onBack?: () => void;
}

export const TodayReport: React.FC<TodayReportProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const [activeDraw, setActiveDraw] = useState<GameCode>(selectedGame);
  const [records, setRecords] = useState<{ booked_number: string; total_count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const draws: GameCode[] = ['DR1', 'KL', 'DR6', 'DR8'];

  const fetchTodayReport = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await ApiClient.getTodayReport(activeDraw);
      setRecords(res.records || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load Today Report');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [activeDraw]);

  useEffect(() => {
    fetchTodayReport();
    // Real-time synchronization: poll every 8 seconds for newly submitted bookings
    const interval = setInterval(() => {
      fetchTodayReport();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchTodayReport]);

  const totalSumCount = records.reduce((sum, r) => sum + r.total_count, 0);
  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto">
      {/* Header */}
      <header
        className="px-4 py-3 text-white flex items-center justify-between sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: themeBg }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base tracking-wide">Today Report</span>
        </div>

        <button
          onClick={fetchTodayReport}
          disabled={loading}
          className="p-1 text-white hover:opacity-80 transition-opacity"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Draw Tabs: DR1 | KL | DR6 | DR8 */}
      <div className="bg-gray-100 p-1.5 grid grid-cols-4 gap-1.5 border-b border-gray-200">
        {draws.map((d) => {
          const isSelected = activeDraw === d;
          return (
            <button
              key={d}
              onClick={() => setActiveDraw(d)}
              className={`py-2 text-xs font-bold rounded transition-colors ${
                isSelected
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Main Content Table: Booked Number | Total Count */}
      <main className="flex-1 overflow-x-auto pb-16">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
          <span className="font-bold text-gray-800 uppercase tracking-wide">
            {activeDraw} – Today
          </span>
          <span className="text-gray-500 font-mono text-[11px]">
            {records.length} unique numbers
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 text-center text-xs text-red-600 bg-red-50 border-b border-red-200">
            {errorMessage}
          </div>
        )}

        <table className="w-full text-center border-collapse text-xs">
          <thead>
            <tr className="bg-[#e4e6ea] text-gray-700 font-bold border-b border-gray-300 text-[11px]">
              <th className="py-2.5 px-4 font-semibold text-left pl-6 border-r border-gray-300">
                Booked Number
              </th>
              <th className="py-2.5 px-4 font-semibold text-right pr-6">
                Total Count
              </th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-16 text-center text-gray-400 text-xs">
                  {loading ? 'Loading today\'s bookings...' : `No bookings recorded for ${activeDraw} today`}
                </td>
              </tr>
            ) : (
              records.map((item) => (
                <tr
                  key={item.booked_number}
                  className="border-b border-gray-200 text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-2 px-4 text-left pl-6 font-mono font-bold text-sm text-black border-r border-gray-200">
                    {item.booked_number}
                  </td>
                  <td className="py-2 px-4 text-right pr-6 font-mono font-semibold text-sm text-black">
                    {item.total_count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>

      {/* Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#e4e6ea] border-t border-gray-300 py-2.5 px-4 flex items-center justify-between text-xs font-bold z-20">
        <span className="text-gray-600 uppercase tracking-wider text-[11px]">
          TOTAL TICKETS ({activeDraw})
        </span>
        <span className="text-base font-mono text-black">
          {totalSumCount}
        </span>
      </div>
    </div>
  );
};
