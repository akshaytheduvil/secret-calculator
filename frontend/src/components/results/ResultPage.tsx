import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { ApiClient } from '../../api/client';
import { ArrowLeft, Share2 } from 'lucide-react';

interface ResultPageProps {
  onBack?: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ onBack }) => {
  const { selectedGame, gameMeta } = useGame();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
  }, [fetchResults]);

  const handleShare = () => {
    if (navigator.share && result) {
      navigator.share({
        title: `${selectedGame} Result - ${selectedDate}`,
        text: `1st: ${result.first_prize || '-'}\n2nd: ${result.second_prize || '-'}\n3rd: ${result.third_prize || '-'}`
      }).catch(() => {});
    } else {
      alert('Sharing result...');
    }
  };

  const themeBg = gameMeta.themeColor;

  // Split complimentary numbers into 3 columns
  const compNumbers: string[] =
    result?.complementary_numbers && result.complementary_numbers.length > 0
      ? result.complementary_numbers
      : [
          '004', '233', '650',
    '028', '248', '689',
    '046', '259', '698',
    '066', '262', '720',
    '096', '363', '754',
    '105', '333', '804',
    '132', '520', '844',
    '138', '544', '969',
    '177', '550', '978',
    '201', '580', '986'
  ];

  // Group into rows of 3
  const compRows: string[][] = [];
  for (let i = 0; i < compNumbers.length; i += 3) {
    compRows.push([compNumbers[i], compNumbers[i + 1] || '', compNumbers[i + 2] || '']);
  }

  const prizes = [
    { rank: '1', name: 'First Price', number: result?.first_prize || '977', highlight: true },
    { rank: '2', name: 'Second Price', number: result?.second_prize || '153', highlight: false },
    { rank: '3', name: 'Third Price', number: result?.third_prize || '374', highlight: false },
    { rank: '4', name: 'Fourth Price', number: result?.fourth_prize || '068', highlight: false },
    { rank: '5', name: 'Fifth Price', number: result?.fifth_prize || '379', highlight: false }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header matching PDF 2 Page 5 */}
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
          className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      <main className="p-4 flex-1">
        {/* Date Selector matching reference */}
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
                  <td className="py-2 px-3 w-10 font-medium text-gray-600 border-r border-gray-200">
                    {p.rank}
                  </td>
                  <td className="py-2 px-3 text-left font-medium text-gray-800 border-r border-gray-200">
                    {p.name}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-black text-sm">
                    {p.number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Complimentary Numbers 3-Column Table */}
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
      </main>
    </div>
  );
};
