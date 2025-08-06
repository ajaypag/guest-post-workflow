'use client';

import React from 'react';
import { Globe, CheckCircle, Clock, XCircle, AlertCircle, ExternalLink, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface OrderDetailsTableProps {
  order: any;
  orderGroups: any[];
  siteSubmissions: Record<string, any[]>;
  userType: 'internal' | 'account';
}

export default function OrderDetailsTable({ 
  order, 
  orderGroups = [], 
  siteSubmissions = {},
  userType
}: OrderDetailsTableProps) {
  
  // Determine which columns to show based on order state/status
  const getVisibleColumns = () => {
    const columns = ['client', 'targetPage', 'anchorText'];
    
    // Progressive disclosure of columns based on order state
    if (order.state === 'analyzing' || order.state === 'finding_sites') {
      columns.push('status');
    }
    
    if (order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing') {
      columns.push('suggestedSite', 'siteMetrics', 'price', 'status');
    }
    
    if (order.state === 'payment_pending' || order.state === 'payment_received' || order.state === 'workflows_generated') {
      columns.push('approvedSite', 'siteMetrics', 'finalPrice');
    }
    
    if (order.state === 'in_progress') {
      columns.push('approvedSite', 'siteMetrics', 'finalPrice', 'contentStatus');
    }
    
    if (order.status === 'completed') {
      columns.push('approvedSite', 'siteMetrics', 'finalPrice', 'publishedUrl');
    }
    
    return columns;
  };
  
  const visibleColumns = getVisibleColumns();
  
  // Build line items with all their data
  const getLineItems = () => {
    const items: any[] = [];
    
    orderGroups.forEach(group => {
      const groupSubmissions = siteSubmissions[group.id] || [];
      const linkCount = group.linkCount || 1;
      
      // Create a line item for each link in the group
      for (let i = 0; i < linkCount; i++) {
        // Try to find a matching submission for this line item
        // Prioritize approved submissions, then pending, then any
        let matchedSubmission = groupSubmissions.find(s => 
          (s.status === 'client_approved' || s.status === 'approved') && 
          (!s.metadata?.lineItemIndex || s.metadata?.lineItemIndex === i)
        ) || groupSubmissions.find(s => 
          s.status === 'pending' && 
          (!s.metadata?.lineItemIndex || s.metadata?.lineItemIndex === i)
        ) || groupSubmissions[i];
        
        items.push({
          id: `${group.id}-${i}`,
          groupId: group.id,
          client: group.client?.name || 'Unknown Client',
          targetPageUrl: group.targetPages?.[i]?.url || '',
          anchorText: group.anchorTexts?.[i] || '',
          
          // Site submission data (if available)
          submission: matchedSubmission,
          suggestedSite: matchedSubmission?.domain,
          approvedSite: (matchedSubmission?.status === 'client_approved' || matchedSubmission?.status === 'approved') 
            ? matchedSubmission?.domain 
            : null,
          
          // Pricing
          estimatedPrice: group.estimatedPrice ? (group.estimatedPrice / linkCount) : null,
          wholesalePrice: matchedSubmission?.wholesalePrice,
          retailPrice: matchedSubmission?.retailPriceSnapshot || matchedSubmission?.price,
          
          // Status
          submissionStatus: matchedSubmission?.status,
          contentStatus: matchedSubmission?.contentStatus,
          publishedUrl: matchedSubmission?.publishedUrl,
          
          // Metrics - check metadata first, then submission fields
          domainRating: matchedSubmission?.metadata?.domainRating || matchedSubmission?.domainRating,
          traffic: matchedSubmission?.metadata?.traffic || matchedSubmission?.traffic
        });
      }
    });
    
    return items;
  };
  
  const lineItems = getLineItems();
  
  // Calculate totals
  const totalEstimated = lineItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
  const totalFinal = lineItems.reduce((sum, item) => sum + (item.retailPrice || item.estimatedPrice || 0), 0);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
        <p className="text-sm text-gray-600 mt-1">
          {order.state === 'sites_ready' && 'Review and approve recommended sites'}
          {order.state === 'payment_pending' && 'Invoice generated - awaiting payment'}
          {order.state === 'payment_received' && 'Payment received - preparing content creation'}
          {order.state === 'in_progress' && 'Content creation in progress'}
          {order.status === 'completed' && 'Order completed'}
          {!['sites_ready', 'payment_pending', 'payment_received', 'in_progress'].includes(order.state) && 
           order.status !== 'completed' && 'Processing your order'}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {visibleColumns.includes('client') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client / Target Page
                </th>
              )}
              {visibleColumns.includes('anchorText') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anchor Text
                </th>
              )}
              {visibleColumns.includes('suggestedSite') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suggested Site
                </th>
              )}
              {visibleColumns.includes('approvedSite') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest Post Site
                </th>
              )}
              {visibleColumns.includes('siteMetrics') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
              )}
              {visibleColumns.includes('price') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
              )}
              {visibleColumns.includes('finalPrice') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
              )}
              {visibleColumns.includes('status') && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              )}
              {visibleColumns.includes('contentStatus') && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
              )}
              {visibleColumns.includes('publishedUrl') && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lineItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {/* Client & Target Page */}
                {visibleColumns.includes('client') && (
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.client}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {item.targetPageUrl || 'No target page selected'}
                      </div>
                    </div>
                  </td>
                )}
                
                {/* Anchor Text */}
                {visibleColumns.includes('anchorText') && (
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.anchorText || '-'}
                  </td>
                )}
                
                {/* Suggested Site (during review) */}
                {visibleColumns.includes('suggestedSite') && !visibleColumns.includes('approvedSite') && (
                  <td className="px-6 py-4">
                    {item.suggestedSite ? (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {typeof item.suggestedSite === 'string' 
                            ? item.suggestedSite 
                            : item.suggestedSite?.domain || 'Unknown'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Finding sites...</span>
                    )}
                  </td>
                )}
                
                {/* Approved Site (after approval) */}
                {visibleColumns.includes('approvedSite') && (
                  <td className="px-6 py-4">
                    {item.approvedSite ? (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {typeof item.approvedSite === 'string' 
                            ? item.approvedSite 
                            : item.approvedSite?.domain || 'Unknown'}
                        </span>
                      </div>
                    ) : item.suggestedSite ? (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {typeof item.suggestedSite === 'string' 
                            ? item.suggestedSite 
                            : item.suggestedSite?.domain || 'Pending approval'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">-</span>
                    )}
                  </td>
                )}
                
                {/* Site Metrics */}
                {visibleColumns.includes('siteMetrics') && (
                  <td className="px-6 py-4">
                    {(item.domainRating || item.traffic) ? (
                      <div className="text-xs text-gray-600 space-y-1">
                        {item.domainRating && <div>DR: {item.domainRating}</div>}
                        {item.traffic && <div>Traffic: {item.traffic.toLocaleString()}</div>}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}
                
                {/* Price (during review) */}
                {visibleColumns.includes('price') && !visibleColumns.includes('finalPrice') && (
                  <td className="px-6 py-4 text-right">
                    {item.retailPrice ? (
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.retailPrice)}
                      </span>
                    ) : item.estimatedPrice ? (
                      <div>
                        <span className="text-sm text-gray-500">
                          ~{formatCurrency(item.estimatedPrice)}
                        </span>
                        <div className="text-xs text-gray-400">Estimated</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">TBD</span>
                    )}
                  </td>
                )}
                
                {/* Final Price (after approval) */}
                {visibleColumns.includes('finalPrice') && (
                  <td className="px-6 py-4 text-right">
                    {item.retailPrice ? (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.retailPrice)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}
                
                {/* Status */}
                {visibleColumns.includes('status') && (
                  <td className="px-6 py-4 text-center">
                    {item.submissionStatus === 'client_approved' || item.submissionStatus === 'approved' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </span>
                    ) : item.submissionStatus === 'client_rejected' || item.submissionStatus === 'rejected' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </span>
                    ) : item.submissionStatus === 'pending' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Review
                      </span>
                    ) : order.state === 'finding_sites' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Finding Sites
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}
                
                {/* Content Status */}
                {visibleColumns.includes('contentStatus') && (
                  <td className="px-6 py-4 text-center">
                    {item.contentStatus === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </span>
                    ) : item.contentStatus === 'in_progress' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Writing
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Queued
                      </span>
                    )}
                  </td>
                )}
                
                {/* Published URL */}
                {visibleColumns.includes('publishedUrl') && (
                  <td className="px-6 py-4 text-center">
                    {item.publishedUrl ? (
                      <a
                        href={item.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-green-600 hover:text-green-800"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Live
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td 
                colSpan={visibleColumns.length - 1} 
                className="px-6 py-4 text-right text-sm font-medium text-gray-900"
              >
                Total Investment
              </td>
              <td className="px-6 py-4 text-right">
                <div className="text-sm font-bold text-gray-900">
                  {order.state === 'payment_received' || order.state === 'payment_pending' || 
                   order.state === 'workflows_generated' || order.state === 'in_progress' || 
                   order.status === 'completed' ? (
                    formatCurrency((order as any).invoiceData?.total || (order as any).totalRetail || totalFinal)
                  ) : totalFinal > 0 ? (
                    <>
                      {formatCurrency(totalFinal)}
                      {totalEstimated > 0 && totalEstimated !== totalFinal && (
                        <div className="text-xs text-gray-500">Est: {formatCurrency(totalEstimated)}</div>
                      )}
                    </>
                  ) : totalEstimated > 0 ? (
                    <>
                      ~{formatCurrency(totalEstimated)}
                      <div className="text-xs text-gray-500">Estimated</div>
                    </>
                  ) : (
                    <span className="text-gray-500 italic">To be determined</span>
                  )}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}