'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import OrderSiteReviewTable from '@/components/orders/OrderSiteReviewTable';
import OrderProgressSteps, { getStateDisplay } from '@/components/orders/OrderProgressSteps';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  ArrowLeft, Loader2, CheckCircle, Clock, Search, Users, FileText, 
  RefreshCw, ExternalLink, Globe, LinkIcon, Eye, Edit, Package,
  Target, ChevronRight, AlertCircle, Activity, Building, User, DollarSign,
  Download, Share2, XCircle, CreditCard, Trash2
} from 'lucide-react';

// Service fee constant - $79 per link for SEO content package
const SERVICE_FEE_CENTS = 7900;

interface LineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  price: number;
  wholesalePrice?: number;
  isEstimate?: boolean;
  guestPostSite?: string;
  draftUrl?: string;
  publishedUrl?: string;
  bulkAnalysisId?: string;
  workflowId?: string;
}

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
  };
  linkCount: number;
  bulkAnalysisProjectId?: string;
  targetPages?: Array<{
    id?: string;
    url: string;
    pageId?: string;
  }>;
  anchorTexts?: string[];
  // Legacy package pricing (deprecated)
  packageType?: string;
  packagePrice?: number;
  // New cost-plus pricing model
  totalPrice?: number;
  estimatedPrice?: number;
  wholesalePrice?: number;
}

interface SiteSubmission {
  id: string;
  orderGroupId: string;
  domainId: string;
  domain: string;
  domainRating?: number;
  traffic?: number;
  price: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submissionStatus?: string;
  clientApprovedAt?: string;
  clientRejectedAt?: string;
  clientReviewNotes?: string;
  specialInstructions?: string;
}

interface Account {
  id: string;
  email: string;
  contactName?: string;
  companyName?: string;
}

interface OrderDetail {
  id: string;
  accountId: string;
  account?: Account;
  status: string;
  state?: string;
  subtotal: number;
  totalPrice: number;
  totalWholesale?: number;
  profitMargin?: number;
  discountAmount?: number;
  discountPercent?: string;
  includesClientReview?: boolean;
  clientReviewFee?: number;
  rushDelivery?: boolean;
  rushFee?: number;
  internalNotes?: string;
  accountNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  invoicedAt?: string;
  paidAt?: string;
  completedAt?: string;
  orderGroups?: OrderGroup[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [siteSubmissions, setSiteSubmissions] = useState<Record<string, SiteSubmission[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    loadOrder();
  }, [params.id]);

  useEffect(() => {
    if ((order?.state === 'sites_ready' || order?.state === 'site_review' || order?.state === 'client_reviewing') && order.orderGroups) {
      loadSiteSubmissions();
    }
  }, [order?.state, order?.orderGroups]);

  const loadUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/orders');
          return;
        }
        throw new Error('Failed to load order');
      }

      const data = await response.json();
      setOrder(data);
      
      // Transform orderGroups into lineItems for the table
      if (data.orderGroups && data.orderGroups.length > 0) {
        const items: LineItem[] = [];
        data.orderGroups.forEach((group: OrderGroup) => {
          // Create a line item for each link in the group
          for (let i = 0; i < group.linkCount; i++) {
            items.push({
              id: `${group.id}-${i}`,
              clientId: group.clientId,
              clientName: group.client?.name || 'Unknown Client',
              targetPageUrl: group.targetPages?.[i]?.url || '',
              targetPageId: group.targetPages?.[i]?.pageId,
              anchorText: group.anchorTexts?.[i] || '',
              price: group.totalPrice || group.estimatedPrice || 0,
              wholesalePrice: group.wholesalePrice || (group.totalPrice ? group.totalPrice - SERVICE_FEE_CENTS * group.linkCount : 0),
              isEstimate: data.status === 'draft' || data.status === 'pending_confirmation',
              guestPostSite: '',
              draftUrl: '',
              publishedUrl: '',
              bulkAnalysisId: group.bulkAnalysisProjectId
            });
          }
        });
        setLineItems(items);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadSiteSubmissions = async () => {
    if (!order?.orderGroups) return;
    
    setLoadingSubmissions(true);
    try {
      const submissionsByGroup: Record<string, SiteSubmission[]> = {};
      
      for (const group of order.orderGroups) {
        try {
          const response = await fetch(`/api/orders/${order.id}/groups/${group.id}/submissions`);
          if (response.ok) {
            const data = await response.json();
            submissionsByGroup[group.id] = data.submissions || [];
          }
        } catch (error) {
          console.error(`Error loading submissions for group ${group.id}:`, error);
        }
      }
      
      setSiteSubmissions(submissionsByGroup);
    } catch (error) {
      console.error('Error loading site submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleApproveSubmission = async (groupId: string, submissionId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${order!.id}/groups/${groupId}/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' })
        }
      );
      
      if (response.ok) {
        // Reload submissions
        await loadSiteSubmissions();
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleRejectSubmission = async (groupId: string, submissionId: string, reason?: string) => {
    try {
      const response = await fetch(
        `/api/orders/${order!.id}/groups/${groupId}/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', notes: reason })
        }
      );
      
      if (response.ok) {
        // Reload submissions
        await loadSiteSubmissions();
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    if (order?.state === 'sites_ready' || order?.state === 'site_review' || order?.state === 'client_reviewing') {
      await loadSiteSubmissions();
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Allow editing until the order is paid
  const isOrderEditable = order && order.status !== 'paid' && order.status !== 'in_progress' && order.status !== 'completed' && order.status !== 'cancelled';

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (!order) {
    return (
      <AuthWrapper>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-500">Order not found</p>
            <Link href="/orders" className="mt-4 text-blue-600 hover:underline">
              Back to Orders
            </Link>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  const stateDisplay = getStateDisplay(order?.status || '', order?.state);

  // Group line items by client
  const groupedLineItems = lineItems.reduce((acc, item) => {
    if (!acc[item.clientId]) {
      acc[item.clientId] = {
        clientName: item.clientName,
        items: [],
        totalPrice: 0
      };
    }
    acc[item.clientId].items.push(item);
    acc[item.clientId].totalPrice += item.price;
    return acc;
  }, {} as Record<string, { clientName: string; items: LineItem[]; totalPrice: number }>);

  // Calculate dynamic column count for progressive disclosure
  const getColumnCount = () => {
    let count = 3; // Base columns: Client/Target, Anchor, Price
    if (order.state === 'site_review' || order.state === 'in_progress' || order.status === 'completed') count++;
    if (order.state === 'in_progress' || order.status === 'completed') count++;
    if (order.status === 'completed') count++;
    if (order.status === 'confirmed' && order.state === 'analyzing') count++;
    return count;
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/orders"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${stateDisplay.color}`}>
                  {stateDisplay.label}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {isOrderEditable && (
                  <Link
                    href={`/orders/${order.id}/edit`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </Link>
                )}
                {user?.userType === 'internal' && (
                  <Link
                    href={`/orders/${order.id}/internal`}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Manage Order
                  </Link>
                )}
                {/* Admin delete button */}
                {(order.status === 'draft' || (user?.userType === 'internal' && user?.role === 'admin')) && (
                  <button
                    onClick={async () => {
                      const isAdmin = user?.userType === 'internal' && user?.role === 'admin';
                      const confirmMessage = isAdmin && order.status !== 'draft'
                        ? `⚠️ ADMIN ACTION: Are you sure you want to delete this ${order.status} order?\n\nOrder ID: ${order.id}\nAccount: ${order.account?.email || 'Unknown'}\nValue: ${formatCurrency(order.totalPrice)}\n\nThis will permanently delete the order and all related data. This action cannot be undone.`
                        : 'Are you sure you want to delete this draft order? This action cannot be undone.';
                      
                      if (confirm(confirmMessage)) {
                        try {
                          const response = await fetch(`/api/orders/${order.id}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            if (isAdmin && order.status !== 'draft') {
                              console.log('Admin deleted order:', data.deletedOrder);
                            }
                            router.push('/orders');
                          } else {
                            const data = await response.json();
                            alert(data.error || 'Failed to delete order');
                          }
                        } catch (error) {
                          console.error('Error deleting order:', error);
                          alert('Error deleting order');
                        }
                      }
                    }}
                    className={`inline-flex items-center px-3 py-2 border ${
                      order.status !== 'draft' && user?.role === 'admin' 
                        ? 'border-red-300 text-red-700 hover:bg-red-50' 
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                    } rounded-md`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Order
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Progress Steps */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Progress</h2>
                <OrderProgressSteps 
                  orderStatus={order?.status || ''} 
                  orderState={order?.state} 
                  className="mt-4"
                />
                
                {/* Quick Actions based on state */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    {order.state === 'analyzing' && order.orderGroups?.some(g => g.bulkAnalysisProjectId) && (
                      <div className="space-y-2">
                        {order.orderGroups.filter(g => g.bulkAnalysisProjectId).map(group => (
                          <Link
                            key={group.id}
                            href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                            className="block w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center"
                          >
                            Analyze {group.client.name}
                          </Link>
                        ))}
                        {user?.userType === 'internal' && (
                          <button
                            onClick={async () => {
                              if (confirm('Mark sites as ready for client review? This will notify the client that sites are available.')) {
                                try {
                                  const response = await fetch(`/api/orders/${order.id}/state`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      state: 'site_review',
                                      notes: 'Sites ready for client review'
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    await loadOrder();
                                    await loadSiteSubmissions();
                                  } else {
                                    const data = await response.json();
                                    alert(data.error || 'Failed to update order state');
                                  }
                                } catch (error) {
                                  console.error('Error updating order state:', error);
                                  alert('Error updating order state');
                                }
                              }
                            }}
                            className="block w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 text-center"
                          >
                            Mark Sites Ready for Review
                          </button>
                        )}
                      </div>
                    )}
                    {(order.state === 'site_review' || order.state === 'client_reviewing') && (
                      <div className="space-y-2">
                        <Link
                          href={`/orders/${order.id}/review`}
                          className="block w-full px-4 py-3 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 text-center font-medium"
                        >
                          <Users className="w-4 h-4 mx-auto mb-1" />
                          Review & Approve Sites
                          {Object.values(siteSubmissions).flat().filter(s => s.status === 'pending').length > 0 && (
                            <div className="text-xs text-purple-200 mt-1">
                              {Object.values(siteSubmissions).flat().filter(s => s.status === 'pending').length} sites pending
                            </div>
                          )}
                        </Link>
                      </div>
                    )}
                    {order.status === 'completed' && lineItems.some(item => item.workflowId) && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 mb-1">View Articles:</p>
                        {lineItems.filter(item => item.workflowId).map((item, idx) => (
                          <Link
                            key={idx}
                            href={`/workflows/${item.workflowId}`}
                            className="block w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 text-center truncate"
                          >
                            {item.clientName} - {item.targetPageUrl || 'Article'}
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    {/* Invoice Link */}
                    {order.invoicedAt && (
                      <div className="space-y-2">
                        <Link
                          href={`/orders/${order.id}/invoice`}
                          className="block w-full px-4 py-3 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 text-center font-medium"
                        >
                          <FileText className="w-4 h-4 mx-auto mb-1" />
                          View Invoice
                          <div className="text-xs text-green-200 mt-1">
                            {formatCurrency(order.totalPrice)}
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* Confirm Order Link */}
                    {order.status === 'pending_confirmation' && (
                      <div className="space-y-2">
                        <Link
                          href={`/orders/${order.id}/confirm`}
                          className="block w-full px-4 py-3 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 text-center font-medium"
                        >
                          <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                          Confirm Order
                          <div className="text-xs text-orange-200 mt-1">
                            Ready for confirmation
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Account Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Account Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.account?.contactName || order.account?.companyName || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.account?.email || 'No email'}</dd>
                  </div>
                  {order.account?.companyName && order.account?.contactName && (
                    <div>
                      <dt className="text-sm text-gray-500">Company</dt>
                      <dd className="text-sm font-medium text-gray-900">{order.account.companyName}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Middle/Right Columns - Order Details Table */}
            <div className="lg:col-span-2">
              {/* Site Review Summary Card */}
              {order.state === 'site_review' && Object.keys(siteSubmissions).length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Site Review Required
                      </h3>
                      <p className="text-sm text-purple-700 mt-1">
                        Review and approve recommended sites for your guest posts
                      </p>
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        {Object.entries(siteSubmissions).map(([groupId, submissions]) => {
                          const group = order.orderGroups?.find(g => g.id === groupId);
                          if (!group) return null;
                          const pending = submissions.filter(s => s.status === 'pending').length;
                          const approved = submissions.filter(s => s.status === 'approved').length;
                          const rejected = submissions.filter(s => s.status === 'rejected').length;
                          
                          return (
                            <div key={groupId} className="flex items-center gap-2">
                              <span className="font-medium">{group.client.name}:</span>
                              {pending > 0 && <span className="text-yellow-700">{pending} pending</span>}
                              {approved > 0 && <span className="text-green-700">{approved} approved</span>}
                              {rejected > 0 && <span className="text-red-700">{rejected} rejected</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {loadingSubmissions && (
                      <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                    )}
                  </div>
                </div>
              )}
              
              {/* Use shared component for site review, regular table otherwise */}
              {order.state === 'site_review' && order.orderGroups ? (
                <OrderSiteReviewTable
                  orderId={params.id as string}
                  orderGroups={order.orderGroups}
                  siteSubmissions={(() => {
                    // Transform siteSubmissions to match the expected interface
                    const transformed: Record<string, any[]> = {};
                    Object.entries(siteSubmissions).forEach(([groupId, submissions]) => {
                      transformed[groupId] = submissions.map(sub => ({
                        ...sub,
                        domain: {
                          id: sub.domainId,
                          domain: sub.domain,
                          qualificationStatus: undefined,
                          notes: undefined
                        }
                      }));
                    });
                    return transformed;
                  })()}
                  userType={user?.userType || 'account'}
                  permissions={{
                    canRebalancePools: false,
                    canAssignTargetPages: false,
                    canSwitchPools: false,
                    canApproveReject: true,
                    canGenerateWorkflows: false,
                    canMarkSitesReady: false,
                    canViewInternalTools: false,
                    canViewPricing: false,
                    canEditDomainAssignments: false
                  }}
                  workflowStage={order.state || 'site_review'}
                  onRefresh={loadOrder}
                />
              ) : (
                <>
                  {/* Order Details Table with Proper Client Grouping */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client / Target Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Anchor Text
                        </th>
                        {/* Progressive disclosure - only show additional columns when relevant */}
                        {(order.state === 'site_review' || order.state === 'in_progress' || order.status === 'completed') && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Guest Post Site
                          </th>
                        )}
                        {(order.state === 'in_progress' || order.status === 'completed') && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Draft URL
                          </th>
                        )}
                        {order.status === 'completed' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Published URL
                          </th>
                        )}
                        {order.status === 'confirmed' && order.state === 'analyzing' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Analysis
                          </th>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Group line items by client */}
                      {Object.entries(groupedLineItems).map(([clientId, { clientName, items, totalPrice }]) => {
                        // Find the orderGroup for this client
                        const orderGroup = order.orderGroups?.find(g => g.clientId === clientId);
                        const groupId = orderGroup?.id;
                        
                        return (
                        <>
                          {/* Client group header row */}
                          <tr key={`${clientId}-header`} className="bg-gray-50">
                            <td colSpan={getColumnCount()} className="px-6 py-3">
                              <div className="text-sm font-semibold text-gray-900">{clientName}</div>
                              <div className="text-xs text-gray-500 mt-1">{items.length} link{items.length > 1 ? 's' : ''}</div>
                            </td>
                          </tr>
                          {/* Line items for this client */}
                          {items.map((item, index) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 pl-12">
                                <div className="text-sm text-gray-600">
                                  {item.targetPageUrl || 'No target page selected'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {item.anchorText || '-'}
                              </td>
                              {(order.state === 'site_review' || order.state === 'in_progress' || order.status === 'completed') && (
                                <td className="px-6 py-4">
                                  {item.guestPostSite ? (
                                    <div className="flex items-center space-x-2">
                                      <Globe className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-900">{item.guestPostSite}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">Pending</span>
                                  )}
                                </td>
                              )}
                              {(order.state === 'in_progress' || order.status === 'completed') && (
                                <td className="px-6 py-4">
                                  {item.draftUrl ? (
                                    <a
                                      href={item.draftUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      View Draft
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              {order.status === 'completed' && (
                                <td className="px-6 py-4">
                                  {item.publishedUrl ? (
                                    <a
                                      href={item.publishedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-sm text-green-600 hover:text-green-800"
                                    >
                                      <LinkIcon className="h-3 w-3 mr-1" />
                                      Live
                                    </a>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              {order.status === 'confirmed' && order.state === 'analyzing' && (
                                <td className="px-6 py-4">
                                  {item.bulkAnalysisId ? (
                                    <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </button>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                {/* Only show price on the first item in the group */}
                                {index === 0 ? formatCurrency(totalPrice) : ''}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Site submissions for this client when in site_review state */}
                          {order.state === 'site_review' && groupId && siteSubmissions[groupId] && expandedSubmission === groupId && (
                            <>
                              <tr className="bg-purple-50">
                                <td colSpan={getColumnCount()} className="px-6 py-3">
                                  <div className="text-sm font-medium text-purple-900">Site Recommendations</div>
                                  <div className="text-xs text-purple-700 mt-1">
                                    {siteSubmissions[groupId].filter(s => s.status === 'pending').length} sites pending review
                                  </div>
                                </td>
                              </tr>
                              {siteSubmissions[groupId].filter(s => s.status === 'pending').map((submission) => (
                                <tr key={submission.id} className="bg-purple-50 hover:bg-purple-100">
                                  <td className="px-6 py-4 pl-12">
                                    <div className="flex items-start gap-3">
                                      <Globe className="h-5 w-5 text-purple-600 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{submission.domain}</div>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                          {submission.domainRating && (
                                            <span>DR: {submission.domainRating}</span>
                                          )}
                                          {submission.traffic && (
                                            <span>Traffic: {submission.traffic.toLocaleString()}</span>
                                          )}
                                          <span className="font-medium">{formatCurrency(submission.price)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td colSpan={getColumnCount() - 2} className="px-6 py-4">
                                    {submission.specialInstructions && (
                                      <textarea
                                        placeholder="Special instructions for this site..."
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        rows={2}
                                        defaultValue={submission.specialInstructions}
                                      />
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleRejectSubmission(groupId, submission.id)}
                                        className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleApproveSubmission(groupId, submission.id)}
                                        className="px-3 py-1 text-sm text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={getColumnCount() - 1} className="px-6 py-4 text-right">
                          <div className="text-sm font-medium text-gray-900">Total Investment</div>
                          {(order.status === 'draft' || order.status === 'pending_confirmation') && (
                            <div className="text-xs text-gray-500 mt-1">Estimate based on current market prices</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(order.totalPrice)}
                        </td>
                      </tr>
                      {user?.userType !== 'internal' && (
                        <tr>
                          <td colSpan={getColumnCount()} className="px-6 py-3 text-center text-xs text-gray-500 bg-gray-100">
                            Site costs + strategic SEO content creation
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>
              </>
              )}
              
              {/* Additional Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Timeline */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Created</p>
                        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {order.approvedAt && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Confirmed</p>
                          <p className="text-sm text-gray-600">{new Date(order.approvedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="space-y-3">
                    {order.state === 'analyzing' && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Analyzing sites</p>
                          <p className="text-xs text-gray-500">Finding placement opportunities</p>
                        </div>
                      </div>
                    )}
                    {order.state === 'site_review' && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Sites ready for review</p>
                          <p className="text-xs text-gray-500">
                            {Object.values(siteSubmissions).reduce((sum, subs) => 
                              sum + subs.filter(s => s.status === 'pending').length, 0
                            )} sites awaiting approval
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notes Section - Full Width */}
              {(order.internalNotes || order.accountNotes) && (
                <div className="lg:col-span-2 mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-gray-400" />
                      Notes
                    </h3>
                    <div className="space-y-4">
                      {user?.userType === 'internal' && order.internalNotes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Internal Notes</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">{order.internalNotes}</p>
                        </div>
                      )}
                      {order.accountNotes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Account Notes</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-blue-50 p-3 rounded">{order.accountNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pricing Details for Internal Users */}
              {user?.userType === 'internal' && (
                <div className="lg:col-span-2 mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
                      Pricing Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Customer Pricing</h4>
                        <dl className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Subtotal</dt>
                            <dd className="font-medium">{formatCurrency(order.subtotal || order.totalPrice)}</dd>
                          </div>
                          {order.discountAmount && order.discountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <dt className="text-gray-600">Discount ({order.discountPercent || '0'}%)</dt>
                              <dd className="font-medium text-green-600">-{formatCurrency(order.discountAmount)}</dd>
                            </div>
                          )}
                          {order.includesClientReview && (
                            <div className="flex justify-between text-sm">
                              <dt className="text-gray-600">Client Review</dt>
                              <dd className="font-medium">{formatCurrency(order.clientReviewFee || 0)}</dd>
                            </div>
                          )}
                          {order.rushDelivery && (
                            <div className="flex justify-between text-sm">
                              <dt className="text-gray-600">Rush Delivery</dt>
                              <dd className="font-medium">{formatCurrency(order.rushFee || 0)}</dd>
                            </div>
                          )}
                          <div className="flex justify-between text-sm pt-2 border-t">
                            <dt className="font-medium">Total Revenue</dt>
                            <dd className="font-bold">{formatCurrency(order.totalPrice)}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Profit Analysis</h4>
                        <dl className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Site Wholesale Cost</dt>
                            <dd className="font-medium">{formatCurrency(order.totalWholesale || 0)}</dd>
                          </div>
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">SEO Content Package ({lineItems.length} × {formatCurrency(SERVICE_FEE_CENTS)})</dt>
                            <dd className="font-medium">{formatCurrency(SERVICE_FEE_CENTS * lineItems.length)}</dd>
                          </div>
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Total Revenue</dt>
                            <dd className="font-medium">{formatCurrency(order.totalPrice)}</dd>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t">
                            <dt className="font-medium">Gross Profit</dt>
                            <dd className="font-bold text-green-600">{formatCurrency(SERVICE_FEE_CENTS * lineItems.length)}</dd>
                          </div>
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Margin</dt>
                            <dd className="font-medium">
                              {order.totalPrice > 0 ? 
                                `${Math.round((SERVICE_FEE_CENTS * lineItems.length / order.totalPrice) * 100)}%` : 
                                'N/A'
                              }
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

// Helper function to format dates
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}