'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, ChevronDown, ChevronRight, Eye, Copy, Check, 
  DollarSign, Calendar, Building, Users, ShoppingCart,
  TrendingUp, Clock, CheckCircle, AlertCircle, FileText,
  CreditCard, Activity, Edit, MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import { AuthSession } from '@/lib/types/auth';
import { format } from 'date-fns';

interface OrderGroup {
  id: string;
  clientId: string;
  clientName: string;
  clientWebsite?: string;
  linkCount: number;
  targetPages: string[];
  bulkAnalysisProjectId?: string;
  groupStatus: string;
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

interface Order {
  id: string;
  orderNumber?: string;
  accountId?: string;
  account?: Account;
  state?: string;
  status: string;
  totalLinks?: number;
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
  shareToken?: string;
  shareExpiresAt?: string;
  approvedAt?: string;
  invoicedAt?: string;
  paidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdBy: string;
  assignedTo?: string;
  internalNotes?: string;
  accountNotes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  orderGroups?: OrderGroup[];
  itemCount?: number;
  clientNames?: string[];
  totalWorkflows?: number;
  completedWorkflows?: number;
  workflowCompletionPercentage?: number;
  lineItems?: Array<{
    id: string;
    status: string;
    clientName?: string;
  }>;
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (cents: number) => string;
  isInternal?: boolean;
}

export function OrdersTableWidescreen({ 
  orders, 
  loading, 
  onRefresh, 
  getStatusColor, 
  formatCurrency,
  isInternal = false
}: OrdersTableProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    const currentSession = AuthService.getSession();
    setSession(currentSession);
  }, []);

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Draft',
      'pending_confirmation': 'Pending Confirmation',
      'confirmed': 'Confirmed',
      'analyzing': 'Finding Sites',
      'sites_ready': 'Sites Ready',
      'client_reviewing': 'Client Reviewing',
      'client_approved': 'Client Approved',
      'pending_payment': 'Pending Payment',
      'paid': 'Paid',
      'fulfilling': 'In Fulfillment',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusLabels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'pending_confirmation': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'analyzing': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'sites_ready': return <Eye className="w-4 h-4" />;
      case 'client_reviewing': return <Eye className="w-4 h-4" />;
      case 'client_approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending_payment': return <CreditCard className="w-4 h-4" />;
      case 'paid': return <DollarSign className="w-4 h-4" />;
      case 'fulfilling': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const toggleOrderExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const copyShareLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/share/order/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-200';
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-orange-500';
    if (percentage < 75) return 'bg-yellow-500';
    if (percentage < 100) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPriorityBadge = (order: Order) => {
    if (order.rushDelivery) {
      return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium">Rush</span>;
    }
    if (order.state === 'client_reviewing') {
      return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium">Review</span>;
    }
    if (order.status === 'pending_payment') {
      return <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">Payment</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-pulse">Loading orders...</div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-4">
            No orders match your current filters. Try adjusting your search criteria.
          </p>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Desktop Table View - Optimized for wide screens */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Order ID
              </th>
              {isInternal && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Account
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                Clients / Brands
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Value
              </th>
              {isInternal && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Profit
                </th>
              )}
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const hasGroups = order.orderGroups && order.orderGroups.length > 0;
              const totalClients = order.clientNames?.length || order.orderGroups?.length || 0;
              const orderStatus = order.state || order.status;
              const workflowProgress = order.workflowCompletionPercentage || 0;
              
              return (
                <React.Fragment key={order.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50' : ''}`}>
                    {/* Expand Toggle */}
                    <td className="px-4 py-4">
                      {totalClients > 0 && (
                        <button
                          onClick={() => toggleOrderExpanded(order.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                        </button>
                      )}
                    </td>

                    {/* Order ID */}
                    <td className="px-4 py-4">
                      <Link 
                        href={`/orders/${order.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        <span className="font-mono text-sm">
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </span>
                      </Link>
                    </td>

                    {/* Account (Internal Only) */}
                    {isInternal && (
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {order.account?.companyName || order.account?.contactName}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {order.account?.email}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Clients */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {order.clientNames?.slice(0, 3).map((name, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                          >
                            {name}
                          </span>
                        ))}
                        {order.clientNames && order.clientNames.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                            +{order.clientNames.length - 3} more
                          </span>
                        )}
                        {!order.clientNames?.length && totalClients > 0 && (
                          <span className="text-sm text-gray-500">
                            {totalClients} client{totalClients !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Items Count */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {order.totalLinks || order.itemCount || 0}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`${getStatusColor(orderStatus)} p-1 rounded`}>
                          {getStatusIcon(orderStatus)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getStatusLabel(orderStatus)}
                          </div>
                          {order.paidAt && (
                            <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                              <DollarSign className="w-3 h-3" />
                              Paid
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-4">
                      {orderStatus === 'fulfilling' || orderStatus === 'completed' ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Fulfillment</span>
                            <span>{workflowProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${getProgressColor(workflowProgress)}`}
                              style={{ width: `${workflowProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-500">
                          —
                        </div>
                      )}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-4 text-right">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.totalRetail)}
                        </div>
                        {order.discountPercent && parseFloat(order.discountPercent) > 0 && (
                          <div className="text-xs text-green-600">
                            -{order.discountPercent}% off
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Profit (Internal Only) */}
                    {isInternal && (
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(order.profitMargin)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Priority */}
                    <td className="px-4 py-4 text-center">
                      {getPriorityBadge(order)}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600">
                        {format(new Date(order.createdAt), 'MMM d')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(order.createdAt), 'h:mm a')}
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600">
                        {format(new Date(order.updatedAt), 'MMM d')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(order.updatedAt), 'h:mm a')}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Order"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {order.shareToken && (
                          <button
                            onClick={() => copyShareLink(order.shareToken!)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Copy Share Link"
                          >
                            {copiedToken === order.shareToken ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {(orderStatus === 'draft' || orderStatus === 'pending_confirmation') && (
                          <Link
                            href={`/orders/${order.id}/edit`}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Order"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}

                        <button
                          onClick={() => setShowActions(showActions === order.id ? null : order.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && totalClients > 0 && (
                    <tr>
                      <td colSpan={isInternal ? 13 : 11} className="px-8 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Client Breakdown:
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {order.clientNames?.map((clientName, index) => (
                              <div 
                                key={`client-${index}`} 
                                className="bg-white rounded-lg border border-gray-200 p-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {clientName}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Line items for this client
                                    </p>
                                  </div>
                                  <Building className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            ))}
                            
                            {/* Fallback to order groups if no client names */}
                            {!order.clientNames?.length && hasGroups && order.orderGroups?.map((group) => (
                              <div 
                                key={group.id} 
                                className="bg-white rounded-lg border border-gray-200 p-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {group.clientName}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {group.linkCount} links • {group.targetPages.length} pages
                                    </p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    group.groupStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                    group.groupStatus === 'analyzing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {group.groupStatus}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Additional Order Details */}
                          {(order.internalNotes || order.accountNotes) && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              {order.internalNotes && isInternal && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-gray-600">Internal Notes:</span>
                                  <p className="text-sm text-gray-700 mt-1">{order.internalNotes}</p>
                                </div>
                              )}
                              {order.accountNotes && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">Client Notes:</span>
                                  <p className="text-sm text-gray-700 mt-1">{order.accountNotes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{orders.length}</span> orders
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total Value:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(orders.reduce((sum, order) => sum + order.totalRetail, 0))}
              </span>
            </div>
            {isInternal && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Total Profit:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(orders.reduce((sum, order) => sum + order.profitMargin, 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}