import { useState, useEffect } from 'react';
import { withdrawalAPI, userAPI } from '../../utils/api';

export default function WithdrawFunds({ user, onBack, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [accountDetails, setAccountDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('withdraw'); // 'withdraw' or 'history'

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success) {
          setBalance(result.data.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    const fetchWithdrawals = async () => {
      try {
        const result = await withdrawalAPI.getUserWithdrawals();
        if (result.success) {
          setWithdrawals(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch withdrawals:', error);
      }
    };

    fetchBalance();
    fetchWithdrawals();
  }, []);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const amt = parseFloat(amount);
    
    if (!amount || isNaN(amt) || amt < 1) {
      setError('Please enter a valid amount (minimum ₹1)');
      return;
    }

    if (amt > balance) {
      setError('Insufficient balance');
      return;
    }

    if (amt < 100) {
      setError('Minimum withdrawal amount is ₹100');
      return;
    }

    if (!accountDetails.trim()) {
      setError('Please enter your account details');
      return;
    }

    setLoading(true);

    try {
      const result = await withdrawalAPI.createWithdrawal(amt, paymentMethod, accountDetails);
      
      if (result.success) {
        setSuccess(true);
        setAmount('');
        setAccountDetails('');
        
        // Refresh balance and withdrawals
        const profileResult = await userAPI.getProfile();
        if (profileResult.success) {
          setBalance(profileResult.data.balance || 0);
        }
        
        const withdrawalsResult = await withdrawalAPI.getUserWithdrawals();
        if (withdrawalsResult.success) {
          setWithdrawals(withdrawalsResult.data || []);
        }

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create withdrawal request. Please try again.');
    } finally {
      setLoading(false);
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

  const getPaymentMethodIcon = (method) => {
    const methodLower = method.toLowerCase();
    if (methodLower.includes('upi')) return '💳';
    if (methodLower.includes('paytm')) return '📱';
    if (methodLower.includes('phonepe')) return '📲';
    if (methodLower.includes('google')) return '🔵';
    if (methodLower.includes('bank')) return '🏦';
    return '💵';
  };

  const paymentMethods = [
    { value: 'upi', label: 'UPI', icon: '💳' },
    { value: 'paytm', label: 'Paytm', icon: '📱' },
    { value: 'phonepe', label: 'PhonePe', icon: '📲' },
    { value: 'googlepay', label: 'Google Pay', icon: '🔵' },
    { value: 'bank_account', label: 'Bank Account', icon: '🏦' },
    { value: 'other', label: 'Other', icon: '💵' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button and Balance */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-white hover:text-yellow-300 transition-colors flex items-center gap-2 font-semibold text-sm sm:text-base"
          >
            <span className="text-xl">←</span> Back to Dashboard
          </button>
          
          {/* Balance - Small in top right */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg px-3 py-2 border border-white/20 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base">💰</span>
              <div>
                <p className="text-white/80 text-xs font-semibold leading-tight">Balance</p>
                <p className="text-white text-sm sm:text-base font-black">₹{balance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 px-4 sm:px-6 py-4 font-bold text-sm sm:text-base transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>💸</span> Withdraw Funds
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 sm:px-6 py-4 font-bold text-sm sm:text-base transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>📋</span> Transaction History
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'withdraw' ? (
              <>
                {/* Success State */}
                {success ? (
                  <div className="text-center py-8">
                    <div className="inline-block p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-xl">
                      <span className="text-5xl">✅</span>
                    </div>
                    <h3 className="text-2xl font-black mb-2 text-gray-800">
                      Request Submitted!
                    </h3>
                    <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
                      Your withdrawal request has been submitted successfully. Admin will process it manually.
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button
                        onClick={() => {
                          setSuccess(false);
                          setAmount('');
                          setAccountDetails('');
                        }}
                        className="px-6 py-3 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all shadow-lg hover:shadow-xl"
                      >
                        New Request
                      </button>
                      <button
                        onClick={onBack}
                        className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700 uppercase tracking-wide">
                        Withdrawal Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-xl">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="100"
                          step="1"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="Enter amount (min ₹100)"
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-300 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all text-gray-800 font-bold text-lg"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <span>ℹ️</span> Minimum: ₹100 | Maximum: ₹{balance.toLocaleString()}
                      </p>
                    </div>

                    {/* Payment Method Selection */}
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-700 uppercase tracking-wide">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setPaymentMethod(method.value)}
                            className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                              paymentMethod === method.value
                                ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 shadow-lg'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-3xl mb-2">{method.icon}</div>
                              <div className={`text-sm font-bold ${
                                paymentMethod === method.value ? 'text-orange-600' : 'text-gray-700'
                              }`}>
                                {method.label}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account Details */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700 uppercase tracking-wide">
                        {paymentMethod === 'bank_account' 
                          ? 'Bank Account Details (Account Number & IFSC)' 
                          : paymentMethod === 'upi' || paymentMethod === 'paytm' || paymentMethod === 'phonepe' || paymentMethod === 'googlepay'
                          ? 'UPI ID / Account Details'
                          : 'Account Details'}
                      </label>
                      <textarea
                        value={accountDetails}
                        onChange={(e) => setAccountDetails(e.target.value)}
                        placeholder={
                          paymentMethod === 'bank_account' 
                            ? 'Enter bank account number and IFSC code' 
                            : paymentMethod === 'upi' || paymentMethod === 'paytm' || paymentMethod === 'phonepe' || paymentMethod === 'googlepay'
                            ? 'Enter UPI ID (e.g., yourname@paytm)'
                            : 'Enter your account details'
                        }
                        rows="3"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all text-gray-800 font-semibold resize-none"
                        required
                      />
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <p className="text-red-600 text-sm font-bold flex items-center gap-2">
                          <span>⚠️</span> {error}
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || !amount || parseFloat(amount) < 100 || !accountDetails.trim()}
                      className="w-full px-6 py-4 rounded-xl font-black text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:scale-[1.02] text-lg"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span> Processing...
                        </span>
                      ) : (
                        <span className="flex  text-red-500 items-center justify-center gap-2">
                          <span>💸</span> Request Withdrawal
                        </span>
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              /* History Tab */
              <div>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                      <span className="text-5xl">📭</span>
                    </div>
                    <h3 className="text-xl font-black mb-2 text-gray-800">
                      No Withdrawal History
                    </h3>
                    <p className="text-gray-600 text-sm">
                      You haven't made any withdrawal requests yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all bg-white"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="text-3xl">
                                {getPaymentMethodIcon(withdrawal.payment_method)}
                              </div>
                              <div>
                                <p className="font-black text-xl text-gray-800">
                                  ₹{withdrawal.amount.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(withdrawal.created_at).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-gray-600 uppercase">
                                {withdrawal.payment_method.replace('_', ' ')}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(withdrawal.status)}`}>
                                {getStatusText(withdrawal.status)}
                              </span>
                            </div>
                            {withdrawal.account_details && (
                              <p className="text-xs text-gray-600 font-semibold mt-2">
                                Account: {withdrawal.account_details}
                              </p>
                            )}
                            {withdrawal.admin_notes && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-700 font-semibold">
                                  <span className="font-black">Admin Note:</span> {withdrawal.admin_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
