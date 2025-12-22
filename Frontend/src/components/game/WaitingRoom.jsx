import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
// eslint-disable-next-line no-unused-vars
import { userAPI } from '../../utils/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function WaitingRoom({ user, onJoinTable, onBack }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Join waiting room to receive real-time updates
    newSocket.emit('join_waiting_room');

    // Listen for tables update
    newSocket.on('tables_update', (tablesArray) => {
      setTables(tablesArray);
      setLoading(false);
    });

    // Listen for new table created
    newSocket.on('table_created', (table) => {
      console.log('[WaitingRoom] table_created received:', table.id);
      // Normalize table object
      const normalizedTable = {
        ...table,
        creator_id: table.creator_id || table.creatorId,
        creatorId: table.creatorId || table.creator_id,
        bet_amount: table.bet_amount || table.betAmount,
        betAmount: table.betAmount || table.bet_amount,
      };
      setTables(prev => {
        // Check if table already exists
        const exists = prev.find(t => t.id === normalizedTable.id);
        if (exists) {
          return prev.map(t => t.id === normalizedTable.id ? normalizedTable : t);
        }
        return [normalizedTable, ...prev];
      });
    });

    // Listen for table updates
    newSocket.on('table_updated', (table) => {
      console.log('[WaitingRoom] table_updated received:', table.id, 'players:', table.players?.length);
      // Normalize table object to have both camelCase and snake_case properties
      const normalizedTable = {
        ...table,
        creator_id: table.creator_id || table.creatorId,
        creatorId: table.creatorId || table.creator_id,
        bet_amount: table.bet_amount || table.betAmount,
        betAmount: table.betAmount || table.bet_amount,
        created_at: table.created_at || table.createdAt,
        createdAt: table.createdAt || table.created_at,
      };
      setTables(prev => prev.map(t => t.id === normalizedTable.id ? normalizedTable : t));
    });

    // Listen for player joined
    newSocket.on('player_joined', ({ table, userId: joinedUserId }) => {
      console.log('[WaitingRoom] player_joined received:', table.id, 'by user:', joinedUserId);
      const normalizedTable = {
        ...table,
        creator_id: table.creator_id || table.creatorId,
        creatorId: table.creatorId || table.creator_id,
        bet_amount: table.bet_amount || table.betAmount,
        betAmount: table.betAmount || table.bet_amount,
      };
      setTables(prev => prev.map(t => t.id === normalizedTable.id ? normalizedTable : t));
    });

    // Listen for table removed
    newSocket.on('table_removed', ({ tableId }) => {
      console.log('[WaitingRoom] table_removed received:', tableId);
      // Get current user ID
      const token = localStorage.getItem('token');
      let currentUserId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.userId;
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      currentUserId = currentUserId || user?.id || user?.userId;

      // Only remove the table if user is NOT a player in it
      // This prevents premature removal when both players are waiting
      setTables(prev => {
        const tableToRemove = prev.find(t => t.id === tableId);
        if (tableToRemove && tableToRemove.players && tableToRemove.players.includes(currentUserId)) {
          console.log('[WaitingRoom] Ignoring table_removed - user is a player in this table');
          return prev;
        }
        return prev.filter(t => t.id !== tableId);
      });
    });

    // Listen for table ready (when second player joins)
    newSocket.on('table_ready', (table) => {
      console.log('[WaitingRoom] table_ready received:', table.id, 'players:', table.players);
      // Normalize table object
      const normalizedTable = {
        ...table,
        creator_id: table.creator_id || table.creatorId,
        creatorId: table.creatorId || table.creator_id,
        bet_amount: table.bet_amount || table.betAmount,
        betAmount: table.betAmount || table.bet_amount,
      };
      // Update the table in the list (don't remove - it stays until game starts)
      setTables(prev => prev.map(t => t.id === normalizedTable.id ? normalizedTable : t));

      // If current user is in this table, join the table room
      const token = localStorage.getItem('token');
      let userId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId;
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      userId = userId || user?.id || user?.userId;
      if (normalizedTable.players && normalizedTable.players.includes(userId)) {
        // Join the table room so we receive game_started event
        newSocket.emit('join_table', { tableId: normalizedTable.id, userId });
        console.log(`Joined table room after table_ready: ${normalizedTable.id}`);
      }
    });

    // Listen for all players ready (both players are in socket room)
    // eslint-disable-next-line no-unused-vars
    newSocket.on('all_players_ready', ({ tableId, table }) => {
      console.log('[WaitingRoom] all_players_ready received:', tableId);
      // Mark the table as truly ready for starting
      setTables(prev => prev.map(t => {
        if (t.id === tableId) {
          return { ...t, socketReady: true };
        }
        return t;
      }));
    });

    // Listen for game started
    newSocket.on('game_started', (table) => {
      console.log('[WaitingRoom] game_started received:', table.id, 'players:', table.players);
      setTables(prev => prev.filter(t => t.id !== table.id));
      // If current user is in this table, navigate to game
      const token = localStorage.getItem('token');
      let userId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId;
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      userId = userId || user?.id || user?.userId;
      console.log('[WaitingRoom] Checking if user', userId, 'is in table players:', table.players);
      if (table.players && table.players.includes(userId) && onJoinTable) {
        console.log('[WaitingRoom] User is in table, navigating to game');
        onJoinTable(table);
      }
    });

    // Listen for table timeout
    newSocket.on('table_timeout', ({ tableId, message }) => {
      console.log('[WaitingRoom] table_timeout received:', tableId, message);
      setTables(prev => prev.filter(t => t.id !== tableId));
      // Show alert with the timeout message
      if (message) {
        alert(message);
      } else {
        alert('Table timed out after 2 minutes. Your balance has been refunded.');
      }
    });

    // Listen for start game error
    newSocket.on('start_game_error', ({ tableId, message }) => {
      console.log('[WaitingRoom] start_game_error received:', tableId, message);
      alert(`Failed to start game: ${message}`);
    });

    // Listen for table joined confirmation
    newSocket.on('table_joined', ({ table, userId: joinedUserId }) => {
      console.log('[WaitingRoom] table_joined received:', table.id, 'for user:', joinedUserId);
      // Update the table in the list
      const normalizedTable = {
        ...table,
        creator_id: table.creator_id || table.creatorId,
        creatorId: table.creatorId || table.creator_id,
        bet_amount: table.bet_amount || table.betAmount,
        betAmount: table.betAmount || table.bet_amount,
      };
      setTables(prev => prev.map(t => t.id === normalizedTable.id ? normalizedTable : t));
    });

    // Listen for join errors
    newSocket.on('join_error', ({ message }) => {
      console.log('[WaitingRoom] join_error received:', message);
      alert(`Join error: ${message}`);
    });

    // Fetch initial tables from API
    const fetchTables = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tables/waiting`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const result = await response.json();
        if (result.success) {
          setTables(result.data || []);

          // Join table rooms for tables where user is already a player
          const token = localStorage.getItem('token');
          let userId = null;
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userId = payload.userId;
            } catch (e) {
              console.error('Failed to decode token:', e);
            }
          }
          userId = userId || user?.id || user?.userId;

          if (userId && result.data) {
            result.data.forEach(table => {
              if (table.players && table.players.includes(userId)) {
                // Join the table room
                newSocket.emit('join_table', { tableId: table.id, userId });
                console.log(`Joined table room on load: ${table.id}`);
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();

    // Cleanup
    return () => {
      newSocket.emit('leave_waiting_room');
      newSocket.close();
    };
  }, [onJoinTable]);

  const handleJoinTable = async (table) => {
    try {
      console.log('[WaitingRoom] handleJoinTable called for table:', table.id);

      const response = await fetch(`${API_BASE_URL}/tables/${table.id}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || 'Failed to join table');
        return;
      }

      console.log('[WaitingRoom] API join successful:', result.data);

      // Get user ID from token
      const token = localStorage.getItem('token');
      let userId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId;
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      userId = userId || user?.id || user?.userId;

      // CRITICAL: Emit socket join_table event IMMEDIATELY after API success
      // This ensures the socket-user mapping is set up on the server
      if (socket) {
        console.log('[WaitingRoom] Emitting join_table for user:', userId);
        socket.emit('join_table', {
          tableId: table.id,
          userId: userId
        });
      }

      // Update local table state with the result from API
      if (result.data) {
        const normalizedTable = {
          ...result.data,
          id: result.data.id,
          creator_id: result.data.creator_id || result.data.creatorId,
          creatorId: result.data.creatorId || result.data.creator_id,
          bet_amount: result.data.bet_amount || result.data.betAmount,
          betAmount: result.data.betAmount || result.data.bet_amount,
          players: result.data.players || [],
          status: result.data.status || 'ready'
        };
        setTables(prev => prev.map(t => t.id === table.id ? normalizedTable : t));
      }

      console.log('[WaitingRoom] Join complete, waiting for server events');
    } catch (error) {
      console.error('[WaitingRoom] Join error:', error);
      alert('Failed to join table: ' + error.message);
    }
  };

  const handleCopyLink = (tableId) => {
    const link = `${window.location.origin}/table/${tableId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Table link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300 p-4`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className={`mb-4 px-4 py-2 rounded-xl font-bold transition-all ${
              isDark
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            } shadow-lg`}
          >
            ← Back
          </button>
          <div className="text-center">
            <div className="inline-block p-4 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl mb-4 shadow-xl">
              <span className="text-5xl">🚪</span>
            </div>
            <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Waiting Rooms
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Browse available custom tables
            </p>
          </div>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading tables...
            </div>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-12">
            <div className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              No tables available
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Create a custom table to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => {
              const playerCount = table.players?.length || 0;
              const isFull = playerCount >= 2;
              
              // Get user ID from token
              const token = localStorage.getItem('token');
              let userId = null;
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  userId = payload.userId;
                } catch (e) {
                  console.error('Failed to decode token:', e);
                }
              }
              userId = userId || user?.id || user?.userId;
              const isCreator = table.creatorId === userId || table.creator_id === userId;
              
              // Mask phone number (e.g., +911234567890 -> +911******0)
              const maskPhone = (phone) => {
                if (!phone) return '';
                const cleaned = phone.replace(/\D/g, '');
                if (cleaned.length >= 10) {
                  const start = cleaned.substring(0, 3);
                  const end = cleaned.substring(cleaned.length - 1);
                  const middle = '*'.repeat(Math.max(0, cleaned.length - 4));
                  return `+${start}${middle}${end}`;
                }
                return phone;
              };
              
              const maskedPhone = maskPhone(table.creatorMobile || table.creatorName || '');
              
              const handleStartGame = () => {
                console.log('[WaitingRoom] handleStartGame called for table:', table.id, 'players:', table.players, 'socketReady:', table.socketReady);
                if (socket && table.players.length === 2) {
                  // First join the table room (in case we're not already in it)
                  console.log('[WaitingRoom] Emitting join_table before start_game');
                  socket.emit('join_table', { tableId: table.id, userId });

                  // Wait a bit longer to ensure both sockets are in the room
                  setTimeout(() => {
                    // Emit start_game - navigation will happen via game_started event
                    console.log('[WaitingRoom] Emitting start_game');
                    socket.emit('start_game', { tableId: table.id });
                  }, 300); // Increased from 100ms to 300ms
                } else {
                  console.log('[WaitingRoom] Cannot start game - socket:', !!socket, 'players:', table.players?.length);
                }
              };
              
              const handleCancel = () => {
                if (socket && isCreator) {
                  socket.emit('cancel_table', { tableId: table.id, userId });
                  setTables(prev => prev.filter(t => t.id !== table.id));
                }
              };
              
              return (
                <div
                  key={table.id}
                  className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border-2 shadow-xl hover:shadow-2xl transition-all`}
                >
                  {/* Invitation Message */}
                  <div className={`${isDark ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border-2 rounded-xl p-4 mb-4`}>
                    <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'} font-semibold text-center`}>
                      {maskedPhone} made a room with bet amount ₹{table.betAmount || table.bet_amount || 0} and invite you to the game
                    </p>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        Table #{table.id.slice(-6)}
                      </h3>
                      {isCreator && (
                        <span className="text-xs font-semibold text-purple-500">Your Table</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyLink(table.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isDark
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      title="Copy table link"
                    >
                      🔗 Share
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Bet Amount:
                      </span>
                      <span className={`text-lg font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        ₹{table.betAmount || table.bet_amount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Players:
                      </span>
                      <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {playerCount}/2
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(2)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-2 rounded ${
                            i < playerCount
                              ? 'bg-green-500'
                              : isDark
                              ? 'bg-gray-700'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {isCreator ? (
                      <>
                        <button
                          onClick={handleStartGame}
                          disabled={!isFull}
                          className={`w-full py-3 rounded-xl font-bold transition-all ${
                            isFull
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-red-500 shadow-lg hover:shadow-xl'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Start the Game
                        </button>
                        <button
                          onClick={handleCancel}
                          className="w-full py-2 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleJoinTable(table)}
                          disabled={isFull}
                          className={`w-full py-3 text-red-500  rounded-xl font-bold transition-all ${
                            isFull
                              ? 'bg-gray-600 cursor-not-allowed'
                              : 'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-red-500 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          Join Now
                        </button>
                        {isFull && (
                          <button
                            onClick={handleStartGame}
                            className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-red-500 shadow-lg hover:shadow-xl transition-all"
                          >
                            Start the Game
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

