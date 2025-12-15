import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { userAPI } from '../utils/api';

const SOCKET_URL = 'http://localhost:5000';

export default function CustomTableForm({ user, onTableCreated, onBack }) {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // Fetch user balance and profile
    const fetchBalance = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success && result.data) {
          setProfile(result.data);
          setBalance(result.data.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    fetchBalance();

    // Initialize socket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Listen for table creation success
    newSocket.on('table_created_success', (data) => {
      setLoading(false);
      if (onTableCreated) {
        onTableCreated(data.table, data.tableLink);
      }
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [onTableCreated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const amount = parseFloat(betAmount);
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    if (amount > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      // Create table via API
      const response = await fetch('http://localhost:5000/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ betAmount: amount })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create table');
      }

      // Emit socket event to create table in real-time
      if (socket) {
        // Get user ID from JWT token or profile
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
        userId = userId || user?.id || user?.userId || profile?.id;
        
        socket.emit('create_table', {
          creatorId: userId,
          creatorName: user?.mobile || profile?.mobile || 'Player',
          creatorMobile: result.data.creatorMobile || user?.mobile || profile?.mobile || '',
          betAmount: amount,
          tableId: result.data.id
        });
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to create table');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300 flex items-center justify-center p-4`}>
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 shadow-2xl max-w-md w-full border-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-5xl">👥</span>
          </div>
          <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Create Custom Table
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Set your bet amount and invite players
          </p>
        </div>

        {/* Balance Display */}
        <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4 mb-6`}>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Available Balance:
            </span>
            <span className={`text-xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              ₹{balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bet Amount Input */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Bet Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={betAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                  setBetAmount(value);
                  setError('');
                }
              }}
              placeholder="Enter bet amount"
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-purple-500'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
              required
            />
            {betAmount && parseFloat(betAmount) > balance && (
              <p className="text-red-500 text-xs mt-1">Insufficient balance</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className={`${isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border-2 rounded-xl p-3`}>
              <p className="text-red-500 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                isDark
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > balance}
              className={`flex-1 px-6 py-3 rounded-xl font-extrabold text-blue-700 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl`}
            >
              {loading ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

