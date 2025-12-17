import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { userAPI } from '../utils/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function WaitingRoom({ user, onJoinTable, onBack }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
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
      setTables(prev => {
        // Check if table already exists
        const exists = prev.find(t => t.id === table.id);
        if (exists) {
          return prev.map(t => t.id === table.id ? table : t);
        }
        return [table, ...prev];
      });
    });

    // Listen for table updates
    newSocket.on('table_updated', (table) => {
      setTables(prev => prev.map(t => t.id === table.id ? table : t));
    });

    // Listen for table removed
    newSocket.on('table_removed', ({ tableId }) => {
      setTables(prev => prev.filter(t => t.id !== tableId));
    });

    // Listen for table ready (when second player joins)
    newSocket.on('table_ready', (table) => {
      // Remove table from waiting room when it becomes ready
      setTables(prev => prev.filter(t => t.id !== table.id));
      
      // If current user is in this table, they can start the game
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
      if (table.players && table.players.includes(userId)) {
        // Table is ready, user can start game
        // Optionally auto-navigate or show a notification
      }
    });

    // Listen for game started
    newSocket.on('game_started', (table) => {
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
      if (table.players && table.players.includes(userId) && onJoinTable) {
        onJoinTable(table);
      }
    });

    // Listen for table timeout
    newSocket.on('table_timeout', ({ tableId }) => {
      setTables(prev => prev.filter(t => t.id !== tableId));
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

      // Deduct balance when joining
      const { data: updatedUser } = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(r => r.json());

      // Emit socket event
      if (socket) {
        socket.emit('join_table', {
          tableId: table.id,
          userId: userId
        });
      }

      // If table is now full (2 players), it will be removed from waiting room
      // Wait a moment for socket update, then navigate to game if user is in it
      if (result.data.players && result.data.players.length >= 2) {
        // Table will be removed from waiting room via socket event
        // User can start the game from the table ready notification
      }
    } catch (error) {
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
                if (socket && table.players.length === 2) {
                  socket.emit('start_game', { tableId: table.id });
                  if (onJoinTable) {
                    onJoinTable(table);
                  }
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
                          className={`w-full py-3 rounded-xl font-bold transition-all ${
                            isFull
                              ? 'bg-gray-600 text-white cursor-not-allowed'
                              : 'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
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

