import React, { useState, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { Menu, Copy, Camera, X } from 'lucide-react';

interface StagedBookingItem {
  id: string;
  lskCategory: string;
  bookedNumber: string;
  count: number;
  unitAmount: number;
  dAmount: number;
  cAmount: number;
}

interface NumberBookingProps {
  onOpenMenu?: () => void;
}

export const NumberBooking: React.FC<NumberBookingProps> = ({ onOpenMenu }) => {
  const { selectedGame, gameMeta } = useGame();
  const { dealerConfig } = useAuth();

  // Digit Mode: '1' | '2' | '3'
  const [digitMode, setDigitMode] = useState<'1' | '2' | '3'>('3');
  const [bookMode, setBookMode] = useState<string>('Book');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [startNumber, setStartNumber] = useState('');
  const [count, setCount] = useState<string>('1');
  const [bCount, setBCount] = useState<string>('1');

  // Staged Table Items
  const [stagedItems, setStagedItems] = useState<StagedBookingItem[]>([]);

  // Submissions & Feedback
  const [loading, setLoading] = useState(false);
  const [successBillNumber, setSuccessBillNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const startInputRef = useRef<HTMLInputElement>(null);

  // Dynamic price resolution from dealer config or defaults matching reference
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
    // 1 digit
    return {
      unit: customPrices.one_digit?.c ?? 12,
      c: customPrices.one_digit?.c ?? 12,
      d: customPrices.one_digit?.d ?? 10.9
    };
  };

  // Switch digit mode helper
  const handleDigitModeChange = (mode: '1' | '2' | '3') => {
    setDigitMode(mode);
    setStartNumber('');
    setErrorMessage(null);
    if (startInputRef.current) {
      startInputRef.current.focus();
    }
  };

  // Add items handler
  const handleAddItems = (categories: { lsk: string; cnt: number }[]) => {
    setErrorMessage(null);
    const trimmed = startNumber.trim();

    if (!trimmed) {
      setErrorMessage('Please enter number');
      return;
    }

    const expectedLength = parseInt(digitMode);
    if (trimmed.length !== expectedLength) {
      setErrorMessage(`Please enter ${expectedLength} digit number`);
      return;
    }

    const newEntries: StagedBookingItem[] = [];

    for (const cat of categories) {
      if (cat.cnt <= 0) {
        setErrorMessage('Count must be greater than 0');
        return;
      }
      const pricing = getPriceForCategory(cat.lsk);
      newEntries.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: cat.lsk,
        bookedNumber: trimmed,
        count: cat.cnt,
        unitAmount: pricing.unit,
        dAmount: Number((cat.cnt * pricing.d).toFixed(2)),
        cAmount: Number((cat.cnt * pricing.c).toFixed(2))
      });
    }

    setStagedItems((prev) => [...prev, ...newEntries]);
    setStartNumber('');
    if (startInputRef.current) {
      startInputRef.current.focus();
    }
  };

  // Handle 3-Digit Action Buttons: SUPER, BOX, BOTH
  const handle3DigitAction = (action: 'SUPER' | 'BOX' | 'BOTH') => {
    const mainCount = parseInt(count) || 1;
    const boxCount = parseInt(bCount) || 1;

    if (action === 'SUPER') {
      handleAddItems([{ lsk: 'SUPER', cnt: mainCount }]);
    } else if (action === 'BOX') {
      handleAddItems([{ lsk: 'BOX', cnt: mainCount }]);
    } else if (action === 'BOTH') {
      handleAddItems([
        { lsk: 'SUPER', cnt: mainCount },
        { lsk: 'BOX', cnt: boxCount }
      ]);
    }
  };

  // Handle 2-Digit Action Buttons: AB, BC, AC, ALL
  const handle2DigitAction = (action: 'AB' | 'BC' | 'AC' | 'ALL') => {
    const currentCount = parseInt(count) || 1;
    if (action === 'ALL') {
      handleAddItems([
        { lsk: 'AB', cnt: currentCount },
        { lsk: 'BC', cnt: currentCount },
        { lsk: 'AC', cnt: currentCount }
      ]);
    } else {
      handleAddItems([{ lsk: action, cnt: currentCount }]);
    }
  };

  // Handle 1-Digit Action Buttons: A, B, C, ALL
  const handle1DigitAction = (action: 'A' | 'B' | 'C' | 'ALL') => {
    const currentCount = parseInt(count) || 1;
    if (action === 'ALL') {
      handleAddItems([
        { lsk: 'A', cnt: currentCount },
        { lsk: 'B', cnt: currentCount },
        { lsk: 'C', cnt: currentCount }
      ]);
    } else {
      handleAddItems([{ lsk: action, cnt: currentCount }]);
    }
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setStagedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit Booking
  const handleSubmitBooking = async () => {
    setErrorMessage(null);
    setSuccessBillNumber(null);

    if (stagedItems.length === 0) {
      setErrorMessage('Please add numbers before submitting');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerName: customerName.trim() || 'Retail',
        gameCode: selectedGame,
        items: stagedItems.map((i) => ({
          lskCategory: i.lskCategory,
          bookedNumber: i.bookedNumber,
          count: i.count
        }))
      };

      const res = await ApiClient.submitBooking(payload);
      setSuccessBillNumber(res.billNumber);

      // Reset form
      setCustomerName('');
      setStartNumber('');
      setCount('1');
      setBCount('1');
      setStagedItems([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Booking submission failed');
    } finally {
      setLoading(false);
    }
  };

  // Copy Summary
  const handleCopy = () => {
    if (stagedItems.length === 0) return;
    const lines = stagedItems.map(
      (item) => `${item.lskCategory} ${item.bookedNumber} x ${item.count} = ₹${item.cAmount}`
    );
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Screen Print / Snapshot
  const handleScreenshot = () => {
    window.print();
  };

  // Calculated totals for bottom bar
  const totalCount = stagedItems.reduce((acc, curr) => acc + curr.count, 0);
  const totalDAmount = stagedItems.reduce((acc, curr) => acc + curr.dAmount, 0);
  const totalCAmount = stagedItems.reduce((acc, curr) => acc + curr.cAmount, 0);

  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto relative select-none">
      {/* 1. Top Header matching PDF 1 / PDF 2 */}
      <header
        className="px-4 py-3 text-white flex items-center justify-between sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: themeBg }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-base tracking-wider">{selectedGame}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleScreenshot}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            title="Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Copy / Action feedback banner */}
      {copyFeedback && (
        <div className="bg-black text-white text-xs text-center py-1 absolute top-12 left-0 right-0 z-30 opacity-90">
          {copyFeedback}
        </div>
      )}

      {/* Success Bill Notification Modal */}
      {successBillNumber && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-5 max-w-xs w-full text-center shadow-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Booking Successful!</h3>
            <div className="my-3 py-2 bg-gray-100 rounded text-xs font-mono">
              <span className="text-gray-500 block">Bill Number</span>
              <strong className="text-base text-black">{successBillNumber}</strong>
            </div>
            <button
              onClick={() => setSuccessBillNumber(null)}
              className="w-full py-2 bg-black text-white text-xs font-bold uppercase rounded mt-2"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Customer Name Section */}
        <div className="px-3 pt-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name"
            className="w-full text-xs text-gray-800 placeholder-gray-400 border-b border-gray-300 py-1 px-1 focus:outline-none focus:border-gray-600 bg-transparent"
          />
        </div>

        {/* Radio Selector & Book dropdown row matching reference */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="digitMode"
                value="1"
                checked={digitMode === '1'}
                onChange={() => handleDigitModeChange('1')}
                className="w-3.5 h-3.5 text-black focus:ring-0"
              />
              <span>1</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="digitMode"
                value="2"
                checked={digitMode === '2'}
                onChange={() => handleDigitModeChange('2')}
                className="w-3.5 h-3.5 text-black focus:ring-0"
              />
              <span>2</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="digitMode"
                value="3"
                checked={digitMode === '3'}
                onChange={() => handleDigitModeChange('3')}
                className="w-3.5 h-3.5 text-black focus:ring-0"
              />
              <span>3</span>
            </label>
          </div>

          <div>
            <select
              value={bookMode}
              onChange={(e) => setBookMode(e.target.value)}
              className="text-xs text-gray-700 bg-transparent border-none outline-none font-medium pr-1 cursor-pointer"
            >
              <option value="Book">Book</option>
            </select>
          </div>
        </div>

        {/* Number Entry Inputs Row: Start | Count | B. Count */}
        <div className="px-3 py-1 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">Start</label>
            <input
              ref={startInputRef}
              type="tel"
              maxLength={parseInt(digitMode)}
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value.replace(/\D/g, ''))}
              placeholder=""
              autoFocus
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm font-bold text-black focus:outline-none focus:border-black bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">Count</label>
            <input
              type="tel"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm font-bold text-black focus:outline-none focus:border-black bg-white"
            />
          </div>

          {digitMode === '3' ? (
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">B. Count</label>
              <input
                type="tel"
                value={bCount}
                onChange={(e) => setBCount(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm font-bold text-black focus:outline-none focus:border-black bg-white"
              />
            </div>
          ) : (
            <div className="invisible" />
          )}
        </div>

        {/* Category Buttons Row matching reference */}
        <div className="px-3 py-2">
          {digitMode === '3' && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handle3DigitAction('SUPER')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                SUPER
              </button>
              <button
                type="button"
                onClick={() => handle3DigitAction('BOX')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                BOX
              </button>
              <button
                type="button"
                onClick={() => handle3DigitAction('BOTH')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                BOTH
              </button>
            </div>
          )}

          {digitMode === '2' && (
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handle2DigitAction('AB')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                AB
              </button>
              <button
                type="button"
                onClick={() => handle2DigitAction('BC')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                BC
              </button>
              <button
                type="button"
                onClick={() => handle2DigitAction('AC')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                AC
              </button>
              <button
                type="button"
                onClick={() => handle2DigitAction('ALL')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                ALL
              </button>
            </div>
          )}

          {digitMode === '1' && (
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handle1DigitAction('A')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handle1DigitAction('B')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => handle1DigitAction('C')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handle1DigitAction('ALL')}
                className="text-white font-bold text-xs py-2 rounded shadow-sm uppercase active:opacity-80 transition-opacity"
                style={{ backgroundColor: themeBg }}
              >
                ALL
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="px-3 py-1 text-center text-xs text-red-600 bg-red-50 border-y border-red-100">
            {errorMessage}
          </div>
        )}

        {/* Staged Items Table matching reference */}
        <div className="flex-1 overflow-x-auto overflow-y-auto pb-20">
          <table className="w-full text-center border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#e4e6ea] text-gray-700 font-semibold border-y border-gray-300 text-[10px]">
                <th className="py-1 px-1 font-semibold text-left pl-3">LSK</th>
                <th className="py-1 px-1 font-semibold">NUMBER</th>
                <th className="py-1 px-1 font-semibold">COUNT</th>
                <th className="py-1 px-1 font-semibold">AMOUNT</th>
                <th className="py-1 px-1 font-semibold">D.AMOUNT</th>
                <th className="py-1 px-1 font-semibold">C.AMOUNT</th>
                <th className="py-1 px-1 font-semibold w-6"></th>
              </tr>
            </thead>
            <tbody>
              {stagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                    No numbers booked yet
                  </td>
                </tr>
              ) : (
                stagedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-200 text-gray-800 hover:bg-gray-50"
                  >
                    <td className="py-1.5 px-1 font-semibold text-left pl-3 uppercase">
                      {item.lskCategory}
                    </td>
                    <td className="py-1.5 px-1 font-mono font-medium">{item.bookedNumber}</td>
                    <td className="py-1.5 px-1">{item.count}</td>
                    <td className="py-1.5 px-1 font-mono">₹ {item.unitAmount}</td>
                    <td className="py-1.5 px-1 font-mono">₹ {item.dAmount.toFixed(2)}</td>
                    <td className="py-1.5 px-1 font-mono">₹ {item.cAmount.toFixed(0)}</td>
                    <td className="py-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                        title="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Sticky Summary & Submit Bar matching PDF 1 / PDF 2 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#f8f9fa] border-t border-gray-300 z-20 flex items-stretch">
        <div className="flex-1 grid grid-cols-3 py-1.5 px-2 text-center divide-x divide-gray-200">
          <div>
            <span className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
              COUNT
            </span>
            <span className="text-xs font-bold text-black font-mono">{totalCount}</span>
          </div>
          <div>
            <span className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
              D.AMOUNT
            </span>
            <span className="text-xs font-bold text-black font-mono">₹ {totalDAmount.toFixed(2)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
              C.AMOUNT
            </span>
            <span className="text-xs font-bold text-black font-mono">₹ {totalCAmount.toFixed(0)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmitBooking}
          disabled={loading || stagedItems.length === 0}
          className="text-white font-bold text-xs px-6 py-3 tracking-wider uppercase transition-opacity disabled:opacity-50 flex items-center justify-center shrink-0"
          style={{ backgroundColor: themeBg }}
        >
          {loading ? '...' : 'SUBMIT'}
        </button>
      </div>
    </div>
  );
};
