import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft, Share2, Copy, Check, MessageSquare, Send, X } from 'lucide-react';

interface ResultPageProps {
  onBack?: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getResults(selectedDate, selectedGame);
      const matched = res.results?.find((r: any) => r.game_code === selectedGame) || res.results?.[0];
      setResult(matched || null);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [selectedGame, selectedDate]);

  useEffect(() => {
    fetchResults();
    // Real-time synchronization: refresh every 10 seconds to detect newly published Admin results
    const interval = setInterval(() => {
      fetchResults();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  // Format date as DD-MM-YYYY
  const formatDisplayDate = (dStr: string) => {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const formattedDate = formatDisplayDate(selectedDate);

  // Generate automated result message formatting matching Section 15
  const generateShareMessage = () => {
    const first = result?.first_prize || '-';
    const second = result?.second_prize || '-';
    const third = result?.third_prize || '-';
    const fourth = result?.fourth_prize || '-';
    const fifth = result?.fifth_prize || '-';

    return `PICK 3 RESULT\n\nDate: ${formattedDate}\nDraw: ${selectedGame}\n\nFirst Prize: ${first}\nSecond Prize: ${second}\nThird Prize: ${third}\nFourth Prize: ${fourth}\nFifth Prize: ${fifth}`;
  };

  const handleShare = () => {
    const text = generateShareMessage();

    // Check for native mobile share support (WhatsApp, Telegram, SMS native chooser)
    if (navigator.share) {
      navigator
        .share({
          title: `PICK 3 RESULT - ${formattedDate} (${selectedGame})`,
          text
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setShowShareModal(true);
          }
        });
    } else {
      setShowShareModal(true);
    }
  };

  const handleCopyToClipboard = () => {
    const text = generateShareMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeBg = gameMeta.themeColor;

  const compNumbers: string[] =
    result?.complementary_numbers && Array.isArray(result.complementary_numbers)
      ? result.complementary_numbers
      : [];

  // Group into rows of 3
  const compRows: string[][] = [];
  for (let i = 0; i < compNumbers.length; i += 3) {
    compRows.push([compNumbers[i], compNumbers[i + 1] || '', compNumbers[i + 2] || '']);
  }

  const prizes = [
    { rank: '1', name: 'First Prize', number: result?.first_prize || '-', highlight: true },
    { rank: '2', name: 'Second Prize', number: result?.second_prize || '-', highlight: false },
    { rank: '3', name: 'Third Prize', number: result?.third_prize || '-', highlight: false },
    { rank: '4', name: 'Fourth Prize', number: result?.fourth_prize || '-', highlight: false },
    { rank: '5', name: 'Fifth Prize', number: result?.fifth_prize || '-', highlight: false }
  ];

  const shareText = generateShareMessage();

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
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
          <span className="font-bold text-base tracking-wide">Result</span>
        </div>

        <button
          onClick={handleShare}
          className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity flex items-center gap-1.5"
          aria-label="Share Result"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">Share</span>
        </button>
      </header>

      {/* Share Dialog Fallback / Chooser Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Share Result</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="my-3 p-3 bg-gray-50 border border-gray-200 rounded font-mono text-xs whitespace-pre-line text-gray-800">
              {shareText}
            </div>

            {/* Share Target Buttons */}
            <div className="space-y-2 mt-4">
              <button
                onClick={handleCopyToClipboard}
                className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Result Message'}</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#1ebc5a] text-white rounded text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>

              <a
                href={`https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Share via Telegram</span>
              </a>

              <a
                href={`sms:?body=${encodeURIComponent(shareText)}`}
                className="w-full py-2.5 px-3 bg-black hover:bg-gray-800 text-white rounded text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>Share via SMS</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <main className="p-4 flex-1">
        {/* Date Selector */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">
            DATE {loading && <span className="text-[10px] text-gray-400 font-normal lowercase">(loading...)</span>}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2.5 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:border-black"
          />
        </div>

        {/* Prizes Table */}
        <div className="border border-gray-300 rounded overflow-hidden mb-5">
          <table className="w-full text-center border-collapse text-xs">
            <tbody>
              {prizes.map((p) => (
                <tr
                  key={p.rank}
                  className={`border-b border-gray-200 ${
                    p.highlight ? 'bg-[#ffe8d6]' : 'bg-white'
                  }`}
                >
                  <td className="py-2.5 px-3 w-10 font-medium text-gray-600 border-r border-gray-200">
                    {p.rank}
                  </td>
                  <td className="py-2.5 px-3 text-left font-medium text-gray-800 border-r border-gray-200">
                    {p.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-black text-sm">
                    {p.number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Complimentary Numbers 3-Column Table */}
        {compRows.length > 0 ? (
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
              Complementary Numbers
            </h4>
            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full text-center border-collapse text-xs">
                <tbody>
                  {compRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-gray-200 last:border-b-0">
                      <td className="py-2 px-2 font-mono font-medium text-gray-800 border-r border-gray-200">
                        {row[0]}
                      </td>
                      <td className="py-2 px-2 font-mono font-medium text-gray-800 border-r border-gray-200">
                        {row[1]}
                      </td>
                      <td className="py-2 px-2 font-mono font-medium text-gray-800">
                        {row[2]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-dashed border-gray-200 rounded text-center text-xs text-gray-400">
            No complementary numbers published for this draw
          </div>
        )}
      </main>
    </div>
  );
};
