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
  account?: {
    email: string;
    contactName?: string;
    companyName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [siteSubmissions, setSiteSubmissions] = useState<Record<string, any[]>>({});
  const [isNewOrder, setIsNewOrder] = useState(false);

  useEffect(() => {
    // Get session
    const currentSession = sessionStorage.getSession();
    setSession(currentSession);
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found');
            return;
          }
          throw new Error('Failed to fetch order');
        }
        const data = await response.json();
        setOrderData(data);
        
        // Determine if this is a new order (just created from /orders/new)
        const isNew = data.status === 'draft' && 
                     (!data.order_groups || data.order_groups.length === 0) &&
                     new Date(data.createdAt).getTime() > Date.now() - 60000; // Created within last minute
        setIsNewOrder(isNew);
        
        // Load site submissions if confirmed order
        if (data.status === 'confirmed' && data.order_groups) {
          const submissionsMap: Record<string, any[]> = {};
          
          // Fetch site submissions for each order group
          for (const group of data.order_groups) {
            try {
              const submissionsResponse = await fetch(
                `/api/orders/${orderId}/groups/${group.id}/site-submissions`,
                { credentials: 'include' }
              );
              if (submissionsResponse.ok) {
                const submissions = await submissionsResponse.json();
                submissionsMap[group.id] = submissions;
              }
            } catch (err) {
              console.error('Error loading site submissions for group:', group.id, err);
            }
          }
          
          setSiteSubmissions(submissionsMap);
        }
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
        credentials: 'include',
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
      // First save the current changes
      await handleSave(orderFormData);
      
      // If this is a draft order and we're submitting it
      if (orderData?.status === 'draft') {
        // Submit the order (move from draft to pending_confirmation)
        const response = await fetch(`/api/orders/${orderId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit order');
        }
        
        // Redirect to success page
        router.push(`/orders/${orderId}/success`);
      } else {
        // For other statuses, the save is already complete
        // Refresh the page to show updated data
        window.location.reload();
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

  // Internal action handlers
  const handleMarkSitesReady = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ state: 'sites_ready' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order state');
      }
      
      // Refresh order data
      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      console.error('Error marking sites ready:', err);
      alert('Failed to mark sites as ready');
    }
  };
  
  const handleGenerateWorkflows = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/workflows/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate workflows');
      }
      
      alert('Workflows generated successfully');
      // Refresh page to show updated state
      window.location.reload();
    } catch (err) {
      console.error('Error generating workflows:', err);
      alert('Failed to generate workflows');
    }
  };
  
  const handleSwitchDomain = async (submissionId: string, groupId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/groups/${groupId}/site-selections/${submissionId}/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch domain');
      }
      
      // Refresh site submissions
      const submissionsResponse = await fetch(
        `/api/orders/${orderId}/groups/${groupId}/site-submissions`,
        { credentials: 'include' }
      );
      if (submissionsResponse.ok) {
        const submissions = await submissionsResponse.json();
        setSiteSubmissions(prev => ({ ...prev, [groupId]: submissions }));
      }
    } catch (err) {
      console.error('Error switching domain:', err);
      alert('Failed to switch domain');
    }
  };

  return (
    <AuthWrapper>
      <Header />
      {/* Full width unified interface - no container constraints */}
      <div className="min-h-screen">
        <UnifiedOrderInterface
          orderId={orderId}
          orderGroups={orderData.order_groups}
          siteSubmissions={siteSubmissions}
          userType={userType}
          orderStatus={orderData.status}
          orderState={orderData.state}
          isPaid={orderData.payment_status === 'paid'}
          onSave={handleSave}
          onSubmit={handleSubmit}
          onMarkSitesReady={userType === 'internal' ? handleMarkSitesReady : undefined}
          onGenerateWorkflows={userType === 'internal' ? handleGenerateWorkflows : undefined}
          onSwitchDomain={userType === 'internal' ? handleSwitchDomain : undefined}
        />
      </div>
    </AuthWrapper>
  );
}