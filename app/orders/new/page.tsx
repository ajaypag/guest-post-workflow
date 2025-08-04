'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';
import { AuthService } from '@/lib/auth';

export default function NewOrderPage() {
  const router = useRouter();
  const session = AuthService.getSession();

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    // Create a new order immediately
    const createNewOrder = async () => {
      try {
        // Prepare the order data based on user type
        const orderData: any = {
          status: 'draft',
          state: 'configuring',
          orderType: 'guest_post',
        };

        // For account users, include their account info
        if (session.userType === 'account') {
          orderData.accountId = session.userId;
          orderData.accountEmail = session.email || '';
          orderData.accountName = session.name || '';
        }

        // Create the order
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to create order:', error);
          // Redirect to orders list with error
          router.push('/orders?error=create_failed');
          return;
        }

        const result = await response.json();
        
        // Redirect to edit page
        router.push(`/orders/${result.orderId}/edit`);
      } catch (error) {
        console.error('Error creating order:', error);
        // Redirect to orders list with error
        router.push('/orders?error=create_failed');
      }
    };

    createNewOrder();
  }, [session, router]);

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Creating New Order</h2>
            <p className="text-gray-600">Please wait while we set up your order...</p>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}