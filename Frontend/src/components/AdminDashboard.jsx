import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import AdminWithdrawals from './AdminWithdrawals';

export default function AdminDashboard() {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'withdrawals', 'commission', 'addFundsHistory', 'changePassword'
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCommission: 0,
    totalAddFunds: 0,
    pendingWithdrawals: 0
  });
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
    try {
      const [commissionResult, addFundsResult, withdrawalsResult] = await Promise.all([
        adminAPI.getCommissionStats(),
        adminAPI.getAddFundsStats(),
        adminAPI.getAllWithdrawals()
      ]);

      if (commissionResult.success) {
        setStats(prev => ({ ...prev, totalCommission: commissionResult.data.total || 0 }));
      }
      if (addFundsResult.success) {
        setStats(prev => ({ ...prev, totalAddFunds: addFundsResult.data.total || 0 }));
      }
      if (withdrawalsResult.success) {
        const pending = withdrawalsResult.data.filter(w => w.status === 'pending').length;
        setStats(prev => ({ ...prev, pendingWithdrawals: pending }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Total Commission</p>
                <p className="text-3xl font-black text-gray-800">₹{stats.totalCommission.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl">
                <span className="text-4xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Total Add Funds</p>
                <p className="text-3xl font-black text-gray-800">₹{stats.totalAddFunds.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-xl">
                <span className="text-4xl">💵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Pending Withdrawals</p>
                <p className="text-3xl font-black text-gray-800">{stats.pendingWithdrawals}</p>
              </div>
              <div className="p-4 bg-yellow-100 rounded-xl">
                <span className="text-4xl">⏳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setView('withdrawals')}
            className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4 shadow-xl">
              <span className="text-5xl">💸</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-800">
              Withdrawal Requests
            </h2>
            <p className="text-gray-600 text-sm">
              View and manage withdrawal requests
            </p>
          </button>

          <button
            onClick={() => setView('commission')}
            className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-xl">
              <span className="text-5xl">💰</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-800">
              Commission Received
            </h2>
            <p className="text-gray-600 text-sm">
              View commission from games
            </p>
          </button>

          <button
            onClick={() => setView('addFundsHistory')}
            className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-xl">
              <span className="text-5xl">💵</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-800">
              Add Funds History
            </h2>
            <p className="text-gray-600 text-sm">
              View all add funds transactions
            </p>
          </button>

          <button
            onClick={() => setView('changePassword')}
            className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-xl">
              <span className="text-5xl">🔐</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-800">
              Change Password
            </h2>
            <p className="text-gray-600 text-sm">
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

