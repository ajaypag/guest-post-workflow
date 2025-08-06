'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowRight, DollarSign } from 'lucide-react';
import Header from '@/components/Header';
import OrderSiteReviewTable from '@/components/orders/OrderSiteReviewTable';
import type { OrderGroup, SiteSubmission } from '@/components/orders/OrderSiteReviewTable';
import { formatCurrency } from '@/lib/utils/formatting';

interface OrderData {
  id: string;
  accountId: string;
  totalPrice: number;
  status: string;
  state?: string;
  createdAt: string;
  approvedAt?: string;
  orderGroups: OrderGroup[];
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
            notes: 'Approved by client' 
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
            notes: reason 
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

  const handleSwitchPool = async (submissionId: string, groupId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/groups/${groupId}/site-selections`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selections: [{ submissionId, action: 'switch_pool' }]
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to switch pool');
      
      await fetchOrder();
    } catch (error) {
      console.error('Error switching pool:', error);
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
    // After approving sites, check if order needs invoicing or if it's ready for payment
    if (order && approvedCount > 0) {
      try {
        // Trigger invoice generation for approved sites
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

  // Calculate statistics
  const totalSubmissions = Object.values(siteSubmissions).flat().length;
  const pendingCount = Object.values(siteSubmissions).flat()
    .filter(s => s.status === 'pending').length;
  const approvedCount = Object.values(siteSubmissions).flat()
    .filter(s => s.status === 'client_approved').length;
  const rejectedCount = Object.values(siteSubmissions).flat()
    .filter(s => s.status === 'client_rejected').length;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
          <OrderSiteReviewTable
            orderId={orderId}
            orderGroups={order.orderGroups}
            siteSubmissions={siteSubmissions}
            userType="account"
            permissions={{
              canApproveReject: true,
              canViewPricing: true,
              canViewInternalTools: false,
              canSwitchPools: true,
              canAssignTargetPages: true,
              canRebalancePools: true,
              canGenerateWorkflows: false,
              canMarkSitesReady: false,
              canEditDomainAssignments: true
            }}
            workflowStage="site_selection_with_sites"
            onApprove={handleApprove}
            onReject={handleReject}
            onSwitchPool={handleSwitchPool}
            onAssignTargetPage={handleAssignTargetPage}
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
          />

          {/* Pricing Summary for Approved Sites */}
          {approvedCount > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                {Object.entries(siteSubmissions).map(([groupId, submissions]) => {
                  const approvedSubmissions = submissions.filter(s => s.status === 'client_approved');
                  if (approvedSubmissions.length === 0) return null;
                  
                  const group = order?.orderGroups.find(g => g.id === groupId);
                  const groupTotal = approvedSubmissions.reduce((sum, sub) => sum + (sub.price || 0), 0);
                  
                  return (
                    <div key={groupId} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium text-gray-900">{group?.client.name || 'Unknown Client'}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({approvedSubmissions.length} site{approvedSubmissions.length > 1 ? 's' : ''})
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
                          .filter(s => s.status === 'client_approved')
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

          {/* Proceed Button */}
          {pendingCount === 0 && approvedCount > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={handleProceed}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Proceed to Next Step
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}