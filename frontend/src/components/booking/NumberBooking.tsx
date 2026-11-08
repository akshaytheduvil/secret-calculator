import React, { useState, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';
import { Menu, Copy, Camera, X, Clipboard, AlertCircle } from 'lucide-react';
import { parseBookingMessage, ParsedBookingEntry } from '../../utils/smartPasteParser';

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

export type BookingMode = 'Book' | 'Range' | 'Set' | 'Hundreds' | 'Ones';

export const NumberBooking: React.FC<NumberBookingProps> = ({ onOpenMenu }) => {
  const { selectedGame, gameMeta } = useGame();
  const { dealerConfig } = useAuth();

  // Digit Mode: '1' | '2' | '3'
  const [digitMode, setDigitMode] = useState<'1' | '2' | '3'>('3');
  const [bookMode, setBookMode] = useState<BookingMode>('Book');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [startNumber, setStartNumber] = useState('');
  const [endNumber, setEndNumber] = useState('');
  const [count, setCount] = useState<string>('1');
  const [bCount, setBCount] = useState<string>('1');

  // Staged Table Items
  const [stagedItems, setStagedItems] = useState<StagedBookingItem[]>([]);

  // Smart Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<{
    entries: ParsedBookingEntry[];
    errors: string[];
  } | null>(null);

  // Submissions & Feedback
  const [loading, setLoading] = useState(false);
  const [successBillNumber, setSuccessBillNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const startInputRef = useRef<HTMLInputElement>(null);

  // Dynamic price resolution from dealer config or defaults
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
    setEndNumber('');
    setErrorMessage(null);
    if (startInputRef.current) {
      startInputRef.current.focus();
    }
  };

  // Helper: Generate all unique permutations for Set mode
  const getUniquePermutations = (str: string): string[] => {
    if (str.length <= 1) return [str];
    const perms = new Set<string>();
    const permute = (arr: string[], m: string[] = []) => {
      if (arr.length === 0) {
        perms.add(m.join(''));
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };
    permute(str.split(''));
    return Array.from(perms);
  };

  // Helper: Generate range numbers
  const generateRangeNumbers = (start: number, end: number, digits: number): string[] => {
    const result: string[] = [];
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    for (let i = min; i <= max; i++) {
      result.push(String(i).padStart(digits, '0'));
    }
    return result;
  };

  // Helper: Generate hundreds numbers
  const generateHundredsNumbers = (start: number, end: number): string[] => {
    const result: string[] = [];
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    // Find next hundred boundary >= min
    let current = Math.ceil(min / 100) * 100;
    while (current <= max) {
      result.push(String(current).padStart(3, '0'));
      current += 100;
    }
    return result;
  };

  // Helper: Generate repeated triple-digit numbers for Ones mode
  const generateOnesNumbers = (start: number, end: number): string[] => {
    const result: string[] = [];
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    for (let d = 0; d <= 9; d++) {
      const val = d * 111;
      if (val >= min && val <= max) {
        result.push(String(val).padStart(3, '0'));
      }
    }
    return result;
  };

  // Helper to append batch of generated numbers
  const addGeneratedBatchToBill = (
    numbers: string[],
    action: 'SUPER' | 'BOX' | 'BOTH',
    mainCount: number,
    boxCount: number
  ) => {
    if (numbers.length === 0) {
      setErrorMessage('No valid numbers match the specified criteria');
      return;
    }

    const newEntries: StagedBookingItem[] = [];

    for (const num of numbers) {
      if (action === 'SUPER' || action === 'BOTH') {
        const pricing = getPriceForCategory('SUPER');
        newEntries.push({
          id: Math.random().toString(36).substring(7),
          lskCategory: 'SUPER',
          bookedNumber: num,
          count: mainCount,
          unitAmount: pricing.unit,
          dAmount: Number((mainCount * pricing.d).toFixed(2)),
          cAmount: Number((mainCount * pricing.c).toFixed(2))
        });
      }
      if (action === 'BOX' || action === 'BOTH') {
        const cnt = action === 'BOTH' ? boxCount : mainCount;
        const pricing = getPriceForCategory('BOX');
        newEntries.push({
          id: Math.random().toString(36).substring(7),
          lskCategory: 'BOX',
          bookedNumber: num,
          count: cnt,
          unitAmount: pricing.unit,
          dAmount: Number((cnt * pricing.d).toFixed(2)),
          cAmount: Number((cnt * pricing.c).toFixed(2))
        });
      }
    }

    setStagedItems((prev) => [...prev, ...newEntries]);
  };

  // Add single items handler (Manual Book mode)
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

  // Main 3-Digit Action handler: respects Book, Set, Range, Hundreds, Ones
  const handle3DigitAction = (action: 'SUPER' | 'BOX' | 'BOTH') => {
    setErrorMessage(null);
    const mainCount = parseInt(count, 10) || 1;
    const boxCount = parseInt(bCount, 10) || 1;

    // 1. Manual Book Mode
    if (bookMode === 'Book') {
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
      return;
    }

    // 2. Set Mode (All unique permutations of input number)
    if (bookMode === 'Set') {
      const trimmed = startNumber.trim();
      if (!trimmed || trimmed.length !== 3) {
        setErrorMessage('Please enter a 3-digit number for Set mode');
        return;
      }
      const perms = getUniquePermutations(trimmed);
      addGeneratedBatchToBill(perms, action, mainCount, boxCount);
      setStartNumber('');
      if (startInputRef.current) startInputRef.current.focus();
      return;
    }

    // 3. Range Mode
    if (bookMode === 'Range') {
      const start = parseInt(startNumber.trim(), 10);
      const end = parseInt(endNumber.trim(), 10);
      if (isNaN(start) || isNaN(end)) {
        setErrorMessage('Please enter valid Start and End numbers for Range');
        return;
      }
      const numbers = generateRangeNumbers(start, end, parseInt(digitMode, 10));
      addGeneratedBatchToBill(numbers, action, mainCount, boxCount);
      setStartNumber('');
      setEndNumber('');
      return;
    }

    // 4. Hundreds Mode
    if (bookMode === 'Hundreds') {
      const start = parseInt(startNumber.trim(), 10);
      const end = parseInt(endNumber.trim(), 10);
      if (isNaN(start) || isNaN(end)) {
        setErrorMessage('Please enter valid Start and End numbers for Hundreds');
        return;
      }
      const numbers = generateHundredsNumbers(start, end);
      addGeneratedBatchToBill(numbers, action, mainCount, boxCount);
      setStartNumber('');
      setEndNumber('');
      return;
    }

    // 5. Ones Mode
    if (bookMode === 'Ones') {
      const start = parseInt(startNumber.trim(), 10);
      const end = parseInt(endNumber.trim(), 10);
      if (isNaN(start) || isNaN(end)) {
        setErrorMessage('Please enter valid Start and End numbers for Ones');
        return;
      }
      const numbers = generateOnesNumbers(start, end);
      addGeneratedBatchToBill(numbers, action, mainCount, boxCount);
      setStartNumber('');
      setEndNumber('');
      return;
    }
  };

  // Handle 2-Digit Action Buttons: AB, BC, AC, ALL
  const handle2DigitAction = (action: 'AB' | 'BC' | 'AC' | 'ALL') => {
    const currentCount = parseInt(count, 10) || 1;
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
    const currentCount = parseInt(count, 10) || 1;
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

  // Remove Item from staging bill
  const handleRemoveItem = (id: string) => {
    setStagedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Parse Smart Paste Input
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const res = parseBookingMessage(pastedText);
    setParsedPreview({
      entries: res.entries,
      errors: res.errors
    });
  };

  // Add Smart Parsed entries to Bill
  const handleApplyParsedEntries = () => {
    if (!parsedPreview || parsedPreview.entries.length === 0) return;

    const newEntries: StagedBookingItem[] = [];
    for (const pe of parsedPreview.entries) {
      const pricing = getPriceForCategory(pe.lskCategory);
      newEntries.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: pe.lskCategory,
        bookedNumber: pe.bookedNumber,
        count: pe.count,
        unitAmount: pricing.unit,
        dAmount: Number((pe.count * pricing.d).toFixed(2)),
        cAmount: Number((pe.count * pricing.c).toFixed(2))
      });
    }

    setStagedItems((prev) => [...prev, ...newEntries]);
    setShowPasteModal(false);
    setPastedText('');
    setParsedPreview(null);
  };

  // Paste from Device Clipboard directly into textarea
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        const res = parseBookingMessage(text);
        setParsedPreview({
          entries: res.entries,
          errors: res.errors
        });
      }
    } catch {
      setErrorMessage('Clipboard access denied. Please paste directly into the text box.');
    }
  };

  // Submit Booking (Strict workflow: stage -> inspect -> submit -> persist -> bill number)
  const handleSubmitBooking = async () => {
    setErrorMessage(null);
    setSuccessBillNumber(null);

    if (stagedItems.length === 0) {
      setErrorMessage('Please add numbers to the bill before submitting');
      return;
    }

    if (loading) return; // Prevent duplicate submission
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

      // Reset form and cleared bill
      setCustomerName('');
      setStartNumber('');
      setEndNumber('');
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
  const isRangeTypeMode = ['Range', 'Hundreds', 'Ones'].includes(bookMode);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto relative select-none">
      {/* 1. Top Header */}
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
          {/* Smart Paste Button */}
          <button
            onClick={() => setShowPasteModal(true)}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            title="Smart Paste"
            aria-label="Smart Paste"
          >
            <Clipboard className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            title="Copy"
            aria-label="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleScreenshot}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
            title="Screenshot"
            aria-label="Screenshot"
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
            <h3 className="text-sm font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
            <div className="my-3 py-2 bg-gray-100 rounded text-xs font-mono">
              <span className="text-gray-500 block">Bill Number</span>
              <strong className="text-base text-black">{successBillNumber}</strong>
            </div>
            <p className="text-[11px] text-gray-600 mb-4">
              Saved to database. Available in reports & Last Sale.
            </p>
            <button
              onClick={() => setSuccessBillNumber(null)}
              className="w-full py-2 bg-black text-white text-xs font-bold uppercase rounded"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Smart Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg p-4 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-gray-900">Smart Paste Parser</h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1 text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mt-2">
              Paste customer WhatsApp booking messages (e.g. <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">532.11</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">952 Box.1</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">12 AC.1</code>):
            </p>

            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste WhatsApp messages here..."
              rows={4}
              className="w-full mt-2 border border-gray-300 rounded p-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-black"
            />

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-semibold rounded"
              >
                Paste from Clipboard
              </button>
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-[11px] font-semibold rounded"
              >
                Parse Entries
              </button>
            </div>

            {/* Parsed Preview Section */}
            {parsedPreview && (
              <div className="mt-3 flex-1 overflow-y-auto border-t border-gray-200 pt-2">
                {parsedPreview.errors.length > 0 && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 space-y-1">
                    <div className="flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Parsing Warnings</span>
                    </div>
                    {parsedPreview.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}

                <div className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Parsed Entries ({parsedPreview.entries.length})</span>
                </div>

                {parsedPreview.entries.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No valid entries parsed</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100 text-[11px]">
                    {parsedPreview.entries.map((entry, idx) => (
                      <div key={idx} className="p-1.5 flex items-center justify-between">
                        <div>
                          <strong className="font-mono text-xs">{entry.bookedNumber}</strong>
                          <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-[10px] rounded font-bold">
                            {entry.lskCategory}
                          </span>
                        </div>
                        <span className="font-mono">Count: {entry.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyParsedEntries}
                disabled={!parsedPreview || parsedPreview.entries.length === 0}
                className="px-4 py-1.5 bg-[#ff0000] hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold uppercase rounded shadow-sm"
              >
                Add to Current Bill
              </button>
            </div>
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

        {/* Radio Selector & Top Options Dropdown (Book, Range, Set, Hundreds, Ones) */}
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
              onChange={(e) => {
                setBookMode(e.target.value as BookingMode);
                setStartNumber('');
                setEndNumber('');
                setErrorMessage(null);
              }}
              className="text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded px-2 py-1 outline-none font-semibold cursor-pointer shadow-sm"
            >
              <option value="Book">Book</option>
              <option value="Range">Range</option>
              <option value="Set">Set</option>
              <option value="Hundreds">Hundreds</option>
              <option value="Ones">Ones</option>
            </select>
          </div>
        </div>

        {/* Number Entry Inputs Row */}
        {isRangeTypeMode ? (
          /* Range / Hundreds / Ones: Start | End | Count | B. Count */
          <div className="px-3 py-1 grid grid-cols-4 gap-1.5">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Start</label>
              <input
                ref={startInputRef}
                type="tel"
                maxLength={3}
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value.replace(/\D/g, ''))}
                placeholder={bookMode === 'Hundreds' ? '100' : bookMode === 'Ones' ? '111' : '100'}
                className="w-full border border-gray-300 rounded px-1.5 py-1.5 text-center text-xs font-bold text-black focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">End</label>
              <input
                type="tel"
                maxLength={3}
                value={endNumber}
                onChange={(e) => setEndNumber(e.target.value.replace(/\D/g, ''))}
                placeholder={bookMode === 'Hundreds' ? '500' : bookMode === 'Ones' ? '888' : '150'}
                className="w-full border border-gray-300 rounded px-1.5 py-1.5 text-center text-xs font-bold text-black focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Count</label>
              <input
                type="tel"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded px-1.5 py-1.5 text-center text-xs font-bold text-black focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">B. Count</label>
              <input
                type="tel"
                value={bCount}
                onChange={(e) => setBCount(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded px-1.5 py-1.5 text-center text-xs font-bold text-black focus:outline-none focus:border-black bg-white"
              />
            </div>
          </div>
        ) : (
          /* Book / Set: Start | Count | B. Count */
          <div className="px-3 py-1 grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                {bookMode === 'Set' ? 'Number (Set)' : 'Start'}
              </label>
              <input
                ref={startInputRef}
                type="tel"
                maxLength={parseInt(digitMode)}
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value.replace(/\D/g, ''))}
                placeholder={bookMode === 'Set' ? '685' : ''}
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
        )}

        {/* Category Buttons Row */}
        <div className="px-3 py-2">
          {(digitMode === '3' || isRangeTypeMode || bookMode === 'Set') && (
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

          {!isRangeTypeMode && bookMode === 'Book' && digitMode === '2' && (
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

          {!isRangeTypeMode && bookMode === 'Book' && digitMode === '1' && (
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

        {/* Staged Items Table (Inspection & Editing before submission) */}
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
                    No numbers in current bill. Add numbers above or use Smart Paste.
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
                        title="Delete entry"
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

      {/* Bottom Sticky Summary & Submit Bar */}
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
          className="text-white font-bold text-xs px-6 py-3 tracking-wider uppercase transition-opacity disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md"
          style={{ backgroundColor: themeBg }}
        >
          {loading ? 'SUBMITTING...' : 'SUBMIT'}
        </button>
      </div>
    </div>
  );
};
