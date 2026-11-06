import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { ApiClient } from '../../api/client';
import { FileText, RefreshCw, XCircle } from 'lucide-react';

export const LastSale: React.FC = () => {
  const { selectedGame, gameMeta } = useGame();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLastSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getLastSale(selectedGame);
      setRecords(res.records || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGame]);

  useEffect(() => {
    fetchLastSales();
  }, [fetchLastSales]);

  const handleCancelBill = async (billId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking bill?')) return;
    try {
      await ApiClient.cancelBill(billId);
      setActionMessage('Bill cancelled successfully');
      fetchLastSales();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel bill');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: gameMeta.themeColor }} />
            <span>Last Sale — {selectedGame}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Today's active bookings prior to closing</p>
        </div>
        <button
          onClick={fetchLastSales}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          {actionMessage}
        </div>
      )}

      {records.length === 0 ? (
        <div className="p-12 text-center bg-[#161820] rounded-3xl border border-zinc-800/80">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm font-medium">No sales recorded yet for today's {selectedGame} draw</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((bill) => (
            <div
              key={bill.id}
              className="bg-[#161820] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-500 block">Customer</span>
                  <strong className="text-white text-sm">{bill.customer_name}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Bill Number</span>
                  <span className="font-mono font-bold text-amber-400">{bill.bill_number}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Total Count</span>
                  <span className="font-mono font-bold text-white">{bill.total_count}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    bill.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {bill.status}
                  </span>
                </div>
                {bill.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCancelBill(bill.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800/60 pb-1">
                      <th className="py-1">Booked Numbers</th>
                      <th className="py-1">LSK Category</th>
                      <th className="py-1 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {bill.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="text-zinc-300">
                        <td className="py-1.5 font-mono font-bold text-white text-sm">{item.bookedNumber}</td>
                        <td className="py-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                            {item.lskCategory}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-mono font-semibold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
