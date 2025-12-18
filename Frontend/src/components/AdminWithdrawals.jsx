import { useState, useEffect } from 'react';
import { adminAPI, withdrawalAPI } from '../utils/api';

export default function AdminWithdrawals({ user, onBack }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, approved, completed, rejected
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminAPI.getAllWithdrawals();
      if (result.success) {
        setWithdrawals(result.data || []);
      } else {
        setError('Failed to fetch withdrawals');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch withdrawals');
      if (err.message.includes('Access denied') || err.message.includes('Admin only')) {
        alert('You do not have admin access. This page is for administrators only.');
        if (onBack) onBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (withdrawalId, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this withdrawal request?`)) {
      return;
    }

    setProcessing(true);
    try {
      const result = await adminAPI.updateWithdrawalStatus(
        withdrawalId,
        status,
        adminNotes || null
      );

      if (result.success) {
        await fetchWithdrawals();
        setSelectedWithdrawal(null);
        setAdminNotes('');
        alert(`Withdrawal ${status} successfully`);
      } else {
        alert(result.message || 'Failed to update withdrawal status');
      }
    } catch (err) {
      alert(err.message || 'Failed to update withdrawal status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (filter === 'all') return true;
    return w.status === filter;
  });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center">
        <div className="text-blue-900 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4 shadow-xl">
                <span className="text-5xl">👨‍💼</span>
              </div>
              <h2 className="text-3xl font-black mb-2 text-gray-800">
                Admin - Withdrawal Requests
              </h2>
              <p className="text-gray-600 text-sm">
                Manage and process withdrawal requests
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', 'pending', 'approved', 'completed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  filter === status
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-blue-900 shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status === 'pending' && pendingCount > 0 && (
                  <span className="ml-2 bg-red-500 text-blue-900 rounded-full px-2 py-0.5 text-xs">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mb-6">
              <p className="text-red-600 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Withdrawals List */}
          {filteredWithdrawals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="border-2 rounded-xl p-6 hover:shadow-lg transition-all bg-white"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <p className="font-black text-2xl text-gray-800">₹{withdrawal.amount}</p>
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${getStatusColor(withdrawal.status)}`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold">User:</span> {withdrawal.users?.mobile || withdrawal.user_id}
                        </p>
                        <p>
                          <span className="font-semibold">Method:</span> {withdrawal.payment_method}
                        </p>
                        <p>
                          <span className="font-semibold">Requested:</span>{' '}
                          {new Date(withdrawal.created_at).toLocaleString()}
                        </p>
                        {withdrawal.completed_at && (
                          <p>
                            <span className="font-semibold">Completed:</span>{' '}
                            {new Date(withdrawal.completed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-semibold">Account Details:</span>{' '}
                          {withdrawal.account_details}
                        </p>
                      </div>
                      {withdrawal.admin_notes && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm">
                            <span className="font-semibold">Admin Notes:</span> {withdrawal.admin_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {withdrawal.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                      <div className="mb-3">
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes about this withdrawal..."
                          rows="2"
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-gray-800 resize-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleStatusUpdate(withdrawal.id, 'approved')}
                          disabled={processing}
                          className="flex-1 px-4 py-2 rounded-lg font-bold text-blue-900 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(withdrawal.id, 'rejected')}
                          disabled={processing}
                          className="flex-1 px-4 py-2 rounded-lg font-bold text-blue-900 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {withdrawal.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                      <div className="mb-3">
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes (e.g., transaction ID after sending money)..."
                          rows="2"
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-gray-800 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleStatusUpdate(withdrawal.id, 'completed')}
                        disabled={processing}
                        className="w-full px-4 py-2 rounded-lg font-bold text-blue-900 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                      >
                        Mark as Completed (After Sending Money)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

