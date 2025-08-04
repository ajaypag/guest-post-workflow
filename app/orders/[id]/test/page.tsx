'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/formatting';
import { Globe, LinkIcon, ExternalLink, Eye, ArrowLeft } from 'lucide-react';

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
  createdAt: string;
  updatedAt: string;
  orderGroups?: OrderGroup[];
}

export default function OrderTestPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Order not found</div>
      </div>
    );
  }

  // Group line items by client
  const groupedLineItems = lineItems.reduce((acc, item) => {
    if (!acc[item.clientId]) {
      acc[item.clientId] = {
        clientName: item.clientName,
        items: [],
        totalPrice: 0
      };
    }
    acc[item.clientId].items.push(item);
    acc[item.clientId].totalPrice += item.price;
    return acc;
  }, {} as Record<string, { clientName: string; items: LineItem[]; totalPrice: number }>);

  // Calculate dynamic column count for progressive disclosure
  const getColumnCount = () => {
    let count = 3; // Base columns: Client/Target, Anchor, Price
    if (order.state === 'site_review' || order.state === 'in_progress' || order.status === 'completed') count++;
    if (order.state === 'in_progress' || order.status === 'completed') count++;
    if (order.status === 'completed') count++;
    if (order.status === 'confirmed' && order.state === 'analyzing') count++;
    return count;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href={`/orders/${params.id}`} className="text-blue-600 hover:underline flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Order
          </Link>
          <h1 className="text-2xl font-bold">Order Test Page - Table with Proper Grouping</h1>
          <p className="text-gray-600 mt-2">Order #{order.id.slice(0, 8)} | Status: {order.status} | State: {order.state || 'N/A'}</p>
        </div>

        {/* Order Details Table with Proper Client Grouping */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Order Details (Grouped by Client)</h2>
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
                  {/* Progressive disclosure - only show additional columns when relevant */}
                  {(order.state === 'site_review' || order.state === 'in_progress' || order.status === 'completed') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest Post Site
                    </th>
                  )}
                  {(order.state === 'in_progress' || order.status === 'completed') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Draft URL
                    </th>
                  )}
                  {order.status === 'completed' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Published URL
                    </th>
                  )}
                  {order.status === 'confirmed' && order.state === 'analyzing' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analysis
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Group line items by client */}
                {Object.entries(groupedLineItems).map(([clientId, { clientName, items, totalPrice }]) => (
                  <>
                    {/* Client group header row */}
                    <tr key={`${clientId}-header`} className="bg-gray-50">
                      <td colSpan={getColumnCount()} className="px-6 py-3">
                        <div className="text-sm font-semibold text-gray-900">{clientName}</div>
                        <div className="text-xs text-gray-500 mt-1">{items.length} link{items.length > 1 ? 's' : ''}</div>
                      </td>
                    </tr>
                    {/* Line items for this client */}
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 pl-12">
                          <div className="text-sm text-gray-600">
                            {item.targetPageUrl || 'No target page selected'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.anchorText || '-'}
                        </td>
                        {(order.state === 'site_review' || order.state === 'in_progress' || order.status === 'completed') && (
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
                        )}
                        {(order.state === 'in_progress' || order.status === 'completed') && (
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
                        )}
                        {order.status === 'completed' && (
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
                        )}
                        {order.status === 'confirmed' && order.state === 'analyzing' && (
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
                        )}
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {/* Only show price on the first item in the group */}
                          {index === 0 ? formatCurrency(totalPrice) : ''}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={getColumnCount() - 1} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
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

        {/* Debug Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Order Status:</strong> {order.status}</p>
            <p><strong>Order State:</strong> {order.state || 'N/A'}</p>
            <p><strong>Total Line Items:</strong> {lineItems.length}</p>
            <p><strong>Unique Clients:</strong> {Object.keys(groupedLineItems).length}</p>
            <p><strong>Column Count:</strong> {getColumnCount()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}