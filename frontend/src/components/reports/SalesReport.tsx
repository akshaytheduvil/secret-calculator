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

      {/* State B: Report Table View (PDF 2 Page 3 Top) */}
      {viewState === 'report' && (
        <main className="flex-1 overflow-x-auto pb-10">
          {!reportData || (!reportData.records && !reportData.bills) || (reportData.records || reportData.bills).length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No sales records found for selected criteria
            </div>
          ) : (
            <div className="space-y-1">
              {(reportData.records || reportData.bills).map((bill: any) => {
                // Filter items by number if specified
                const rawItems = bill.items || [];
                const filteredItems = numberFilter
                  ? rawItems.filter((it: any) => (it.bookedNumber || it.booked_number || '').includes(numberFilter))
                  : rawItems;

                if (numberFilter && filteredItems.length === 0) return null;

                return (
                  <div key={bill.id || bill.bill_number} className="border-b border-gray-200">
                    {/* Bill Header Row */}
                    <div className="bg-[#e4e6ea] px-2 py-1.5 grid grid-cols-6 text-[10px] font-bold text-gray-800 text-center">
                      <div className="col-span-1 text-left truncate">
                        <span className="block text-[8px] text-gray-500">DATE</span>
                        {bill.draw_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString() : '-')}
                      </div>
                      <div className="col-span-1 text-left truncate">
                        <span className="block text-[8px] text-gray-500">DEALER</span>
                        {bill.dealer || bill.customer_name || 'Retail'}
                      </div>
                      <div className="col-span-1">
                        <span className="block text-[8px] text-gray-500">BILL NO</span>
                        {bill.bill_number}
                      </div>
                      <div className="col-span-1">
                        <span className="block text-[8px] text-gray-500">BILL COUNT</span>
                        {bill.total_count}
                      </div>
                      <div className="col-span-1">
                        <span className="block text-[8px] text-gray-500">D.AMOUNT</span>
                        ₹{bill.total_d_amount || (bill.total_count * 8.5).toFixed(1)}
                      </div>
                      <div className="col-span-1">
                        <span className="block text-[8px] text-gray-500">C.AMOUNT</span>
                        ₹{bill.total_c_amount || (bill.total_count * 10)}
                      </div>
                    </div>

                    {/* Sub-Items Table */}
                    <table className="w-full text-center border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 border-b border-gray-200 text-[9px]">
                          <th className="py-1 px-1 font-semibold text-left pl-3">LSK</th>
                          <th className="py-1 px-1 font-semibold">NUMBER</th>
                          <th className="py-1 px-1 font-semibold">COUNT</th>
                          <th className="py-1 px-1 font-semibold">AMOUNT</th>
                          <th className="py-1 px-1 font-semibold">D.AMOUNT</th>
                          <th className="py-1 px-1 font-semibold">C.AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item: any, idx: number) => {
                          const lskCat = item.lskCategory || item.lsk_category || 'SUPER';
                          const bookedNum = item.bookedNumber || item.booked_number;
                          const cnt = item.count || 1;
                          const unitPrice = ['A', 'B', 'C'].includes(lskCat) ? 12 : 10;
                          const dPrice = ['A', 'B', 'C'].includes(lskCat) ? 10.9 : 8.5;
                          return (
                            <tr key={idx} className="border-b border-gray-100 text-gray-700">
                              <td className="py-1 px-1 text-left pl-3 font-semibold uppercase">
                                {lskCat}
                              </td>
                              <td className="py-1 px-1 font-mono">{bookedNum}</td>
                              <td className="py-1 px-1">{cnt}</td>
                              <td className="py-1 px-1 font-mono">₹ {unitPrice}</td>
                              <td className="py-1 px-1 font-mono">₹ {(cnt * dPrice).toFixed(2)}</td>
                              <td className="py-1 px-1 font-mono">₹ {(cnt * unitPrice).toFixed(0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}
    </div>
  );
};
