'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StripePaymentForm from './StripePaymentForm';
import PaymentSuccessModal from './PaymentSuccessModal';
import { Order } from '@/lib/db/orderSchema';

interface OrderPaymentPageProps {
  order: Order;
  className?: string;
}

interface OrderDetails {
  id: string;
  state: string;
  totalRetail: number;
  orderType: string;
  itemCount: number;
  account: {
    name: string;
    email: string;
    companyName?: string;
  };
}

export default function OrderPaymentPage({ order, className }: OrderPaymentPageProps) {
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Check if order is in correct state for payment
  const canAcceptPayment = order.state === 'payment_pending' || 
                          (order.state === 'reviewing' && order.totalRetail > 0);

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    setShowSuccessModal(true);
    
    // Refresh the page after a short delay to show updated order status
    setTimeout(() => {
      router.refresh();
    }, 3000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Payment error:', errorMessage);
  };

  const handleProcessing = (isProcessing: boolean) => {
    setProcessing(isProcessing);
  };

  const handleViewOrder = () => {
    router.push(`/orders/${order.id}`);
  };

  const handleRetryPayment = () => {
    setError('');
    // The StripePaymentForm will automatically retry when re-rendered
  };

  if (order.paidAt) {
    return (
      <div className={`${className} max-w-2xl mx-auto`}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Payment Complete</h3>
              <p className="text-green-700">
                This order has already been paid for on {new Date(order.paidAt).toLocaleDateString()}.
              </p>
            </div>
          </div>
          <button
            onClick={handleViewOrder}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            View Order Details
          </button>
        </div>
      </div>
    );
  }

  if (!canAcceptPayment) {
    return (
      <div className={`${className} max-w-2xl mx-auto`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Order Not Ready for Payment</h3>
              <p className="text-yellow-700">
                This order is currently in "{order.state}" state and cannot accept payment yet.
              </p>
            </div>
          </div>
          <button
            onClick={handleViewOrder}
            className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            View Order Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} max-w-4xl mx-auto`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-sm">{order.id.substring(0, 8)}...</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Order Type:</span>
                <span className="capitalize">{order.orderType.replace('_', ' ')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="capitalize font-medium text-blue-600">{order.state?.replace('_', ' ') || 'Unknown'}</span>
              </div>
              
              {/* Show approved/estimated links count */}
              {order.estimatedLinksCount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Links:</span>
                  <span>{order.estimatedLinksCount}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Pricing Breakdown</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>${(order.subtotalRetail / 100).toFixed(2)}</span>
                </div>
                
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({order.discountPercent}%):</span>
                    <span>-${(order.discountAmount / 100).toFixed(2)}</span>
                  </div>
                )}
                
                {order.rushDelivery && order.rushFee && order.rushFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rush Delivery:</span>
                    <span>${((order.rushFee || 0) / 100).toFixed(2)}</span>
                  </div>
                )}
                
                {order.includesClientReview && order.clientReviewFee && order.clientReviewFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client Review:</span>
                    <span>${((order.clientReviewFee || 0) / 100).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-green-600">${(order.totalRetail / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-blue-800">Secure Payment</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Your payment information is encrypted and secure. We use industry-standard SSL encryption 
                  and PCI DSS compliant processing through Stripe.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">Payment Error</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    <button
                      onClick={handleRetryPayment}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <StripePaymentForm
              orderId={order.id}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onProcessing={handleProcessing}
            />
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you're experiencing issues with payment or have questions about your order, 
              our support team is here to help.
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">Email:</span>{' '}
                <a href="mailto:info@linkio.com" className="text-blue-600 hover:underline">
                  info@linkio.com
                </a>
              </p>
              <p>
                <span className="text-gray-600">Phone:</span>{' '}
                <a href="mailto:info@linkio.com" className="text-blue-600 hover:underline">
                  Email Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        orderId={order.id}
        paymentIntentId={paymentIntentId}
        amount={order.totalRetail}
        currency="USD"
        onViewOrder={handleViewOrder}
      />
    </div>
  );
}