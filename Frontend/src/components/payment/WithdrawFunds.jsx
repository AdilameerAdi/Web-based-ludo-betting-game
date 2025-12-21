import { useState, useEffect } from 'react';
import { withdrawalAPI, userAPI } from '../../utils/api';

export default function WithdrawFunds({ user, winningBalance: propWinningBalance, onBack, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [accountDetails, setAccountDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [winningBalance, setWinningBalance] = useState(propWinningBalance || 0);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('withdraw'); // 'withdraw' or 'history'

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success) {
          const winningBal = result.data.winning_balance || result.data.winningBalance || 0;
          setWinningBalance(winningBal);
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
    
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount (must be greater than 0)');
      return;
    }

    if (amt > winningBalance) {
      setError(`Insufficient winning balance. You can only withdraw up to ₹${winningBalance.toLocaleString()}`);
      return;
    }

    if (winningBalance <= 0) {
      setError('You have no winning balance available for withdrawal');
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
          const winningBal = profileResult.data.winning_balance || profileResult.data.winningBalance || 0;
          setWinningBalance(winningBal);
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
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'approved':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'completed':
        return 'bg-black text-white border-black';
      case 'rejected':
        return 'bg-gray-200 text-gray-800 border-gray-400';
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

  const paymentMethods = [
    { value: 'upi', label: 'UPI', icon: '💳' },
    { value: 'paytm', label: 'Paytm', icon: '📱' },
    { value: 'phonepe', label: 'PhonePe', icon: '📲' },
    { value: 'googlepay', label: 'Google Pay', icon: '🔵' },
    { value: 'bank_account', label: 'Bank Account', icon: '🏦' },
    { value: 'other', label: 'Other', icon: '💵' },
  ];

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="text-black hover:text-gray-600 transition-colors flex items-center gap-2 font-medium text-sm sm:text-base"
            >
              <span className="text-lg">←</span> Back
            </button>
            
            {/* Winning Balance */}
            <div className="bg-black text-white rounded-lg px-4 py-2 border border-black">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-white/80 text-xs font-medium">Winning Balance</p>
                  <p className="text-white text-base sm:text-lg font-bold">₹{winningBalance.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Withdraw Funds</h1>
          <p className="text-gray-600 text-sm">Request withdrawal from your winning balance</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-300 mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'withdraw'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'history'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white">
          {activeTab === 'withdraw' ? (
            <>
              {/* Success State */}
              {success ? (
                <div className="text-center py-12 border border-gray-200 rounded-lg">
                  <div className="inline-block p-4 bg-black rounded-full mb-4">
                    <span className="text-4xl text-white">✓</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-black">
                    Request Submitted
                  </h3>
                  <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
                    Your withdrawal request has been submitted. Admin will process it manually.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setAmount('');
                        setAccountDetails('');
                      }}
                      className="px-6 py-2 border border-gray-300 rounded text-black font-medium hover:bg-gray-50 transition-colors"
                    >
                      New Request
                    </button>
                    <button
                      onClick={onBack}
                      className="px-6 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 transition-colors"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-black">
                      Withdrawal Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="Enter amount"
                        className="w-full pl-10 pr-4 py-3 rounded border border-gray-300 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all text-black font-medium"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Maximum: ₹{winningBalance.toLocaleString()}
                    </p>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-black">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentMethod(method.value)}
                          className={`p-4 rounded border-2 transition-all ${
                            paymentMethod === method.value
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-black hover:border-gray-400'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">{method.icon}</div>
                            <div className="text-xs font-medium">
                              {method.label}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account Details */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-black">
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
                      className="w-full px-4 py-3 rounded border border-gray-300 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all text-black resize-none"
                      required
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-gray-100 border border-gray-300 rounded p-4">
                      <p className="text-black text-sm font-medium">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > winningBalance || winningBalance <= 0 || !accountDetails.trim()}
                    className="w-full px-6 py-3 rounded bg-black text-white font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Processing...' : 'Submit Withdrawal Request'}
                  </button>
                </form>
              )}
            </>
          ) : (
            /* History Tab */
            <div>
              {withdrawals.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 rounded-lg">
                  <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                    <span className="text-4xl">📭</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-black">
                    No Withdrawal History
                  </h3>
                  <p className="text-gray-600 text-sm">
                    You haven't made any withdrawal requests yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="border border-gray-300 rounded p-4 hover:border-gray-400 transition-colors bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-2xl">
                              {paymentMethods.find(m => m.value === withdrawal.payment_method)?.icon || '💵'}
                            </div>
                            <div>
                              <p className="font-bold text-lg text-black">
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
                            <span className="text-xs font-medium text-gray-600 uppercase">
                              {withdrawal.payment_method.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(withdrawal.status)}`}>
                              {getStatusText(withdrawal.status)}
                            </span>
                          </div>
                          {withdrawal.account_details && (
                            <p className="text-xs text-gray-600 mt-2">
                              Account: {withdrawal.account_details}
                            </p>
                          )}
                          {withdrawal.admin_notes && (
                            <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded">
                              <p className="text-xs text-black font-medium">
                                <span className="font-bold">Admin Note:</span> {withdrawal.admin_notes}
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
  );
}
