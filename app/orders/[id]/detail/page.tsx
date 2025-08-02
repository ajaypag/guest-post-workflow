'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import {
  ArrowLeft,
  Edit,
  Download,
  Share2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  DollarSign,
  User,
  Building,
  Globe,
  FileText,
  Loader2,
  CreditCard,
  Users,
  Target,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
    niche?: string;
  };
  linkCount: number;
  targetPages: any[];
  bulkAnalysisProjectId?: string;
  groupStatus: string;
}

interface OrderDetail {
  id: string;
  accountId?: string;
  accountEmail: string;
  accountName: string;
  accountCompany?: string;
  orderType: string;
  status: string;
  state: string;
  subtotalRetail: number;
  discountPercent: string;
  discountAmount: number;
  totalRetail: number;
  totalWholesale: number;
  profitMargin: number;
  includesClientReview: boolean;
  clientReviewFee: number;
  rushDelivery: boolean;
  rushFee: number;
  internalNotes?: string;
  accountNotes?: string;
  approvedAt?: string;
  invoicedAt?: string;
  paidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo?: string;
  orderGroups: OrderGroup[];
  items?: Array<{
    id: string;
    domain: string;
    domainRating: number;
    traffic: number;
    retailPrice: number;
    wholesalePrice: number;
    status: string;
    workflowId?: string;
    publishedUrl?: string;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

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
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/orders/${params.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found');
          return;
        }
        throw new Error('Failed to load order');
      }

      const data = await response.json();
      console.log('[ORDER_DETAIL] Loaded order data:', data);
      console.log('[ORDER_DETAIL] Order groups:', data.orderGroups);
      console.log('[ORDER_DETAIL] Order groups length:', data.orderGroups?.length || 0);
      if (data.orderGroups && data.orderGroups.length > 0) {
        console.log('[ORDER_DETAIL] First group:', data.orderGroups[0]);
        console.log('[ORDER_DETAIL] First group targetPages:', data.orderGroups[0].targetPages);
      }
      setOrder(data); // API returns order directly now
    } catch (error) {
      console.error('Error loading order:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!order || confirmingOrder) return;
    
    const confirmed = confirm('Confirm this order? This will create bulk analysis projects for each client.');
    if (!confirmed) return;
    
    try {
      setConfirmingOrder(true);
      const response = await fetch(`/api/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: user?.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to confirm order');
      }
      
      // Reload the order to show updated status
      await loadOrder();
    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Failed to confirm order');
    } finally {
      setConfirmingOrder(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-indigo-600" />;
      case 'pending_confirmation':
        return <Clock className="h-5 w-5 text-amber-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_confirmation': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-indigo-100 text-indigo-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateLabel = (state: string) => {
    const stateLabels: { [key: string]: string } = {
      'configuring': 'Configuring',
      'awaiting_review': 'Awaiting Review',
      'analyzing': 'Finding Sites',
      'reviewing': 'Site Review',
      'payment_pending': 'Payment Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    };
    return stateLabels[state] || state;
  };

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

  if (error || !order) {
    return (
      <AuthWrapper>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{error || 'Order not found'}</p>
            <Link href="/orders" className="text-blue-600 hover:underline">
              Back to Orders
            </Link>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  const totalLinks = order.orderGroups.reduce((sum, group) => sum + group.linkCount, 0);
  const totalClients = order.orderGroups.length;

  return (
    <AuthWrapper>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {order.state && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    {getStateLabel(order.state)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {order.status === 'draft' && (
                  <Link
                    href={`/orders/${order.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Continue Editing
                  </Link>
                )}
                {user?.userType === 'internal' && order.status === 'pending_confirmation' && (
                  <button
                    onClick={handleConfirmOrder}
                    disabled={confirmingOrder}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirmingOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Order
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Overview */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <Users className="h-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                    <p className="text-sm text-gray-600">Clients</p>
                  </div>
                  <div className="text-center">
                    <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{totalLinks}</p>
                    <p className="text-sm text-gray-600">Total Links</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {order.orderGroups.filter(g => g.bulkAnalysisProjectId).length}
                    </p>
                    <p className="text-sm text-gray-600">Active Projects</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  Account Information
                </h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 text-gray-900">{order.accountName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 text-gray-900">{order.accountEmail}</span>
                  </div>
                  {order.accountCompany && (
                    <div>
                      <span className="text-gray-600">Company:</span>
                      <span className="ml-2 text-gray-900">{order.accountCompany}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Groups */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-gray-400" />
                  Client Details
                </h2>
                {order.orderGroups.length > 0 ? (
                  <div className="space-y-4">
                    {order.orderGroups.map((group) => (
                      <div key={group.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{group.client.name}</p>
                            <a 
                              href={group.client.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {group.client.website}
                            </a>
                            {group.client.niche && (
                              <p className="text-sm text-gray-600 mt-1">Niche: {group.client.niche}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{group.linkCount} links</p>
                            {group.bulkAnalysisProjectId && (
                              <Link
                                href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Project
                              </Link>
                            )}
                          </div>
                        </div>
                        
                        {group.targetPages && Array.isArray(group.targetPages) && group.targetPages.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-1">Target Pages:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {group.targetPages.slice(0, 3).map((page, idx) => (
                                <li key={idx}>• {page.url || page}</li>
                              ))}
                              {group.targetPages.length > 3 && (
                                <li className="text-gray-500">+ {group.targetPages.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No client groups in this order</p>
                )}
              </div>

              {/* Order Items (if any) */}
              {order.items && order.items.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-gray-400" />
                    Domains ({order.items.length})
                  </h2>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.domain}</p>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                            <span>DR: {item.domainRating}</span>
                            {item.traffic && <span>Traffic: {item.traffic.toLocaleString()}</span>}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === 'completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(item.retailPrice)}</p>
                          {item.workflowId && (
                            <Link
                              href={`/workflows/${item.workflowId}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Workflow
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(order.internalNotes || order.accountNotes) && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-400" />
                    Notes
                  </h2>
                  {user?.userType === 'internal' && order.internalNotes && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-700 mb-1">Internal Notes</h3>
                      <p className="text-gray-600 whitespace-pre-wrap">{order.internalNotes}</p>
                    </div>
                  )}
                  {order.accountNotes && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Account Notes</h3>
                      <p className="text-gray-600 whitespace-pre-wrap">{order.accountNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pricing Summary */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
                  Pricing Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(order.subtotalRetail)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount ({order.discountPercent}%)</span>
                      <span className="text-green-600">-{formatCurrency(order.discountAmount)}</span>
                    </div>
                  )}
                  {order.includesClientReview && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Client Review</span>
                      <span className="text-gray-900">{formatCurrency(order.clientReviewFee)}</span>
                    </div>
                  )}
                  {order.rushDelivery && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rush Delivery</span>
                      <span className="text-gray-900">{formatCurrency(order.rushFee)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalRetail)}</span>
                    </div>
                  </div>
                  {user?.userType === 'internal' && (
                    <>
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Wholesale Cost</span>
                          <span className="text-gray-900">{formatCurrency(order.totalWholesale)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-600">Profit Margin</span>
                          <span className="text-green-600">{formatCurrency(order.profitMargin)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Timeline</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  {order.approvedAt && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Confirmed</p>
                        <p className="text-sm text-gray-600">{formatDate(order.approvedAt)}</p>
                      </div>
                    </div>
                  )}
                  {order.paidAt && (
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-4 w-4 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Paid</p>
                        <p className="text-sm text-gray-600">{formatDate(order.paidAt)}</p>
                      </div>
                    </div>
                  )}
                  {order.completedAt && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Completed</p>
                        <p className="text-sm text-gray-600">{formatDate(order.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              {order.status === 'confirmed' && order.state === 'analyzing' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">Bulk Analysis In Progress</p>
                  <p className="text-sm text-blue-700">
                    Our team is finding suitable sites for this order. Check the bulk analysis projects for progress.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}