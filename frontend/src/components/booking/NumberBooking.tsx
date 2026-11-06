import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { CheckCircle2, AlertCircle, Plus, Trash2, Send } from 'lucide-react';

interface StagedBookingItem {
  id: string;
  lskCategory: 'A' | 'B' | 'C' | 'AB' | 'BC' | 'AC' | 'SUPER' | 'BOX';
  bookedNumber: string;
  count: number;
  cAmount: number;
  dAmount: number;
}

export const NumberBooking: React.FC = () => {
  const { selectedGame, gameMeta } = useGame();
  const { dealerConfig } = useAuth();

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [bookingNumber, setBookingNumber] = useState('');
  const [lskCategory, setLskCategory] = useState<string>('SUPER');
  const [count, setCount] = useState<string>('1');
  const [bCount, setBCount] = useState<string>('1'); // When SUPER+BOX both selected
  const [alsoBox, setAlsoBox] = useState<boolean>(false); // Dual select SUPER + BOX for 3-digit

  // Staged Cart for current customer
  const [stagedItems, setStagedItems] = useState<StagedBookingItem[]>([]);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic price resolution from dealer config
  const customPrices = dealerConfig?.custom_prices || {
    three_digit: { c: 10, d: 10 },
    two_digit: { c: 10, d: 10 },
    one_digit: { c: 12, d: 12 }
  };

  const getUnitPrice = (category: string) => {
    if (['SUPER', 'BOX'].includes(category)) {
      return {
        c: customPrices.three_digit?.c ?? 10,
        d: customPrices.three_digit?.d ?? 10
      };
    }
    if (['AB', 'BC', 'AC'].includes(category)) {
      return {
        c: customPrices.two_digit?.c ?? 10,
        d: customPrices.two_digit?.d ?? 10
      };
    }
    return {
      c: customPrices.one_digit?.c ?? 12,
      d: customPrices.one_digit?.d ?? 12
    };
  };

  // Auto adjust LSK options based on input number length
  useEffect(() => {
    const trimmed = bookingNumber.trim();
    if (trimmed.length === 1) {
      if (!['A', 'B', 'C'].includes(lskCategory)) setLskCategory('A');
      setAlsoBox(false);
    } else if (trimmed.length === 2) {
      if (!['AB', 'BC', 'AC'].includes(lskCategory)) setLskCategory('AB');
      setAlsoBox(false);
    } else if (trimmed.length === 3) {
      if (!['SUPER', 'BOX'].includes(lskCategory)) setLskCategory('SUPER');
    }
  }, [bookingNumber, lskCategory]);

  // Current row calculated amounts
  const currentUnits = getUnitPrice(lskCategory);
  const numCount = parseInt(count) || 0;
  const numBCount = alsoBox ? (parseInt(bCount) || 0) : 0;
  const rowCAmount = numCount * currentUnits.c + (alsoBox ? numBCount * currentUnits.c : 0);
  const rowDAmount = numCount * currentUnits.d + (alsoBox ? numBCount * currentUnits.d : 0);

  // Add Item to Staged Batch
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedNum = bookingNumber.trim();
    if (!trimmedNum) {
      setErrorMessage('Please enter a booking number');
      return;
    }

    if (['A', 'B', 'C'].includes(lskCategory) && trimmedNum.length !== 1) {
      setErrorMessage('One-digit category requires exactly 1 digit');
      return;
    }
    if (['AB', 'BC', 'AC'].includes(lskCategory) && trimmedNum.length !== 2) {
      setErrorMessage('Two-digit category requires exactly 2 digits');
      return;
    }
    if (['SUPER', 'BOX'].includes(lskCategory) && trimmedNum.length !== 3) {
      setErrorMessage('Three-digit category requires exactly 3 digits');
      return;
    }

    if (numCount <= 0) {
      setErrorMessage('Count must be greater than 0');
      return;
    }

    const newItems: StagedBookingItem[] = [];

    // Main item
    newItems.push({
      id: Math.random().toString(36).substring(7),
      lskCategory: lskCategory as any,
      bookedNumber: trimmedNum,
      count: numCount,
      cAmount: numCount * currentUnits.c,
      dAmount: numCount * currentUnits.d
    });

    // Dual selection: if 3-digit and alsoBox checked
    if (trimmedNum.length === 3 && lskCategory === 'SUPER' && alsoBox) {
      if (numBCount <= 0) {
        setErrorMessage('BOX count (B.Count) must be greater than 0');
        return;
      }
      newItems.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'BOX',
        bookedNumber: trimmedNum,
        count: numBCount,
        cAmount: numBCount * currentUnits.c,
        dAmount: numBCount * currentUnits.d
      });
    }

    setStagedItems([...stagedItems, ...newItems]);
    // Reset number input for rapid continuous entry
    setBookingNumber('');
    setAlsoBox(false);
  };

  const handleRemoveItem = (id: string) => {
    setStagedItems(stagedItems.filter((i) => i.id !== id));
  };

  // Submit Final Booking to Server
  const handleSubmitBooking = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Customer Name is required');
      return;
    }

    if (stagedItems.length === 0) {
      setErrorMessage('Please add at least one booking number to submit');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        gameCode: selectedGame,
        items: stagedItems.map((i) => ({
          lskCategory: i.lskCategory,
          bookedNumber: i.bookedNumber,
          count: i.count
        }))
      };

      const res = await ApiClient.submitBooking(payload);

      // Show success message and bill number
      setSuccessMessage(`Booking saved successfully! Bill Number: ${res.billNumber}`);

      // Clear the form for the next customer
      setCustomerName('');
      setBookingNumber('');
      setCount('1');
      setBCount('1');
      setAlsoBox(false);
      setStagedItems([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Booking submission failed');
    } finally {
      setLoading(false);
    }
  };

  const totalBatchC = stagedItems.reduce((acc, curr) => acc + curr.cAmount, 0);
  const totalBatchCount = stagedItems.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Game Banner Header */}
      <div
        className="rounded-2xl p-4 text-white shadow-md flex items-center justify-between"
        style={{ backgroundColor: gameMeta.themeColor }}
      >
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold opacity-90">Number Booking</span>
          <h2 className="text-2xl font-black font-mono tracking-tight">{selectedGame}</h2>
        </div>
        <div className="text-right">
          <span className="text-xs opacity-90 block">Closing Time</span>
          <span className="text-sm font-bold bg-black/20 px-2.5 py-1 rounded-full">{gameMeta.closingTime}</span>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <form onSubmit={handleAddItem} className="space-y-4">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Retail Counter Client"
              className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Booking Number */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
                Booking Number
              </label>
              <input
                type="text"
                maxLength={3}
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1 to 3 digits"
                className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3.5 text-lg font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
              />
            </div>

            {/* LSK Category */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
                LSK Category
              </label>
              <select
                value={lskCategory}
                onChange={(e) => setLskCategory(e.target.value)}
                className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {bookingNumber.trim().length <= 1 && (
                  <optgroup label="Single Digit">
                    <option value="A">LSK A (Pos 1)</option>
                    <option value="B">LSK B (Pos 2)</option>
                    <option value="C">LSK C (Pos 3)</option>
                  </optgroup>
                )}
                {bookingNumber.trim().length === 2 && (
                  <optgroup label="Two Digit">
                    <option value="AB">LSK AB (First 2)</option>
                    <option value="BC">LSK BC (Last 2)</option>
                    <option value="AC">LSK AC (Outer 2)</option>
                  </optgroup>
                )}
                {bookingNumber.trim().length === 3 && (
                  <optgroup label="Three Digit">
                    <option value="SUPER">LSK SUPER (Straight)</option>
                    <option value="BOX">LSK BOX (Permutations)</option>
                  </optgroup>
                )}
              </select>
            </div>

            {/* Count */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
                Count
              </label>
              <input
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full bg-[#1e2029] border border-zinc-700/80 rounded-xl py-2.5 px-3.5 text-base font-mono font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
          </div>

          {/* SUPER & BOX simultaneous selection for 3-digit */}
          {bookingNumber.trim().length === 3 && lskCategory === 'SUPER' && (
            <div className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoBox}
                  onChange={(e) => setAlsoBox(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-zinc-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-zinc-200">
                  Also book BOX for this 3-digit number
                </span>
              </label>

              {alsoBox && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">B.Count:</span>
                  <input
                    type="number"
                    min="1"
                    value={bCount}
                    onChange={(e) => setBCount(e.target.value)}
                    className="w-20 bg-[#1e2029] border border-zinc-700 rounded-lg py-1 px-2 text-xs font-mono font-bold text-white text-center"
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Calculated Amounts Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#12141a] border border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-500 block">C.Amount (Customer)</span>
              <span className="text-sm font-mono font-bold text-emerald-400">₹{rowCAmount}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">D.Amount (Wholesale)</span>
              <span className="text-sm font-mono font-bold text-amber-400">₹{rowDAmount}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Number</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Staged Items List */}
      {stagedItems.length > 0 && (
        <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Staged Numbers ({stagedItems.length})
            </h3>
            <div className="text-right">
              <span className="text-xs text-zinc-400 mr-2">Total Count: <strong className="text-white font-mono">{totalBatchCount}</strong></span>
              <span className="text-xs text-zinc-400">Total: <strong className="text-emerald-400 font-mono text-sm">₹{totalBatchC}</strong></span>
            </div>
          </div>

          <div className="divide-y divide-zinc-800 max-h-60 overflow-y-auto pr-1">
            {stagedItems.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-bold">
                    {item.lskCategory}
                  </span>
                  <span className="font-mono text-base font-black text-white">{item.bookedNumber}</span>
                  <span className="text-zinc-400">× {item.count}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold text-emerald-400">₹{item.cAmount}</span>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Final Submit Button */}
          <div className="pt-4 mt-3 border-t border-zinc-800 flex justify-end">
            <button
              onClick={handleSubmitBooking}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Booking (₹{totalBatchC})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
