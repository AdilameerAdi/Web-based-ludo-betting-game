import { useState } from 'react';
import { userAPI } from '../../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
        // CRITICAL: Validate that params exist
        if (!result.data.params) {
          setLoading(false);
          setError('Invalid response from server. Missing payment parameters.');
          console.error('[AddFunds] Missing params in response:', result.data);
          return;
        }

        console.log('[AddFunds] Payment initiated, redirecting to Paytm...', {
          paymentUrl: result.data.paymentUrl,
          orderId: result.data.orderId,
          amount: result.data.amount
        });

        // Validate payment URL before proceeding
        let paymentUrl = result.data.paymentUrl;
        if (!paymentUrl) {
          setLoading(false);
          setError('Payment gateway URL is missing. Please contact support.');
          console.error('[AddFunds] Missing payment URL');
          return;
        }

        // CRITICAL: Ensure URL uses HTTPS (not HTTP)
        // Paytm requires HTTPS - HTTP will cause Access Denied
        if (paymentUrl.startsWith('http://')) {
          console.warn('[AddFunds] WARNING: Payment URL is HTTP, converting to HTTPS');
          paymentUrl = paymentUrl.replace('http://', 'https://');
        }
        
        // Ensure URL is HTTPS
        if (!paymentUrl.startsWith('https://')) {
          // If no protocol, add HTTPS
          if (paymentUrl.startsWith('securegw.paytm.in')) {
            paymentUrl = 'https://' + paymentUrl;
          } else {
            setLoading(false);
            setError('Invalid payment gateway URL. Must use HTTPS.');
            console.error('[AddFunds] Invalid payment URL (must be HTTPS):', paymentUrl);
            return;
          }
        }

        const dummyUrlPatterns = ['dummy.com', 'test.com', 'example.com'];
        const isDummyUrl = dummyUrlPatterns.some(pattern => paymentUrl.toLowerCase().includes(pattern));
        
        if (isDummyUrl || (!paymentUrl.includes('paytm.in') && !paymentUrl.includes('paytm.com'))) {
          setLoading(false);
          setError('Payment gateway is not properly configured. The payment URL appears to be invalid. Please contact support.');
          console.error('[AddFunds] Invalid payment URL detected:', paymentUrl);
          return;
        }

        // Final validation: URL must be HTTPS Paytm URL
        if (!paymentUrl.startsWith('https://securegw.paytm.in') && !paymentUrl.startsWith('https://securegw-stage.paytm.in')) {
          setLoading(false);
          setError('Invalid Paytm payment gateway URL. Please contact support.');
          console.error('[AddFunds] Invalid Paytm URL:', paymentUrl);
          return;
        }

        // CRITICAL: Paytm /theia/processTransaction ONLY accepts POST requests from HTML forms
        // NEVER open this URL directly in browser (GET request) - it will return "Access Denied"
        // The correct flow: Backend generates params → Frontend receives → Frontend submits hidden form (POST) → Paytm
        
        // Remove any existing Paytm form to prevent duplicates
        const existingForm = document.getElementById('paytm-payment-form');
        if (existingForm) {
          existingForm.remove();
        }

        // Create hidden HTML form with POST method
        const form = document.createElement('form');
        form.method = 'POST'; // MUST be POST, not GET
        form.action = paymentUrl; // Paytm payment URL (must be HTTPS)
        form.target = '_self'; // Open in same window
        form.style.display = 'none'; // Hide the form visually
        form.id = 'paytm-payment-form';
        
        // Log the exact URL being used (for debugging)
        console.log('[AddFunds] Form action URL:', form.action);
        console.log('[AddFunds] Form method:', form.method);
        console.log('[AddFunds] Ensuring HTTPS URL:', paymentUrl);

        // Add all Paytm parameters as hidden inputs
        // These parameters were generated by backend with valid checksum
        Object.keys(result.data.params).forEach((key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = result.data.params[key] || '';
          form.appendChild(input);
        });

        // Log form data for debugging (without sensitive values)
        console.log('[AddFunds] Form parameters:', Object.keys(result.data.params));
        console.log('[AddFunds] Submitting POST form to Paytm (this is the correct method)');
        console.log('[AddFunds] Final form action before submit:', form.action);
        console.log('[AddFunds] Form method before submit:', form.method);

        // Append form to body
        document.body.appendChild(form);
        
        // Verify form action is still HTTPS before submitting
        if (!form.action.startsWith('https://')) {
          console.error('[AddFunds] CRITICAL ERROR: Form action is not HTTPS!', form.action);
          setLoading(false);
          setError('Security error: Payment URL must use HTTPS. Please contact support.');
          if (form.parentNode) {
            form.parentNode.removeChild(form);
          }
          return;
        }
        
        // Final verification before submission
        console.log('[AddFunds] Final form verification:');
        console.log('[AddFunds] - Form action:', form.action);
        console.log('[AddFunds] - Form method:', form.method);
        console.log('[AddFunds] - Form target:', form.target);
        console.log('[AddFunds] - Number of inputs:', form.querySelectorAll('input').length);
        console.log('[AddFunds] - Form in DOM:', form.parentNode !== null);
        
        // Verify all required parameters are present
        const requiredParams = ['MID', 'ORDER_ID', 'TXN_AMOUNT', 'CHECKSUMHASH'];
        const missingParams = requiredParams.filter(param => {
          const input = form.querySelector(`input[name="${param}"]`);
          return !input || !input.value;
        });
        
        if (missingParams.length > 0) {
          console.error('[AddFunds] Missing required parameters in form:', missingParams);
          setLoading(false);
          setError('Payment form is missing required parameters. Please try again.');
          if (form.parentNode) {
            form.parentNode.removeChild(form);
          }
          return;
        }
        
        // Auto-submit the form (this sends POST request to Paytm)
        // User will be redirected to Paytm payment page
        // Note: After form.submit(), user is redirected to Paytm
        // Loading state will persist until user returns via callback URL
        try {
          console.log('[AddFunds] Submitting form to Paytm now...');
          console.log('[AddFunds] Form action:', form.action);
          console.log('[AddFunds] Form method:', form.method);
          console.log('[AddFunds] Number of inputs:', form.querySelectorAll('input').length);
          
          // Log all form values for debugging
          const formInputs = form.querySelectorAll('input');
          console.log('[AddFunds] Form inputs:');
          formInputs.forEach(input => {
            if (input.name === 'CHECKSUMHASH') {
              console.log(`  ${input.name}: ${input.value.substring(0, 20)}...`);
            } else {
              console.log(`  ${input.name}: ${input.value}`);
            }
          });
          
          // Submit immediately - no setTimeout needed
          form.submit();
          console.log('[AddFunds] Form submitted - page should redirect to Paytm');
          
          // Don't set loading to false here - let the redirect happen
          // The page will navigate away, so state doesn't matter
        } catch (err) {
          console.error('[AddFunds] Form submission error:', err);
          setLoading(false);
          setError('Failed to redirect to payment gateway. Please try again.');
          // Remove form if submission failed
          if (form.parentNode) {
            form.parentNode.removeChild(form);
          }
        }
      } else {
        setLoading(false);
        setError('Invalid response from server. Please try again.');
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

