'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { XCircleIcon } from '@heroicons/react/24/outline';

export default function PaymentCancelPage() {
  const params = useParams();
  const orderId = params.id as string;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Cancel Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>

          {/* Cancel Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled and no charges were made to your account.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-left">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-sm">#{orderId.substring(0, 8)}</span>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="text-left mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">What now?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your order is still pending payment</li>
              <li>• You can try payment again at any time</li>
              <li>• No charges were made to your account</li>
              <li>• Contact support if you need assistance</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Link
              href={`/orders/${orderId}`}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-center text-sm"
            >
              Back to Order
            </Link>
            <Link
              href={`/orders/${orderId}/payment`}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
            >
              Try Again
            </Link>
          </div>

          {/* Support Link */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <Link 
                href="/support" 
                className="text-blue-600 hover:text-blue-700"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}