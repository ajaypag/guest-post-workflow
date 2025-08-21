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
import { formatCurrency } from '@/lib/utils/formatting';
import { isLineItemsSystemEnabled } from '@/lib/config/featureFlags';

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

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

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


  // Check if invoice needs regeneration
  const needsInvoiceRegeneration = () => {
    if (!order?.invoicedAt) return false;
    
    // Check if any line item was modified after invoice generation
    const invoiceTime = new Date(order.invoicedAt).getTime();
    const hasModificationsAfterInvoice = lineItems.some(item => {
      if (!item.modifiedAt) return false;
      return new Date(item.modifiedAt).getTime() > invoiceTime;
    });
    
    return hasModificationsAfterInvoice;
  };

  const handleProceed = async () => {
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
          body: JSON.stringify({ action })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`[INVOICE] ${needsRegeneration ? 'Regenerated' : 'Generated'} successfully:`, result);
          // Invoice generated successfully, redirect to invoice page
          router.push(`/orders/${orderId}/invoice`);
        } else {
          // Log the error details for debugging
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`[INVOICE] Failed to ${needsRegeneration ? 'regenerate' : 'generate'} invoice:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          
          // Show error message to user
          alert(`Failed to ${needsRegeneration ? 'regenerate' : 'generate'} invoice: ${errorData.error || 'Unknown error'}. Please try again or contact support.`);
          
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
                    You can adjust the selection using the status dropdown in the table below: "Included", "Excluded", or "Saved for Later".
                    {savedForLaterCount > 0 && ` ${savedForLaterCount} additional sites have been saved to your Site Bank for future orders.`}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
              <div className="text-center bg-green-50 rounded-lg p-4 sm:p-3 border border-green-200">
                <p className="text-2xl font-semibold text-green-600">{includedCount}</p>
                <p className="text-sm sm:text-xs text-green-700 font-medium">In This Order</p>
              </div>
              <div className="text-center bg-purple-50 rounded-lg p-4 sm:p-3 border border-purple-200 relative group">
                <p className="text-2xl font-semibold text-purple-600">{savedForLaterCount}</p>
                <p className="text-sm sm:text-xs text-purple-700 font-medium">Site Bank</p>
                {savedForLaterCount > 0 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                      Available for future orders
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                )}
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
            userType="account"
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
              canSetExclusionReason: false  // Only this is restricted - internal notes
            }}
            onChangeStatus={handleStatusChange}
            onEditItem={handleEditItem}
            onRefresh={fetchOrder}
            benchmarkData={benchmarkData}
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
                  onClick={handleProceed}
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
    </AuthWrapper>
  );
}