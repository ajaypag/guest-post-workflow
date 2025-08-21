'use client';

import React from 'react';
import { Globe, Link as LinkIcon, Package, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface LineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageUrl?: string;
  anchorText?: string;
  price: number;
  status: string;
  assignedDomain?: string;
  publishedUrl?: string;
}

interface LineItemsDisplayProps {
  lineItems: LineItem[];
  orderStatus: string;
  orderState?: string;
  userType: 'internal' | 'account' | 'publisher';
}

export default function LineItemsDisplay({ 
  lineItems, 
  orderStatus,
  orderState,
  userType
}: LineItemsDisplayProps) {
  
  if (!lineItems || lineItems.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="text-gray-500 text-center">No items in this order yet</p>
      </div>
    );
  }

  // Group line items by client
  const groupedItems = lineItems.reduce((acc, item) => {
    if (!acc[item.clientId]) {
      acc[item.clientId] = {
        clientName: item.clientName,
        items: []
      };
    }
    acc[item.clientId].items.push(item);
    return acc;
  }, {} as Record<string, { clientName: string; items: LineItem[] }>);

  // Calculate totals
  const totalPrice = lineItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalItems = lineItems.length;

  // Determine what to show based on order status/state
  const showSites = orderState === 'sites_ready' || orderState === 'client_reviewing' || 
                    orderState === 'payment_pending' || orderState === 'in_progress' ||
                    orderStatus === 'completed';
  const showPublishedLinks = orderStatus === 'completed';

  return (
    <div className="space-y-6">
      {/* Summary Card for Pending Confirmation */}
      {orderStatus === 'pending_confirmation' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">Order Summary</h3>
              <p className="text-sm text-blue-700 mt-1">
                {totalItems} {totalItems === 1 ? 'link' : 'links'} submitted for {Object.keys(groupedItems).length} {Object.keys(groupedItems).length === 1 ? 'client' : 'clients'}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Your order has been submitted and is awaiting confirmation from our team.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
              <p className="text-sm text-gray-600 mt-1">
                {totalItems} {totalItems === 1 ? 'guest post' : 'guest posts'} requested
              </p>
            </div>
            {userType === 'internal' && totalPrice > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalPrice)}</p>
              </div>
            )}
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
                {showSites && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Site
                  </th>
                )}
                {showPublishedLinks && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published Link
                  </th>
                )}
                {userType === 'internal' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedItems).map(([clientId, group]) => (
                <React.Fragment key={clientId}>
                  {/* Client Header Row */}
                  <tr className="bg-gray-50">
                    <td colSpan={showSites || showPublishedLinks ? (userType === 'internal' ? 6 : 5) : (userType === 'internal' ? 4 : 3)} 
                        className="px-6 py-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{group.clientName}</span>
                        <span className="text-xs text-gray-500">({group.items.length} {group.items.length === 1 ? 'link' : 'links'})</span>
                      </div>
                    </td>
                  </tr>
                  {/* Line Items for this Client */}
                  {group.items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-start gap-2">
                          <LinkIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            {item.targetPageUrl ? (
                              <a 
                                href={item.targetPageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                                title={item.targetPageUrl}
                              >
                                {item.targetPageUrl}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-500 italic">No target page specified</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {item.anchorText || <span className="text-gray-400 italic">Not specified</span>}
                        </span>
                      </td>
                      {showSites && (
                        <td className="px-6 py-4">
                          {item.assignedDomain ? (
                            <span className="text-sm text-gray-900">{item.assignedDomain}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Pending</span>
                          )}
                        </td>
                      )}
                      {showPublishedLinks && (
                        <td className="px-6 py-4">
                          {item.publishedUrl ? (
                            <a 
                              href={item.publishedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            >
                              View <LinkIcon className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not published</span>
                          )}
                        </td>
                      )}
                      {userType === 'internal' && (
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {item.price > 0 ? formatCurrency(item.price) : '-'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        {item.status === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                            <Clock className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {item.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Complete
                          </span>
                        )}
                        {item.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Cancelled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with Totals */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </div>
            {userType === 'internal' && totalPrice > 0 && (
              <div className="text-sm font-semibold text-gray-900">
                Total: {formatCurrency(totalPrice)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}