'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import UnifiedOrderInterface from '@/components/orders/UnifiedOrderInterface';
import { sessionStorage } from '@/lib/userStorage';
import { type AuthSession } from '@/lib/auth';

interface OrderData {
  id: string;
  status: string;
  state?: string;
  payment_status?: string;
  created_by: string;
  account_id: string;
  order_groups?: any[];
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Get session
    const currentSession = sessionStorage.getSession();
    setSession(currentSession);
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found');
            return;
          }
          throw new Error('Failed to fetch order');
        }
        const data = await response.json();
        setOrderData(data);
      } catch (err) {
        setError('Error loading order');
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleSave = async (orderFormData: any) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderFormData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save order');
      }
      
      // Refresh order data
      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      console.error('Error saving order:', err);
      throw err;
    }
  };

  const handleSubmit = async (orderFormData: any) => {
    try {
      // For draft orders, confirm them
      if (orderData?.status === 'draft') {
        const response = await fetch(`/api/orders/${orderId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error('Failed to confirm order');
        }
        
        // Redirect to success page or refresh
        router.push(`/orders/${orderId}/success`);
      } else {
        // For other statuses, just save
        await handleSave(orderFormData);
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order...</p>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (error || !orderData) {
    return (
      <AuthWrapper>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600">{error || 'Order not found'}</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  // Determine user type based on session and order ownership
  const userType = session?.userType === 'internal' 
    ? 'internal' 
    : session?.userId === orderData.account_id 
      ? 'account' 
      : 'external';

  return (
    <AuthWrapper>
      <Header />
      {/* Full width unified interface - no container constraints */}
      <div className="min-h-screen">
        <UnifiedOrderInterface
          orderId={orderId}
          userType={userType}
          orderStatus={orderData.status}
          isPaid={orderData.payment_status === 'paid'}
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      </div>
    </AuthWrapper>
  );
}