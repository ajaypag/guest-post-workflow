'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  orderId: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onProcessing?: (processing: boolean) => void;
  className?: string;
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
  publishableKey: string;
  error?: string;
}

// Payment form component that uses Stripe Elements
function PaymentForm({ 
  orderId, 
  onSuccess, 
  onError, 
  onProcessing,
  amount,
  currency 
}: StripePaymentFormProps & { amount: number; currency: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const MAX_RETRY_ATTEMPTS = 3;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    onProcessing?.(true);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}/payment-success`,
        },
        redirect: 'if_required', // Only redirect for 3D Secure if absolutely necessary
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        
        // Handle specific Stripe error types
        let userFriendlyMessage = 'Payment failed';
        let isRetryable = false;
        
        switch (error.code) {
          case 'card_declined':
            userFriendlyMessage = 'Your card was declined. Please try a different payment method or contact your bank.';
            break;
          case 'insufficient_funds':
            userFriendlyMessage = 'Insufficient funds. Please check your account balance or use a different payment method.';
            break;
          case 'incorrect_cvc':
            userFriendlyMessage = 'The security code is incorrect. Please check your card details and try again.';
            isRetryable = true;
            break;
          case 'expired_card':
            userFriendlyMessage = 'Your card has expired. Please use a different payment method.';
            break;
          case 'processing_error':
            userFriendlyMessage = 'We encountered a processing error. Please try again in a few moments.';
            isRetryable = true;
            break;
          case 'authentication_required':
            userFriendlyMessage = 'Additional authentication is required. Please complete the verification process.';
            break;
          case 'api_connection_error':
          case 'api_error':
          case 'rate_limit_error':
            userFriendlyMessage = 'Connection error. Please check your internet connection and try again.';
            isRetryable = true;
            setNetworkError(true);
            break;
          default:
            userFriendlyMessage = error.message || 'Payment failed. Please try again or contact support.';
            isRetryable = error.code !== 'card_declined' && error.code !== 'insufficient_funds';
        }
        
        // Enable retry button for retryable errors and if we haven't exceeded max attempts
        setCanRetry(isRetryable && retryAttempts < MAX_RETRY_ATTEMPTS);
        
        setErrorMessage(userFriendlyMessage);
        onError?.(userFriendlyMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded!', paymentIntent);
        onSuccess?.(paymentIntent.id);
      } else if (paymentIntent) {
        // Handle other statuses like requires_action
        console.log('Payment status:', paymentIntent.status);
        
        switch (paymentIntent.status) {
          case 'requires_action':
            setErrorMessage('Payment requires additional verification (3D Secure). Please complete the authentication process.');
            break;
          case 'requires_payment_method':
            setErrorMessage('Payment method failed. Please try a different payment method.');
            break;
          case 'requires_confirmation':
            setErrorMessage('Payment needs confirmation. Please try submitting again.');
            break;
          case 'processing':
            setErrorMessage('Payment is being processed. You will receive a confirmation once complete.');
            // Don't treat this as an error - it's a valid processing state
            onSuccess?.(paymentIntent.id);
            break;
          case 'canceled':
            setErrorMessage('Payment was canceled. You can try again when ready.');
            break;
          default:
            setErrorMessage(`Payment is in ${paymentIntent.status} status. Please contact support if this persists.`);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      
      // Handle network errors
      const isNetworkError = err instanceof TypeError && err.message.includes('fetch') ||
                            err instanceof Error && (
                              err.message.includes('Network') ||
                              err.message.includes('connection') ||
                              err.message.includes('timeout')
                            );
      
      if (isNetworkError) {
        setNetworkError(true);
        setCanRetry(retryAttempts < MAX_RETRY_ATTEMPTS);
        setErrorMessage('Network connection error. Please check your internet connection and try again.');
        onError?.('Network connection error. Please try again.');
      } else {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setErrorMessage(errorMsg);
        onError?.(errorMsg);
      }
    } finally {
      setProcessing(false);
      onProcessing?.(false);
    }
  };

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1);
    setErrorMessage('');
    setNetworkError(false);
    setCanRetry(false);
    
    // Retry with a short delay
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Payment Details</span>
          <span className="text-xl font-bold text-green-600">
            ${(amount / 100).toFixed(2)} {currency}
          </span>
        </div>
        
        {/* Payment Element handles all payment methods */}
        <div className="mb-4">
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-red-600 text-sm">{errorMessage}</p>
              {networkError && (
                <p className="text-red-500 text-xs mt-2">
                  Network issue detected. Please check your connection.
                </p>
              )}
              {retryAttempts > 0 && (
                <p className="text-gray-600 text-xs mt-1">
                  Retry attempt {retryAttempts} of {MAX_RETRY_ATTEMPTS}
                </p>
              )}
            </div>
            {canRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={processing}
                className="ml-4 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors
          ${processing 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }
        `}
      >
        {processing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processing Payment...</span>
          </div>
        ) : (
          `Pay $${(amount / 100).toFixed(2)} ${currency}`
        )}
      </button>

      <div className="text-xs text-gray-500 text-center">
        <p>Your payment information is secure and encrypted.</p>
        <p>Powered by <span className="font-semibold">Stripe</span></p>
      </div>
    </form>
  );
}

// Main component that handles Stripe initialization and payment intent creation
export default function StripePaymentForm(props: StripePaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    currency: string;
    paymentIntentId: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Initialize payment intent when component mounts
    initializePayment();
  }, [props.orderId]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // Create payment intent
      const response = await fetch(`/api/orders/${props.orderId}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send empty JSON body as API expects JSON
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Provide user-friendly error messages based on status codes
        let userMessage = errorData.error || 'Failed to create payment intent';
        switch (response.status) {
          case 400:
            userMessage = 'Invalid order or payment request. Please refresh the page and try again.';
            break;
          case 401:
            userMessage = 'Please log in to continue with payment.';
            break;
          case 402:
            userMessage = 'Payment declined. Please try a different payment method.';
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
            userMessage = errorData.details || errorData.message || errorData.error || 'Failed to initialize payment';
        }
        
        throw new Error(userMessage);
      }

      const data: PaymentIntentResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Initialize Stripe with the publishable key
      setStripePromise(loadStripe(data.publishableKey));
      setClientSecret(data.clientSecret);
      setPaymentData({
        amount: data.amount,
        currency: data.currency,
        paymentIntentId: data.paymentIntentId,
        status: data.status,
      });

    } catch (err) {
      console.error('Error initializing payment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(errorMessage);
      props.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    initializePayment();
  };

  if (loading) {
    return (
      <div className={`${props.className} space-y-4`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
        <p className="text-center text-gray-600">Loading payment form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${props.className} space-y-4`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Payment Error</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stripePromise || !clientSecret || !paymentData) {
    return (
      <div className={`${props.className}`}>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-600">Unable to initialize payment. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0066cc',
      colorBackground: '#ffffff',
      colorText: '#1a1a1a',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '6px',
    },
  };

  const elementsOptions = {
    clientSecret,
    appearance,
  };

  return (
    <div className={props.className}>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentForm
          {...props}
          amount={paymentData.amount}
          currency={paymentData.currency}
        />
      </Elements>
    </div>
  );
}