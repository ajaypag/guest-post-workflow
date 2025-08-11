'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OrderPaymentPage from '@/components/orders/OrderPaymentPage';
// Removed AuthService - external users don't need it for payment
import { Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        // No authentication check needed here - the API will handle auth
        // External users access this via invoice page after authentication
        const response = await fetch(`/api/orders/${params.id}`, {
          credentials: 'include'  // Include cookies for account auth
        });

        if (!response.ok) {
          console.error('[PAYMENT PAGE] Failed to fetch order:', {
            status: response.status,
            statusText: response.statusText,
            orderId: params.id
          });
          
          if (response.status === 404) {
            setError('Order not found');
            return;
          }
          
          if (response.status === 401) {
            setError('Authentication required. Please log in to continue.');
            return;
          }
          
          if (response.status === 403) {
            setError('You do not have permission to view this order.');
            return;
          }
          
          throw new Error(`Failed to load order: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[PAYMENT PAGE] Order data received:', {
          id: data.id,
          state: data.state,
          totalRetail: data.totalRetail,
          subtotalRetail: data.subtotalRetail,
          discountAmount: data.discountAmount,
          invoiceData: data.invoiceData ? 'present' : 'missing',
          invoicedAt: data.invoicedAt
        });
        
        // Check if we actually got order data
        if (!data || !data.id) {
          console.error('[PAYMENT PAGE] Invalid order data structure:', data);
          setError('Failed to load order data. Please try again.');
          return;
        }
        
        setOrder(data); // API returns order directly, not wrapped in { order: ... }
      } catch (err) {
        console.error('Error loading order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order');
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <a
              href="/orders"
              className="inline-block mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Orders
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Order Not Found</h2>
            <p className="text-yellow-700">The order you're looking for could not be found.</p>
            <a
              href="/orders"
              className="inline-block mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Back to Orders
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check if invoice has been generated
  if (!order.invoiceData || !order.totalRetail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Invoice Not Generated
            </h2>
            <p className="text-yellow-700">
              An invoice needs to be generated before payment can be processed.
            </p>
            <a
              href={`/orders/${order.id}`}
              className="inline-block mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Return to Order
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check if order is in a payable state
  const payableStates = ['payment_pending', 'reviewing', 'sites_ready'];
  if (!payableStates.includes(order.state) && !order.paidAt) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Payment Not Available
            </h2>
            <p className="text-yellow-700">
              This order is in "{order.state}" state and does not require payment at this time.
            </p>
            <a
              href={`/orders/${order.id}`}
              className="inline-block mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              View Order Details
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Order already has the correct fields after invoice generation
  // No need to map - just ensure defaults for optional fields
  const orderForPayment = {
    ...order,
    // These fields should already exist from invoice generation:
    // totalRetail, subtotalRetail, discountAmount, discountPercent
    // Just ensure optional fields have defaults
    rushFee: order.rushFee || 0,
    clientReviewFee: order.clientReviewFee || 0,
    estimatedLinksCount: order.estimatedLinksCount || 0,
    account: order.account || {},
    paidAt: order.paidAt || null
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <a
          href={`/orders/${order.id}`}
          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Order Details
        </a>
      </div>

      <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>
      
      <OrderPaymentPage order={orderForPayment} />
    </div>
  );
}