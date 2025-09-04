'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, DollarSign, Bell } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import LineItemsReviewTable from '@/components/orders/LineItemsReviewTable';
import type { LineItem } from '@/components/orders/LineItemsReviewTable';
import BenchmarkDisplay from '@/components/orders/BenchmarkDisplay';
import OrderSuggestionsModule from '@/components/orders/OrderSuggestionsModule';
import InvoiceGenerationModal from '@/components/orders/InvoiceGenerationModal';
import { formatCurrency } from '@/lib/utils/formatting';
import { isLineItemsSystemEnabled } from '@/lib/config/featureFlags';
import { AuthService } from '@/lib/auth';

interface OrderData {
  id: string;
  accountId: string;
  totalPrice: number;
  status: string;
  state?: string;
  createdAt: string;
  approvedAt?: string;
  invoicedAt?: string;
  lineItems: LineItem[];
}

export default function ExternalOrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<{
    isOpen: boolean;
    data: any;
  }>({ isOpen: false, data: null });

  useEffect(() => {
    fetchOrder();
    loadSession();
  }, [orderId]);

  const loadSession = async () => {
    try {
      const session = await AuthService.getSession();
      setSession(session);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const loadBenchmarkData = async (orderStatus?: string) => {
    // Use passed status or current order status
    const status = orderStatus || order?.status;
    if (!status) return;
    
    // Fetch benchmark data if order is in appropriate status
    if (status === 'confirmed' || status === 'paid' || status === 'pending_confirmation') {
      try {
        const benchmarkRes = await fetch(`/api/orders/${orderId}/benchmark?comparison=true`);
        if (benchmarkRes.ok) {
          const benchData = await benchmarkRes.json();
          setBenchmarkData(benchData.benchmark || benchData);
          setComparisonData(benchData.comparison || null);
        }
      } catch (error) {
        console.error('Failed to load benchmark:', error);
      }
    }
  };

  const handleStatusChange = async (itemId: string, status: 'included' | 'excluded' | 'saved_for_later', reason?: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/line-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            inclusionStatus: status,
            ...(reason && { exclusionReason: reason })
          }
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update status';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            errorMessage = await response.text();
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage);
      }

      // Parse the successful response
      await response.json();
      
      // Refresh the order data to show updated status immediately
      await fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleEditItem = async (itemId: string, updates: any) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/line-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      // Refresh the order data
      await fetchOrder();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  const handleRemoveLineItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this line item? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/orders/${orderId}/line-items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove line item');
      }
      
      await fetchOrder();
      setMessage({ type: 'success', text: 'Line item removed successfully' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error removing line item:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to remove line item' });
      
      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      // Fetch order details (skip order groups for performance)
      const response = await fetch(`/api/orders/${orderId}?skipOrderGroups=true`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const orderData = await response.json();
      
      // Fetch line items with assigned domains
      const lineItemsRes = await fetch(`/api/orders/${orderId}/line-items`);
      
      let items: LineItem[] = [];
      
      if (lineItemsRes.ok) {
        const lineItemsData = await lineItemsRes.json();
        items = lineItemsData.lineItems || [];
        setLineItems(items);
        console.log('[REVIEW PAGE] Loaded', items.length, 'line items');
      }
      
      // Fetch benchmark data if order is confirmed, paid, or pending confirmation (for external review)
      if (orderData.status === 'confirmed' || orderData.status === 'paid' || orderData.status === 'pending_confirmation') {
        try {
          const benchmarkRes = await fetch(`/api/orders/${orderId}/benchmark?comparison=true`);
          if (benchmarkRes.ok) {
            const benchData = await benchmarkRes.json();
            setBenchmarkData(benchData.benchmark || benchData);
            setComparisonData(benchData.comparison || null);
          }
        } catch (error) {
          console.error('Failed to load benchmark:', error);
        }
      }
      
      setOrder({
        ...orderData,
        lineItems: items
      });
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };


  // Check if invoice needs regeneration based on meaningful changes
  const needsInvoiceRegeneration = () => {
    if (!order?.invoicedAt) return false;
    
    // NEVER regenerate invoice after payment - that's final
    if (order.status === 'paid' || order.status === 'completed') {
      return false;
    }
    
    // Check if any invoice-affecting changes happened after invoice generation
    const invoiceTime = new Date(order.invoicedAt).getTime();
    const GRACE_PERIOD = 30 * 1000; // 30 seconds grace period
    
    // Check for changes that actually affect the invoice
    const hasInvoiceAffectingChanges = lineItems.some(item => {
      if (!item.modifiedAt) return false;
      
      const itemModifiedTime = new Date(item.modifiedAt).getTime();
      const timeDiff = itemModifiedTime - invoiceTime;
      
      // Skip if within grace period
      if (timeDiff <= GRACE_PERIOD) return false;
      
      // Check if this item has invoice-affecting metadata changes
      // The invoice cares about:
      // 1. Inclusion status (included/excluded/saved_for_later)
      // 2. Price changes (estimatedPrice, approvedPrice, wholesalePrice)
      // 3. Domain assignment (whether an item has a domain or not)
      
      // For now, we'll check if the item was modified after invoice
      // In the future, we could store invoice snapshot and compare specific fields
      // But the metadata.invoiceSnapshot approach would require API changes
      
      // Simple approach: Any modification after grace period triggers regeneration
      // This is safer than missing important changes
      return true;
    });
    
    if (hasInvoiceAffectingChanges) {
      console.log('[INVOICE] Invoice-affecting changes detected');
    }
    
    return hasInvoiceAffectingChanges;
  };

  const handleProceed = async (cancelUnusedItems = false) => {
    const needsRegeneration = needsInvoiceRegeneration();
    
    // If invoice exists and doesn't need regeneration, just navigate to it
    if (order?.invoicedAt && !needsRegeneration) {
      router.push(`/orders/${orderId}/invoice`);
      return;
    }
    
    // Count included items (check metadata.inclusionStatus)
    const includedItems = lineItems.filter(item => 
      item.assignedDomain && (item.metadata?.inclusionStatus === 'included' || 
      (!item.metadata?.inclusionStatus && item.assignedDomain)) // Default to included if has domain
    );
    
    if (order && includedItems.length > 0) {
      try {
        setGeneratingInvoice(true);
        const action = needsRegeneration ? 'regenerate_invoice' : 'generate_invoice';
        console.log(`[INVOICE] ${needsRegeneration ? 'Regenerating' : 'Generating'} invoice for order ${orderId} with ${includedItems.length} included sites`);
        
        // Trigger invoice generation or regeneration for included sites
        const response = await fetch(`/api/orders/${orderId}/invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action,
            cancelUnusedItems 
          })
        });
        
        const result = await response.json();
        
        // Handle warning about unused line items - show modal
        if (response.status === 422 && result.warning === 'unused_line_items') {
          setGeneratingInvoice(false);
          setInvoiceModal({
            isOpen: true,
            data: result
          });
          return;
        }
        
        if (response.ok) {
          console.log(`[INVOICE] ${needsRegeneration ? 'Regenerated' : 'Generated'} successfully:`, result);
          // Close modal if it was open
          setInvoiceModal({ isOpen: false, data: null });
          // Invoice generated successfully, redirect to invoice page
          router.push(`/orders/${orderId}/invoice`);
        } else {
          // Log the error details for debugging
          console.error(`[INVOICE] Failed to ${needsRegeneration ? 'regenerate' : 'generate'} invoice:`, {
            status: response.status,
            statusText: response.statusText,
            error: result
          });
          
          // Show error message to user
          alert(`Failed to ${needsRegeneration ? 'regenerate' : 'generate'} invoice: ${result.error || 'Unknown error'}. Please try again or contact support.`);
          
          // Don't redirect automatically - let user decide next step
        }
      } catch (error) {
        console.error(`[INVOICE] Error ${needsRegeneration ? 'regenerating' : 'generating'} invoice:`, error);
        alert(`Failed to ${needsRegeneration ? 'regenerate' : 'generate'} invoice due to network error. Please try again.`);
      } finally {
        setGeneratingInvoice(false);
      }
    } else {
      // No approved sites, go to order page
      router.push(`/orders/${orderId}`);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </AuthWrapper>
    );
  }

  if (!order) {
    return (
      <AuthWrapper>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Order not found</p>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  // Calculate statistics from line items
  const totalItems = lineItems.length;
  // Count items based on metadata.inclusionStatus (where the actual status is stored)
  const includedCount = lineItems.filter(item => 
    item.metadata?.inclusionStatus === 'included' || 
    (!item.metadata?.inclusionStatus && item.assignedDomain) // Default to included if has domain but no status
  ).length;
  const excludedCount = lineItems.filter(item => 
    item.metadata?.inclusionStatus === 'excluded'
  ).length;
  const savedForLaterCount = lineItems.filter(item => 
    item.metadata?.inclusionStatus === 'saved_for_later'
  ).length;
  const pendingCount = lineItems.filter(item => 
    !item.assignedDomain && !item.metadata?.inclusionStatus
  ).length;

  return (
    <AuthWrapper>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href={`/orders/${orderId}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Order
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Review Site Recommendations
                </h1>
                <p className="text-gray-600 mt-1">
                  Order #{order.id.slice(0, 8)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500">Total Sites</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`rounded-lg p-3 mb-4 flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Clear instructions for users */}
            {totalItems > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    {includedCount > 0 
                      ? `${includedCount} sites are ready for your order` 
                      : 'Review and select sites for your order'}
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Our team has pre-organized sites based on your requirements. Sites marked as "Included" will be part of your order.
                    You can adjust the selection using the status dropdown in the table below: "Included" or "Excluded".
                  </p>
                </div>
              </div>
            )}

            {/* Benchmark Display - Show Original Request vs Current Selection */}
            {benchmarkData && (
              <div className="mt-6">
                <BenchmarkDisplay 
                  benchmark={benchmarkData}
                  comparison={{
                    ...comparisonData,
                    comparisonData: {
                      ...comparisonData?.comparisonData,
                      // Calculate current selection in real-time
                      deliveredLinks: includedCount,
                      requestedLinks: benchmarkData?.benchmarkData?.totalRequestedLinks || totalItems,
                      actualRevenue: lineItems
                        .filter(item => 
                          item.metadata?.inclusionStatus === 'included' || 
                          (!item.metadata?.inclusionStatus && item.assignedDomain)
                        )
                        .reduce((sum, item) => sum + (item.estimatedPrice || item.wholesalePrice || 0), 0),
                      drRange: comparisonData?.comparisonData?.drRange,
                      trafficRange: comparisonData?.comparisonData?.trafficRange
                    }
                  }}
                  orderId={orderId}
                  userType="account"
                />
              </div>
            )}

            {/* Progress Stats - Simple included/excluded counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
              <div className="text-center bg-green-50 rounded-lg p-4 sm:p-3 border border-green-200">
                <p className="text-2xl font-semibold text-green-600">{includedCount}</p>
                <p className="text-sm sm:text-xs text-green-700 font-medium">In This Order</p>
              </div>
              <div className="text-center bg-gray-50 rounded-lg p-4 sm:p-3 border border-gray-200">
                <p className="text-2xl font-semibold text-gray-400">{excludedCount}</p>
                <p className="text-sm sm:text-xs text-gray-600 font-medium">Not Interested</p>
              </div>
            </div>
          </div>

          {/* Site Review Table */}
          <LineItemsReviewTable
            orderId={orderId}
            lineItems={lineItems}
            userType={session?.userType || "account"}
            permissions={{
              canApproveReject: false,  // Disable confusing approve/reject buttons
              canViewPricing: true,    // External users can see pricing column
              canEditPricing: false,   // External users cannot edit price overrides
              canViewInternalTools: false,
              canChangeStatus: true,  // External users CAN organize sites (included/excluded/saved)
              canAssignTargetPages: true,  // External users CAN assign/change target pages
              canGenerateWorkflows: false,
              canMarkSitesReady: false,
              canEditDomainAssignments: true,  // External users CAN edit all domain details
              canSetExclusionReason: false,  // Only this is restricted - internal notes
              canViewPublishedUrls: false,  // Hide published URLs at review stage for account users
              canShowSetupButton: false  // Hide Setup button at review stage - it would reset the order flow
            }}
            onChangeStatus={handleStatusChange}
            onEditItem={handleEditItem}
            onRemoveItem={session?.userType === 'internal' ? handleRemoveLineItem : undefined}
            onRefresh={fetchOrder}
            benchmarkData={benchmarkData}
          />

          {/* Order Suggestions Module - Help users expand their orders */}
          <OrderSuggestionsModule 
            orderId={orderId}
            userType="account"
            lineItems={lineItems}
            onAddDomain={() => {
              // Refresh order data when domain is added or replaced
              fetchOrder();
            }}
          />

          {/* Pricing Summary for Selected Sites */}
          {includedCount > 0 && (
            <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Order Summary</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Group line items by client */}
                {(() => {
                  const clientGroups: Record<string, LineItem[]> = {};
                  lineItems
                    .filter(item => 
                      item.metadata?.inclusionStatus === 'included' || 
                      (!item.metadata?.inclusionStatus && item.assignedDomain)
                    )
                    .forEach(item => {
                      if (!clientGroups[item.clientId]) {
                        clientGroups[item.clientId] = [];
                      }
                      clientGroups[item.clientId].push(item);
                    });
                  
                  return Object.entries(clientGroups).map(([clientId, items]) => {
                    const groupTotal = items.reduce((sum, item) => 
                      sum + (item.estimatedPrice || item.wholesalePrice || 0), 0
                    );
                    const clientName = items[0]?.client?.name || 'Unknown Client';
                    
                    return (
                      <div key={clientId} className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-100 last:border-b-0 gap-1 sm:gap-0">
                        <div>
                          <span className="font-medium text-gray-900">{clientName}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({items.length} site{items.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 text-right sm:text-left">
                          {groupTotal > 0 ? formatCurrency(groupTotal) : (
                            <span className="text-gray-500 italic text-sm">TBD</span>
                          )}
                        </span>
                      </div>
                    );
                  });
                })()}
                
                {/* Total */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {(() => {
                        const totalPrice = lineItems
                          .filter(item => 
                            item.metadata?.inclusionStatus === 'included' || 
                            (!item.metadata?.inclusionStatus && item.assignedDomain)
                          )
                          .reduce((sum, item) => sum + (item.estimatedPrice || item.wholesalePrice || 0), 0);
                        
                        return totalPrice > 0 ? formatCurrency(totalPrice) : (
                          <span className="text-gray-500 italic text-base font-normal">
                            To be determined
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                  {lineItems.some(item => !item.wholesalePrice && !item.estimatedPrice) && (
                    <p className="text-xs text-gray-500 mt-1 text-left sm:text-right">
                      Pricing will be finalized before order confirmation
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Proceed Button - Always visible with clear messaging */}
          <div className="mt-4 sm:mt-6 text-center">
            {includedCount > 0 ? (
              <>
                <button
                  onClick={() => handleProceed()}
                  disabled={generatingInvoice}
                  className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingInvoice ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Invoice...
                    </>
                  ) : order?.invoicedAt ? (
                    needsInvoiceRegeneration() ? (
                      <>
                        Regenerate Invoice (Changes Made)
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        View Invoice
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )
                  ) : (
                    <>
                      Generate Invoice for {includedCount} Site{includedCount !== 1 ? 's' : ''}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  {order?.invoicedAt 
                    ? (needsInvoiceRegeneration() 
                        ? "Changes detected since invoice was generated. Click to regenerate with current selection."
                        : "Invoice ready. Click to view, or make changes to regenerate.")
                    : "You can adjust your selection using the status dropdowns above"}
                </p>
              </>
            ) : totalItems > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                <p className="text-gray-600 mb-2">
                  No sites selected for this order
                </p>
                <p className="text-sm text-gray-500">
                  Change sites to "✅ Use This Site" in the table above to include them in your order
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-4 sm:p-6 border border-yellow-200">
                <p className="text-yellow-800 mb-2">
                  No sites have been suggested yet
                </p>
                <p className="text-sm text-yellow-700">
                  Our team is working on finding the best sites for your requirements
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Generation Modal */}
      {invoiceModal.data && (
        <InvoiceGenerationModal
          isOpen={invoiceModal.isOpen}
          onClose={() => setInvoiceModal({ isOpen: false, data: null })}
          onProceed={() => {
            setInvoiceModal({ isOpen: false, data: null });
            handleProceed(true); // Proceed with cancelling unused items
          }}
          totalRequested={invoiceModal.data.totalRequested}
          totalAssigned={invoiceModal.data.totalAssigned}
          unusedCount={invoiceModal.data.unusedCount}
          unusedItems={invoiceModal.data.unusedItems}
          isProcessing={generatingInvoice}
        />
      )}
    </AuthWrapper>
  );
}