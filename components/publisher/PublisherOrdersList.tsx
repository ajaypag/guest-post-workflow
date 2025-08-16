'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  Filter,
  RefreshCw,
  ExternalLink,
  Play,
  Send,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import PublisherOrderStatusActions from './PublisherOrderStatusActions';

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalEarnings: number;
}

interface PublisherOrder {
  id: string;
  orderId: string;
  clientName: string;
  targetPageUrl?: string;
  anchorText?: string;
  domain?: string;
  publisherStatus: string;
  publisherPrice?: number;
  platformFee?: number;
  netEarnings?: number;
  notifiedAt?: string;
  acceptedAt?: string;
  submittedAt?: string;
  earnings?: {
    id: string;
    amount: number;
    status: string;
    paidAt?: string;
  };
  offeringType?: string;
  turnaroundDays?: number;
  overallStatus: string;
  createdAt: string;
}

interface OrdersResponse {
  orders: PublisherOrder[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: OrderStats;
}

interface PublisherOrdersListProps {
  publisherId: string;
}

export default function PublisherOrdersList({ publisherId }: PublisherOrdersListProps) {
  const [orders, setOrders] = useState<PublisherOrder[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PublisherOrder | null>(null);
  const [submissionData, setSubmissionData] = useState({
    publishedUrl: '',
    notes: ''
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/publisher/orders?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data: OrdersResponse = await response.json();
      setOrders(data.orders);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      notified: { label: 'Notified', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Play },
      submitted: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-800', icon: Send },
      completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const handleOrderAction = async (orderId: string, action: string, data?: any) => {
    try {
      const response = await fetch('/api/publisher/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineItemId: orderId,
          action,
          data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order');
      }

      // Refresh orders
      await fetchOrders();
      
      // Close modal if open
      setSubmitModalOpen(false);
      setSelectedOrder(null);
      setSubmissionData({ publishedUrl: '', notes: '' });
    } catch (error) {
      console.error('Error updating order:', error);
      setError(error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  const openSubmissionModal = (order: PublisherOrder) => {
    setSelectedOrder(order);
    setSubmitModalOpen(true);
  };

  const handleSubmission = async () => {
    if (!selectedOrder || !submissionData.publishedUrl.trim()) {
      setError('Published URL is required');
      return;
    }

    await handleOrderAction(selectedOrder.id, 'submit', submissionData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-lg font-semibold text-gray-900">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Play className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">{stats.inProgressOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">{stats.completedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Earnings</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="notified">Notified</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <button
            onClick={fetchOrders}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-500">
              {statusFilter !== 'all' 
                ? `No orders with status "${statusFilter}" found.`
                : 'No orders have been assigned to you yet.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        Order #{order.orderId.slice(-8)}
                      </h3>
                      {getStatusBadge(order.publisherStatus)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <p><span className="font-medium">Client:</span> {order.clientName}</p>
                        <p><span className="font-medium">Domain:</span> {order.domain || 'N/A'}</p>
                      </div>
                      
                      {order.targetPageUrl && (
                        <div>
                          <p><span className="font-medium">Target:</span></p>
                          <a 
                            href={order.targetPageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            <span className="truncate max-w-xs">{order.targetPageUrl}</span>
                            <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                      
                      {order.anchorText && (
                        <div>
                          <p><span className="font-medium">Anchor Text:</span> {order.anchorText}</p>
                        </div>
                      )}
                    </div>

                    {order.publisherPrice && (
                      <div className="mt-3 flex items-center space-x-6 text-sm">
                        <span className="text-gray-600">
                          <span className="font-medium">Gross:</span> {formatCurrency(order.publisherPrice)}
                        </span>
                        {order.platformFee && (
                          <span className="text-gray-600">
                            <span className="font-medium">Platform Fee:</span> {formatCurrency(order.platformFee)}
                          </span>
                        )}
                        {order.netEarnings && (
                          <span className="text-green-600 font-medium">
                            Net: {formatCurrency(order.netEarnings)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    {order.publisherStatus === 'pending' || order.publisherStatus === 'notified' ? (
                      <>
                        <button
                          onClick={() => handleOrderAction(order.id, 'accept')}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleOrderAction(order.id, 'reject', { reason: 'Not interested' })}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    ) : order.publisherStatus === 'accepted' ? (
                      <button
                        onClick={() => handleOrderAction(order.id, 'start')}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Start Work
                      </button>
                    ) : (order.publisherStatus === 'in_progress' || order.publisherStatus === 'accepted') ? (
                      <button
                        onClick={() => openSubmissionModal(order)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                      >
                        Submit Work
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Dates */}
                <div className="mt-4 flex items-center space-x-6 text-xs text-gray-500">
                  <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                  {order.acceptedAt && (
                    <span>Accepted: {new Date(order.acceptedAt).toLocaleDateString()}</span>
                  )}
                  {order.submittedAt && (
                    <span>Submitted: {new Date(order.submittedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {submitModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Submit Work for Order #{selectedOrder.orderId.slice(-8)}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Published URL *
                </label>
                <input
                  type="url"
                  value={submissionData.publishedUrl}
                  onChange={(e) => setSubmissionData({ ...submissionData, publishedUrl: e.target.value })}
                  placeholder="https://example.com/published-article"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={submissionData.notes}
                  onChange={(e) => setSubmissionData({ ...submissionData, notes: e.target.value })}
                  placeholder="Any additional notes about the submission..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setSubmitModalOpen(false);
                  setSelectedOrder(null);
                  setSubmissionData({ publishedUrl: '', notes: '' });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmission}
                disabled={!submissionData.publishedUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Work
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}