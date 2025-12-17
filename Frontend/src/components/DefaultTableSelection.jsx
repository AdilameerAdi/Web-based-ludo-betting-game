import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { userAPI } from '../utils/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function DefaultTableSelection({ onSelectTable, onBack, user }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchingTable, setSearchingTable] = useState(null);
  const [socket, setSocket] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const searchingRef = useRef(false);
  const searchingTableRef = useRef(null);
  const userInfoRef = useRef(null);
  const userRef = useRef(null);

  const tables = [
    { id: 1, amount: 20, prize: 36, color: 'bg-green-100', borderColor: 'border-green-300', textColor: 'text-green-700', icon: '💎' },
    { id: 2, amount: 50, prize: 90, color: 'bg-blue-100', borderColor: 'border-blue-300', textColor: 'text-blue-700', icon: '⭐' },
    { id: 3, amount: 70, prize: 126, color: 'bg-purple-100', borderColor: 'border-purple-300', textColor: 'text-purple-700', icon: '🔥' },
    { id: 4, amount: 100, prize: 180, color: 'bg-orange-100', borderColor: 'border-orange-300', textColor: 'text-orange-700', icon: '👑' }
  ];

  // Update refs when state changes
  useEffect(() => {
    searchingRef.current = searching;
    searchingTableRef.current = searchingTable;
    userInfoRef.current = userInfo;
    userRef.current = user;
  }, [searching, searchingTable, userInfo, user]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Fetch user info
    const fetchUserInfo = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success && result.data) {
          const userData = result.data;
          setUserInfo(userData);
          userInfoRef.current = userData;
        } else {
          // Try to get user from token
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const userData = { id: payload.userId, mobile: payload.mobile || 'Player' };
              setUserInfo(userData);
              userInfoRef.current = userData;
            } catch (e) {
              console.error('Failed to decode token:', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        // Try to get user from token as fallback
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userData = { id: payload.userId, mobile: payload.mobile || 'Player' };
            setUserInfo(userData);
            userInfoRef.current = userData;
          } catch (e) {
            console.error('Failed to decode token:', e);
          }
        }
      }
    };

    fetchUserInfo();

    // Listen for match found
    newSocket.on('match_found', ({ table, opponent }) => {
      console.log('Match found!', table, opponent);
      setSearching(false);
      setSearchingTable(null);
      // Wait a bit for game_started event, but navigate if it doesn't come
      setTimeout(() => {
        if (onSelectTable && !window.gameNavigated) {
          window.gameNavigated = true;
          onSelectTable(table);
        }
      }, 600);
    });

    // Listen for game started - this is the main event to navigate
    newSocket.on('game_started', (table) => {
      console.log('Game started!', table);
      setSearching(false);
      setSearchingTable(null);
      // Navigate to game when game_started is received
      if (onSelectTable) {
        window.gameNavigated = true;
        onSelectTable(table);
      }
    });

    // Listen for search started
    newSocket.on('search_started', ({ tableAmount, position }) => {
      console.log(`Search started for table ${tableAmount}, position: ${position}`);
      setSearching(true);
    });

    // Listen for search cancelled
    newSocket.on('search_cancelled', ({ tableAmount }) => {
      console.log(`Search cancelled for table ${tableAmount}`);
      setSearching(false);
      setSearchingTable(null);
    });

    // Listen for match errors
    newSocket.on('match_error', ({ message }) => {
      console.error('Match error:', message);
      setError(message);
      setSearching(false);
      setSearchingTable(null);
      setTimeout(() => setError(null), 5000);
    });

    // Listen for search errors
    newSocket.on('search_error', ({ message }) => {
      console.error('Search error:', message);
      setError(message);
      setSearching(false);
      setSearchingTable(null);
      setTimeout(() => setError(null), 5000);
    });

    // Cleanup
    return () => {
      // Cancel any active search using refs for latest values
      if (searchingRef.current && searchingTableRef.current && newSocket) {
        const userId = userInfoRef.current?.id || userRef.current?.id || userRef.current?.userId;
        if (userId) {
          newSocket.emit('cancel_search', { userId, tableAmount: searchingTableRef.current.amount });
        }
      }
      // Reset navigation flag
      window.gameNavigated = false;
      newSocket.close();
    };
  }, [onSelectTable]);

  const handleTableSelect = async (table) => {
    if (searching) {
      return; // Already searching
    }

    if (!userInfo && !user) {
      setError('Please login to play');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const userId = userInfo?.id || user?.id || user?.userId;
    const userName = userInfo?.mobile || user?.mobile || 'Player';
    const userMobile = userInfo?.mobile || user?.mobile || '';

    if (!userId) {
      setError('Unable to identify user');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Reset navigation flag when starting new search
    window.gameNavigated = false;
    
    setSelectedTable(table.id);
    setSearchingTable(table);
    setError(null);

    // Emit search_match event
    if (socket) {
      socket.emit('search_match', {
        userId,
        tableAmount: table.amount,
        userName,
        userMobile
      });
    } else {
      setError('Connection error. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelSearch = () => {
    if (socket && searchingTable) {
      const userId = userInfo?.id || user?.id || user?.userId;
      if (userId) {
        socket.emit('cancel_search', { userId, tableAmount: searchingTable.amount });
      }
    }
    setSearching(false);
    setSearchingTable(null);
    setSelectedTable(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="min-h-screen flex flex-col p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 sm:mb-12">
          <button
            onClick={onBack}
            className="group px-6 py-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl text-gray-700 font-semibold flex items-center gap-2 shadow-md hover:shadow-lg border border-gray-200/50 transition-all duration-300 hover:scale-105"
          >
            <span className="text-xl group-hover:-translate-x-1 transition-transform duration-300">←</span>
            <span>Back</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
              Choose Your Table
            </h1>
            <p className="text-gray-600 text-sm font-medium">Select a betting amount to start playing</p>
          </div>

          <div className="w-20"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-7xl">
            {/* Table Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableSelect(table)}
                  disabled={searching}
                  className={`
                    group relative bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8
                    border-2 transition-all duration-300 transform
                    ${selectedTable === table.id 
                      ? `${table.borderColor} shadow-2xl scale-105 ring-4 ${table.borderColor.replace('border-', 'ring-')} ring-opacity-30` 
                      : 'border-gray-200/60 hover:shadow-2xl hover:scale-105 hover:border-gray-300'
                    }
                    ${searching ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    overflow-hidden
                  `}
                >
                  {/* Decorative gradient overlay */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${table.id === 1 ? 'from-green-400 to-emerald-500' : table.id === 2 ? 'from-blue-400 to-cyan-500' : table.id === 3 ? 'from-purple-400 to-pink-500' : 'from-orange-400 to-amber-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                  {/* Colored Top Section */}
                  <div className={`${table.color} rounded-2xl p-6 mb-6 relative overflow-hidden`}>
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    </div>
                    
                    {/* Icon */}
                    <div className="flex justify-center mb-5 relative z-10">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 ${table.color} rounded-2xl flex items-center justify-center border-4 ${table.borderColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-4xl sm:text-5xl filter drop-shadow-lg">{table.icon}</span>
                      </div>
                    </div>
                    
                    {/* Entry Fee */}
                    <div className="text-center relative z-10">
                      <p className={`${table.textColor} text-xs font-bold mb-2 uppercase tracking-widest opacity-80`}>
                        Entry Fee
                      </p>
                      <p className={`${table.textColor} text-4xl sm:text-5xl font-black drop-shadow-sm`}>
                        ₹{table.amount}
                      </p>
                    </div>
                  </div>
                  
                  {/* Win Prize */}
                  <div className="text-center mb-6">
                    <p className="text-gray-500 text-xs font-bold mb-3 uppercase tracking-widest">
                      Win Prize
                    </p>
                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-gray-400 text-lg font-semibold">₹</span>
                      <p className="text-gray-900 text-3xl sm:text-4xl font-black">
                        {table.prize}
                      </p>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6"></div>
                  
                  {/* Players Info */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-full border-4 border-white shadow-md ring-2 ring-red-100"></div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full border-4 border-white shadow-md ring-2 ring-blue-100"></div>
                    </div>
                    <span className="text-gray-700 text-sm font-bold">2 Players</span>
                  </div>

                  {/* Hover effect indicator */}
                  {!searching && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                        <span>Click to Play</span>
                        <span className="text-lg">→</span>
                      </div>
                    </div>
                  )}

                  {/* Searching Overlay */}
                  {searching && searchingTable?.id === table.id && (
                    <div className="absolute inset-0 bg-white/98 backdrop-blur-md flex items-center justify-center rounded-3xl z-20 border-2 border-blue-200">
                      <div className="text-center p-8">
                        <div className="relative mb-6">
                          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                            <span className="text-4xl">🔍</span>
                          </div>
                          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                        </div>
                        <p className="text-gray-900 font-bold text-xl mb-2">Searching for opponent...</p>
                        <p className="text-gray-600 text-sm mb-6 font-medium">Please wait while we find you a match</p>
                        <div className="flex justify-center gap-2 mb-6">
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelSearch();
                          }}
                          className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          Cancel Search
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-8 text-center animate-fade-in">
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl shadow-lg backdrop-blur-sm">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <p className="text-red-700 text-sm font-bold">{error}</p>
                </div>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-2xl">💡</span>
                </div>
                <p className="text-gray-700 text-sm font-semibold">
                  Winner takes the entire prize pool • Good luck! <span className="text-lg">🍀</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
