import { useState, useEffect } from 'react';
import { withdrawalAPI, userAPI } from '../utils/api';

export default function WithdrawFunds({ user, onBack, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [accountDetails, setAccountDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState([]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-4">
          <button
            onClick={onBack}
            className="text-white hover:text-yellow-300 transition-colors flex items-center gap-2 font-semibold"
          >
            <span>←</span> Back to Dashboard
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Success State */}
          {success ? (
            <div className="p-8 text-center">
              <div className="inline-block p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-xl font-black mb-2 text-gray-800">
                Request Submitted!
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Your withdrawal request has been submitted. Admin will process it manually.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setAmount('');
                    setAccountDetails('');
                  }}
                  className="px-5 py-2 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all text-sm"
                >
                  New Request
                </button>
                <button
                  onClick={onBack}
                  className="px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all text-sm"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Compact Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <span className="text-3xl">💸</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Withdraw Funds</h2>
                    <p className="text-sm text-white/90">Request withdrawal to your account</p>
                  </div>
                </div>
              </div>

              {/* Compact Form */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Amount Input - Compact */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-700 uppercase tracking-wide">
                      Withdrawal Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="100"
                        step="1"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="Enter amount (min ₹100)"
                        className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-gray-800 font-semibold"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Min: ₹100 | Max: ₹{balance}
                    </p>
                  </div>

                  {/* Payment Method - Compact */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-700 uppercase tracking-wide">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-gray-800 font-semibold"
                      required
                    >
                      <option value="upi">UPI</option>
                      <option value="bank_account">Bank Account</option>
                      <option value="paytm">Paytm</option>
                      <option value="phonepe">PhonePe</option>
                      <option value="googlepay">Google Pay</option>
                    </select>
                  </div>

                  {/* Account Details - Compact */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-gray-700 uppercase tracking-wide">
                      {paymentMethod === 'bank_account' ? 'Bank Account / IFSC' : 'UPI ID / Account Details'}
                    </label>
                    <textarea
                      value={accountDetails}
                      onChange={(e) => setAccountDetails(e.target.value)}
                      placeholder={paymentMethod === 'bank_account' ? 'Enter bank account and IFSC' : 'Enter UPI ID or account details'}
                      rows="2"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-gray-800 font-semibold resize-none"
                      required
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm font-semibold">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !amount || parseFloat(amount) < 100 || !accountDetails.trim()}
                    className="w-full px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Processing...' : 'Request Withdrawal'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Compact Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl mt-4">
            <h3 className="text-lg font-black mb-4 text-gray-800 flex items-center gap-2">
              <span>📋</span> Withdrawal History
            </h3>
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-800">₹{withdrawal.amount}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(withdrawal.status)}`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {new Date(withdrawal.created_at).toLocaleDateString()} • {withdrawal.payment_method}
                      </p>
                      {withdrawal.admin_notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Note: {withdrawal.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

