import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { ApiClient } from '../../api/client';
import { Award, Share2, Calendar, RefreshCw } from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { selectedGame, gameMeta } = useGame();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getResults(date, selectedGame);
      setResultsList(res.results || []);
    } catch {
      setResultsList([]);
    } finally {
      setLoading(false);
    }
  }, [date, selectedGame]);

  useEffect(() => {
    fetchResults();
    // Real-time synchronization polling every 5 seconds for results
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const handleShare = (gameRes: any) => {
    const text = `🏆 ${selectedGame} Draw Results (${date})\n1st Prize: ${gameRes.first_prize || 'Pending'}\n2nd Prize: ${gameRes.second_prize || 'Pending'}\n3rd Prize: ${gameRes.third_prize || 'Pending'}`;
    if (navigator.share) {
      navigator.share({ title: `${selectedGame} Results`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  };

  const currentResult = resultsList.find((r) => r.game_code === selectedGame) || resultsList[0];

  const compNumbers: string[] = currentResult?.complementary_numbers || [];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Draw Results — {selectedGame}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Live declared winning numbers and complementary awards</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#161820] border border-zinc-700/80 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          <button
            onClick={fetchResults}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Refresh results"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {!currentResult || (!currentResult.first_prize && !currentResult.second_prize && compNumbers.length === 0) ? (
        <div className="p-12 text-center bg-[#161820] rounded-3xl border border-zinc-800 text-zinc-500">
          <Award className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
          <p className="text-sm font-medium">No results declared yet for {selectedGame} on {date}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Prizes Podium */}
          <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: gameMeta.themeColor }}
            />

            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Official Declaration: {date}
              </span>
              <button
                onClick={() => handleShare(currentResult)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Share</span>
              </button>
            </div>

            {/* 1st Prize Feature Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 text-center mb-6 shadow-inner">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                ★ FIRST PRIZE ★
              </span>
              <span className="text-5xl sm:text-6xl font-black font-mono text-white tracking-widest drop-shadow">
                {currentResult.first_prize || '—'}
              </span>
            </div>

            {/* 2nd through 5th Prizes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#12141a] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">2nd Prize</span>
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {currentResult.second_prize || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#12141a] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">3rd Prize</span>
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {currentResult.third_prize || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#12141a] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">4th Prize</span>
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {currentResult.fourth_prize || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#12141a] border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">5th Prize</span>
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {currentResult.fifth_prize || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Last Complementary Numbers in a Three-Column Grid */}
          {compNumbers.length > 0 && (
            <div className="bg-[#161820] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>Last Complementary Numbers</span>
                <span className="text-xs font-normal text-zinc-500 font-mono">({compNumbers.length})</span>
              </h3>

              {/* Three-Column Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {compNumbers.map((num, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#12141a] border border-zinc-800/80 text-center font-mono font-bold text-sm sm:text-base text-zinc-200 hover:border-zinc-700 transition-colors"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
