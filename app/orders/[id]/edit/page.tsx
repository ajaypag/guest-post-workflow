'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the new order interface
// The new interface at /orders/new handles both creating and editing orders
export default function EditOrderPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new orders page
    // TODO: Once /orders/new supports loading specific drafts via URL params,
    // we can pass the draft ID as a query parameter
    router.push('/orders/new');
  }, [router]);
  
  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to order editor...</p>
      </div>
    </div>
  );
}