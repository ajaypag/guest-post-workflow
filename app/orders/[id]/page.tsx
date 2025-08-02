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
  CreditCard
} from 'lucide-react';
import PaymentStatus, { PaymentStatusCard } from '@/components/orders/PaymentStatus';
import RecordPaymentModal from '@/components/orders/RecordPaymentModal';
import WorkflowGenerationButton from '@/components/orders/WorkflowGenerationButton';

interface OrderDetail {
  id: string;
  clientId: string;
  status: string;
  state: string;
  advertiserEmail: string;
  advertiserName: string;
  advertiserCompany?: string;
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
  paidAt?: string | null;
  invoicedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    website: string;
  };
  items?: Array<{
    id: string;
    domain: string;
    domainRating: number;
    traffic?: string;
    retailPrice: number;
    wholesalePrice: number;
    status: string;
    workflowId?: string;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      setOrder(data); // API returns order directly now
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
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
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              </div>
              
              <div className="flex items-center gap-3">
                {user?.userType === 'internal' && (
                  <Link
                    href={`/orders/${order.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                )}
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-gray-400" />
                  Client Information
                </h2>
                {order.client ? (
                  <div className="space-y-2">
                    <p className="text-gray-900 font-medium">{order.client.name}</p>
                    <a href={order.client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {order.client.website}
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500">Client information not available</p>
                )}
              </div>

              {/* Advertiser Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  Advertiser Information
                </h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 text-gray-900">{order.advertiserName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 text-gray-900">{order.advertiserEmail}</span>
                  </div>
                  {order.advertiserCompany && (
                    <div>
                      <span className="text-gray-600">Company:</span>
                      <span className="ml-2 text-gray-900">{order.advertiserCompany}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-gray-400" />
                  Domains ({order.items?.length || 0})
                </h2>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.domain}</p>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                            <span>DR: {item.domainRating}</span>
                            {item.traffic && <span>Traffic: {item.traffic}</span>}
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
                ) : (
                  <p className="text-gray-500">No domains in this order</p>
                )}
              </div>

              {/* Internal Notes */}
              {user?.userType === 'internal' && order.internalNotes && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-400" />
                    Internal Notes
                  </h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.internalNotes}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Status Card */}
              <PaymentStatusCard order={order} />

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
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  {order.updatedAt !== order.createdAt && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Updated</p>
                        <p className="text-sm text-gray-600">{formatDate(order.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <div className="space-y-2">
                  {order.status === 'draft' && user?.userType === 'internal' && (
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Submit for Approval
                    </button>
                  )}
                  {order.status === 'pending_approval' && user?.userType === 'account' && (
                    <>
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        Approve Order
                      </button>
                      <button className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50">
                        Request Changes
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && user?.userType === 'internal' && !order.paidAt && (
                    <button 
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Record Payment
                    </button>
                  )}
                  {order.status === 'confirmed' && order.paidAt && (
                    <WorkflowGenerationButton 
                      order={order}
                      isPaid={true}
                      onSuccess={() => loadOrder()}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {order && showPaymentModal && (
        <RecordPaymentModal
          order={{
            id: order.id,
            totalRetail: order.totalRetail,
            accountName: order.advertiserName
          }}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            loadOrder(); // Reload to show updated payment status
          }}
        />
      )}
    </AuthWrapper>
  );
}