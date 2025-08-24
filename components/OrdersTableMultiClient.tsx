'use client';

import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, Copy, Check, Trash2, CheckCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import { AuthSession } from '@/lib/types/auth';

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
  accountId?: string;
  account?: Account;
  state?: string;
  status: string; // For backwards compatibility
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
  itemCount?: number; // For backwards compatibility
  clientNames?: string[]; // New field for client/brand names from line items
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (cents: number) => string;
  isInternal?: boolean;
}

export function OrdersTableMultiClient({ 
  orders, 
  loading, 
  onRefresh, 
  getStatusColor, 
  formatCurrency,
  isInternal = false
}: OrdersTableProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const currentSession = AuthService.getSession();
    setSession(currentSession);
  }, []);

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Draft',
      'pending_confirmation': 'Pending Confirmation',
      'confirmed': 'Confirmed',
      'pending_review': 'Pending Review',
      'pending_approval': 'Pending Approval',
      'approved': 'Approved',
      'invoiced': 'Invoiced',
      'paid': 'Paid',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'legacy': 'Legacy Order'
    };
    return statusLabels[status] || status;
  };

  const renderActionButtons = (order: Order, isInternal: boolean) => {
    // For internal users
    if (isInternal) {
      if (order.status === 'pending_confirmation') {
        return (
          <Link
            href={`/orders/${order.id}/internal`}
            className="inline-flex items-center px-3 py-1.5 border border-red-600 text-red-600 text-xs font-medium rounded hover:bg-red-50"
          >
            Confirm Order
          </Link>
        );
      }
      if (order.status === 'confirmed' && order.state === 'sites_ready') {
        return (
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-yellow-600 text-yellow-700 text-xs font-medium rounded hover:bg-yellow-50"
          >
            Send to Client
          </Link>
        );
      }
      if (order.status === 'confirmed' && order.state === 'analyzing') {
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-md">
            Processing...
          </span>
        );
      }
    }
    // For external users  
    else {
      if (order.status === 'draft') {
        return (
          <Link
            href={`/orders/${order.id}/edit`}
            className="inline-flex items-center px-3 py-1.5 border border-red-600 text-red-600 text-xs font-medium rounded hover:bg-red-50"
          >
            Complete Setup
          </Link>
        );
      }
      if (order.status === 'confirmed' && (order.state === 'sites_ready' || order.state === 'client_reviewing')) {
        return (
          <Link
            href={`/orders/${order.id}/review`}
            className="inline-flex items-center px-3 py-1.5 border border-orange-600 text-orange-600 text-xs font-medium rounded hover:bg-orange-50"
          >
            Review Sites
          </Link>
        );
      }
      if (order.status === 'confirmed' && order.state === 'payment_pending') {
        return (
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-green-600 text-green-600 text-xs font-medium rounded hover:bg-green-50"
          >
            Pay Invoice
          </Link>
        );
      }
      if (order.status === 'invoiced') {
        return (
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-green-600 text-green-600 text-xs font-medium rounded hover:bg-green-50"
          >
            Pay Invoice
          </Link>
        );
      }
      if (order.status === 'confirmed' && order.state === 'analyzing') {
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-md">
            In Progress
          </span>
        );
      }
    }
    
    // Default cases
    if (order.status === 'paid' || order.status === 'in_progress') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-md">
          In Progress
        </span>
      );
    }
    if (order.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs text-green-600 bg-green-50 rounded-md">
          Complete
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded-md">
        No Action
      </span>
    );
  };


  const copyShareLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/share/order/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full">
      {/* Mobile Cards View */}
      <div className="md:hidden">
        <div className="divide-y divide-gray-200">
          {orders.map((order) => {
            const hasGroups = order.orderGroups && order.orderGroups.length > 0;
            const totalClients = order.orderGroups?.length || 1;
            const orderStatus = order.state || order.status;
            
            return (
              <div key={order.id} className="p-4">
                {/* Main Order Card */}
                <div className="space-y-3">
                  {/* Header with Order ID and Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <Link 
                        href={`/orders/${order.id}`}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      getStatusColor(order.status)
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Account</p>
                    <p className="text-sm font-medium text-gray-900">
                      {order.account?.contactName || order.account?.companyName || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {order.account?.email}
                    </p>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Clients</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {order.clientNames && order.clientNames.length > 0 
                          ? order.clientNames.length 
                          : hasGroups 
                            ? totalClients
                            : '—'}
                      </p>
                      {!order.clientNames?.length && !hasGroups && (
                        <p className="text-xs text-gray-500">No client data</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Items</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {order.orderGroups?.reduce((sum, g) => sum + (g.linkCount || 0), 0) || order.itemCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Value</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency((order.totalRetail || 0) / 100)}
                      </p>
                    </div>
                  </div>

                  {/* Next Step */}
                  {orderStatus && orderStatus !== order.status && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Action:</span>
                      <span className="text-xs font-medium text-blue-600">
                        {orderStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}


                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 text-center min-h-[44px] flex items-center justify-center"
                    >
                      View Order
                    </Link>
                    {order.status === 'confirmed' && (
                      <Link
                        href={`/orders/${order.id}/review`}
                        className="flex-1 px-3 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 text-center min-h-[44px] flex items-center justify-center"
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto min-w-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              {isInternal && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clients
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Step
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value / Profit
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const hasGroups = order.orderGroups && order.orderGroups.length > 0;
              const totalClients = order.orderGroups?.length || 1;
              const orderStatus = order.state || order.status;
              
              return (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <Link 
                            href={`/orders/${order.id}`}
                            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            #{order.id.slice(0, 8)}...
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {order.totalLinks || order.itemCount || 0} links
                            </span>
                            {order.includesClientReview && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Review
                              </span>
                            )}
                            {order.rushDelivery && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Rush
                              </span>
                            )}
                          </div>
                      </div>
                    </td>

                    {isInternal && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-sm">{order.account?.contactName || order.account?.companyName || 'Unknown'}</div>
                          {order.account?.companyName && order.account?.contactName && (
                            <div className="text-xs text-gray-500">{order.account.companyName}</div>
                          )}
                          <div className="text-xs text-gray-500">{order.account?.email || 'No email'}</div>
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-col">
                          {order.clientNames && order.clientNames.length > 0 ? (
                            <>
                              <span className="text-sm font-medium">
                                {order.clientNames.slice(0, 2).join(', ')}
                                {order.clientNames.length > 2 && (
                                  <span className="text-gray-500"> +{order.clientNames.length - 2} more</span>
                                )}
                              </span>
                              <span className="text-xs text-gray-500">
                                {order.clientNames.length} client{order.clientNames.length !== 1 ? 's' : ''}
                              </span>
                            </>
                          ) : hasGroups ? (
                            <>
                              <span className="text-sm font-medium">{totalClients}</span>
                              <span className="text-xs text-gray-500">(legacy)</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-gray-400">—</span>
                              <span className="text-xs text-gray-500">No client data</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {order.orderGroups?.reduce((sum, g) => sum + (g.linkCount || 0), 0) || order.itemCount || order.totalLinks || 0}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {order.state && order.state !== order.status && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">State:</span>
                            <span className="text-xs font-medium text-gray-700">{order.state}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderActionButtons(order, isInternal)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="font-medium">{formatCurrency(order.totalRetail)}</div>
                      {order.profitMargin > 0 && (
                        <div className="text-xs text-green-600">
                          +{formatCurrency(order.profitMargin)} profit
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(order.updatedAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View icon */}
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-gray-500 hover:text-gray-700"
                          title="View Order"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        
                        {/* Manage button for internal users */}
                        {isInternal && (
                          <Link
                            href={`/orders/${order.id}/internal`}
                            className="inline-flex items-center px-2.5 py-1 border border-purple-600 text-purple-600 text-xs rounded hover:bg-purple-50"
                          >
                            <Activity className="h-3 w-3 mr-1" />
                            Manage
                          </Link>
                        )}
                        {isInternal && order.shareToken && (
                          <button
                            onClick={() => copyShareLink(order.shareToken!)}
                            className="text-gray-500 hover:text-gray-700"
                            title="Copy share link"
                          >
                            {copiedToken === order.shareToken ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {/* Delete button - draft orders for all users, any order for admins */}
                        {(order.status === 'draft' || (isInternal && session?.role === 'admin')) && (
                          <button
                            onClick={async () => {
                              const isAdmin = isInternal && session?.role === 'admin';
                              const confirmMessage = isAdmin && order.status !== 'draft'
                                ? `⚠️ ADMIN ACTION: Are you sure you want to delete this ${order.status} order?\n\nOrder ID: ${order.id}\nAccount: ${order.account?.email || 'Unknown'}\nValue: ${formatCurrency(order.totalRetail)}\n\nThis will permanently delete the order and all related data. This action cannot be undone.`
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
                                    onRefresh();
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
                            className={order.status !== 'draft' && isInternal && session?.role === 'admin' ? "text-red-700 hover:text-red-900" : "text-red-600 hover:text-red-800"}
                            title={order.status !== 'draft' && isInternal && session?.role === 'admin' ? "Admin delete order" : "Delete draft order"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}