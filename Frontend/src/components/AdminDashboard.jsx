import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import AdminWithdrawals from './AdminWithdrawals';

export default function AdminDashboard() {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'withdrawals', 'commission', 'addFundsHistory', 'users', 'gameHistory', 'changePassword'
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCommission: 0,
    totalAddFunds: 0,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: 0,
    totalUsers: 0,
    totalGames: 0,
    todayCommission: 0,
    todayGames: 0
  });
  const [statsError, setStatsError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('admin');
      
      if (!adminToken || !adminData) {
        navigate('/admin');
        return;
      }

      try {
        setAdmin(JSON.parse(adminData));
        await fetchStats();
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchStats = async () => {
    setStatsError(null);
    try {
      // Try to use the new dashboard-stats endpoint first
      const result = await adminAPI.getDashboardStats();

      if (result.success) {
        setStats({
          totalCommission: result.data.totalCommission || 0,
          totalAddFunds: result.data.totalAddFunds || 0,
          pendingWithdrawals: result.data.pendingWithdrawals || 0,
          pendingWithdrawalAmount: result.data.pendingWithdrawalAmount || 0,
          totalUsers: result.data.totalUsers || 0,
          totalGames: result.data.totalGames || 0,
          todayCommission: result.data.todayCommission || 0,
          todayGames: result.data.todayGames || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStatsError('Failed to load some statistics. Data may be incomplete.');

      // Fallback to individual API calls if dashboard-stats fails
      try {
        const [commissionResult, addFundsResult, withdrawalsResult] = await Promise.all([
          adminAPI.getCommissionStats().catch(() => ({ success: true, data: { total: 0 } })),
          adminAPI.getAddFundsStats().catch(() => ({ success: true, data: { total: 0 } })),
          adminAPI.getAllWithdrawals().catch(() => ({ success: true, data: [] }))
        ]);

        setStats(prev => ({
          ...prev,
          totalCommission: commissionResult.success ? (commissionResult.data.total || 0) : prev.totalCommission,
          totalAddFunds: addFundsResult.success ? (addFundsResult.data.total || 0) : prev.totalAddFunds,
          pendingWithdrawals: withdrawalsResult.success
            ? withdrawalsResult.data.filter(w => w.status === 'pending').length
            : prev.pendingWithdrawals
        }));
      } catch (fallbackError) {
        console.error('Fallback stats fetch also failed:', fallbackError);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show withdrawals page
  if (view === 'withdrawals') {
    return (
      <div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-800">Withdrawal Requests</h2>
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
        <AdminWithdrawals user={admin} onBack={() => setView('dashboard')} />
      </div>
    );
  }

  // Show commission page
  if (view === 'commission') {
    return <CommissionHistory onBack={() => setView('dashboard')} />;
  }

  // Show add funds history page
  if (view === 'addFundsHistory') {
    return <AddFundsHistory onBack={() => setView('dashboard')} />;
  }

  // Show users page
  if (view === 'users') {
    return <UserManagement onBack={() => setView('dashboard')} />;
  }

  // Show game history page
  if (view === 'gameHistory') {
    return <GameHistory onBack={() => setView('dashboard')} />;
  }

  // Show change password page
  if (view === 'changePassword') {
    return <ChangePassword admin={admin} onBack={() => setView('dashboard')} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4 shadow-xl">
                <span className="text-5xl">👨‍💼</span>
              </div>
              <h1 className="text-3xl font-black mb-2 text-gray-800">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Welcome, {admin?.username || 'Admin'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Message */}
        {statsError && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 text-sm font-semibold">{statsError}</p>
          </div>
        )}

        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-semibold mb-1">Total Commission</p>
                <p className="text-2xl font-black text-gray-800">₹{stats.totalCommission.toLocaleString()}</p>
                {stats.todayCommission > 0 && (
                  <p className="text-xs text-green-600 mt-1">+₹{stats.todayCommission.toLocaleString()} today</p>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <span className="text-3xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-semibold mb-1">Total Add Funds</p>
                <p className="text-2xl font-black text-gray-800">₹{stats.totalAddFunds.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <span className="text-3xl">💵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-semibold mb-1">Pending Withdrawals</p>
                <p className="text-2xl font-black text-gray-800">{stats.pendingWithdrawals}</p>
                {stats.pendingWithdrawalAmount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">₹{stats.pendingWithdrawalAmount.toLocaleString()} total</p>
                )}
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <span className="text-3xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-semibold mb-1">Total Users</p>
                <p className="text-2xl font-black text-gray-800">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <span className="text-3xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-semibold mb-1">Total Games Played</p>
                <p className="text-2xl font-black text-gray-800">{stats.totalGames.toLocaleString()}</p>
                {stats.todayGames > 0 && (
                  <p className="text-xs text-blue-600 mt-1">+{stats.todayGames} today</p>
                )}
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl">
                <span className="text-3xl">🎮</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-semibold mb-1">Net Revenue</p>
                <p className="text-2xl font-black text-gray-800">₹{(stats.totalAddFunds - stats.pendingWithdrawalAmount).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Add Funds - Pending Withdrawals</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <span className="text-3xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setView('withdrawals')}
            className="bg-white rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-3 shadow-xl">
              <span className="text-4xl">💸</span>
            </div>
            <h2 className="text-xl font-black mb-1 text-gray-800">
              Withdrawal Requests
            </h2>
            <p className="text-gray-600 text-xs">
              View and manage withdrawal requests
            </p>
          </button>

          <button
            onClick={() => setView('commission')}
            className="bg-white rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-3 shadow-xl">
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-xl font-black mb-1 text-gray-800">
              Commission History
            </h2>
            <p className="text-gray-600 text-xs">
              View commission from games
            </p>
          </button>

          <button
            onClick={() => setView('addFundsHistory')}
            className="bg-white rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-xl">
              <span className="text-4xl">💵</span>
            </div>
            <h2 className="text-xl font-black mb-1 text-gray-800">
              Add Funds History
            </h2>
            <p className="text-gray-600 text-xs">
              View all add funds transactions
            </p>
          </button>

          <button
            onClick={() => setView('users')}
            className="bg-white rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-3 shadow-xl">
              <span className="text-4xl">👥</span>
            </div>
            <h2 className="text-xl font-black mb-1 text-gray-800">
              User Management
            </h2>
            <p className="text-gray-600 text-xs">
              View all registered users
            </p>
          </button>

          <button
            onClick={() => setView('gameHistory')}
            className="bg-white rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-3 shadow-xl">
              <span className="text-4xl">🎮</span>
            </div>
            <h2 className="text-xl font-black mb-1 text-gray-800">
              Game History
            </h2>
            <p className="text-gray-600 text-xs">
              View all completed games
            </p>
          </button>

          <button
            onClick={() => setView('changePassword')}
            className="bg-white rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-3 shadow-xl">
              <span className="text-4xl">🔐</span>
            </div>
            <h2 className="text-xl font-black mb-1 text-gray-800">
              Change Password
            </h2>
            <p className="text-gray-600 text-xs">
              Update your admin password
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

// Commission History Component
function CommissionHistory({ onBack }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const result = await adminAPI.getCommissionHistory();
        if (result.success) {
          setCommissions(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch commissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-gray-800">Commission Received from Games</h2>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              ← Back
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No commission records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                <p className="text-lg font-bold text-green-800">
                  Total Commission: ₹{commissions.reduce((sum, c) => sum + (c.commission || 0), 0).toLocaleString()}
                </p>
              </div>
              {commissions.map((commission) => (
                <div key={commission.id} className="border-2 rounded-xl p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">₹{commission.commission}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Table: {commission.table_id || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date: {new Date(commission.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800">
                      Commission
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add Funds History Component
function AddFundsHistory({ onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const result = await adminAPI.getAddFundsHistory();
        if (result.success) {
          setTransactions(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-gray-800">Add Funds History</h2>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              ← Back
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-lg font-bold text-blue-800">
                  Total Add Funds: ₹{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                </p>
              </div>
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border-2 rounded-xl p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">₹{transaction.amount}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        User: {transaction.user_mobile || transaction.user_id || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date: {new Date(transaction.created_at).toLocaleString()}
                      </p>
                      {transaction.order_id && (
                        <p className="text-sm text-gray-600">
                          Order ID: {transaction.order_id}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      transaction.status === 'success' || transaction.status === 'TXN_SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status || 'Success'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Change Password Component
function ChangePassword({ admin, onBack, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await adminAPI.changePassword(currentPassword, newPassword);
      
      if (result.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          alert('Password changed successfully. Please login again.');
          onLogout();
        }, 2000);
      } else {
        setError(result.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-gray-800">Change Password</h2>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              ← Back
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="inline-block p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-xl">
                <span className="text-5xl">✅</span>
              </div>
              <h3 className="text-2xl font-black mb-2 text-gray-800">
                Password Changed!
              </h3>
              <p className="text-gray-600">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-gray-800 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-gray-800 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-gray-800 font-semibold"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// User Management Component
function UserManagement({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('[Frontend] Fetching users...');
        const result = await adminAPI.getAllUsers();
        console.log('[Frontend] Users API response:', result);
        
        if (result.success) {
          console.log('[Frontend] Users data:', result.data);
          setUsers(result.data || []);
        } else {
          console.error('[Frontend] API returned success=false:', result);
          setError(result.message || 'Failed to load users');
        }
      } catch (err) {
        console.error('[Frontend] Failed to fetch users:', err);
        console.error('[Frontend] Error details:', {
          message: err.message,
          details: err.details,
          stack: err.stack
        });
        const errorMsg = err.details?.error || err.details?.message || err.message || 'Failed to load users. Please try again.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-gray-800">User Management</h2>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              Back
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 inline-block">
                <p className="text-red-600 font-semibold">{error}</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                <p className="text-lg font-bold text-purple-800">
                  Total Users: {users.length}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-bold text-gray-700">Mobile</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-700">Balance</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-700">Joined</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-800">{user.mobile}</td>
                        <td className="py-3 px-4 text-gray-800">
                          <span className="font-bold text-green-600">{(user.balance || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {user.is_admin ? 'Admin' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Game History Component
function GameHistory({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const result = await adminAPI.getGameHistory(50, 0);
        if (result.success) {
          setGames(result.data || []);
        } else {
          setError(result.message || 'Failed to load games');
        }
      } catch (err) {
        console.error('Failed to fetch games:', err);
        setError('Failed to load games. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-gray-800">Game History</h2>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              Back
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading games...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 inline-block">
                <p className="text-red-600 font-semibold">{error}</p>
              </div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No games found</p>
              <p className="text-gray-400 text-sm mt-2">Games will appear here once players complete matches</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 mb-6">
                <p className="text-lg font-bold text-indigo-800">
                  Total Games: {games.length}
                </p>
              </div>
              {games.map((game) => (
                <div key={game.id} className="border-2 rounded-xl p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">
                        Game #{game.id?.slice(0, 8) || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Bet Amount: <span className="font-bold text-green-600">{game.bet_amount || 0}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Winner: {game.winner_id?.slice(0, 8) || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date: {game.created_at ? new Date(game.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      game.status === 'completed' ? 'bg-green-100 text-green-800' :
                      game.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {game.status || 'Completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
