'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import OrderSiteReviewTableV2 from '@/components/orders/OrderSiteReviewTableV2';
import BenchmarkDisplay from '@/components/orders/BenchmarkDisplay';
import OrderDetailsTable from '@/components/orders/OrderDetailsTable';
import OrderProgressSteps, { getStateDisplay } from '@/components/orders/OrderProgressSteps';
import TransferOrderModal from '@/components/orders/TransferOrderModal';
import ShareOrderButton from '@/components/orders/ShareOrderButton';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { isLineItemsSystemEnabled } from '@/lib/config/featureFlags';
import { 
  ArrowLeft, Loader2, CheckCircle, Clock, Search, Users, FileText, 
  RefreshCw, ExternalLink, Globe, LinkIcon, Eye, Edit, Package,
  Target, ChevronRight, AlertCircle, Activity, Building, User, DollarSign,
  Download, Share2, XCircle, CreditCard, Trash2, ArrowRightLeft
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
  shareToken?: string;
  shareExpiresAt?: string;
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [showBenchmarkHistory, setShowBenchmarkHistory] = useState(false);

  useEffect(() => {
    loadUser();
    loadOrder();
  }, [params.id]);

  useEffect(() => {
    if ((order?.state === 'sites_ready' || order?.state === 'site_review' || order?.state === 'client_reviewing' || order?.state === 'payment_pending' || order?.state === 'payment_received' || order?.state === 'workflows_generated' || order?.state === 'in_progress') && order.orderGroups) {
      loadSiteSubmissions();
    }
    // Load benchmark for confirmed orders
    if (order?.status === 'confirmed' || order?.status === 'paid' || order?.status === 'in_progress' || order?.status === 'completed') {
      loadBenchmarkData();
    }
  }, [order?.state, order?.orderGroups, order?.status]);

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
      
      // Load line items from the line items system if available
      if (isLineItemsSystemEnabled() && data.lineItems && data.lineItems.length > 0) {
        console.log('[LOAD_ORDER] Loading from line items system');
        
        const items: LineItem[] = data.lineItems.map((dbItem: any) => ({
          id: dbItem.id, // Use actual database ID
          clientId: dbItem.clientId,
          clientName: dbItem.client?.name || 'Unknown Client',
          targetPageId: dbItem.targetPageId,
          targetPageUrl: dbItem.targetPageUrl,
          anchorText: dbItem.anchorText,
          price: dbItem.approvedPrice || dbItem.estimatedPrice || 0,
          wholesalePrice: dbItem.metadata?.wholesalePrice || (dbItem.estimatedPrice - SERVICE_FEE_CENTS),
          isEstimate: data.status === 'draft' || data.status === 'pending_confirmation',
          guestPostSite: dbItem.assignedDomain || '',
          draftUrl: '',
          publishedUrl: dbItem.publishedUrl || '',
          bulkAnalysisId: dbItem.metadata?.bulkAnalysisId,
          workflowId: dbItem.metadata?.workflowId
        }));
        
        setLineItems(items);
      }
      // Fallback to transform orderGroups into lineItems for the table (legacy system)
      else if (data.orderGroups && data.orderGroups.length > 0) {
        console.log('[LOAD_ORDER] Loading from orderGroups system (fallback)');
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
  
  const handleEditSubmission = async (submissionId: string, groupId: string, updates: any) => {
    try {
      const response = await fetch(`/api/orders/${params.id}/groups/${groupId}/submissions/${submissionId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to edit submission');
      }
      
      await loadSiteSubmissions();
      alert('Submission updated successfully');
      
    } catch (error: any) {
      console.error('Error editing submission:', error);
      alert(error.message || 'Failed to edit submission');
    }
  };

  const handleRemoveSubmission = async (submissionId: string, groupId: string) => {
    try {
      const response = await fetch(`/api/orders/${params.id}/groups/${groupId}/submissions/${submissionId}/edit`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to remove submission');
      }
      
      await loadSiteSubmissions();
      alert('Submission removed successfully');
      
    } catch (error: any) {
      console.error('Error removing submission:', error);
      alert(error.message || 'Failed to remove submission');
    }
  };

  const loadSiteSubmissions = async () => {
    if (!order?.orderGroups) return;
    
    setLoadingSubmissions(true);
    try {
      const submissionsByGroup: Record<string, SiteSubmission[]> = {};
      
      for (const group of order.orderGroups) {
        try {
          const response = await fetch(`/api/orders/${order.id}/groups/${group.id}/submissions?includeCompleted=true`);
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

  const loadBenchmarkData = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}/benchmark?comparison=true`);
      if (response.ok) {
        const data = await response.json();
        setBenchmarkData(data.benchmark);
        setComparisonData(data.comparison);
      }
    } catch (error) {
      console.error('Failed to load benchmark data:', error);
    }
  };

  const handleEditBenchmark = async (updatedBenchmarkData: any) => {
    try {
      const response = await fetch(`/api/orders/${params.id}/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create', 
          reason: 'client_modified',
          benchmarkData: updatedBenchmarkData 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBenchmarkData(data.benchmark);
        await loadBenchmarkData(); // Reload to get comparison
        alert('Your wishlist has been updated successfully');
      }
    } catch (error) {
      console.error('Failed to update benchmark:', error);
      alert('Failed to update wishlist');
    }
  };

  const handleViewBenchmarkHistory = () => {
    setShowBenchmarkHistory(true);
    // TODO: Implement history modal/sidebar
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    if (order?.state === 'sites_ready' || order?.state === 'site_review' || order?.state === 'client_reviewing' || order?.state === 'payment_pending' || order?.state === 'payment_received' || order?.state === 'workflows_generated' || order?.state === 'in_progress') {
      await loadSiteSubmissions();
    }
    if (order?.status === 'confirmed' || order?.status === 'paid' || order?.status === 'in_progress' || order?.status === 'completed') {
      await loadBenchmarkData();
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
                  <>
                    <ShareOrderButton 
                      orderId={order.id}
                      currentShareToken={order.shareToken}
                    />
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer
                    </button>
                    <Link
                      href={`/orders/${order.id}/internal`}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Manage Order
                    </Link>
                  </>
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
                
                {/* Quick Actions based on state - Internal users only */}
                {user?.userType === 'internal' && (
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

                      {/* Confirm Order Link - Internal Users Only */}
                      {order.status === 'pending_confirmation' && user?.userType === 'internal' && (
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
                      
                      {/* Status Message for External Users */}
                      {order.status === 'pending_confirmation' && user?.userType !== 'internal' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">Order Submitted Successfully</p>
                              <p className="text-xs text-blue-700 mt-1">
                                Your order is awaiting confirmation from our team. We'll begin processing shortly.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Status Message for External Users when sites are ready */}
                {user?.userType !== 'internal' && (order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing') && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-purple-900">Sites Ready for Review</p>
                            <p className="text-xs text-purple-700 mt-1">
                              Your recommended sites are ready for review and approval.
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/orders/${order.id}/review`}
                          className="px-3 py-2 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 whitespace-nowrap"
                        >
                          Review Sites
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
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
                <OrderSiteReviewTableV2
                  orderId={params.id as string}
                  orderGroups={order.orderGroups}
                  lineItems={lineItems}
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
                    canChangeStatus: true,  // External users CAN organize sites
                    canAssignTargetPages: true,  // External users CAN modify target pages
                    canApproveReject: true,
                    canGenerateWorkflows: false,
                    canMarkSitesReady: false,
                    canViewInternalTools: false,
                    canViewPricing: true,
                    canEditDomainAssignments: true  // External users CAN edit domain details
                  }}
                  workflowStage={order.state || 'site_review'}
                  onEditSubmission={handleEditSubmission}
                  onRemoveSubmission={handleRemoveSubmission}
                  onRefresh={loadOrder}
                  useLineItems={isLineItemsSystemEnabled()}
                  useStatusSystem={true}  // External users CAN use status system
                />
              ) : (
                <>
                  {/* Smart Order Details Table */}
                  <OrderDetailsTable 
                    order={order}
                    orderGroups={order.orderGroups || []}
                    siteSubmissions={siteSubmissions}
                    userType={user?.userType || 'account'}
                  />
                </>
              )}
              
              {/* OLD TABLE CODE REMOVED - NOW USING OrderDetailsTable COMPONENT */}
              
              {/* Additional Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Timeline */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                  <div className="space-y-3">
                    {/* Order Created */}
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order Created</p>
                        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {/* Order Confirmed */}
                    {order.approvedAt && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Order Confirmed</p>
                          <p className="text-sm text-gray-600">{new Date(order.approvedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Sites Ready (when applicable) */}
                    {(order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing') && (
                      <div className="flex items-start gap-3">
                        <Search className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Sites Found</p>
                          <p className="text-sm text-gray-600">
                            {Object.values(siteSubmissions).flat().length} sites ready for review
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Sites Approved (when applicable) */}
                    {Object.values(siteSubmissions).flat().some(s => (s as any).status === 'client_approved') && (
                      <div className="flex items-start gap-3">
                        <Users className="h-4 w-4 text-purple-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Sites Approved</p>
                          <p className="text-sm text-gray-600">
                            {Object.values(siteSubmissions).flat().filter(s => (s as any).status === 'client_approved').length} sites approved
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Invoice Generated */}
                    {order.invoicedAt && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Invoice Generated</p>
                          <p className="text-sm text-gray-600">{new Date(order.invoicedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Received */}
                    {order.paidAt && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Payment Received</p>
                          <p className="text-sm text-gray-600">{new Date(order.paidAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
                  </div>
                  <div className="space-y-3">
                    {/* Awaiting Confirmation State */}
                    {(order.status === 'pending_confirmation' || order.status === 'draft') && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Awaiting Confirmation</p>
                          <p className="text-xs text-gray-500">Order submitted and waiting for internal review and approval</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Finding Sites State */}
                    {(order.state === 'analyzing' || order.state === 'finding_sites') && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Finding Sites</p>
                          <p className="text-xs text-gray-500">Our team is analyzing and curating suitable sites for your links</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Sites Ready for Review */}
                    {(order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing') && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {(() => {
                              const pendingCount = Object.values(siteSubmissions).flat().filter(s => s.status === 'pending').length;
                              const approvedCount = Object.values(siteSubmissions).flat().filter(s => (s as any).status === 'client_approved').length;
                              
                              if (pendingCount > 0) return 'Sites Ready for Review';
                              if (approvedCount > 0) return 'Sites Approved';
                              return 'Sites Available';
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(() => {
                              const pendingCount = Object.values(siteSubmissions).flat().filter(s => s.status === 'pending').length;
                              const approvedCount = Object.values(siteSubmissions).flat().filter(s => (s as any).status === 'client_approved').length;
                              const totalCount = Object.values(siteSubmissions).flat().length;
                              
                              if (pendingCount > 0) return `${pendingCount} sites awaiting your approval`;
                              if (approvedCount > 0) return `${approvedCount} of ${totalCount} sites approved`;
                              return `${totalCount} sites available for review`;
                            })()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Pending */}
                    {order.state === 'payment_pending' && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Awaiting Payment</p>
                          <p className="text-xs text-gray-500">Invoice ready - review and proceed with payment</p>
                        </div>
                      </div>
                    )}
                    
                    {/* In Progress */}
                    {(order.state === 'payment_received' || order.state === 'workflows_generated' || order.state === 'in_progress') && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Content Creation Started</p>
                          <p className="text-xs text-gray-500">Payment received - our team is creating your guest posts</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Default fallback */}
                    {!order.state && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Processing</p>
                          <p className="text-xs text-gray-500">Order is being processed</p>
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
      
      {/* Transfer Order Modal */}
      <TransferOrderModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        orderId={order.id}
        currentAccountName={order.account?.companyName || order.account?.contactName || order.account?.email}
        onSuccess={() => {
          setShowTransferModal(false);
          loadOrder(); // Reload the order to show new account
        }}
      />
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