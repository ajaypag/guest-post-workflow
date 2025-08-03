'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService, type AuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  ArrowLeft, Loader2, CheckCircle, Clock, Users, FileText, 
  RefreshCw, ExternalLink, Globe, LinkIcon, Eye, Package,
  Target, ChevronRight, AlertCircle, Activity, Building, User, DollarSign,
  Download, Share2, XCircle, CreditCard, Trash2, Zap, PlayCircle,
  ClipboardCheck, Send, Database, Search
} from 'lucide-react';

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
  packageType?: string;
  packagePrice?: number;
  groupStatus?: string;
  siteSelections?: {
    approved: number;
    pending: number;
    total: number;
  };
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
  paidAt?: string;
  completedAt?: string;
  orderGroups?: OrderGroup[];
}

export default function InternalOrderManagementPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkAuth = async () => {
      // Check session for userType
      const currentSession = AuthService.getSession();
      if (!currentSession || currentSession.userType !== 'internal') {
        router.push('/orders');
        return;
      }
      
      setSession(currentSession);
      loadOrder();
    };
    
    checkAuth();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to load order');
      }
      
      const data = await response.json();
      console.log('Order data received:', data);
      console.log('Order groups:', data.orderGroups);
      if (data.orderGroups) {
        data.orderGroups.forEach((group: any) => {
          console.log(`Group ${group.id}: bulkAnalysisProjectId = ${group.bulkAnalysisProjectId}`);
        });
      }
      setOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadOrder();
    setLoading(false);
  };

  const handleConfirmOrder = async () => {
    if (!order) return;
    
    setActionLoading(prev => ({ ...prev, confirm: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to confirm order');
      }
      
      const data = await response.json();
      setMessage({
        type: 'success',
        text: `Order confirmed successfully! Created ${data.projectsCreated} bulk analysis projects.`
      });
      await loadOrder();
    } catch (err) {
      console.error('Error confirming order:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to confirm order'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, confirm: false }));
    }
  };

  const handleMarkSitesReady = async () => {
    setActionLoading(prev => ({ ...prev, sites_ready: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}/update-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'sites_ready' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order state');
      }
      
      setMessage({
        type: 'success',
        text: 'Sites marked as ready for client review'
      });
      await loadOrder();
    } catch (err) {
      console.error('Error updating order state:', err);
      setMessage({
        type: 'error',
        text: 'Failed to update order state'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, sites_ready: false }));
    }
  };

  const handleGenerateWorkflows = async () => {
    if (!order || order.status !== 'paid') {
      setMessage({
        type: 'warning',
        text: 'Order must be paid before generating workflows'
      });
      return;
    }
    
    setActionLoading(prev => ({ ...prev, generate_workflows: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}/generate-workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate workflows');
      }
      
      const data = await response.json();
      setMessage({
        type: 'success',
        text: `Successfully generated ${data.workflowsCreated} workflows!`
      });
      await loadOrder();
    } catch (err) {
      console.error('Error generating workflows:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to generate workflows'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, generate_workflows: false }));
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (error || !order) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-red-600">{error || 'Order not found'}</p>
              <Link href="/orders" className="text-blue-600 hover:underline mt-4 inline-block">
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_confirmation': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateDisplay = (state?: string) => {
    switch (state) {
      case 'analyzing': return { label: 'Analyzing Sites', color: 'bg-blue-100 text-blue-800' };
      case 'sites_ready': return { label: 'Sites Ready for Review', color: 'bg-yellow-100 text-yellow-800' };
      case 'client_reviewing': return { label: 'Client Reviewing', color: 'bg-purple-100 text-purple-800' };
      case 'selections_confirmed': return { label: 'Selections Confirmed', color: 'bg-green-100 text-green-800' };
      case 'payment_received': return { label: 'Payment Received', color: 'bg-green-100 text-green-800' };
      case 'workflows_generated': return { label: 'Workflows Generated', color: 'bg-indigo-100 text-indigo-800' };
      default: return { label: state || 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const stateDisplay = getStateDisplay(order.state);

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href={`/orders/${order.id}`}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Internal Order Management
              </h1>
              <span className="text-gray-500">#{order.id.slice(0, 8)}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stateDisplay.color}`}>
                {stateDisplay.label}
              </span>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="ml-auto inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'error' ? 'bg-red-50 text-red-800' :
              message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
              message.type === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message.type === 'error' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'warning' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5" /> :
               <AlertCircle className="h-5 w-5 mt-0.5" />}
              <div className="flex-1">{message.text}</div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Account</p>
                    <p className="font-medium">
                      {order.account?.companyName || order.account?.contactName || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">{order.account?.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${formatCurrency(order.totalPrice)}
                    </p>
                    {order.profitMargin && (
                      <p className="text-sm text-green-600">
                        Profit: ${formatCurrency(order.profitMargin)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {order.paidAt && (
                    <div>
                      <p className="text-sm text-gray-500">Paid</p>
                      <p className="font-medium">
                        {new Date(order.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Internal Notes */}
              {order.internalNotes && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Internal Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {order.internalNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Middle Column - Actions & Projects */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Actions & Management</h2>
                
                <div className="space-y-4">
                  {/* Order Confirmation */}
                  {order.status === 'pending_confirmation' && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-yellow-600" />
                        Order Confirmation Required
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Confirm this order to create bulk analysis projects and notify the client.
                      </p>
                      <button
                        onClick={handleConfirmOrder}
                        disabled={actionLoading.confirm}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading.confirm ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Confirming...
                          </span>
                        ) : (
                          'Confirm Order'
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Bulk Analysis Projects */}
                  {order.orderGroups && order.orderGroups.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-600" />
                        Bulk Analysis Projects
                      </h3>
                      {order.orderGroups.some(g => g.bulkAnalysisProjectId) ? (
                        <div className="space-y-2">
                          {order.orderGroups.filter(g => g.bulkAnalysisProjectId).map(group => (
                            <Link
                              key={group.id}
                              href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                              className="block w-full px-3 py-2 bg-white border border-blue-200 text-blue-700 text-sm rounded-md hover:bg-blue-50"
                            >
                              <div className="flex items-center justify-between">
                                <span>{group.client.name}</span>
                                <ExternalLink className="h-4 w-4" />
                              </div>
                              <span className="text-xs text-gray-600">
                                {group.linkCount} links • {group.siteSelections?.approved || 0} approved
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          No bulk analysis projects created yet. Confirm the order to create projects.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Site Readiness */}
                  {order.state === 'analyzing' && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Site Analysis Complete?
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Once you've completed site analysis and selection, mark sites as ready for client review.
                      </p>
                      <button
                        onClick={handleMarkSitesReady}
                        disabled={actionLoading.sites_ready}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading.sites_ready ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          'Mark Sites Ready'
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Workflow Generation */}
                  {order.status === 'paid' && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        Generate Workflows
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Create workflows for all approved sites in this order.
                      </p>
                      <button
                        onClick={handleGenerateWorkflows}
                        disabled={actionLoading.generate_workflows}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      >
                        {actionLoading.generate_workflows ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          'Generate Workflows'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Order Groups */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Client Groups</h2>
                
                {order.orderGroups && order.orderGroups.length > 0 ? (
                  <div className="space-y-4">
                    {order.orderGroups.map(group => (
                      <div key={group.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {group.client.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {group.client.website}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {group.linkCount} links
                          </span>
                        </div>
                        
                        {group.packageType && (
                          <div className="text-sm text-gray-600 mb-2">
                            Package: <span className="font-medium">{group.packageType}</span>
                          </div>
                        )}
                        
                        {group.siteSelections && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Site Selections</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm">
                                <span className="font-medium text-green-600">{group.siteSelections.approved}</span> approved
                              </span>
                              <span className="text-sm">
                                <span className="font-medium text-yellow-600">{group.siteSelections.pending}</span> pending
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {group.targetPages && group.targetPages.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Target Pages</p>
                            {group.targetPages.map((page, idx) => (
                              <p key={idx} className="text-sm text-gray-600 truncate">
                                {page.url}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No client groups in this order</p>
                )}
                
                {/* Diagnostic Link for Debugging */}
                {session?.role === 'admin' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link 
                      href={`/admin/order-project-diagnostics?orderId=${order.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Database className="h-4 w-4" />
                      Run Order Diagnostics
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}