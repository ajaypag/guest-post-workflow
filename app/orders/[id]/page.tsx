'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  ArrowLeft, Loader2, CheckCircle, Clock, Search, Users, FileText, 
  RefreshCw, ExternalLink, Globe, LinkIcon, Eye, Edit, Package,
  Target, ChevronRight, AlertCircle, Activity, Building, User, DollarSign,
  Download, Share2, XCircle, CreditCard
} from 'lucide-react';

interface LineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  price: number;
  selectedPackage?: string;
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
  packageType?: string;
  packagePrice?: number;
}

interface OrderDetail {
  id: string;
  accountId: string;
  status: string;
  state?: string;
  accountEmail: string;
  accountName: string;
  accountCompany?: string;
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

const getStateDisplay = (status: string, state?: string) => {
  if (status === 'draft') return { label: 'Draft', color: 'bg-gray-100 text-gray-700' };
  if (status === 'pending_confirmation') return { label: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-700' };
  if (status === 'cancelled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
  if (status === 'completed') return { label: 'Completed', color: 'bg-green-100 text-green-700' };
  
  // For confirmed orders, show the state
  switch (state) {
    case 'analyzing':
      return { label: 'Finding Sites', color: 'bg-blue-100 text-blue-700' };
    case 'site_review':
      return { label: 'Ready for Review', color: 'bg-purple-100 text-purple-700' };
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' };
    default:
      return { label: 'Processing', color: 'bg-gray-100 text-gray-700' };
  }
};

const getProgressSteps = (status: string, state?: string) => {
  const steps = [
    { id: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, description: 'Your order has been received' },
    { id: 'analyzing', label: 'Finding Sites', icon: Search, description: 'Our team is identifying suitable sites' },
    { id: 'site_review', label: 'Review Sites', icon: Users, description: 'Site recommendations ready for your review' },
    { id: 'in_progress', label: 'Creating Content', icon: FileText, description: 'Writing and placing your links' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, description: 'All links have been placed' }
  ];
  
  let currentStep = 0;
  if (status === 'confirmed' || status === 'pending_confirmation') {
    currentStep = 1;
    if (state === 'analyzing') currentStep = 1;
    if (state === 'site_review') currentStep = 2;
    if (state === 'in_progress') currentStep = 3;
  }
  if (status === 'completed') currentStep = 4;
  
  return { steps, currentStep };
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadUser();
    loadOrder();
  }, [params.id]);

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
              price: group.packagePrice || 0,
              selectedPackage: group.packageType || 'better',
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
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const isOrderEditable = order && (order.status === 'draft' || order.status === 'pending_confirmation');

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

  const { steps, currentStep } = getProgressSteps(order?.status || '', order?.state);
  const stateDisplay = getStateDisplay(order?.status || '', order?.state);

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
              </div>
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Progress Steps */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Progress</h2>
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    
                    return (
                      <div key={step.id} className="relative">
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                            ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                          `}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`
                            absolute left-4 top-8 w-0.5 h-8
                            ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                          `} />
                        )}
                      </div>
                    );
                  })}
                </div>
                
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
                      </div>
                    )}
                    {order.state === 'site_review' && (
                      <Link
                        href={`/account/orders/${order.id}/sites`}
                        className="block w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 flex items-center justify-center"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Review Sites
                      </Link>
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
                  </div>
                </div>
              </div>
              
              {/* Account Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Account Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.accountName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.accountEmail}</dd>
                  </div>
                  {order.accountCompany && (
                    <div>
                      <dt className="text-sm text-gray-500">Company</dt>
                      <dd className="text-sm font-medium text-gray-900">{order.accountCompany}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Middle/Right Columns - Order Details Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.status === 'confirmed' ? 'Tracking your link placement progress' : 'Review your order details'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(order.totalPrice)}</p>
                      <p className="text-sm text-gray-600">Total Order Value</p>
                    </div>
                  </div>
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
                        {order.status === 'confirmed' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Guest Post Site
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Draft
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Published
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Analysis
                            </th>
                          </>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lineItems.map((item, index) => {
                        const isFirstInGroup = index === 0 || lineItems[index - 1].clientId !== item.clientId;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              {isFirstInGroup && (
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {item.clientName}
                                </div>
                              )}
                              <div className={`text-sm text-gray-600 ${isFirstInGroup ? '' : 'mt-2'}`}>
                                {item.targetPageUrl || 'No target page selected'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.anchorText || '-'}
                            </td>
                            {order.status === 'confirmed' && (
                              <>
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
                                <td className="px-6 py-4">
                                  {item.draftUrl ? (
                                    <a
                                      href={item.draftUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      View
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
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
                                <td className="px-6 py-4 text-center">
                                  {item.bulkAnalysisId ? (
                                    <Link
                                      href={`/clients/${item.clientId}/bulk-analysis/projects/${item.bulkAnalysisId}`}
                                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Link>
                                  ) : item.workflowId ? (
                                    <Link
                                      href={`/workflows/${item.workflowId}`}
                                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(item.price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={order.status === 'confirmed' ? 6 : 2} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(order.totalPrice)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
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
                          <p className="text-xs text-gray-500">Awaiting your approval</p>
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
                            <dt className="text-gray-600">Wholesale Cost</dt>
                            <dd className="font-medium">{formatCurrency(order.totalWholesale || 0)}</dd>
                          </div>
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Revenue</dt>
                            <dd className="font-medium">{formatCurrency(order.totalPrice)}</dd>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t">
                            <dt className="font-medium">Gross Profit</dt>
                            <dd className="font-bold text-green-600">{formatCurrency(order.profitMargin || (order.totalPrice - (order.totalWholesale || 0)))}</dd>
                          </div>
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Margin</dt>
                            <dd className="font-medium">
                              {order.totalWholesale ? 
                                `${Math.round(((order.totalPrice - order.totalWholesale) / order.totalPrice) * 100)}%` : 
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