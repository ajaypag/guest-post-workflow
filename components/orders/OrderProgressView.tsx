'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Globe, LinkIcon, Eye, Users, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import OrderProgressSteps, { getStateDisplay } from './OrderProgressSteps';

interface Client {
  id: string;
  name: string;
  website?: string;
  [key: string]: any;
}

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
}

interface OrderProgressViewProps {
  orderId: string;
  orderStatus: string;
  orderState: string;
  lineItems: LineItem[];
  clients: Client[];
  subtotal: number;
  total: number;
  accountEmail: string;
  accountName: string;
  accountCompany: string;
}

export default function OrderProgressView({
  orderId,
  orderStatus,
  orderState,
  lineItems,
  clients,
  subtotal,
  total,
  accountEmail,
  accountName,
  accountCompany
}: OrderProgressViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const stateDisplay = getStateDisplay(orderStatus, orderState);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh logic would go here
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Group line items by client
  const groupedItems = lineItems.reduce((acc, item) => {
    if (!acc[item.clientId]) {
      acc[item.clientId] = {
        client: clients.find(c => c.id === item.clientId),
        items: []
      };
    }
    acc[item.clientId].items.push(item);
    return acc;
  }, {} as Record<string, { client: Client | undefined; items: LineItem[] }>);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Status Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600">Order placed on {new Date().toLocaleDateString()}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
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
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${stateDisplay.color}`}>
              {stateDisplay.label}
            </span>
          </div>
        </div>
        
        {/* Progress Steps */}
        <OrderProgressSteps orderStatus={orderStatus} orderState={orderState} />
      </div>

      {/* Order Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest Post Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Draft URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analysis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedItems).map(([clientId, { client, items }]) => (
                items.map((item: LineItem, index: number) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {index === 0 && (
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {client?.name || 'Unknown Client'}
                        </div>
                      )}
                      <div className={`text-sm text-gray-600 ${index === 0 ? '' : 'mt-2'}`}>
                        {item.targetPageUrl || 'No target page selected'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.anchorText || '-'}
                    </td>
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
                          View Draft
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
                    <td className="px-6 py-4">
                      {item.bulkAnalysisId ? (
                        <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.price)}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={6} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Account Name</dt>
              <dd className="text-sm font-medium text-gray-900">{accountName}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{accountEmail}</dd>
            </div>
            {accountCompany && (
              <div>
                <dt className="text-sm text-gray-500">Company</dt>
                <dd className="text-sm font-medium text-gray-900">{accountCompany}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {orderState === 'site_review' && (
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center">
                <Users className="h-4 w-4 mr-2" />
                Review Recommended Sites
              </button>
            )}
            {orderState === 'in_progress' && (
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" />
                View Article Drafts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}