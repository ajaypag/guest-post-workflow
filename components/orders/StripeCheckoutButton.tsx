'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface StripeCheckoutButtonProps {
  orderId: string;
  amount: number; // Amount in cents
  currency?: string;
  onProcessing?: (processing: boolean) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function StripeCheckoutButton({
  orderId,
  amount,
  currency = 'USD',
  onProcessing,
  onError,
  className = '',
  disabled = false,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePayment = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);
      setError('');
      onProcessing?.(true);

      console.log('[CHECKOUT BUTTON] Creating checkout session for order:', orderId);

      // Create checkout session
      const response = await fetch(`/api/orders/${orderId}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Provide user-friendly error messages
        let userMessage = errorData.error || 'Failed to create payment session';
        switch (response.status) {
          case 400:
            if (errorData.error?.includes('not ready for payment')) {
              userMessage = 'Order is not ready for payment. Please complete the configuration process first.';
            } else if (errorData.error?.includes('already been paid')) {
              userMessage = 'This order has already been paid.';
            } else {
              userMessage = errorData.error || 'Invalid payment request. Please refresh and try again.';
            }
            break;
          case 401:
            userMessage = 'Please log in to continue with payment.';
            break;
          case 403:
            userMessage = 'You do not have permission to make this payment.';
            break;
          case 404:
            userMessage = 'Order not found. Please check the order details.';
            break;
          case 429:
            userMessage = 'Too many payment attempts. Please wait a moment and try again.';
            break;
          case 500:
          case 503:
            userMessage = 'Payment system is temporarily unavailable. Please try again later.';
            break;
          default:
            userMessage = errorData.message || errorData.error || 'Failed to initialize payment';
        }
        
        throw new Error(userMessage);
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      console.log('[CHECKOUT BUTTON] Checkout session created, redirecting to:', {
        sessionId: data.sessionId,
        amount: data.amount,
        expiresAt: data.expiresAt
      });

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (err) {
      console.error('[CHECKOUT BUTTON] Payment error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      onError?.(errorMessage);
      
      setLoading(false);
      onProcessing?.(false);
    }
  };

  return (
    <div className={className}>
      {/* Payment Button */}
      <button
        type="button"
        onClick={handlePayment}
        disabled={disabled || loading}
        className={`
          w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200
          ${loading || disabled
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transform hover:scale-[1.02] active:scale-[0.98]'
          }
          ${error ? 'mb-4' : ''}
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Creating Payment Session...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Pay {formatCurrency(amount)} {currency}</span>
          </div>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-600 text-sm font-medium">Payment Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>SSL Encrypted</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Powered by <span className="font-semibold">Stripe</span> • You'll be redirected to complete payment
        </p>
      </div>
    </div>
  );
}