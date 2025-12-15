import { useState } from 'react';
import { userAPI } from '../utils/api';

const API_BASE_URL = 'http://localhost:5000/api';

export default function AddFunds({ user, onBack, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  const handleQuickSelect = (amt) => {
    setAmount(amt.toString());
    setSelectedAmount(amt);
    setError(null);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setAmount(value);
      setSelectedAmount(null);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    
    if (!amount || isNaN(amt) || amt < 1) {
      setError('Please enter a valid amount (minimum ₹1)');
      return;
    }

    if (amt > 100000) {
      setError('Maximum amount is ₹1,00,000');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to initiate payment');
      }

      if (result.success && result.data) {
        // Create and submit Paytm payment form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.data.paymentUrl;
        form.target = '_self';

        // Add all parameters to form
        Object.keys(result.data.params).forEach((key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = result.data.params[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to initiate payment. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-5xl">💰</span>
          </div>
          <h2 className="text-3xl font-black mb-2 text-gray-800">
            Add Funds
          </h2>
          <p className="text-gray-600 text-sm">
            Add money to your wallet to start playing
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Amount Selection */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">
              Quick Select
            </label>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickSelect(amt)}
                  className={`py-2 px-3 rounded-lg font-bold transition-all ${
                    selectedAmount === amt
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Or Enter Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                ₹
              </span>
              <input
                type="number"
                min="1"
                max="100000"
                step="1"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Enter amount"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-gray-800 font-semibold"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Min: ₹1 | Max: ₹1,00,000
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) < 1}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-green-600 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? 'Processing...' : 'Proceed to Pay'}
            </button>
          </div>
        </form>

        {/* Payment Info */}
        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-xs text-blue-800 font-semibold text-center">
            🔒 Secure payment powered by Paytm
          </p>
        </div>
      </div>
    </div>
  );
}

