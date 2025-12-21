import { useState, useEffect } from 'react';
import { userAPI } from '../../utils/api';
import DefaultTableSelection from '../game/DefaultTableSelection';
import LudoGameV2 from '../game/LudoGameV2';
import CustomTableForm from '../game/CustomTableForm';
import WaitingRoom from '../game/WaitingRoom';
import AddFunds from '../payment/AddFunds';
import PaymentStatus from '../payment/PaymentStatus';
import WithdrawFunds from '../payment/WithdrawFunds';
import AdminWithdrawals from '../admin/AdminWithdrawals';

export default function UserDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState(() => {
    // Check if there's an active game to rejoin
    const activeGame = localStorage.getItem('activeGame');
    if (activeGame) {
      return 'game';
    }
    return 'dashboard';
  });
  const [selectedTable, setSelectedTable] = useState(() => {
    // Restore active game table from localStorage
    const activeGame = localStorage.getItem('activeGame');
    if (activeGame) {
      try {
        return JSON.parse(activeGame);
      } catch {
        localStorage.removeItem('activeGame');
        return null;
      }
    }
    return null;
  });
  const [balance, setBalance] = useState(0); // Available balance in INR
  const [winningBalance, setWinningBalance] = useState(0); // Winning balance (withdrawable) in INR
  // eslint-disable-next-line no-unused-vars
  const [createdTableLink, setCreatedTableLink] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  // Check for payment status in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const orderId = urlParams.get('orderId');
    const message = urlParams.get('message');
    
    if (status && orderId) {
      setPaymentStatus({ status, orderId, message });
      setView('paymentStatus');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success) {
          setProfile(result.data);
          setBalance(result.data.balance || result.data.available_balance || 0);
          const winningBal = result.data.winning_balance || result.data.winningBalance || 0;
          setWinningBalance(winningBal);
          console.log('[Dashboard] Profile loaded:', {
            balance: result.data.balance,
            winning_balance: result.data.winning_balance,
            winningBalance: result.data.winningBalance,
            allData: result.data
          });
          // Check if user is admin
          setIsAdmin(result.data.is_admin === true || result.data.is_admin === 'true');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching profile:', error);
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    
    // Refresh balance periodically
    const interval = setInterval(fetchProfile, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) {
      onLogout();
    }
  };

  const handleAddFunds = () => {
    setView('addFunds');
  };

  const handleAddFundsSuccess = () => {
    // Refresh balance after successful payment
    const fetchProfile = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success) {
          setProfile(result.data);
          setBalance(result.data.balance || result.data.available_balance || 0);
          setWinningBalance(result.data.winning_balance || result.data.winningBalance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  };

  const handleWithdrawFunds = () => {
    setView('withdrawFunds');
  };

  const handleAdminWithdrawals = () => {
    setView('adminWithdrawals');
  };

  const handleWithdrawSuccess = () => {
    // Refresh balance after withdrawal request
    const fetchProfile = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success) {
          setProfile(result.data);
          setBalance(result.data.balance || result.data.available_balance || 0);
          setWinningBalance(result.data.winning_balance || result.data.winningBalance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  };

  const handleDefaultTable = () => {
    setView('tableSelection');
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setView('game');
    // Save active game to localStorage for page reload recovery
    localStorage.setItem('activeGame', JSON.stringify(table));
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedTable(null);
    // Clear active game from localStorage
    localStorage.removeItem('activeGame');
  };

  // eslint-disable-next-line no-unused-vars
  const handleGameEnd = (result) => {
    // Clear active game from localStorage
    localStorage.removeItem('activeGame');
    // Handle game end logic (update balance, etc.)
    // Refresh balance
    const fetchProfile = async () => {
      try {
        const profileResult = await userAPI.getProfile();
        if (profileResult.success) {
          setProfile(profileResult.data);
          setBalance(profileResult.data.balance || profileResult.data.available_balance || 0);
          setWinningBalance(profileResult.data.winning_balance || profileResult.data.winningBalance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
    // Go back to dashboard after a delay
    setTimeout(() => {
      handleBackToDashboard();
    }, 3000);
  };

  // Handle explicit leave game (forfeit)
  const handleLeaveGame = () => {
    // This will be called when user clicks Leave button
    // The LudoGameV2 component will handle emitting the forfeit event
    localStorage.removeItem('activeGame');
    setView('dashboard');
    setSelectedTable(null);
  };

  const handleCustomTable = () => {
    setView('customTable');
  };

  const handleWaitingRooms = () => {
    setView('waitingRoom');
  };

  const handleTableCreated = (table, tableLink) => {
    setCreatedTableLink(tableLink);
    setSelectedTable(table);
    // Show success message and option to go to waiting room or share link
    alert(`Table created successfully! Link: ${tableLink}`);
    setView('waitingRoom');
  };

  const handleJoinTable = (table) => {
    setSelectedTable(table);
    setView('game');
    // Save active game to localStorage for page reload recovery
    localStorage.setItem('activeGame', JSON.stringify(table));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show table selection screen
  if (view === 'tableSelection') {
    return <DefaultTableSelection onSelectTable={handleTableSelect} onBack={handleBackToDashboard} user={user || profile} />;
  }

  // Show custom table form
  if (view === 'customTable') {
    return <CustomTableForm user={user || profile} onTableCreated={handleTableCreated} onBack={handleBackToDashboard} />;
  }

  // Show waiting room
  if (view === 'waitingRoom') {
    return <WaitingRoom user={user || profile} onJoinTable={handleJoinTable} onBack={handleBackToDashboard} />;
  }

  // Show add funds
  if (view === 'addFunds') {
    return <AddFunds user={user || profile} onBack={handleBackToDashboard} onSuccess={handleAddFundsSuccess} />;
  }

  // Show withdraw funds
  if (view === 'withdrawFunds') {
    return <WithdrawFunds user={user || profile} winningBalance={winningBalance} onBack={handleBackToDashboard} onSuccess={handleWithdrawSuccess} />;
  }

  // Show admin withdrawals
  if (view === 'adminWithdrawals') {
    return <AdminWithdrawals user={user || profile} onBack={handleBackToDashboard} />;
  }

  // Show payment status
  if (view === 'paymentStatus' && paymentStatus) {
    return (
      <PaymentStatus 
        status={paymentStatus.status} 
        orderId={paymentStatus.orderId} 
        message={paymentStatus.message}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Show game screen
  if (view === 'game' && selectedTable) {
    return <LudoGameV2 table={selectedTable} onBack={handleBackToDashboard} onGameEnd={handleGameEnd} onLeave={handleLeaveGame} />;
  }

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Colored Navbar Section */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-12 h-12 sm:w-16 sm:h-16 bg-red-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-20 right-10 sm:top-40 sm:right-20 w-8 h-8 sm:w-12 sm:h-12 bg-blue-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-10 h-10 sm:w-14 sm:h-14 bg-yellow-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}></div>
          <div className="absolute bottom-10 right-1/3 w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }}></div>
          
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-8 h-full w-full">
              {[...Array(64)].map((_, i) => (
                <div 
                  key={i} 
                  className={`border border-white/30 ${
                    Math.floor(i / 8) % 2 === 0 
                      ? (i % 2 === 0 ? 'bg-yellow-400' : 'bg-red-400')
                      : (i % 2 === 0 ? 'bg-red-400' : 'bg-yellow-400')
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Navbar Content */}
        <div className="relative z-10 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Left: Logo */}
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl animate-spin-slow">🎲</span>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-2xl">LUDO GAME</h1>
                  <p className="text-yellow-300 text-xs sm:text-sm font-semibold">Premium Gaming</p>
                </div>
              </div>

              {/* Right: Balance and Buttons */}
              <div className="flex flex-col items-end gap-2 sm:gap-3">
                {/* First Line: Available Balance and Add Funds */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg text-xs sm:text-sm`}>
                    Available Balance: INR {balance.toLocaleString()}
                  </div>
                  <button
                    onClick={handleAddFunds}
                    className="px-3 sm:px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs sm:text-sm"
                  >
                    💰 Add Funds
                  </button>
                </div>

                {/* Second Line: Winning Balance and Withdraw Funds */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg text-xs sm:text-sm`}>
                    Winning Balance: INR {winningBalance.toLocaleString()}
                  </div>
                  <button
                    onClick={handleWithdrawFunds}
                    disabled={winningBalance <= 0}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs sm:text-sm ${
                      winningBalance <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={winningBalance <= 0 ? 'No winning balance available for withdrawal' : 'Withdraw Funds'}
                  >
                    💸 Withdraw Funds
                  </button>
                </div>

                {/* Buttons Row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className={`p-2 sm:p-2.5 rounded-lg font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 ${
                      isDark 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                    }`}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {isDark ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                  </button>

                  {/* Admin Panel (only for admins) */}
                  {isAdmin && (
                    <button
                      onClick={handleAdminWithdrawals}
                      className="px-3 sm:px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs sm:text-sm"
                      title="Admin Panel"
                    >
                      👨‍💼 Admin
                    </button>
                  )}

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="px-4 sm:px-5 py-2 rounded-lg font-bold text-white bg-red-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs sm:text-sm"
                  >
                     Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Light/White Content Section */}
      <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Game Options Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Default Table Game */}
            <button
              onClick={handleDefaultTable}
              className={`${
                isDark 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 group`}
            >
              <div className="text-center">
                <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <span className="text-5xl">🤝</span>
                </div>
                <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                 Start a Game
                </h2>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Join pre-created betting tables
                </p>
                <p className={`text-xs mb-4 font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  Place bets & play with others
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
                  <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg"></div>
                  <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg"></div>
                  <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
                </div>
              </div>
            </button>

            {/* Custom Table */}
            <button
              onClick={handleCustomTable}
              className={`${
                isDark 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 group`}
            >
              <div className="text-center">
                <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <span className="text-5xl">👥</span>
                </div>
                <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  Custom Table
                </h2>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Create your own betting table
                </p>
                <p className={`text-xs mb-4 font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  Set bet amount & invite players
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full shadow-lg"></div>
                  <div className="w-4 h-4 bg-pink-500 rounded-full shadow-lg"></div>
                  <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-lg"></div>
                  <div className="w-4 h-4 bg-rose-500 rounded-full shadow-lg"></div>
                </div>
              </div>
            </button>

            {/* Waiting Rooms */}
            <button
              onClick={handleWaitingRooms}
              className={`${
                isDark 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 group`}
            >
              <div className="text-center">
                <div className="inline-block p-4 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <span className="text-5xl">🚪</span>
                </div>
                <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                 Join a Game.
                </h2>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Browse available betting rooms
                </p>
                <p className={`text-xs mb-4 font-semibold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  Join rooms waiting for players
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-4 h-4 bg-cyan-500 rounded-full shadow-lg animate-pulse"></div>
                  <div className="w-4 h-4 bg-teal-500 rounded-full shadow-lg animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-lg animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
              </div>
            </button>
          </div>

          {/* User Info Card */}
          <div className={`${
            isDark 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-gray-50 border-gray-200'
          } rounded-2xl p-6 shadow-xl max-w-md mx-auto border-2`}>
            <div className="text-center">
              <div className="inline-block p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg">
                <span className="text-3xl">👤</span>
              </div>
              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Logged in as
              </p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {profile?.mobile || user?.mobile || 'N/A'}
              </p>
              {isAdmin && (
                <div className="mt-3 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg inline-block">
                  <p className="text-white text-xs font-bold">👨‍💼 Admin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
