'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, ShoppingCart, Users, Target, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
    niche?: string;
  };
  linkCount: number;
  targetPages: any[];
  requirementOverrides?: {
    minDR?: number;
    minTraffic?: number;
    niches?: string[];
    customGuidelines?: string;
  };
}

interface OrderData {
  id: string;
  accountId: string;
  totalRetail: number;
  totalWholesale: number;
  status: string;
  orderGroups: OrderGroup[];
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchOrder();
  }, [orderId]);
  
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      console.log('[ORDER_CONFIRM] Loaded order:', data);
      console.log('[ORDER_CONFIRM] Order groups:', data.orderGroups);
      if (data.orderGroups && data.orderGroups.length > 0) {
        console.log('[ORDER_CONFIRM] First group targetPages:', data.orderGroups[0].targetPages);
      }
      
      // Verify it's in draft status
      if (data.status !== 'draft') {
        router.push(`/account/orders/${orderId}/status`);
        return;
      }
      
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmOrder = async () => {
    if (!order || confirming) return;
    
    try {
      setConfirming(true);
      setError('');
      
      // For account users, we submit the order which moves it to pending_confirmation
      const response = await fetch(`/api/orders/${orderId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit order');
      }
      
      // Redirect to order status page
      router.push(`/account/orders/${orderId}/status`);
    } catch (error: any) {
      console.error('Error submitting order:', error);
      setError(error.message || 'Failed to submit order');
      setConfirming(false);
    }
  };
  
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </>
    );
  }
  
  if (!order) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error || 'Order not found'}</p>
            <Link href="/account/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  const totalLinks = order.orderGroups.reduce((sum, group) => sum + group.linkCount, 0);
  const totalClients = order.orderGroups.length;
  
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/account/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center mb-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ready to Submit Your Order
          </h1>
          <p className="text-lg text-gray-600">
            Please review and confirm your order details
          </p>
        </div>
        
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <ShoppingCart className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalLinks}</p>
                <p className="text-sm text-gray-600">Total Links</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                <p className="text-sm text-gray-600">Clients</p>
              </div>
              <div className="text-center">
                <Target className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">${(order.totalRetail / 100).toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Price</p>
              </div>
            </div>
            
            {/* Client Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Order Details</h3>
              {order.orderGroups.map((group) => (
                <div key={group.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{group.client.name}</p>
                      <p className="text-sm text-gray-600">{group.client.website}</p>
                      {group.client.niche && (
                        <p className="text-sm text-gray-500">Niche: {group.client.niche}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{group.linkCount} links</p>
                    </div>
                  </div>
                  
                  {group.targetPages && Array.isArray(group.targetPages) && group.targetPages.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">Target Pages:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {group.targetPages.slice(0, 3).map((page: any, idx: number) => (
                          <li key={idx}>• {page.url || page}</li>
                        ))}
                        {group.targetPages.length > 3 && (
                          <li className="text-gray-500">+ {group.targetPages.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* What Happens Next */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">What Happens Next?</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <p>Our expert team will begin analyzing potential link placement opportunities</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <p>We'll identify high-quality sites that match your requirements and budget</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <p>You'll receive site recommendations to review and approve within 2-3 business days</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">4</span>
              </div>
              <p>Once approved, we'll begin the outreach and content creation process</p>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/account/orders/${orderId}/edit`}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Edit
          </Link>
          
          <button
            onClick={handleConfirmOrder}
            disabled={confirming}
            className={`
              inline-flex items-center px-6 py-3 rounded-lg font-medium
              ${confirming 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {confirming ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Confirming Order...
              </>
            ) : (
              <>
                Confirm Order
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}