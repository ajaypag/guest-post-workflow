'use client';

import React from 'react';
import { Package } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  clientId: string;
  accountId?: string;
  accountEmail: string;
  accountName: string;
  accountCompany?: string;
  status: string;
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
  itemCount?: number;
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (cents: number) => string;
}

export function OrdersTable({ 
  orders, 
  loading, 
  onRefresh, 
  getStatusColor, 
  formatCurrency 
}: OrdersTableProps) {

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'draft': 'Draft',
      'pending_approval': 'Pending Approval',
      'approved': 'Approved',
      'invoiced': 'Invoiced',
      'paid': 'Paid',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    return statusLabels[status] || status;
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
                Status
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
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {order.id.slice(0, 8)}...
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {order.itemCount && (
                        <span className="text-xs text-gray-500">
                          {order.itemCount} domains
                        </span>
                      )}
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

                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-sm">{order.accountName}</div>
                    {order.accountCompany && (
                      <div className="text-xs text-gray-500">{order.accountCompany}</div>
                    )}
                    <div className="text-xs text-gray-500">{order.accountEmail}</div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
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
                  <Link href={`/orders/${order.id}/detail`}>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      View
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}