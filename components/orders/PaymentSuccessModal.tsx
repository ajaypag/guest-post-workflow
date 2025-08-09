'use client';

import React from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  onViewOrder?: () => void;
}

export default function PaymentSuccessModal({
  isOpen,
  onClose,
  orderId,
  paymentIntentId,
  amount,
  currency = 'USD',
  onViewOrder
}: PaymentSuccessModalProps) {
  if (!isOpen) return null;

  const handleViewOrder = () => {
    onViewOrder?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Success content */}
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Successful!
          </h3>

          {/* Subtitle */}
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully and your order is now being prepared.
          </p>

          {/* Payment details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-gray-900">
                  {orderId.substring(0, 8)}...
                </span>
              </div>
              {amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold text-green-600">
                    ${(amount / 100).toFixed(2)} {currency}
                  </span>
                </div>
              )}
              {paymentIntentId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-gray-900 text-xs">
                    {paymentIntentId.substring(0, 16)}...
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-semibold">Paid</span>
              </div>
            </div>
          </div>

          {/* Next steps */}
          <div className="text-left mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• You will receive a payment confirmation email shortly</li>
              <li>• Our team will begin processing your order immediately</li>
              <li>• You'll receive regular updates on your order progress</li>
              <li>• Estimated delivery time will be provided within 24 hours</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleViewOrder}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View Order Details
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>

        {/* Support note */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}