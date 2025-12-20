import { useState, useEffect } from 'react';
import { adminAPI, withdrawalAPI } from '../../utils/api';

export default function AdminWithdrawals({ user, onBack }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, approved, completed, rejected
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [expandedWithdrawal, setExpandedWithdrawal] = useState(null);
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
        setExpandedWithdrawal(null);
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
        return 'bg-amber-100 text-amber-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-1">
            Withdrawal Requests
          </h2>
          <p className="text-xs lg:text-sm text-gray-500">
            Manage and process withdrawal requests from users
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 lg:mb-6">
          <div className="p-3 lg:p-4">
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'approved', 'completed', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    filter === status
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'pending' && pendingCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Withdrawals Table */}
        {filteredWithdrawals.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No withdrawal requests found</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Details</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWithdrawals.map((withdrawal) => (
                    <>
                      <tr
                        key={withdrawal.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedWithdrawal(expandedWithdrawal === withdrawal.id ? null : withdrawal.id)}
                      >
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs lg:text-sm font-semibold text-gray-900">₹{withdrawal.amount}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-4">
                          <div className="text-xs lg:text-sm text-gray-900">
                            {withdrawal.users?.mobile || withdrawal.user_id?.slice(0, 20) + '...'}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs lg:text-sm text-gray-900 capitalize">{withdrawal.payment_method}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-4">
                          <div className="text-xs lg:text-sm text-gray-900 max-w-xs truncate">{withdrawal.account_details}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                            {getStatusText(withdrawal.status)}
                          </span>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs lg:text-sm text-gray-500">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedWithdrawal(expandedWithdrawal === withdrawal.id ? null : withdrawal.id);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {expandedWithdrawal === withdrawal.id ? '▼' : '▶'}
                          </button>
                        </td>
                      </tr>
                      {expandedWithdrawal === withdrawal.id && (
                        <tr>
                          <td colSpan="7" className="px-3 lg:px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Full Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">User ID</p>
                                  <p className="text-sm text-gray-900 font-mono">
                                    {withdrawal.user_id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Requested</p>
                                  <p className="text-sm text-gray-900">
                                    {new Date(withdrawal.created_at).toLocaleString()}
                                  </p>
                                </div>
                                {withdrawal.completed_at && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Completed</p>
                                    <p className="text-sm text-gray-900">
                                      {new Date(withdrawal.completed_at).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Account Details</p>
                                  <p className="text-sm text-gray-900 font-medium">
                                    {withdrawal.account_details}
                                  </p>
                                </div>
                              </div>

                              {/* Admin Notes (if exists) */}
                              {withdrawal.admin_notes && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <p className="text-xs font-medium text-blue-700 mb-1">Admin Notes</p>
                                  <p className="text-sm text-blue-900">
                                    {withdrawal.admin_notes}
                                  </p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              {withdrawal.status === 'pending' && (
                                <div className="pt-4 border-t border-gray-200">
                                  <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2 text-gray-700">
                                      Admin Notes (Optional)
                                    </label>
                                    <textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add notes about this withdrawal..."
                                      rows="3"
                                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900 resize-none"
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(withdrawal.id, 'approved');
                                      }}
                                      disabled={processing}
                                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(withdrawal.id, 'rejected');
                                      }}
                                      disabled={processing}
                                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              )}

                              {withdrawal.status === 'approved' && (
                                <div className="pt-4 border-t border-gray-200">
                                  <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2 text-gray-700">
                                      Admin Notes (Optional)
                                    </label>
                                    <textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add notes (e.g., transaction ID after sending money)..."
                                      rows="3"
                                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all text-gray-900 resize-none"
                                    />
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusUpdate(withdrawal.id, 'completed');
                                    }}
                                    disabled={processing}
                                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Mark as Completed (After Sending Money)
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

