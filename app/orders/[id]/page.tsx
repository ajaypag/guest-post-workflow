'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import LineItemsReviewTable from '@/components/orders/LineItemsReviewTable';
import OrderSiteReviewTableV2 from '@/components/orders/OrderSiteReviewTableV2';
import BenchmarkDisplay from '@/components/orders/BenchmarkDisplay';
// Removed OrderDetailsTable - using LineItemsDisplay and OrderSiteReviewTableV2 instead
import LineItemsDisplay from '@/components/orders/LineItemsDisplay';
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
  Download, Share2, XCircle, CreditCard, Trash2, ArrowRightLeft, MoreVertical
} from 'lucide-react';

// Service fee constant - $79 per link for SEO content package
const SERVICE_FEE_CENTS = 7900;

// User-friendly status messaging
const getStatusMessage = (status: string, state?: string) => {
  if (status === 'confirmed') {
    if (state === 'analyzing') {
      return {
        title: "🔍 Finding Perfect Sites for You",
        description: "Our team is analyzing your requirements to identify high-quality sites that match your criteria.",
        timeline: "Typically takes 24-48 hours",
        nextStep: "You'll receive an email when sites are ready for review",
        userAction: "none",
        actionText: "No action needed - we're working on it!"
      };
    } else if (state === 'sites_ready' || state === 'client_reviewing') {
      return {
        title: "📋 Sites Ready for Your Review",
        description: "We've found sites that match your criteria. Review and approve the ones you'd like to use.",
        timeline: "Please review within 5 business days",
        nextStep: "Approve sites to receive your final invoice",
        userAction: "required",
        actionText: "Your review is needed"
      };
    } else if (state === 'payment_pending') {
      return {
        title: "💳 Invoice Ready for Payment",
        description: "Your sites have been approved and your invoice is ready. Pay to start content creation.",
        timeline: "Content creation begins after payment",
        nextStep: "Our team will create and publish your content",
        userAction: "required",
        actionText: "Payment required"
      };
    }
  } else if (status === 'paid' || status === 'in_progress') {
    return {
      title: "✍️ Creating Your Content",
      description: "Payment received! Our team is now creating high-quality guest posts and getting them published.",
      timeline: "Content creation and publishing takes 2-4 weeks",
      nextStep: "You'll receive links as they are published",
      userAction: "none",
      actionText: "Content creation in progress"
    };
  } else if (status === 'completed') {
    return {
      title: "🎉 Order Complete!",
      description: "All your guest posts have been successfully created and published.",
      timeline: "Complete",
      nextStep: "Review your published links below",
      userAction: "none",
      actionText: "All done!"
    };
  } else if (status === 'draft') {
    return {
      title: "📝 Draft Order",
      description: "Your order is still being configured and hasn't been submitted yet.",
      timeline: "No timeline - still in draft",
      nextStep: "Complete your order configuration and submit",
      userAction: "required",
      actionText: "Finish configuring your order"
    };
  }
  
  // Fallback
  return {
    title: `Order ${status}`,
    description: "Order is being processed",
    timeline: "Timeline varies by status",
    nextStep: "Check back later for updates",
    userAction: "none",
    actionText: "Processing"
  };
};

interface LineItem {
  id: string;
  orderId: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    website: string;
  };
  clientName: string;
  targetPageId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  status: string;
  price: number;
  wholesalePrice?: number;
  estimatedPrice?: number;
  isEstimate?: boolean;
  guestPostSite?: string;
  assignedDomain?: any;
  assignedDomainId?: string;
  draftUrl?: string;
  publishedUrl?: string;
  bulkAnalysisId?: string;
  workflowId?: string;
  metadata?: any;
}

interface SiteSubmission {
  id: string;
  orderGroupId: string; // Now uses orderId for compatibility
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
  lineItems?: any[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  // Site submissions are now derived from line items
  const [siteSubmissions, setSiteSubmissions] = useState<SiteSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [showBenchmarkHistory, setShowBenchmarkHistory] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);

  useEffect(() => {
    loadUser();
    loadOrder();
  }, [params.id]);

  useEffect(() => {
    // Load line items and derive site submissions from them
    const shouldLoadSubmissions = user?.userType === 'internal' 
      ? lineItems.length > 0 // Load if line items exist for internal users
      : ((order?.state === 'sites_ready' || order?.state === 'site_review' || 
          order?.state === 'client_reviewing' || order?.state === 'payment_pending' || 
          order?.state === 'payment_received' || order?.state === 'workflows_generated' || 
          order?.state === 'in_progress') && lineItems.length > 0);
    
    if (shouldLoadSubmissions) {
      // Convert line items to site submissions format for display
      const submissions = lineItems
        .filter(item => item.guestPostSite) // Only items with assigned domains
        .map(item => {
          // Extract DR and Traffic from assignedDomain
          const domainData = item.assignedDomain || {};
          const domainRating = domainData.evidence?.da || parseInt(domainData.authorityDirect) || 0;
          const trafficStr = domainData.evidence?.traffic || domainData.traffic || '';
          
          // Parse traffic string (e.g., "1.2M" -> 1200000)
          let traffic = 0;
          if (trafficStr) {
            if (typeof trafficStr === 'string') {
              const match = trafficStr.match(/^([\d.]+)([KMB])?$/i);
              if (match) {
                traffic = parseFloat(match[1]);
                if (match[2]) {
                  const multiplier = { 'K': 1000, 'M': 1000000, 'B': 1000000000 }[match[2].toUpperCase()];
                  traffic *= multiplier || 1;
                }
              }
            } else {
              traffic = trafficStr;
            }
          }
          
          return {
            id: item.id,
            orderGroupId: item.orderId, // Use orderId as groupId for compatibility
            domainId: item.id,
            domain: item.guestPostSite || '',
            domainRating: domainRating,
            traffic: traffic,
            price: item.price,
            status: item.status === 'assigned' ? 'pending' : item.status as any,
            submissionStatus: item.status,
            targetPageUrl: item.targetPageUrl,
            anchorText: item.anchorText,
            clientApprovedAt: undefined,
            clientRejectedAt: undefined,
            clientReviewNotes: undefined,
            specialInstructions: item.anchorText
          };
        });
      setSiteSubmissions(submissions);
    }
    
    // Load benchmark for orders that have been submitted (includes pending_confirmation)
    if (order?.status === 'pending_confirmation' || order?.status === 'confirmed' || order?.status === 'paid' || order?.status === 'in_progress' || order?.status === 'completed') {
      loadBenchmarkData();
    }
  }, [order?.state, lineItems, order?.status, user?.userType]);

  const loadUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}?skipOrderGroups=true`, {
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
      
      // Load line items - this is now the primary system
      if (data.lineItems && data.lineItems.length > 0) {
        console.log('[LOAD_ORDER] Loading line items, found', data.lineItems.length, 'items');
        
        const items: LineItem[] = data.lineItems.map((dbItem: any) => ({
          id: dbItem.id,
          orderId: params.id as string,
          clientId: dbItem.clientId,
          client: dbItem.client, // Preserve the full client object
          clientName: dbItem.client?.name || 'Unknown Client',
          targetPageId: dbItem.targetPageId,
          targetPageUrl: dbItem.targetPageUrl,
          anchorText: dbItem.anchorText,
          status: dbItem.status || 'draft',
          price: dbItem.approvedPrice || dbItem.estimatedPrice || 0,
          wholesalePrice: dbItem.wholesalePrice || (dbItem.estimatedPrice ? dbItem.estimatedPrice - SERVICE_FEE_CENTS : 0),
          estimatedPrice: dbItem.estimatedPrice,
          isEstimate: data.status === 'draft' || data.status === 'pending_confirmation',
          guestPostSite: dbItem.assignedDomain?.domain || dbItem.assignedDomain || '', // Use domain string for display
          assignedDomain: dbItem.assignedDomain, // Preserve the full assignedDomain object
          assignedDomainId: dbItem.assignedDomainId,
          draftUrl: '',
          publishedUrl: dbItem.publishedUrl || '',
          bulkAnalysisId: dbItem.metadata?.bulkAnalysisId,
          workflowId: dbItem.metadata?.workflowId,
          metadata: dbItem.metadata
        }));
        
        setLineItems(items);
      } else {
        // No line items available
        console.log('[LOAD_ORDER] No line items found');
        setLineItems([]);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditSubmission = async (submissionId: string, groupId: string, updates: any) => {
    try {
      // For line items, we need to update the line item directly
      const response = await fetch(`/api/orders/${params.id}/line-items/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to edit submission');
      }
      
      await loadOrder(); // Reload the entire order to refresh data
      alert('Submission updated successfully');
      
    } catch (error: any) {
      console.error('Error editing submission:', error);
      alert(error.message || 'Failed to edit submission');
    }
  };

  const handleRemoveSubmission = async (submissionId: string, groupId: string) => {
    try {
      // For line items, we update the status to 'cancelled'
      const response = await fetch(`/api/orders/${params.id}/line-items/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to remove submission');
      }
      
      await loadOrder(); // Reload the entire order to refresh data
      alert('Submission removed successfully');
      
    } catch (error: any) {
      console.error('Error removing submission:', error);
      alert(error.message || 'Failed to remove submission');
    }
  };

  // Removed loadSiteSubmissions - no longer needed with lineItems system
  
  const handleApproveSubmission = async (groupId: string, submissionId: string) => {
    try {
      // For line items, update the status to 'approved'
      const response = await fetch(`/api/orders/${params.id}/line-items/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (response.ok) {
        await loadOrder(); // Reload the entire order
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleRejectSubmission = async (groupId: string, submissionId: string, reason?: string) => {
    try {
      // For line items, update the status to 'rejected' with notes
      const response = await fetch(`/api/orders/${params.id}/line-items/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'rejected',
          notes: reason 
        })
      });
      
      if (response.ok) {
        await loadOrder(); // Reload the entire order
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
    }
  };

  const loadBenchmarkData = async () => {
    try {
      console.log('Loading benchmark data for order:', params.id);
      const response = await fetch(`/api/orders/${params.id}/benchmark?comparison=true`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Benchmark data loaded:', data);
        setBenchmarkData(data.benchmark);
        setComparisonData(data.comparison);
      } else {
        console.error('Benchmark API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
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
    try {
      await loadOrder();
      // Line items and site submissions are loaded as part of loadOrder
      
      // Always try to load benchmark data if order exists - let the API decide if it's valid
      console.log('Refreshing benchmark data for order:', params.id);
      await loadBenchmarkData();
      
    } catch (error) {
      console.error('Error during refresh:', error);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Allow editing until payment is ACTUALLY received - aligns with backend validation
  const isOrderEditable = order && (() => {
    // Must match backend editableStatuses exactly
    const editableStatuses = [
      'draft',                  // Creating order
      'pending_confirmation',   // Submitted but not confirmed
      'confirmed',             // Internal confirmed, analyzing
      'sites_ready',           // Sites selected for review
      'client_reviewing',      // Client reviewing sites
      'client_approved',       // Client approved sites
      'invoiced'               // Invoice sent but not paid - user can still edit
    ];
    
    return editableStatuses.includes(order.status);
  })();

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
    if (order.state === 'in_progress' || order.status === 'completed') count++;
    if (order.state === 'in_progress' || order.status === 'completed') count++;
    if (order.status === 'completed') count++;
    if (order.status === 'confirmed' && order.state === 'analyzing') count++;
    return count;
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-8 max-w-[98vw] mx-auto">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Link
                  href="/orders"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm sm:text-base"
                >
                  <ArrowLeft className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                  Back to Orders
                </Link>
                <div className="flex items-center gap-2 sm:gap-4">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${stateDisplay.color}`}>
                    {stateDisplay.label}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs sm:text-sm min-h-[44px]"
                >
                  <RefreshCw className={`w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Refresh</span>
                </button>
                
                {/* Show contextual primary action based on state */}
                {order.state === 'payment_pending' && order.invoicedAt && !order.paidAt ? (
                  <Link
                    href={`/orders/${order.id}/invoice`}
                    className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs sm:text-sm min-h-[44px]"
                  >
                    <CreditCard className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Pay Invoice</span>
                    <span className="sm:hidden">Pay</span>
                  </Link>
                ) : order.state === 'ready_for_review' || order.state === 'client_reviewing' ? (
                  <Link
                    href={`/orders/${order.id}/review`}
                    className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-sm min-h-[44px]"
                  >
                    <Eye className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Review Sites</span>
                    <span className="sm:hidden">Review</span>
                  </Link>
                ) : isOrderEditable && order.status === 'draft' ? (
                  /* Only show edit button for draft orders - revise is in nav tabs */
                  <Link
                    href={`/orders/${order.id}/edit`}
                    className="inline-flex items-center px-2.5 sm:px-3 py-1.5 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 hover:border-blue-300 text-xs sm:text-sm min-h-[36px] transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Edit Order</span>
                    <span className="sm:hidden">Edit</span>
                  </Link>
                ) : null}
                {user?.userType === 'internal' && (
                  <>
                    {/* Manage Order - keep outside */}
                    <Link
                      href={`/orders/${order.id}/internal`}
                      className="inline-flex items-center px-2.5 sm:px-3 py-1.5 border border-purple-200 text-purple-700 rounded-md hover:bg-purple-50 hover:border-purple-300 text-xs sm:text-sm min-h-[36px] transition-colors"
                    >
                      <Activity className="h-3.5 w-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Manage Order</span>
                      <span className="sm:hidden">Manage</span>
                    </Link>
                    
                    {/* Admin Actions Dropdown */}
                    <div className="relative group">
                      <button
                        className="inline-flex items-center px-2 py-1.5 border border-gray-200 text-gray-500 rounded-md hover:border-gray-300 hover:text-gray-700 text-xs font-medium transition-all duration-150 min-h-[36px]"
                        title="More Actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-1">
                          <ShareOrderButton 
                            orderId={order.id}
                            currentShareToken={order.shareToken}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          />
                          <button
                            onClick={() => setShowTransferModal(true)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-2 text-gray-400" />
                            Transfer Order
                          </button>
                          
                          {/* Delete button - moved to dropdown */}
                          {(order.status === 'draft' || user?.role === 'admin') && (
                            <>
                              <hr className="my-1 border-gray-200" />
                              <button
                                onClick={async () => {
                                  const isAdmin = user?.userType === 'internal' && user?.role === 'admin';
                                  const confirmMessage = isAdmin && order.status !== 'draft'
                                    ? `⚠️ ADMIN ACTION: Are you sure you want to delete this ${order.status} order?\n\nOrder ID: ${order.id}\nAccount: ${order.account?.email || 'Unknown'}\nValue: ${formatCurrency((order as any).totalRetail || 0)}\n\nThis will permanently delete the order and all related data. This action cannot be undone.`
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
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete Order
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Unified Navigation Tabs for Order Flow - Always visible to show workflow */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 sm:mb-6">
            <div className="flex flex-wrap items-center justify-between p-2 sm:p-3">
              <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
                {/* Order Details - Always Available */}
                <Link
                  href={`/orders/${order.id}`}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    !pathname.includes('/edit') && !pathname.includes('/review') && !pathname.includes('/invoice') && !pathname.includes('/payment')
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 sm:h-4 w-3 sm:w-4" />
                    Order Details
                  </span>
                </Link>
                
                {/* Step 1: Setup/Edit - Show state based on editability */}
                {isOrderEditable ? (
                  order.status === 'draft' ? (
                    <Link
                      href={`/orders/${order.id}/edit`}
                      className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        pathname.includes('/edit')
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Edit className="h-3 sm:h-4 w-3 sm:w-4" />
                        1. Setup
                      </span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setShowEditWarning(true)}
                      className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        pathname.includes('/edit')
                          ? 'bg-amber-100 text-amber-700' 
                          : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                      title="Revise order (will reset for review)"
                    >
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 sm:h-4 w-3 sm:w-4" />
                        1. Revise
                      </span>
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
                    title={order.state === 'analyzing' ? "Setup complete - finding sites" : "Setup complete"}
                  >
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />
                      1. Setup ✓
                    </span>
                  </button>
                )}
                
                {/* Step 2: Review - Available after sites are ready */}
                {(order.state === 'ready_for_review' || order.state === 'client_reviewing' || ['payment_pending', 'payment_received'].includes(order.state || '')) ? (
                  <Link
                    href={`/orders/${order.id}/review`}
                    className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      pathname.includes('/review')
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 sm:h-4 w-3 sm:w-4" />
                      2. Review
                      {['payment_pending', 'payment_received'].includes(order.state || '') && ' ✓'}
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
                    title={order.state === 'analyzing' ? "Sites being analyzed" : "Not ready for review yet"}
                  >
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 sm:h-4 w-3 sm:w-4 opacity-50" />
                      2. Review
                    </span>
                  </button>
                )}
                
                {/* Step 3: Invoice - Available after review */}
                {order.invoicedAt ? (
                  <Link
                    href={`/orders/${order.id}/invoice`}
                    className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      pathname.includes('/invoice')
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 sm:h-4 w-3 sm:w-4" />
                      3. Invoice ✓
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
                    title="Invoice will be generated after site review"
                  >
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 sm:h-4 w-3 sm:w-4 opacity-50" />
                      3. Invoice
                    </span>
                  </button>
                )}
                
                {/* Step 4: Payment - Available after invoice */}
                {order.paidAt ? (
                  <button
                    disabled
                    className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-green-700 bg-green-100 cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />
                      4. Payment ✓
                    </span>
                  </button>
                ) : order.state === 'payment_pending' && order.invoicedAt ? (
                  <Link
                    href={`/orders/${order.id}/payment`}
                    className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      pathname.includes('/payment')
                        ? 'bg-green-100 text-green-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 sm:h-4 w-3 sm:w-4" />
                      4. Payment
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
                    title="Payment available after invoice"
                  >
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 sm:h-4 w-3 sm:w-4 opacity-50" />
                      4. Payment
                    </span>
                  </button>
                )}
              </div>
              
              {/* Stage indicator */}
              <div className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0">
                <span className="font-medium">{getStateDisplay(order.status, order.state).label}</span>
              </div>
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Column - Progress Steps */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Progress</h2>
                <OrderProgressSteps 
                  orderStatus={order?.status || ''} 
                  orderState={order?.state} 
                  className="mt-4"
                />
                
                {/* Quick Actions based on state - only show if there are actions */}
                {(() => {
                  const hasPayAction = user?.userType !== 'internal' && order.state === 'payment_pending' && order.invoicedAt && !order.paidAt;
                  const hasReviewAction = user?.userType !== 'internal' && (order.state === 'ready_for_review' || order.state === 'client_reviewing');
                  
                  if (!hasPayAction && !hasReviewAction) return null;
                  
                  return (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        {/* Pay Invoice Action for External Users */}
                        {hasPayAction && (
                          <Link
                            href={`/orders/${order.id}/invoice`}
                            className="block w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 text-center font-medium"
                          >
                            <span className="flex items-center justify-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Pay Invoice - ${(((order as any).totalRetail || 0) / 100).toFixed(2)}
                            </span>
                          </Link>
                        )}
                        
                        {/* Review Sites Action for External Users */}
                        {hasReviewAction && (
                          <Link
                            href={`/orders/${order.id}/review`}
                            className="block w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center font-medium"
                          >
                          <span className="flex items-center justify-center gap-2">
                            <Eye className="h-4 w-4" />
                            Review & Approve Sites
                          </span>
                        </Link>
                      )}
                      {order.state === 'analyzing' && lineItems.some(item => item.bulkAnalysisId) && (
                        <div className="space-y-2">
                          {/* Group line items by client for bulk analysis links */}
                          {Object.entries(groupedLineItems).map(([clientId, group]) => {
                            const itemWithAnalysis = group.items.find(item => item.bulkAnalysisId);
                            if (!itemWithAnalysis) return null;
                            return (
                              <Link
                                key={clientId}
                                href={`/clients/${clientId}/bulk-analysis/projects/${itemWithAnalysis.bulkAnalysisId}`}
                                className="block w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center"
                              >
                                Analyze {group.clientName}
                              </Link>
                            );
                          })}
                          <button
                            onClick={async () => {
                              if (confirm('Mark sites as ready for client review? This will notify the client that sites are available.')) {
                                try {
                                  const response = await fetch(`/api/orders/${order.id}/state`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      state: 'sites_ready',
                                      notes: 'Sites ready for client review'
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    await loadOrder();
                                    // Site submissions are derived from line items
                                    await loadOrder();
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
                      {(order.state === 'client_reviewing') && (
                        <div className="space-y-2">
                          <Link
                            href={`/orders/${order.id}/review`}
                            className="block w-full px-4 py-3 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 text-center font-medium"
                          >
                            <Users className="w-4 h-4 mx-auto mb-1" />
                            Review & Approve Sites
                            {siteSubmissions.filter(s => s.status === 'pending').length > 0 && (
                              <div className="text-xs text-purple-200 mt-1">
                                {siteSubmissions.filter(s => s.status === 'pending').length} sites pending
                              </div>
                            )}
                          </Link>
                        </div>
                      )}
                      {order.status === 'completed' && lineItems.some(item => item.workflowId) && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 mb-1">View Articles:</p>
                          {lineItems.filter(item => item.workflowId).map((item, idx) => (
                            <div
                              key={idx}
                              className="block w-full px-3 py-2 bg-green-100 text-green-800 text-sm rounded-md text-center truncate border border-green-200"
                            >
                              <div className="font-medium">{item.clientName} - {item.targetPageUrl || 'Article'}</div>
                              <div className="text-xs text-green-600 mt-1">Article Completed</div>
                            </div>
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
                              {formatCurrency((order as any).totalRetail || 0)}
                            </div>
                          </Link>
                        </div>
                      )}

                      {/* Confirm Order Link - Internal Users Only */}
                      {order.status === 'pending_confirmation' && user?.userType === 'internal' && (
                        <div className="space-y-2">
                          <Link
                            href={`/orders/${order.id}/internal`}
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
                  );
                })()}
                
                {/* Status Message for External Users when sites are ready */}
                {user?.userType !== 'internal' && (order.state === 'sites_ready' || order.state === 'client_reviewing') && (
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
              
              {/* Account Information - Only for Internal Users */}
              {user?.userType === 'internal' && (
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
              )}
            </div>

            {/* Middle/Right Columns - Order Details Table */}
            <div className="lg:col-span-9">
              {/* Site Review Summary Card */}
              {order.state === 'sites_ready' && siteSubmissions.length > 0 && (
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
                        {Object.entries(groupedLineItems).map(([clientId, group]) => {
                          const clientSubmissions = siteSubmissions.filter(s => 
                            lineItems.find(item => item.id === s.id)?.clientId === clientId
                          );
                          const pending = clientSubmissions.filter(s => s.status === 'pending').length;
                          const approved = clientSubmissions.filter(s => s.status === 'approved').length;
                          const rejected = clientSubmissions.filter(s => s.status === 'rejected').length;
                          
                          if (clientSubmissions.length === 0) return null;
                          
                          return (
                            <div key={clientId} className="flex items-center gap-2">
                              <span className="font-medium">{group.clientName}:</span>
                              {pending > 0 && <span className="text-yellow-700">{pending} pending</span>}
                              {approved > 0 && <span className="text-green-700">{approved} approved</span>}
                              {rejected > 0 && <span className="text-red-700">{rejected} rejected</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {loadingSubmissions && (
                        <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                      )}
                      <Link
                        href={`/orders/${order.id}/review`}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Review Sites
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Benchmark Display - Show original request (only after confirmation) */}
              {benchmarkData && order.status !== 'pending_confirmation' && (
                <div className="mb-6">
                  <BenchmarkDisplay 
                    benchmark={benchmarkData}
                    comparison={comparisonData}
                    orderId={order.id}
                    userType={user?.userType || 'account'}
                    onRefresh={loadBenchmarkData}
                  />
                </div>
              )}
              
              {/* Show LineItemsDisplay for pending_confirmation orders with line items */}
              {(order.status === 'pending_confirmation' || order.status === 'draft') && lineItems.length > 0 ? (
                <LineItemsDisplay 
                  lineItems={lineItems}
                  orderStatus={order.status}
                  orderState={order.state}
                  userType={user?.userType || 'account'}
                />
              ) : (order.state === 'sites_ready' || order.state === 'client_reviewing' || 
                order.state === 'payment_pending' || order.state === 'payment_received' || 
                order.state === 'workflows_generated' || order.state === 'in_progress' || 
                order.status === 'completed') && lineItems.length > 0 ? (
                <LineItemsReviewTable
                  orderId={params.id as string}
                  lineItems={lineItems}
                  userType={user?.userType || 'account'}
                  permissions={{
                    canEditDomainAssignments: user?.userType === 'internal',
                    canViewPricing: true,                              // All users can see pricing
                    canEditPricing: user?.userType === 'internal',    // Only internal users can edit pricing
                    canAssignTargetPages: user?.userType === 'internal'
                  }}
                  onEditItem={async (itemId, updates) => {
                    await handleEditSubmission(itemId, '', updates);
                  }}
                  onRemoveItem={async (itemId) => {
                    await handleRemoveSubmission(itemId, '');
                  }}
                />
              ) : (
                <>
                  {/* Fallback to LineItemsDisplay for orders without site submissions */}
                  <LineItemsDisplay 
                    lineItems={lineItems}
                    orderStatus={order.status}
                    orderState={order.state}
                    userType={user?.userType || 'account'}
                  />
                </>
              )}
              
              {/* OLD TABLE CODE REMOVED - NOW USING OrderDetailsTable COMPONENT */}
              
              {/* Additional Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                {/* Timeline */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Timeline</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Order Created */}
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Clock className="h-3 sm:h-4 w-3 sm:w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">Order Created</p>
                        <p className="text-xs sm:text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
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
                    {(order.state === 'sites_ready' || order.state === 'client_reviewing') && (
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
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Activity className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Current Status</h3>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
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
                    {order.state === 'analyzing' && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Finding Sites</p>
                          <p className="text-xs text-gray-500">Our team is analyzing and curating suitable sites for your links</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Sites Ready for Review */}
                    {(order.state === 'sites_ready' || order.state === 'client_reviewing') && (
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
                          <p className="text-xs text-gray-500">Invoice ready - please complete payment to proceed</p>
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
      
      {/* Edit Warning Modal */}
      {showEditWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Revise Order?
                </h3>
                <div className="mt-2 text-sm text-gray-600 space-y-2">
                  <p>
                    Your order has already been submitted for review. Making changes now will:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-500">
                    <li>Reset the order to "pending confirmation"</li>
                    <li>Require the team to review your changes</li>
                    {(order.state === 'sites_ready' || order.state === 'client_reviewing') && (
                      <li>May affect site recommendations (team will re-evaluate)</li>
                    )}
                    {order.state === 'analyzing' && (
                      <li>Pause the current site analysis</li>
                    )}
                  </ul>
                  <p className="font-medium text-gray-700 mt-3">
                    Are you sure you want to proceed with editing?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditWarning(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <Link
                href={`/orders/${order.id}/edit`}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
              >
                Continue to Edit
              </Link>
            </div>
          </div>
        </div>
      )}
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