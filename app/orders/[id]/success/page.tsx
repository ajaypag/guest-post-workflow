'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface OrderData {
  id: string;
  status: string;
  state?: string;
  payment_status?: string;
  created_by: string;
  account_id: string;
  order_groups?: any[];
  total?: number;
}

export default function OrderSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch order');
        }
        const data = await response.json();
        setOrderData(data);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AuthWrapper>
    );
  }

  if (!orderData) {
    router.push('/orders');
    return null;
  }

  return (
    <AuthWrapper>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Message */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Confirmed!
            </h1>
            
            <p className="text-lg text-gray-600 mb-6">
              Your order #{orderId.slice(0, 8)} has been successfully confirmed.
            </p>

            {orderData.total && (
              <div className="text-2xl font-bold text-gray-900 mb-8">
                Total: {formatCurrency(orderData.total)}
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <p className="ml-3 text-gray-700">
                    Our team will begin analyzing suitable guest post sites for your links
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <p className="ml-3 text-gray-700">
                    You'll receive an email when sites are ready for your review
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <p className="ml-3 text-gray-700">
                    Once approved, we'll create content and place your links
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push(`/orders/${orderId}`)}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="w-5 h-5 mr-2" />
                View Order Details
              </button>
              
              <button
                onClick={() => router.push('/orders')}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to Orders
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need help?</h3>
            <p className="text-gray-600 mb-4">
              If you have any questions about your order, our team is here to help.
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Email: support@postflow.com</p>
              <p>Response time: Within 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}