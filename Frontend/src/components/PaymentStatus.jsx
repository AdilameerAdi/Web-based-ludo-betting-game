import { useEffect, useState } from 'react';
import { userAPI } from '../utils/api';

export default function PaymentStatus({ status, orderId, message, onBack }) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const result = await userAPI.getProfile();
        if (result.success && result.data) {
          setBalance(result.data.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
        {/* Status Icon */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="inline-block p-6 bg-green-100 rounded-full">
              <span className="text-6xl">✅</span>
            </div>
          ) : (
            <div className="inline-block p-6 bg-red-100 rounded-full">
              <span className="text-6xl">❌</span>
            </div>
          )}
        </div>

        {/* Status Message */}
        <h2 className="text-3xl font-black mb-2 text-gray-800">
          {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
        </h2>

        <p className="text-gray-600 mb-6">
          {isSuccess 
            ? 'Your funds have been added to your wallet successfully.' 
            : message || 'Your payment could not be processed. Please try again.'}
        </p>

        {/* Order ID */}
        {orderId && (
          <div className="bg-gray-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Order ID</p>
            <p className="text-sm font-mono font-semibold text-gray-800">{orderId}</p>
          </div>
        )}

        {/* Balance Display */}
        {isSuccess && !loading && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-600 mb-1">Current Balance</p>
            <p className="text-2xl font-black text-green-600">₹{balance.toFixed(2)}</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          {isSuccess ? 'Continue Playing' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}

