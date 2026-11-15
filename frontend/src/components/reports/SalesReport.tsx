import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft } from 'lucide-react';

interface SalesReportProps {
  onBack?: () => void;
}

export const SalesReport: React.FC<SalesReportProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const { user } = useAuth();

  // View state: 'filter' | 'report'
  const [viewState, setViewState] = useState<'filter' | 'report'>('filter');

  // Filters
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lsk, setLsk] = useState('ALL');
  const [numberFilter, setNumberFilter] = useState('');
  const [allGame, setAllGame] = useState(false);
  const [fullView, setFullView] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [subDealers, setSubDealers] = useState<any[]>([]);

  // Data
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
      setViewState('report');
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lsk, allGame, selectedGame, fullView, selectedDealerId]);

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
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header matching PDF 2 Page 3 */}
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
          <span className="font-bold text-base tracking-wide">Sale Report</span>
        </div>
      </header>

      {/* State A: Filter View (PDF 2 Page 3 Bottom) */}
      {viewState === 'filter' && (
        <main className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {/* FROM & TO Dates */}
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

            {/* LSK Dropdown */}
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

            {/* NUMBER Input */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                NUMBER
              </label>
              <input
                type="text"
                value={numberFilter}
                onChange={(e) => setNumberFilter(e.target.value)}
                placeholder="Enter Number"
                className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:border-black"
              />
            </div>

            {/* Dealer Dropdown */}
            <div>
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
              >
                <option value="">My Sales</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkboxes: Full View & All Game */}
            <div className="flex items-center gap-6 pt-1 text-xs text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fullView}
                  onChange={(e) => setFullView(e.target.checked)}
                  className="w-4 h-4 text-black rounded border-gray-300 focus:ring-0"
                />
                <span>Full View</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
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
            onClick={fetchReport}
            disabled={loading}
            className="w-full py-3 bg-[#ff0000] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded mt-8 shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'LOADING...' : 'SHOW REPORT'}
          </button>
        </main>
      )}

      {/* State B: Report Table View — flat table matching design reference */}
      {viewState === 'report' && (() => {
        const bills = (reportData?.records || reportData?.bills || []).filter((bill: any) => {
          if (!numberFilter) return true;
          const rawItems = bill.items || [];
          return rawItems.some((it: any) => (it.bookedNumber || it.booked_number || '').includes(numberFilter));
        });

        const totalCount = bills.reduce((s: number, b: any) => s + (Number(b.total_count) || 0), 0);
        const totalD = bills.reduce((s: number, b: any) => s + (Number(b.total_d_amount) || 0), 0);
        const totalC = bills.reduce((s: number, b: any) => s + (Number(b.total_c_amount) || 0), 0);

        const fmtDate = (b: any) => {
          if (!b.created_at) return b.draw_date || '-';
          const d = new Date(b.created_at);
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          return `${yy}-${mm}-${dd} ${hh}:${min}`;
        };

        return (
          <main className="flex-1 overflow-x-auto pb-10">
            {bills.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                No sales records found for selected criteria
              </div>
            ) : (
              <table className="w-full border-collapse text-[10px]" style={{ minWidth: 340 }}>
                <thead>
                  <tr className="bg-[#e4e6ea] text-gray-800 font-bold text-[9px] border-b-2 border-gray-300">
                    <th className="py-2 px-1 text-left pl-2 font-semibold">DATE</th>
                    <th className="py-2 px-1 font-semibold">DEALER</th>
                    <th className="py-2 px-1 font-semibold">BILL NO</th>
                    <th className="py-2 px-1 font-semibold">BILL COUNT</th>
                    <th className="py-2 px-1 font-semibold">D.AMOUNT</th>
                    <th className="py-2 px-1 font-semibold">C.AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill: any) => (
                    <tr key={bill.id || bill.bill_number} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-1.5 px-1 pl-2 text-left text-gray-700 whitespace-nowrap">
                        {fmtDate(bill)}
                      </td>
                      <td className="py-1.5 px-1 text-center text-gray-800 font-medium">
                        {bill.username_snapshot || bill.dealer || 'Qq'}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono">
                        <div className="font-bold text-gray-900">{bill.bill_number}</div>
                        <div className="text-[9px] text-gray-500">
                          ({bill.game_code || ''} {bill.customer_name || ''})
                        </div>
                      </td>
                      <td className="py-1.5 px-1 text-center font-bold text-gray-800">
                        {bill.total_count}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono text-gray-700">
                        ₹ {Number(bill.total_d_amount || 0).toFixed(0)}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-gray-900">
                        ₹ {Number(bill.total_c_amount || 0).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#e4e6ea] font-bold text-[10px] border-t-2 border-gray-400">
                    <td className="py-2 px-1 pl-2 text-left text-gray-700" colSpan={2}>TOTAL</td>
                    <td className="py-2 px-1 text-center text-gray-700">—</td>
                    <td className="py-2 px-1 text-center text-gray-900">{totalCount}</td>
                    <td className="py-2 px-1 text-center font-mono text-gray-900">₹ {totalD.toFixed(0)}</td>
                    <td className="py-2 px-1 text-center font-mono text-gray-900">₹ {totalC.toFixed(0)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </main>
        );
      })()}
    </div>
  );
};
