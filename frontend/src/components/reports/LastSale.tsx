import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';

interface LastSaleProps {
  onBack?: () => void;
}

export const LastSale: React.FC<LastSaleProps> = ({ onBack }) => {
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
    if (!window.confirm('Cancel this booking bill?')) return;
    try {
      await ApiClient.cancelBill(billId);
      setActionMessage('Bill cancelled');
      fetchLastSales();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel bill');
    }
  };

  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header matching reference */}
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
          <span className="font-bold text-base tracking-wide">Last Sale</span>
        </div>

        <button
          onClick={fetchLastSales}
          disabled={loading}
          className="p-1 text-white hover:opacity-80 transition-opacity"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {actionMessage && (
        <div className="p-2 bg-green-50 text-green-700 text-xs text-center border-b border-green-200">
          {actionMessage}
        </div>
      )}

      {/* Main List */}
      <main className="flex-1 p-3">
        {records.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No sales recorded yet for today's {selectedGame} draw
          </div>
        ) : (
          <div className="space-y-2.5">
            {records.map((bill) => (
              <div
                key={bill.id}
                className="bg-white border border-gray-200 rounded p-3 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <div>
                    <span className="text-[10px] text-gray-500 block">BILL NO</span>
                    <strong className="text-black font-mono text-sm">{bill.bill_number}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">CUSTOMER</span>
                    <span className="text-gray-800 font-medium">{bill.customer_name || 'Retail'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-gray-600 mb-2">
                  <span>Count: <strong className="text-black">{bill.total_count}</strong></span>
                  <span>Amount: <strong className="text-black">₹{bill.total_c_amount || (bill.total_count * 10)}</strong></span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      bill.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>

                {bill.items && bill.items.length > 0 && (
                  <div className="bg-gray-50 p-2 rounded text-[11px] font-mono divide-y divide-gray-200">
                    {bill.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1">
                        <span>{item.lsk_category} - {item.booked_number}</span>
                        <span>x {item.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {bill.status === 'ACTIVE' && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleCancelBill(bill.id)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
