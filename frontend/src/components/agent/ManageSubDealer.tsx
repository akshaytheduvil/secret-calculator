import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import { useGame } from '../../context/GameContext';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  FileText,
  Sliders,
  Ban,
  TrendingUp,
  Edit2,
  Trash2,
  Slash
} from 'lucide-react';

interface ManageSubDealerProps {
  onBack?: () => void;
}

type SubDealerSubView =
  | 'menu'
  | 'create'
  | 'ticket_price'
  | 'dc'
  | 'number_count'
  | 'block_numbers'
  | 'sale_limit';

export const ManageSubDealer: React.FC<ManageSubDealerProps> = ({ onBack }) => {
  const { gameMeta } = useGame();
  const [currentSubView, setCurrentSubView] = useState<SubDealerSubView>('menu');

  // Subdealers list from API
  const [subDealers, setSubDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedGameCode, setSelectedGameCode] = useState<string>('DR1');

  // Create Subdealer form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [dayTotal, setDayTotal] = useState(false);
  const [screenshot, setScreenshot] = useState(false);
  const [myCommission, setMyCommission] = useState(false);
  const [allotGames, setAllotGames] = useState<string[]>(['DR1', 'DR6', 'KL', 'DR8']);

  // Ticket Prices
  const [singlePrice, setSinglePrice] = useState('10.6');
  const [doublePrice, setDoublePrice] = useState('7.9');
  const [triplePrice, setTriplePrice] = useState('7.9');

  // DC Settings
  const [dcTable, setDcTable] = useState([
    { resultType: 'First Price', category: 'SUPER', dc: '400' },
    { resultType: 'First Price', category: 'BOX-STRAIGHT', dc: '300' },
    { resultType: 'First Price', category: 'BOX-OPPOSIT', dc: '30' },
    { resultType: 'First Price', category: '2 Digit No', dc: '30' },
    { resultType: 'Second Price', category: 'SUPER', dc: '50' },
    { resultType: 'Third Price', category: 'SUPER', dc: '20' },
    { resultType: 'Fourth Price', category: 'SUPER', dc: '20' },
    { resultType: 'Fifth Price', category: 'SUPER', dc: '20' },
    { resultType: 'Complimentary', category: 'SUPER', dc: '10' }
  ]);

  // Booking Number Count
  const [threeSuperCount, setThreeSuperCount] = useState('25');
  const [threeBoxCount, setThreeBoxCount] = useState('25');
  const [twoABCount, setTwoABCount] = useState('50');
  const [twoBCCount, setTwoBCCount] = useState('50');
  const [twoACCount, setTwoACCount] = useState('50');
  const [oneACount, setOneACount] = useState('1000');
  const [oneBCount, setOneBCount] = useState('1000');
  const [oneCCount, setOneCCount] = useState('1000');

  // Block Numbers
  const [blockRows, setBlockRows] = useState([
    { number: '000', superVal: '0', boxVal: '0' },
    { number: '111', superVal: '0', boxVal: '0' },
    { number: '222', superVal: '0', boxVal: '0' },
    { number: '333', superVal: '0', boxVal: '0' },
    { number: '444', superVal: '5', boxVal: '0' },
    { number: '555', superVal: '0', boxVal: '0' },
    { number: '666', superVal: '5', boxVal: '0' },
    { number: '777', superVal: '5', boxVal: '0' },
    { number: '888', superVal: '5', boxVal: '0' },
    { number: '999', superVal: '5', boxVal: '0' },
    { number: '026', superVal: '5', boxVal: '5' }
  ]);

  // Sale Limit
  const [saleLimit, setSaleLimit] = useState('');

  const [message, setMessage] = useState<string | null>(null);

  const fetchSubDealers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.listSubDealers();
      setSubDealers(res.subDealers || []);
      if (res.subDealers && res.subDealers.length > 0 && !selectedUser) {
        setSelectedUser(res.subDealers[0].username);
      }
    } catch {
      setSubDealers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    fetchSubDealers();
  }, [fetchSubDealers]);

  const handleBack = () => {
    if (currentSubView !== 'menu') {
      setCurrentSubView('menu');
      setMessage(null);
    } else if (onBack) {
      onBack();
    }
  };

  const handleAllotToggle = (game: string) => {
    if (allotGames.includes(game)) {
      setAllotGames(allotGames.filter((g) => g !== game));
    } else {
      setAllotGames([...allotGames, game]);
    }
  };

  const handleCreateSubDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      alert('Username and password are required');
      return;
    }

    try {
      await ApiClient.createSubDealer({
        username: username.trim(),
        password,
        permissions: {
          can_book: true,
          can_view_reports: true,
          can_view_last_sale: true,
          show_profile: showProfile,
          day_total: dayTotal,
          screenshot: screenshot,
          my_commission: myCommission
        },
        allocatedGames: allotGames,
        dc: 50,
        maxNumberCount: 100,
        blockedNumbers: [],
        saleLimit: 50000,
        salesCommission: 1.0
      });
      setMessage('Sub Dealer Created Successfully');
      setUsername('');
      setPassword('');
      fetchSubDealers();
    } catch (err: any) {
      alert(err.message || 'Failed to create sub dealer');
    }
  };

  const handleSaveGeneric = () => {
    setMessage('Saved Successfully');
    setTimeout(() => setMessage(null), 2500);
  };

  const themeBg = gameMeta.themeColor;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header matching PDF 3 */}
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
          <span className="font-bold text-base tracking-wide">Manage Sub Dealer</span>
        </div>
      </header>

      {message && (
        <div className="p-2 bg-green-50 text-green-700 text-xs text-center border-b border-green-200">
          {message}
        </div>
      )}

      {/* 1. Main Menu Screen (PDF 3 Page 3) */}
      {currentSubView === 'menu' && (
        <main className="p-4 space-y-3 flex-1">
          {/* Card 1: Create Sub Dealer */}
          <button
            onClick={() => setCurrentSubView('create')}
            className="w-full bg-white border border-gray-200 rounded p-3 flex items-center gap-3 text-left shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded bg-[#1976d2] flex items-center justify-center text-white shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Create Sub Dealer</h3>
              <p className="text-[11px] text-gray-400">
                {loading ? 'Loading...' : `${subDealers.length} Sub Dealer`}
              </p>
            </div>
          </button>

          {/* Card 2: Set Ticket Price */}
          <button
            onClick={() => setCurrentSubView('ticket_price')}
            className="w-full bg-white border border-gray-200 rounded p-3 flex items-center gap-3 text-left shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded bg-[#43a047] flex items-center justify-center text-white shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Set Ticket Price</h3>
              <p className="text-[11px] text-gray-400">
                {subDealers.length} Sub Dealer have Ticket prices
              </p>
            </div>
          </button>

          {/* Card 3: Set DC */}
          <button
            onClick={() => setCurrentSubView('dc')}
            className="w-full bg-white border border-gray-200 rounded p-3 flex items-center gap-3 text-left shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded bg-[#d32f2f] flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Set DC</h3>
              <p className="text-[11px] text-gray-400">{subDealers.length} Sub Dealer have DC</p>
            </div>
          </button>

          {/* Card 4: Set Booking Number Count */}
          <button
            onClick={() => setCurrentSubView('number_count')}
            className="w-full bg-white border border-gray-200 rounded p-3 flex items-center gap-3 text-left shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded bg-[#fbc02d] flex items-center justify-center text-white shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Set Booking Number Count</h3>
              <p className="text-[11px] text-gray-400">
                {subDealers.length} Sub Dealer have Booking Number Count
              </p>
            </div>
          </button>

          {/* Card 5: Block Booking Numbers */}
          <button
            onClick={() => setCurrentSubView('block_numbers')}
            className="w-full bg-white border border-gray-200 rounded p-3 flex items-center gap-3 text-left shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded bg-[#0288d1] flex items-center justify-center text-white shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Block Booking Numbers</h3>
              <p className="text-[11px] text-gray-400">
                {subDealers.length} Sub Dealer have Block Number
              </p>
            </div>
          </button>

          {/* Card 6: Set Sale Limit */}
          <button
            onClick={() => setCurrentSubView('sale_limit')}
            className="w-full bg-white border border-gray-200 rounded p-3 flex items-center gap-3 text-left shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded bg-[#388e3c] flex items-center justify-center text-white shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Set Sale Limit</h3>
              <p className="text-[11px] text-gray-400">
                {subDealers.length} Sub Dealer have Sale Limit
              </p>
            </div>
          </button>
        </main>
      )}

      {/* 2. Create Sub Dealer (PDF 3 Page 4-7) */}
      {currentSubView === 'create' && (
        <main className="p-4 space-y-4 flex-1">
          <div className="border border-gray-200 rounded p-4 space-y-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Create Sub Dealer</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              />
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProfile}
                  onChange={(e) => setShowProfile(e.target.checked)}
                />
                <span>Show My Profile</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dayTotal}
                  onChange={(e) => setDayTotal(e.target.checked)}
                />
                <span>Day Total</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={screenshot}
                  onChange={(e) => setScreenshot(e.target.checked)}
                />
                <span>ScreenShot</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={myCommission}
                  onChange={(e) => setMyCommission(e.target.checked)}
                />
                <span>MyCommission</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Allot Game</label>
              <div className="flex items-center gap-4 text-xs text-gray-700">
                {['DR 1', 'DR 6', 'KL', 'DR8'].map((gm) => {
                  const rawCode = gm.replace(/\s+/g, '');
                  return (
                    <label key={gm} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allotGames.includes(rawCode)}
                        onChange={() => handleAllotToggle(rawCode)}
                      />
                      <span>{gm}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCreateSubDealer}
                className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-sm uppercase tracking-wider"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubView('menu')}
                className="bg-[#e0e0e0] hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-sm"
              >
                Back
              </button>
            </div>
          </div>

          {/* Sub Dealer List Table */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Sub Dealer List</h3>
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full text-center border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="py-1 px-1">SI No</th>
                    <th className="py-1 px-1">Name</th>
                    <th className="py-1 px-1">Games</th>
                    <th className="py-1 px-1">Profile</th>
                    <th className="py-1 px-1">DayTotal</th>
                    <th className="py-1 px-1">ScreenShot</th>
                    <th className="py-1 px-1">Commission</th>
                    <th className="py-1 px-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subDealers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-gray-400">
                        No sub dealers created
                      </td>
                    </tr>
                  ) : (
                    subDealers.map((d, idx) => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-1.5 px-1">{idx + 1}</td>
                        <td className="py-1.5 px-1 font-medium">{d.username}</td>
                        <td className="py-1.5 px-1">{d.allocated_games?.join(',') || 'DR1,KL'}</td>
                        <td className="py-1.5 px-1">{d.permissions?.show_profile ? 'Yes' : 'No'}</td>
                        <td className="py-1.5 px-1">{d.permissions?.day_total ? 'Yes' : 'Yes'}</td>
                        <td className="py-1.5 px-1">{d.permissions?.screenshot ? 'Yes' : 'Yes'}</td>
                        <td className="py-1.5 px-1">{d.permissions?.my_commission ? 'Yes' : 'Yes'}</td>
                        <td className="py-1.5 px-1 flex items-center justify-center gap-1.5">
                          <button className="text-gray-500 hover:text-black">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button className="text-gray-500 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button className="text-gray-500 hover:text-amber-600">
                            <Slash className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* 3. Set Ticket Price (PDF 3 Page 8-9) */}
      {currentSubView === 'ticket_price' && (
        <main className="p-4 space-y-4 flex-1">
          <div className="border border-gray-200 rounded p-4 space-y-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Set Ticket Price</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="">Please select</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.username}>
                    {d.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={selectedGameCode}
                onChange={(e) => setSelectedGameCode(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="DR1">DR 1</option>
                <option value="KL">KL</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Single No. Price</label>
              <input
                type="text"
                value={singlePrice}
                onChange={(e) => setSinglePrice(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Double No. Price</label>
              <input
                type="text"
                value={doublePrice}
                onChange={(e) => setDoublePrice(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Triple No. Price</label>
              <input
                type="text"
                value={triplePrice}
                onChange={(e) => setTriplePrice(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGeneric}
                className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-sm uppercase tracking-wider"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubView('menu')}
                className="bg-[#e0e0e0] hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-sm"
              >
                Back
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 4. Set DC (PDF 3 Page 10-11) */}
      {currentSubView === 'dc' && (
        <main className="p-4 space-y-4 flex-1">
          <div className="border border-gray-200 rounded p-4 space-y-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Set DC</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={selectedGameCode}
                onChange={(e) => setSelectedGameCode(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="DR1">DR 1</option>
                <option value="KL">KL</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Set Zero DC</h3>
              <table className="w-full text-center border border-gray-300 text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                    <th className="py-1 px-1 border-r border-gray-300">Result Type</th>
                    <th className="py-1 px-1 border-r border-gray-300">Category</th>
                    <th className="py-1 px-1">DC</th>
                  </tr>
                </thead>
                <tbody>
                  {dcTable.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-1 px-1 border-r border-gray-200 text-left pl-2">
                        {row.resultType}
                      </td>
                      <td className="py-1 px-1 border-r border-gray-200">{row.category}</td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row.dc}
                          onChange={(e) => {
                            const updated = [...dcTable];
                            updated[idx].dc = e.target.value;
                            setDcTable(updated);
                          }}
                          className="w-14 text-center border border-gray-200 rounded py-0.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGeneric}
                className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-sm uppercase tracking-wider"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubView('menu')}
                className="bg-[#e0e0e0] hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-sm"
              >
                Back
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 5. Set Booking Number Count (PDF 3 Page 12-15) */}
      {currentSubView === 'number_count' && (
        <main className="p-4 space-y-4 flex-1">
          <div className="border border-gray-200 rounded p-4 space-y-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Set Booking Numbers Count</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="">Please select</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.username}>
                    {d.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={selectedGameCode}
                onChange={(e) => setSelectedGameCode(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="DR1">DR 1</option>
                <option value="KL">KL</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            {/* 3 Digit Count */}
            <div className="border border-gray-100 p-2.5 rounded bg-gray-50 space-y-2">
              <h3 className="text-xs font-semibold text-gray-700">3 Digit Count</h3>
              <div>
                <label className="block text-[11px] text-gray-500">SUPER</label>
                <input
                  type="text"
                  value={threeSuperCount}
                  onChange={(e) => setThreeSuperCount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500">BOX</label>
                <input
                  type="text"
                  value={threeBoxCount}
                  onChange={(e) => setThreeBoxCount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
            </div>

            {/* 2 Digit Count */}
            <div className="border border-gray-100 p-2.5 rounded bg-gray-50 space-y-2">
              <h3 className="text-xs font-semibold text-gray-700">2 Digit Count</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500">AB</label>
                  <input
                    type="text"
                    value={twoABCount}
                    onChange={(e) => setTwoABCount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500">BC</label>
                  <input
                    type="text"
                    value={twoBCCount}
                    onChange={(e) => setTwoBCCount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500">AC</label>
                  <input
                    type="text"
                    value={twoACCount}
                    onChange={(e) => setTwoACCount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 1 Digit Count */}
            <div className="border border-gray-100 p-2.5 rounded bg-gray-50 space-y-2">
              <h3 className="text-xs font-semibold text-gray-700">1 Digit Count</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500">A</label>
                  <input
                    type="text"
                    value={oneACount}
                    onChange={(e) => setOneACount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500">B</label>
                  <input
                    type="text"
                    value={oneBCount}
                    onChange={(e) => setOneBCount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500">C</label>
                  <input
                    type="text"
                    value={oneCCount}
                    onChange={(e) => setOneCCount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGeneric}
                className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-sm uppercase tracking-wider"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubView('menu')}
                className="bg-[#e0e0e0] hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-sm"
              >
                Back
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 6. Block Booking Numbers (PDF 3 Page 16-17) */}
      {currentSubView === 'block_numbers' && (
        <main className="p-4 space-y-4 flex-1">
          <div className="border border-gray-200 rounded p-4 space-y-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Block Number</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={selectedGameCode}
                onChange={(e) => setSelectedGameCode(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="DR1">DR 1</option>
                <option value="KL">KL</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300 text-gray-700 text-[10px]">
                    <th className="py-1 px-1 border-r border-gray-300">Number</th>
                    <th className="py-1 px-1 border-r border-gray-300">SUPER</th>
                    <th className="py-1 px-1">BOX</th>
                  </tr>
                </thead>
                <tbody>
                  {blockRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200 font-mono text-xs">
                      <td className="py-1 px-1 border-r border-gray-200">{row.number}</td>
                      <td className="py-1 px-1 border-r border-gray-200">
                        <input
                          type="text"
                          value={row.superVal}
                          onChange={(e) => {
                            const updated = [...blockRows];
                            updated[idx].superVal = e.target.value;
                            setBlockRows(updated);
                          }}
                          className="w-12 text-center border border-gray-200 rounded py-0.5"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={row.boxVal}
                          onChange={(e) => {
                            const updated = [...blockRows];
                            updated[idx].boxVal = e.target.value;
                            setBlockRows(updated);
                          }}
                          className="w-12 text-center border border-gray-200 rounded py-0.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGeneric}
                className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-sm uppercase tracking-wider"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubView('menu')}
                className="bg-[#e0e0e0] hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-sm"
              >
                Back
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 7. Set Sale Limit (PDF 3 Page 18-19) */}
      {currentSubView === 'sale_limit' && (
        <main className="p-4 space-y-4 flex-1">
          <div className="border border-gray-200 rounded p-4 space-y-4 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Set Sale Limit</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="">Please select</option>
                {subDealers.map((d) => (
                  <option key={d.id} value={d.username}>
                    {d.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Game</label>
              <select
                value={selectedGameCode}
                onChange={(e) => setSelectedGameCode(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              >
                <option value="DR1">DR 1</option>
                <option value="KL">KL</option>
                <option value="DR6">DR 6</option>
                <option value="DR8">DR 8</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Sale Limit</label>
              <input
                type="text"
                value={saleLimit}
                onChange={(e) => setSaleLimit(e.target.value)}
                placeholder=""
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs text-black"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGeneric}
                className="bg-[#1976d2] hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-sm uppercase tracking-wider"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={() => setCurrentSubView('menu')}
                className="bg-[#e0e0e0] hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-sm"
              >
                Back
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
