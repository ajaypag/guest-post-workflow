'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { AuthService } from '@/lib/auth';

export default function PaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const payment_intent = searchParams.get('payment_intent');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const session = await AuthService.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/orders/${params.id}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          router.push('/orders');
          return;
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        console.error('Error loading order:', err);
        router.push('/orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-center text-gray-600 mb-8">
            Thank you for your payment. Your order has been confirmed and our team will begin working on it shortly.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-sm">{order.id.substring(0, 8)}...</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-semibold text-green-600">
                  ${((order.totalRetail || order.totalPrice || 0) / 100).toFixed(2)}
                </span>
              </div>
              
              {payment_intent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs">{payment_intent.substring(0, 20)}...</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Paid
                </span>
              </div>

              {order.orderType && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type:</span>
                  <span className="capitalize">{order.orderType.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You'll receive a payment confirmation email shortly
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Our team will begin processing your order immediately
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You'll receive regular updates on your order progress
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Estimated delivery time will be provided within 24 hours
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/orders/${order.id}`}
              className="flex-1 bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View Order Details
            </Link>
            
            <Link
              href="/orders"
              className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              View All Orders
            </Link>
          </div>

          {/* Support Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Need help? Contact our support team at{' '}
              <a href="mailto:info@linkio.com" className="text-blue-600 hover:underline">
                info@linkio.com
              </a>{' '}
              or call us at{' '}
              <a href="tel:+18443782473" className="text-blue-600 hover:underline">
                (844) 378-2473
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}