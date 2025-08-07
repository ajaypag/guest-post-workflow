'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, DollarSign, Bell } from 'lucide-react';
import Header from '@/components/Header';
import OrderSiteReviewTableV2 from '@/components/orders/OrderSiteReviewTableV2';
import type { OrderGroup, SiteSubmission, LineItem } from '@/components/orders/OrderSiteReviewTableV2';
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
  orderGroups: OrderGroup[];
  lineItems?: any[];
}

export default function ExternalOrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [siteSubmissions, setSiteSubmissions] = useState<Record<string, SiteSubmission[]>>({});
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      // Fetch order details
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const orderData = await response.json();
      
      // Load line items if system is enabled
      if (isLineItemsSystemEnabled() && orderData.lineItems) {
        const items: LineItem[] = orderData.lineItems.map((item: any) => ({
          id: item.id,
          orderId: item.orderId,
          clientId: item.clientId,
          targetPageUrl: item.targetPageUrl,
          targetPageId: item.targetPageId,
          anchorText: item.anchorText,
          status: item.status,
          assignedDomainId: item.assignedDomainId,
          assignedDomain: item.assignedDomain,
          estimatedPrice: item.estimatedPrice,
          metadata: item.metadata
        }));
        setLineItems(items);
      }
      
      // Fetch submissions for each order group
      const submissionsData: Record<string, SiteSubmission[]> = {};
      for (const group of orderData.orderGroups) {
        console.log('[REVIEW PAGE] Fetching submissions for group:', group.id);
        const submissionsRes = await fetch(
          `/api/orders/${orderId}/groups/${group.id}/submissions?includeCompleted=true`
        );
        if (submissionsRes.ok) {
          const data = await submissionsRes.json();
          console.log('[REVIEW PAGE] Received submissions:', data.submissions?.length || 0);
          submissionsData[group.id] = data.submissions || [];
        } else {
          console.error('[REVIEW PAGE] Failed to fetch submissions:', submissionsRes.status, await submissionsRes.text());
        }
      }
      
      // Fetch benchmark data if order is confirmed
      if (orderData.status === 'confirmed' || orderData.status === 'paid') {
        try {
          const benchmarkRes = await fetch(`/api/orders/${orderId}/benchmark`);
          if (benchmarkRes.ok) {
            const benchData = await benchmarkRes.json();
            setBenchmarkData(benchData);
          }
        } catch (error) {
          console.error('Failed to load benchmark:', error);
        }
      }
      
      setOrder(orderData);
      setSiteSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string, groupId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/groups/${groupId}/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'approve',
            notes: 'Approved by client',
            approvedBy: 'account_user' // Track who approved
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to approve site');
      
      // Refresh data
      await fetchOrder();
    } catch (error) {
      console.error('Error approving site:', error);
    }
  };

  const handleReject = async (submissionId: string, groupId: string, reason: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/groups/${groupId}/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'reject',
            notes: reason,
            rejectedBy: 'account_user' // Track who rejected
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to reject site');
      
      // Refresh data
      await fetchOrder();
    } catch (error) {
      console.error('Error rejecting site:', error);
    }
  };

  const handleEditSubmission = async (submissionId: string, groupId: string, updates: any) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/groups/${groupId}/submissions/${submissionId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to edit submission');
      }
      
      await fetchOrder();
    } catch (error: any) {
      console.error('Error editing submission:', error);
      alert(error.message || 'Failed to edit submission');
    }
  };

  const handleChangeInclusionStatus = async (submissionId: string, groupId: string, status: 'included' | 'excluded' | 'saved_for_later', reason?: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/groups/${groupId}/submissions/${submissionId}/inclusion`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            inclusionStatus: status,
            exclusionReason: reason 
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to update status');
      
      await fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAssignToLineItem = async (submissionId: string, lineItemId: string) => {
    try {
      // Find the submission to get domain ID
      let domainId: string | null = null;
      for (const [groupId, submissions] of Object.entries(siteSubmissions)) {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
          domainId = submission.domainId;
          break;
        }
      }

      if (!domainId) {
        throw new Error('Submission not found');
      }

      const response = await fetch(
        `/api/orders/${orderId}/line-items/${lineItemId}/assign-domain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId, domainId })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign domain to line item');
      }

      // Refresh data
      await fetchOrder();
    } catch (error) {
      console.error('Error assigning to line item:', error);
      alert(error instanceof Error ? error.message : 'Failed to assign domain to line item');
    }
  };

  const handleAssignTargetPage = async (submissionId: string, targetPageUrl: string, groupId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/groups/${groupId}/site-selections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selections: [{ 
              submissionId, 
              action: 'assign_target_page',
              targetPageUrl 
            }]
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to assign target page');
      
      await fetchOrder();
    } catch (error) {
      console.error('Error assigning target page:', error);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedSubmissions.size === 0) return;
    
    setActionLoading(true);
    try {
      // Process each selected submission
      for (const submissionId of selectedSubmissions) {
        // Find which group this submission belongs to
        for (const [groupId, submissions] of Object.entries(siteSubmissions)) {
          const submission = submissions.find(s => s.id === submissionId);
          if (submission) {
            if (action === 'approve') {
              await handleApprove(submissionId, groupId);
            } else {
              await handleReject(submissionId, groupId, 'Bulk rejection');
            }
          }
        }
      }
      
      setSelectedSubmissions(new Set());
      await fetchOrder();
    } catch (error) {
      console.error(`Error during bulk ${action}:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProceed = async () => {
    // After selecting sites (included status), check if order needs invoicing
    if (order && includedCount > 0) {
      try {
        // Trigger invoice generation for included sites
        const response = await fetch(`/api/orders/${orderId}/invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_invoice' })
        });
        
        if (response.ok) {
          // Invoice generated successfully, redirect to invoice page
          router.push(`/orders/${orderId}/invoice`);
        } else {
          // If invoice generation fails, go to order status page
          router.push(`/account/orders/${orderId}/status`);
        }
      } catch (error) {
        console.error('Error generating invoice:', error);
        // Fallback to order status page
        router.push(`/account/orders/${orderId}/status`);
      }
    } else {
      // No approved sites, go to order page
      router.push(`/orders/${orderId}`);
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
            <p className="text-gray-600">Order not found</p>
          </div>
        </div>
      </>
    );
  }

  // Calculate statistics (supporting both old and new systems)
  const allSubmissions = Object.values(siteSubmissions).flat();
  const totalSubmissions = allSubmissions.length;
  
  // Count based on inclusion status (new system) or approval status (old system)
  const includedCount = allSubmissions
    .filter(s => s.inclusionStatus === 'included' || s.status === 'client_approved').length;
  const excludedCount = allSubmissions
    .filter(s => s.inclusionStatus === 'excluded' || s.status === 'client_rejected').length;
  const savedForLaterCount = allSubmissions
    .filter(s => s.inclusionStatus === 'saved_for_later').length;
  const pendingCount = allSubmissions
    .filter(s => !s.inclusionStatus && s.status === 'pending').length;
    
  // For backward compatibility
  const approvedCount = includedCount;
  const rejectedCount = excludedCount;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href={`/orders/${orderId}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Order
              </Link>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Review Site Recommendations
                </h1>
                <p className="text-gray-600 mt-1">
                  Order #{order.id.slice(0, 8)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Sites</p>
                <p className="text-2xl font-bold text-gray-900">{totalSubmissions}</p>
              </div>
            </div>

            {/* Notification if recently marked ready */}
            {order.state === 'sites_ready' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Sites are ready for your review!
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Our team has carefully selected sites based on your requirements. Please review and approve the ones you'd like to proceed with.
                  </p>
                </div>
              </div>
            )}

            {/* Progress Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-gray-500">Pending Review</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{approvedCount}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{rejectedCount}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">
                  {Math.round((approvedCount / totalSubmissions) * 100) || 0}%
                </p>
                <p className="text-xs text-gray-500">Completion</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          {pendingCount > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedSubmissions.size} sites selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    disabled={selectedSubmissions.size === 0 || actionLoading}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    disabled={selectedSubmissions.size === 0 || actionLoading}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Site Review Table */}
          <OrderSiteReviewTableV2
            orderId={orderId}
            orderGroups={order.orderGroups}
            lineItems={lineItems}
            siteSubmissions={siteSubmissions}
            userType="account"
            permissions={{
              canApproveReject: true,
              canViewPricing: true,
              canViewInternalTools: false,
              canChangeStatus: true,  // External users CAN organize sites (included/excluded/saved)
              canAssignTargetPages: true,  // External users CAN assign/change target pages
              canGenerateWorkflows: false,
              canMarkSitesReady: false,
              canEditDomainAssignments: true,  // External users CAN edit all domain details
              canSetExclusionReason: false  // Only this is restricted - internal notes
            }}
            workflowStage="site_selection_with_sites"
            onApprove={handleApprove}
            onReject={handleReject}
            onEditSubmission={handleEditSubmission}
            onChangeInclusionStatus={handleChangeInclusionStatus}
            onAssignTargetPage={handleAssignTargetPage}
            onAssignToLineItem={handleAssignToLineItem}
            onRefresh={fetchOrder}
            selectedSubmissions={selectedSubmissions}
            onSelectionChange={(submissionId, selected) => {
              const newSelected = new Set(selectedSubmissions);
              if (selected) {
                newSelected.add(submissionId);
              } else {
                newSelected.delete(submissionId);
              }
              setSelectedSubmissions(newSelected);
            }}
            useLineItems={isLineItemsSystemEnabled()}
            useStatusSystem={true}  // External users CAN use status system for organization
            benchmarkData={benchmarkData}
          />

          {/* Benchmark Display */}
          {benchmarkData && (
            <div className="mt-6">
              <BenchmarkDisplay 
                benchmark={benchmarkData}
                orderId={orderId}
                userType="account"
              />
            </div>
          )}

          {/* Pricing Summary for Selected Sites */}
          {includedCount > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                {Object.entries(siteSubmissions).map(([groupId, submissions]) => {
                  const includedSubmissions = submissions.filter(s => 
                    s.inclusionStatus === 'included' || s.status === 'client_approved'
                  );
                  if (includedSubmissions.length === 0) return null;
                  
                  const group = order?.orderGroups.find(g => g.id === groupId);
                  const groupTotal = includedSubmissions.reduce((sum, sub) => sum + (sub.price || 0), 0);
                  
                  return (
                    <div key={groupId} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium text-gray-900">{group?.client.name || 'Unknown Client'}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({includedSubmissions.length} site{includedSubmissions.length > 1 ? 's' : ''})
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {groupTotal > 0 ? formatCurrency(groupTotal) : (
                          <span className="text-gray-500 italic text-sm">Pricing pending</span>
                        )}
                      </span>
                    </div>
                  );
                })}
                
                {/* Total */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Investment</span>
                    <span className="text-lg font-bold text-gray-900">
                      {(() => {
                        const totalPrice = Object.values(siteSubmissions)
                          .flat()
                          .filter(s => s.inclusionStatus === 'included' || s.status === 'client_approved')
                          .reduce((sum, sub) => sum + (sub.price || 0), 0);
                        
                        return totalPrice > 0 ? formatCurrency(totalPrice) : (
                          <span className="text-gray-500 italic text-base font-normal">
                            Final pricing will be confirmed
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    Final pricing confirmed at approval
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Proceed Button - Show when sites have been selected */}
          {includedCount > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={handleProceed}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Generate Invoice ({includedCount} sites)
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              {pendingCount > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {pendingCount} sites still pending review
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}