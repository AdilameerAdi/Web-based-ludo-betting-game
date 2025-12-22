import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import AdminWithdrawals from './AdminWithdrawals';

export default function AdminDashboard() {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'withdrawals', 'commission', 'addFundsHistory', 'users', 'gameHistory', 'changePassword'
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  // Sidebar navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', view: 'dashboard' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '💸', view: 'withdrawals' },
    { id: 'commission', label: 'Commission', icon: '💰', view: 'commission' },
    { id: 'addFundsHistory', label: 'Add Funds', icon: '💵', view: 'addFundsHistory' },
    { id: 'users', label: 'Users', icon: '👥', view: 'users' },
    { id: 'gameHistory', label: 'Game History', icon: '🎮', view: 'gameHistory' },
    { id: 'changePassword', label: 'Settings', icon: '🔐', view: 'changePassword' },
  ];

  // Render sidebar component
  const renderSidebar = () => (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 ${
        // Mobile: slide in/out
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${
        // Desktop: width based on collapsed state
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
      } w-64`}>
        {/* Sidebar Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <div className="lg:block hidden">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">{admin?.username || 'Admin'}</p>
            </div>
          )}
        </div>
        <div className="lg:hidden block">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">{admin?.username || 'Admin'}</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <span className="text-gray-600">✕</span>
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <span className="text-gray-600">{sidebarCollapsed ? '→' : '←'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.view);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                view === item.view
                  ? 'bg-gray-100 border-r-2 border-gray-900 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-xl mr-3 shrink-0">{item.icon}</span>
              <span className="text-sm font-medium lg:block hidden">{!sidebarCollapsed && item.label}</span>
              <span className="text-sm font-medium lg:hidden block">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-lg lg:${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <span className="text-xl mr-3 shrink-0">🚪</span>
            <span className="text-sm  font-medium lg:block hidden">{!sidebarCollapsed && 'Logout'}</span>
            <span className="text-sm text-red-500 font-medium lg:hidden block">Logout</span>
          </button>
        </div>
      </div>
    </>
  );

  // Render mobile header
  const renderMobileHeader = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4">
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <span className="text-2xl">☰</span>
      </button>
      <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
      <div className="w-10" /> {/* Spacer for centering */}
    </div>
  );

  // Show withdrawals page
  if (view === 'withdrawals') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {renderSidebar()}
        {renderMobileHeader()}
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
          <AdminWithdrawals user={admin} onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  // Show commission page
  if (view === 'commission') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {renderSidebar()}
        {renderMobileHeader()}
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
          <CommissionHistory onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  // Show add funds history page
  if (view === 'addFundsHistory') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {renderSidebar()}
        {renderMobileHeader()}
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
          <AddFundsHistory onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  // Show users page
  if (view === 'users') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {renderSidebar()}
        {renderMobileHeader()}
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
          <UserManagement onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  // Show game history page
  if (view === 'gameHistory') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {renderSidebar()}
        {renderMobileHeader()}
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
          <GameHistory onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  // Show change password page
  if (view === 'changePassword') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {renderSidebar()}
        {renderMobileHeader()}
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
          <ChangePassword admin={admin} onBack={() => setView('dashboard')} onLogout={handleLogout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {renderSidebar()}
      {renderMobileHeader()}
      <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 lg:pt-0`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Dashboard Overview
            </h1>
            <p className="text-sm text-gray-500">
              Welcome back, {admin?.username || 'Admin'}
            </p>
          </div>

        {/* Error Message */}
        {statsError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm font-medium">{statsError}</p>
          </div>
        )}

        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-2">Total Commission</p>
                <p className="text-2xl font-semibold text-gray-900 mb-1">₹{stats.totalCommission.toLocaleString()}</p>
                {stats.todayCommission > 0 && (
                  <p className="text-xs text-gray-500">+₹{stats.todayCommission.toLocaleString()} today</p>
                )}
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-2">Total Add Funds</p>
                <p className="text-2xl font-semibold text-gray-900">₹{stats.totalAddFunds.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-2">Pending Withdrawals</p>
                <p className="text-2xl font-semibold text-gray-900 mb-1">{stats.pendingWithdrawals}</p>
                {stats.pendingWithdrawalAmount > 0 && (
                  <p className="text-xs text-gray-500">₹{stats.pendingWithdrawalAmount.toLocaleString()} total</p>
                )}
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-2">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-2">Total Games Played</p>
                <p className="text-2xl font-semibold text-gray-900 mb-1">{stats.totalGames.toLocaleString()}</p>
                {stats.todayGames > 0 && (
                  <p className="text-xs text-gray-500">+{stats.todayGames} today</p>
                )}
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">🎮</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-2">Net Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 mb-1">₹{(stats.totalAddFunds - stats.pendingWithdrawalAmount).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Add Funds - Pending Withdrawals</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}

// Commission History Component
function CommissionHistory({ onBack }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all'); // all, 1, 7, 15, 30

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

  // Filter commissions based on time period
  const getFilteredCommissions = () => {
    if (timeFilter === 'all') {
      return commissions;
    }

    const days = parseInt(timeFilter);
    const now = new Date();
    const filterDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return commissions.filter((commission) => {
      const commissionDate = new Date(commission.created_at);
      return commissionDate >= filterDate;
    });
  };

  const filteredCommissions = getFilteredCommissions();
  const totalCommission = filteredCommissions.reduce((sum, c) => sum + (parseFloat(c.commission) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Commission Received from Games</h2>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">View all commission records from completed games</p>
        </div>

        {/* Time Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 lg:mb-6">
          <div className="p-3 lg:p-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All Time' },
                { value: '1', label: '1 Day' },
                { value: '7', label: '7 Days' },
                { value: '15', label: '15 Days' },
                { value: '30', label: '30 Days' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeFilter === filter.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Total Commission Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-base font-medium text-gray-500 mb-1">
                Total Commission {timeFilter !== 'all' ? `(${timeFilter} Day${timeFilter === '1' ? '' : 's'})` : ''}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Commission Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No commission records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game ID</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table ID</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet Amount</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCommissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">₹{parseFloat(commission.commission || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div className="text-xs lg:text-sm text-gray-900 font-mono">
                          {commission.game_id ? commission.game_id.slice(0, 12) + '...' : 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div className="text-xs lg:text-sm text-gray-900">
                          {commission.table_id || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs lg:text-sm text-gray-900">
                          ₹{parseFloat(commission.bet_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs lg:text-sm text-gray-500">
                          {new Date(commission.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Add Funds History</h2>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">View all successful add funds transactions</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">

          <div className="p-6">
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
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-base font-medium text-gray-500 mb-1">Total Add Funds</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                  </p>
                </div>
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg mb-2">₹{transaction.amount}</p>
                        <p className="text-sm text-gray-500 mb-1">
                          User: {transaction.user_mobile || transaction.user_id || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                          Date: {new Date(transaction.created_at).toLocaleString()}
                        </p>
                        {transaction.order_id && (
                          <p className="text-sm text-gray-500">
                            Order ID: {transaction.order_id}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                        transaction.status === 'success' || transaction.status === 'TXN_SUCCESS'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-amber-100 text-amber-700'
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
    </div>
  );
}

// Change Password Component
function ChangePassword({ admin, onBack, onLogout }) {
  const [activeTab, setActiveTab] = useState('password'); // 'password' or 'username'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handlePasswordSubmit = async (e) => {
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

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);

    try {
      const result = await adminAPI.changeUsername(currentPassword, newUsername);
      
      if (result.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewUsername('');
        // Update admin data in localStorage
        if (result.data && result.data.admin) {
          localStorage.setItem('admin', JSON.stringify(result.data.admin));
        }
        setTimeout(() => {
          alert('Username changed successfully. Please login again with your new username.');
          onLogout();
        }, 2000);
      } else {
        setError(result.message || 'Failed to change username');
      }
    } catch (err) {
      setError(err.message || 'Failed to change username');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Settings</h2>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">Update your admin account settings</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('password');
                setError(null);
                setSuccess(false);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === 'password'
                  ? 'bg-gray-900 text-white border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => {
                setActiveTab('username');
                setError(null);
                setSuccess(false);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === 'username'
                  ? 'bg-gray-900 text-white border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Change Username
            </button>
          </div>

          <div className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="inline-block p-3 bg-gray-100 rounded-lg mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">
                  {activeTab === 'password' ? 'Password Changed!' : 'Username Changed!'}
                </h3>
                <p className="text-gray-500 text-sm">Redirecting to login...</p>
              </div>
            ) : (
              <>
                {activeTab === 'password' ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900"
                        required
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full px-4 py-2.5 rounded-lg font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleUsernameSubmit} className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-700">
                        <span className="font-semibold">Current Username:</span> {admin?.username || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900"
                        placeholder="Enter your current password"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Required to verify your identity</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        New Username
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900"
                        placeholder="Enter new username"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">3+ characters, letters, numbers, and underscores only</p>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !currentPassword || !newUsername}
                      className="w-full px-4 py-2.5 rounded-lg font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Changing...' : 'Change Username'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">User Management</h2>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">View and manage all registered users</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-base font-medium text-gray-500 mb-1">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.length}
                  </p>
                </div>
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 lg:px-4 text-xs lg:text-sm font-medium text-gray-700">Mobile</th>
                        <th className="text-left py-3 px-3 lg:px-4 text-xs lg:text-sm font-medium text-gray-700">Balance</th>
                        <th className="text-left py-3 px-3 lg:px-4 text-xs lg:text-sm font-medium text-gray-700">Joined</th>
                        <th className="text-left py-3 px-3 lg:px-4 text-xs lg:text-sm font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 lg:px-4 text-xs lg:text-sm font-medium text-gray-900">{user.mobile}</td>
                          <td className="py-3 px-3 lg:px-4 text-xs lg:text-sm text-gray-900">
                            <span className="font-semibold">{(user.balance || 0).toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-3 lg:px-4 text-xs lg:text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 lg:px-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              user.is_admin ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
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
    </div>
  );
}

// Game History Component
function GameHistory({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // all, 1, 7, 15, 30

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

  // Filter games based on time period
  const getFilteredGames = () => {
    if (timeFilter === 'all') {
      return games;
    }

    const days = parseInt(timeFilter);
    const now = new Date();
    const filterDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return games.filter((game) => {
      const gameDate = new Date(game.created_at);
      return gameDate >= filterDate;
    });
  };

  const filteredGames = getFilteredGames();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Game History</h2>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">View all completed game matches</p>
        </div>

        {/* Time Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 lg:mb-6">
          <div className="p-3 lg:p-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All Time' },
                { value: '1', label: '1 Day' },
                { value: '7', label: '7 Days' },
                { value: '15', label: '15 Days' },
                { value: '30', label: '30 Days' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    timeFilter === filter.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Total Games Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-base font-medium text-gray-500 mb-1">
                Total Games {timeFilter !== 'all' ? `(${timeFilter} Day${timeFilter === '1' ? '' : 's'})` : ''}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredGames.length}
              </p>
            </div>
          </div>
        </div>

        {/* Games Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading games...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No games found</p>
              <p className="text-gray-400 text-sm mt-2">Games will appear here once players complete matches</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game ID</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table ID</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet Amount</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Winner Payout</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result Type</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGames.map((game) => (
                    <tr
                      key={game.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 lg:px-6 py-4">
                        <div className="text-xs lg:text-sm text-gray-900 font-mono">
                          {game.game_id ? game.game_id.slice(0, 12) + '...' : game.id?.slice(0, 12) + '...' || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div className="text-xs lg:text-sm text-gray-900">
                          {game.table_id || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs lg:text-sm font-semibold text-gray-900">
                          ₹{parseFloat(game.bet_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs lg:text-sm text-gray-900">
                          ₹{parseFloat(game.commission || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs lg:text-sm text-gray-900">
                          ₹{parseFloat(game.winner_payout || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div className="text-xs lg:text-sm text-gray-900 capitalize">
                          {game.result_type || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          game.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          game.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {game.status || 'Completed'}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs lg:text-sm text-gray-500">
                          {game.created_at ? new Date(game.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
