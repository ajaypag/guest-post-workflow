'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Package, Building, Target, DollarSign, Clock, Zap, 
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  FileText, Send, Loader2
} from 'lucide-react';

interface OrderSummaryColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

export default function OrderSummaryColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: OrderSummaryColumnProps) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  if (!order) {
    return <div className="p-4">Loading order details...</div>;
  }
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  const handleSubmitOrder = async () => {
    if (submitting || order.status !== 'draft') return;
    
    const confirmed = confirm(
      'Submit this order for processing?\n\n' +
      'Our team will review your order and begin finding suitable sites for your guest posts.'
    );
    
    if (!confirmed) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      const response = await fetch(`/api/orders/${order.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit order');
      }
      
      // Redirect to status page
      router.push(`/account/orders/${order.id}/status`);
      
    } catch (error: any) {
      console.error('Error submitting order:', error);
      setError(error.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };
  
  const totalLinks = order.orderGroups?.reduce((sum: number, group: any) => sum + group.linkCount, 0) || 0;
  const totalClients = order.orderGroups?.length || 0;
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Review & Confirm Order</h2>
        <p className="text-sm text-gray-600 mt-1">
          Review your order details before submitting
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Order Overview */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3">Order Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Total Brands</p>
              <p className="text-2xl font-bold text-blue-900">{totalClients}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Total Links</p>
              <p className="text-2xl font-bold text-blue-900">{totalLinks}</p>
            </div>
          </div>
        </div>
        
        {/* Client Groups */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 flex items-center">
            <Building className="h-4 w-4 mr-2" />
            Brand Details
          </h3>
          
          {order.orderGroups?.map((group: any) => (
            <div key={group.id} className="border rounded-lg">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-start">
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{group.client?.name}</p>
                    <p className="text-sm text-gray-600">{group.linkCount} links</p>
                  </div>
                </div>
                {expandedGroups[group.id] ? 
                  <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                }
              </button>
              
              {expandedGroups[group.id] && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">Target Pages:</p>
                  <ul className="space-y-1">
                    {group.targetPages?.map((page: any, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600">
                        • {page.url}
                        {group.anchorTexts?.[idx] && (
                          <span className="text-gray-500 ml-2">
                            (Anchor: {group.anchorTexts[idx]})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Pricing Summary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Pricing Summary
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(order.subtotalRetail / 100)}</span>
            </div>
            
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount ({order.discountPercent}%)</span>
                <span className="text-green-600">-{formatCurrency(order.discountAmount / 100)}</span>
              </div>
            )}
            
            {order.includesClientReview && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Client Review</span>
                <span className="font-medium">{formatCurrency(order.clientReviewFee / 100)}</span>
              </div>
            )}
            
            {order.rushDelivery && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  Rush Delivery
                </span>
                <span className="font-medium">{formatCurrency(order.rushFee / 100)}</span>
              </div>
            )}
            
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(order.totalRetail / 100)}</span>
            </div>
          </div>
        </div>
        
        {/* Options Summary */}
        <div className="space-y-2">
          {order.includesClientReview && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Client review included - You'll approve all sites before we proceed</span>
            </div>
          )}
          
          {order.rushDelivery && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Zap className="h-4 w-4 text-amber-600" />
              <span>Rush delivery - Your order will be prioritized</span>
            </div>
          )}
        </div>
        
        {/* Notes */}
        {order.accountNotes && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Order Notes
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.accountNotes}</p>
          </div>
        )}
        
        {/* Next Steps */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Our team will review your order within 24 hours</li>
            <li>We'll research and find high-quality sites matching your requirements</li>
            {order.includesClientReview ? (
              <li>You'll review and approve all suggested sites</li>
            ) : (
              <li>We'll proceed with the best sites we find</li>
            )}
            <li>Our writers will create unique, high-quality content</li>
            <li>We'll secure publication and provide you with live links</li>
          </ol>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="border-t p-4">
        {order.status === 'draft' ? (
          <>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                  Submitting Order...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 inline mr-2" />
                  Submit Order for Processing
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              You can track progress after submission
            </p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Order already submitted
            </p>
            <button
              onClick={() => router.push(`/account/orders/${order.id}/status`)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Order Status →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}