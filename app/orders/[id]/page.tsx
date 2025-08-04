'use client';

import { useParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import UnifiedOrderInterface from '@/components/orders/UnifiedOrderInterface';

export default function OrderPage() {
  const params = useParams();
  const orderId = params.id as string;

  return (
    <AuthWrapper>
      <Header />
      {/* Full width unified interface - no container constraints */}
      <div className="min-h-screen">
        <UnifiedOrderInterface
          orderId={orderId}
          userType="internal" // TODO: Get from session
          orderStatus="confirmed" // TODO: Load from API
          isPaid={false} // TODO: Load from API
          onSave={async (orderData) => {
            // TODO: Implement real save functionality
            console.log('Save order:', orderData);
          }}
          onSubmit={async (orderData) => {
            // TODO: Implement real submit functionality  
            console.log('Submit order:', orderData);
          }}
        />
      </div>
    </AuthWrapper>
  );
}