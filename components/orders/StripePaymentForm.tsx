'use client';

import React from 'react';
import StripeCheckoutButton from './StripeCheckoutButton';

interface StripePaymentFormProps {
  orderId: string;
  amount?: number; // Amount in cents
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onProcessing?: (processing: boolean) => void;
  className?: string;
}

/**
 * Simplified Stripe Payment Form using Stripe Checkout
 * 
 * MIGRATION NOTE: This component has been completely rewritten to use
 * Stripe Checkout Sessions instead of the broken Elements implementation.
 * 
 * Key Changes:
 * - Replaced complex 432-line Elements form with simple redirect
 * - Users redirect to Stripe-hosted checkout page
 * - Success handling happens on redirect pages, not via onSuccess callback
 * - Much more reliable and easier to maintain
 */
export default function StripePaymentForm(props: StripePaymentFormProps) {
  const { orderId, amount = 0, onSuccess, onError, onProcessing, className } = props;

  // Note: onSuccess won't be called in the new flow since users 
  // get redirected to Stripe and then back to our success page.
  // The success handling is done on the success page itself.

  return (
    <div className={className}>
      <div className="bg-white rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Complete Your Payment
          </h3>
          <p className="text-gray-600 text-sm">
            Click the button below to securely complete your payment via Stripe Checkout.
            You'll be redirected to Stripe's secure payment page.
          </p>
        </div>

        {/* Payment Button */}
        <StripeCheckoutButton
          orderId={orderId}
          amount={amount}
          onProcessing={onProcessing}
          onError={onError}
          className="w-full"
        />

        {/* Features */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Multiple payment methods</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Mobile optimized</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Instant confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}