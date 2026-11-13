import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft, RefreshCw, Trash2, Edit2, MoreVertical, X } from 'lucide-react';

interface LastSaleProps {
  onBack?: () => void;
}

export const LastSale: React.FC<LastSaleProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const { dealerConfig } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // 3-dot menu state
  const [openMenuBillId, setOpenMenuBillId] = useState<string | null>(null);

  // Edit Modal State
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Price resolution helper
  const customPrices = dealerConfig?.custom_prices || {
    three_digit: { c: 10, d: 8.5 },
    two_digit: { c: 10, d: 8.5 },
    one_digit: { c: 12, d: 10.9 }
  };

  const getPriceForCategory = (category: string) => {
    if (['SUPER', 'BOX'].includes(category)) {
      return {
        unit: customPrices.three_digit?.c ?? 10,
        c: customPrices.three_digit?.c ?? 10,
        d: customPrices.three_digit?.d ?? 8.5
      };
    }
    if (['AB', 'BC', 'AC'].includes(category)) {
      return {
        unit: customPrices.two_digit?.c ?? 10,
        c: customPrices.two_digit?.c ?? 10,
        d: customPrices.two_digit?.d ?? 8.5
      };
    }
    return {
      unit: customPrices.one_digit?.c ?? 12,
      c: customPrices.one_digit?.c ?? 12,
      d: customPrices.one_digit?.d ?? 10.9
    };
  };

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
    if (!window.confirm('Delete this booking bill?')) return;
    try {
      await ApiClient.cancelBill(billId);
      setActionMessage('Booking deleted successfully');
      setTimeout(() => setActionMessage(null), 3000);
      fetchLastSales();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel bill');
    }
  };

  const handleOpenEdit = (bill: any) => {
    setEditingBill(bill);
    setEditCustomerName(bill.customer_name || 'Retail');
    setEditItems(
      bill.items.map((it: any) => ({
        id: it.id || Math.random().toString(),
        lskCategory: it.lskCategory || it.lsk_category,
        bookedNumber: it.bookedNumber || it.booked_number,
        count: Number(it.count)
      }))
    );
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingBill) return;
    if (editItems.length === 0) {
      setEditError('Bill must have at least one booked number');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      await ApiClient.editBill(editingBill.id, {
        customerName: editCustomerName.trim() || 'Retail',
        items: editItems.map((i) => ({
          lskCategory: i.lskCategory,
          bookedNumber: i.bookedNumber,
          count: Number(i.count)
        }))
      });
      setActionMessage(`Booking ${editingBill.bill_number} updated successfully!`);
      setTimeout(() => setActionMessage(null), 3000);
      setEditingBill(null);
      fetchLastSales();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update booking');
    } finally {
      setEditLoading(false);
    }
  };

  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col max-w-md mx-auto relative select-none">
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
          <span className="font-bold text-base tracking-wide">Last Sale — {selectedGame}</span>
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

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg p-4 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-gray-900">Edit Booking</h3>
              </div>
              <button
                onClick={() => setEditingBill(null)}
                className="p-1 text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-2 p-2 bg-gray-50 rounded text-xs flex justify-between items-center font-mono">
              <span>Bill: <strong>{editingBill.bill_number}</strong></span>
              <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold">
                Draw: {editingBill.game_code} ({editingBill.scheduled_close_time?.slice(0, 5) || 'Open'})
              </span>
            </div>

            <div className="mb-2">
              <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Customer Name</label>
              <input
                type="text"
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-black"
              />
            </div>

            {editError && (
              <div className="mb-2 p-1.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                {editError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100 mb-3">
              {editItems.map((item, idx) => {
                const prices = getPriceForCategory(item.lskCategory);
                const itemC = item.count * prices.c;
                const itemD = item.count * prices.d;
                return (
                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-gray-900 font-mono">
                        {item.lskCategory} - {item.bookedNumber}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Rate: ₹{prices.unit} | C: ₹{itemC.toFixed(0)} | D: ₹{itemD.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.count > 1) {
                            setEditItems(editItems.map((it, i) => i === idx ? { ...it, count: it.count - 1 } : it));
                          }
                        }}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.count}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setEditItems(editItems.map((it, i) => i === idx ? { ...it, count: val } : it));
                        }}
                        className="w-12 text-center border border-gray-300 rounded py-0.5 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditItems(editItems.map((it, i) => i === idx ? { ...it, count: it.count + 1 } : it));
                        }}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditItems(editItems.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Remove number"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recalculated Edit Totals */}
            <div className="bg-gray-100 p-2 rounded text-xs mb-3 flex justify-between items-center font-mono">
              <span>Count: <strong>{editItems.reduce((acc, it) => acc + (it.count || 0), 0)}</strong></span>
              <span>Total C: <strong>₹{editItems.reduce((acc, it) => acc + (it.count * getPriceForCategory(it.lskCategory).c), 0).toFixed(0)}</strong></span>
              <span>Total D: <strong>₹{editItems.reduce((acc, it) => acc + (it.count * getPriceForCategory(it.lskCategory).d), 0).toFixed(2)}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editLoading || editItems.length === 0}
                className="flex-1 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase rounded disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <main className="flex-1 p-3 pb-8">
        {records.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs">
            No active sales recorded yet for {selectedGame} draw
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((bill) => (
              <div
                key={bill.id}
                className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-sm"
              >
                {/* Header: Bill No, Customer, Draw Status */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">BILL NUMBER</span>
                    <strong className="text-black font-mono text-sm">{bill.bill_number}</strong>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        bill.isEditable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {bill.isEditable
                        ? `● OPEN (${bill.scheduled_close_time?.slice(0, 5) || '18:00'})`
                        : '● DRAW CLOSED'}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Customer: <strong className="text-gray-800">{bill.customer_name || 'Retail'}</strong>
                    </span>
                  </div>
                </div>

                {/* Numbers & Amounts Breakdown Table */}
                {bill.items && bill.items.length > 0 && (
                  <div className="border border-gray-200 rounded overflow-hidden mb-2">
                    <table className="w-full text-center border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                          <th className="py-1 px-1 text-left pl-2 font-semibold">LSK</th>
                          <th className="py-1 px-1 font-semibold">NUMBER</th>
                          <th className="py-1 px-1 font-semibold">COUNT</th>
                          <th className="py-1 px-1 font-semibold">RATE</th>
                          <th className="py-1 px-1 font-semibold">D.AMT</th>
                          <th className="py-1 px-1 font-semibold">C.AMT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {bill.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-1 px-1 text-left pl-2 font-sans font-medium text-gray-800">
                              {item.lskCategory || item.lsk_category}
                            </td>
                            <td className="py-1 px-1 font-bold text-black">
                              {item.bookedNumber || item.booked_number}
                            </td>
                            <td className="py-1 px-1">{item.count}</td>
                            <td className="py-1 px-1 text-gray-600">₹{item.unitCPrice || 10}</td>
                            <td className="py-1 px-1 text-gray-600">₹{Number(item.totalDAmount || 0).toFixed(2)}</td>
                            <td className="py-1 px-1 font-semibold text-black">₹{Number(item.totalCAmount || 0).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bill Totals Summary */}
                <div className="bg-gray-50 p-2 rounded flex justify-between items-center text-xs font-mono text-gray-700 border border-gray-200 mb-2">
                  <span>Count: <strong className="text-black">{bill.total_count}</strong></span>
                  <span>D.Total: <strong className="text-black">₹{Number(bill.total_d_amount || 0).toFixed(2)}</strong></span>
                  <span>C.Total: <strong className="text-black font-bold text-sm">₹{Number(bill.total_c_amount || 0).toFixed(0)}</strong></span>
                </div>

                {/* Footer with Timestamp and 3-dot Edit/Delete Menu */}
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="text-gray-400">
                    Booked at: {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Always-visible 3-dot menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuBillId(openMenuBillId === bill.id ? null : bill.id)}
                      className="p-1.5 text-gray-500 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuBillId === bill.id && (
                      <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-32 text-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { handleOpenEdit(bill); setOpenMenuBillId(null); }}
                          className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-gray-50 text-gray-800 font-medium transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                          Edit
                        </button>
                        <div className="border-t border-gray-100" />
                        <button
                          type="button"
                          onClick={() => { handleCancelBill(bill.id); setOpenMenuBillId(null); }}
                          className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
