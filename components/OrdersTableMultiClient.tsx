'use client';

import React, { useState, useEffect } from 'react';
import { Package, ChevronDown, ChevronRight, Users, Link as LinkIcon, Eye, Copy, Check, Trash2, CheckCircle, Activity } from 'lucide-react';
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
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
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

  const getActionStatus = (order: Order, isInternal: boolean) => {
    // For internal users
    if (isInternal) {
      if (order.status === 'pending_confirmation') {
        return { text: 'Needs Confirmation', color: 'text-red-600', priority: 'high' };
      }
      if (order.status === 'confirmed' && (order.state === 'analyzing' || order.state === 'finding_sites')) {
        return { text: 'Processing', color: 'text-blue-600', priority: 'medium' };
      }
      if (order.status === 'confirmed' && order.state === 'site_review') {
        return { text: 'Ready to Send', color: 'text-yellow-600', priority: 'medium' };
      }
    }
    // For external users  
    else {
      if (order.status === 'draft') {
        return { text: 'Finish Setup', color: 'text-red-600', priority: 'high' };
      }
      if (order.status === 'confirmed' && (order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing')) {
        return { text: 'Review Sites', color: 'text-red-600', priority: 'high' };
      }
      if (order.status === 'confirmed' && order.state === 'payment_pending') {
        return { text: 'Payment Due', color: 'text-red-600', priority: 'high' };
      }
      if (order.status === 'confirmed' && (order.state === 'analyzing' || order.state === 'finding_sites')) {
        return { text: 'In Progress', color: 'text-blue-600', priority: 'low' };
      }
    }
    
    // Default cases
    if (order.status === 'paid' || order.status === 'in_progress') {
      return { text: 'In Progress', color: 'text-blue-600', priority: 'low' };
    }
    if (order.status === 'completed') {
      return { text: 'Complete', color: 'text-green-600', priority: 'low' };
    }
    
    return { text: 'No Action', color: 'text-gray-500', priority: 'low' };
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

  const getGroupStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-gray-100 text-gray-800',
      'analyzing': 'bg-blue-100 text-blue-800',
      'ready_for_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const hasGroups = order.orderGroups && order.orderGroups.length > 0;
              const totalClients = order.orderGroups?.length || 1;
              const orderStatus = order.state || order.status;
              
              return (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {hasGroups && (
                          <button
                            onClick={() => toggleOrderExpanded(order.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {order.id.slice(0, 8)}...
                          </div>
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
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-sm">{order.account?.contactName || order.account?.companyName || 'Unknown'}</div>
                        {order.account?.companyName && order.account?.contactName && (
                          <div className="text-xs text-gray-500">{order.account.companyName}</div>
                        )}
                        <div className="text-xs text-gray-500">{order.account?.email || 'No email'}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{totalClients}</span>
                        {totalClients === 1 && !hasGroups && (
                          <span className="text-xs text-gray-500 ml-1">(legacy)</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
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

                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const actionStatus = getActionStatus(order, isInternal);
                        return (
                          <div className="flex items-center gap-2">
                            {actionStatus.priority === 'high' && (
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                            {actionStatus.priority === 'medium' && (
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            )}
                            <span className={`text-sm font-medium ${actionStatus.color}`}>
                              {actionStatus.text}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-medium">{formatCurrency(order.totalRetail)}</div>
                      {order.discountAmount > 0 && (
                        <div className="text-xs text-green-600">
                          -{formatCurrency(order.discountAmount)} ({order.discountPercent}%)
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isInternal && order.status === 'pending_confirmation' && (
                          <Link
                            href={`/orders/${order.id}/internal`}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Review & Confirm
                          </Link>
                        )}
                        {isInternal && order.status === 'confirmed' && order.state === 'analyzing' && (
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
                                    onRefresh();
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
                            className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Sites Ready
                          </button>
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
                        <Link href={`/orders/${order.id}`}>
                          <button className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </Link>
                        {isInternal && (
                          <Link href={`/orders/${order.id}/internal`}>
                            <button className="text-purple-600 hover:text-purple-900 text-sm font-medium flex items-center gap-1">
                              <Activity className="h-4 w-4" />
                              Manage
                            </button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded client groups */}
                  {isExpanded && hasGroups && (
                    <tr>
                      <td colSpan={8} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-gray-200">
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-200">
                              {order.orderGroups!.map((group) => (
                                <tr key={group.id} className="hover:bg-gray-100">
                                  <td className="pl-16 pr-6 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <LinkIcon className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {group.clientName}
                                        </div>
                                        {group.clientWebsite && (
                                          <div className="text-xs text-gray-500">{group.clientWebsite}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <span className="text-sm text-gray-600">
                                      {group.linkCount} {group.linkCount === 1 ? 'link' : 'links'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    {group.targetPages && group.targetPages.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {group.targetPages.slice(0, 2).join(', ')}
                                        {group.targetPages.length > 2 && ` +${group.targetPages.length - 2} more`}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGroupStatusColor(group.groupStatus)}`}>
                                      {group.groupStatus.replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    {group.siteSelections && (
                                      <div className="text-xs text-gray-600">
                                        {group.siteSelections.approved}/{group.siteSelections.total} sites selected
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap text-right">
                                    {group.bulkAnalysisProjectId ? (
                                      <Link href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}>
                                        <button className="text-blue-600 hover:text-blue-900 text-xs">
                                          View Analysis
                                        </button>
                                      </Link>
                                    ) : (
                                      <span className="text-xs text-gray-400">No analysis yet</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
    </div>
  );
}