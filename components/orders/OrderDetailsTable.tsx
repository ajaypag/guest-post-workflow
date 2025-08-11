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
  
  // Early return if no order
  if (!order) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="text-gray-500">No order data available</p>
      </div>
    );
  }
  
  // Determine which columns to show based on order state/status
  const getVisibleColumns = () => {
    const columns = ['client', 'targetPage', 'anchorText'];
    
    // Handle edge cases first
    if (!order.state && !order.status) {
      return columns; // Minimal display for unknown state
    }
    
    // Map order status and state to determine what to show
    // Status values: draft, pending_confirmation, confirmed, paid, completed, cancelled
    // State values: configuring, analyzing, sites_ready, 
    //               client_reviewing, payment_pending, payment_received, workflows_generated, in_progress
    
    // Early states - just show basic info
    if (order.status === 'draft' || order.state === 'configuring') {
      columns.push('status');
      return columns;
    }
    
    // Analysis phase - show progress
    if (order.state === 'analyzing' || order.status === 'pending_confirmation') {
      // Only show status column if we have meaningful status information
      if (order.status && order.status !== 'pending_confirmation') {
        columns.push('status');
      }
      return columns;
    }
    
    // Review phase - show suggestions and pricing
    if (order.state === 'sites_ready' || order.state === 'client_reviewing') {
      columns.push('suggestedSite', 'siteMetrics', 'price', 'status');
      return columns;
    }
    
    // Payment and post-payment phases - show approved sites
    if (order.state === 'payment_pending' || order.state === 'payment_received' || 
        order.state === 'workflows_generated' || order.status === 'paid') {
      columns.push('approvedSite', 'siteMetrics', 'finalPrice');
      return columns;
    }
    
    // Content creation phase
    if (order.state === 'in_progress') {
      columns.push('approvedSite', 'siteMetrics', 'finalPrice', 'contentStatus');
      return columns;
    }
    
    // Completed
    if (order.status === 'completed') {
      columns.push('approvedSite', 'siteMetrics', 'finalPrice', 'publishedUrl');
      return columns;
    }
    
    // Cancelled
    if (order.status === 'cancelled') {
      columns.push('status');
      return columns;
    }
    
    // Default fallback - show status
    columns.push('status');
    return columns;
  };
  
  const visibleColumns = getVisibleColumns();
  
  // Build line items with all their data
  const getLineItems = () => {
    const items: any[] = [];
    
    // Handle empty order groups
    if (!orderGroups || orderGroups.length === 0) {
      return items;
    }
    
    orderGroups.forEach(group => {
      if (!group || !group.id) return; // Skip invalid groups
      
      const groupSubmissions = siteSubmissions?.[group.id] || [];
      const linkCount = Math.max(1, group.linkCount || 1); // Ensure at least 1
      
      // Group target pages to track how many links point to each URL
      const targetPageCounts: Record<string, number> = {};
      const targetPageIndices: Record<string, number> = {};
      
      // Create a line item for each link in the group
      for (let i = 0; i < linkCount; i++) {
        // Get the target page URL for this specific link
        const targetPageUrl = Array.isArray(group.targetPages) && group.targetPages[i] ? 
          (typeof group.targetPages[i] === 'string' ? group.targetPages[i] : group.targetPages[i].url) : '';
        
        // Track how many times we've seen this target URL (for multiple links to same target)
        if (!targetPageCounts[targetPageUrl]) {
          targetPageCounts[targetPageUrl] = 0;
          targetPageIndices[targetPageUrl] = 0;
        }
        const targetPageIndex = targetPageIndices[targetPageUrl];
        targetPageIndices[targetPageUrl]++;
        
        // Find submissions that are specifically assigned to THIS target URL
        // This is critical - submissions are assigned to specific target pages, not just any slot
        const matchingSubmissions = groupSubmissions.filter(sub => {
          const submissionTargetUrl = sub.targetPageUrl || sub.metadata?.targetPageUrl;
          return submissionTargetUrl === targetPageUrl;
        });
        
        // Sort submissions by pool and rank to handle multiple primaries
        const primarySubmissions = matchingSubmissions
          .filter(sub => sub.selectionPool === 'primary')
          .sort((a, b) => (a.poolRank || 1) - (b.poolRank || 1));
        
        const approvedSubmissions = matchingSubmissions
          .filter(sub => sub.status === 'client_approved' || sub.status === 'approved')
          .sort((a, b) => (a.poolRank || 1) - (b.poolRank || 1));
        
        // For multiple links to same target, use index to get different primary submissions
        // This is the KEY: primarySubmissions[targetPageIndex] gets the Nth primary for the Nth link
        let matchedSubmission = 
          // First try approved submissions (using index for multiple)
          (approvedSubmissions[targetPageIndex] || approvedSubmissions[0]) ||
          // Then try primary pool submissions (using index for multiple)
          primarySubmissions[targetPageIndex] ||
          // Then any pending submission
          matchingSubmissions.find(s => s.status === 'pending') ||
          // Finally any matching submission
          matchingSubmissions[0] || null;
        
        items.push({
          id: `${group.id}-${i}`,
          groupId: group.id,
          client: group.client?.name || group.clientName || 'Unknown Client',
          targetPageUrl: targetPageUrl,
          anchorText: Array.isArray(group.anchorTexts) ? 
            (group.anchorTexts[i] || '') : '',
          
          // Site submission data (if available)
          submission: matchedSubmission,
          // Safely handle domain as either string or object
          suggestedSite: matchedSubmission ? 
            (typeof matchedSubmission.domain === 'string' ? 
              matchedSubmission.domain : 
              matchedSubmission.domain?.domain || null) : null,
          approvedSite: (matchedSubmission?.status === 'client_approved' || matchedSubmission?.status === 'approved') 
            ? (typeof matchedSubmission.domain === 'string' ? 
                matchedSubmission.domain : 
                matchedSubmission.domain?.domain || null)
            : null,
          
          // Pricing - use snapshots first, then regular price, then estimate
          estimatedPrice: group.estimatedPrice && linkCount > 0 ? 
            Math.round(group.estimatedPrice / linkCount) : null,
          wholesalePrice: matchedSubmission?.wholesalePriceSnapshot || 
                         matchedSubmission?.wholesalePrice || null,
          retailPrice: matchedSubmission?.retailPriceSnapshot || 
                      matchedSubmission?.price || null,
          
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
  
  // Calculate totals - be more careful with pricing
  const totalEstimated = lineItems.reduce((sum, item) => {
    return sum + (item.estimatedPrice || 0);
  }, 0);
  
  const totalFinal = lineItems.reduce((sum, item) => {
    // Only count approved items for final total
    if (item.submissionStatus === 'client_approved' || item.submissionStatus === 'approved') {
      // Use retail price snapshot if available
      if (item.retailPrice && item.retailPrice > 0) {
        return sum + item.retailPrice;
      }
    }
    // For non-approved items in review phase, still show estimated
    if (!item.submissionStatus || item.submissionStatus === 'pending') {
      if (item.retailPrice && item.retailPrice > 0) {
        return sum + item.retailPrice;
      }
      return sum + (item.estimatedPrice || 0);
    }
    // Don't count rejected items
    return sum;
  }, 0);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
        <p className="text-sm text-gray-600 mt-1">
          {order.status === 'draft' && 'Draft order - not yet confirmed'}
          {order.status === 'pending_confirmation' && 'Awaiting order confirmation'}
          {order.state === 'configuring' && 'Setting up order details'}
          {order.state === 'analyzing' && 'Analyzing target pages and finding sites'}
          {order.state === 'analyzing' && 'Finding suitable guest post sites'}
          {order.state === 'sites_ready' && 'Review and approve recommended sites'}
          {order.state === 'sites_ready' && 'Sites under review'}
          {order.state === 'client_reviewing' && 'Client reviewing site suggestions'}
          {order.state === 'payment_pending' && 'Invoice generated - awaiting payment'}
          {order.state === 'payment_received' && 'Payment received - preparing content creation'}
          {order.state === 'workflows_generated' && 'Content workflows created'}
          {order.state === 'in_progress' && 'Content creation in progress'}
          {order.status === 'completed' && 'Order completed'}
          {order.status === 'cancelled' && 'Order cancelled'}
          {!order.state && !order.status && 'Order status unknown'}
        </p>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {lineItems.length > 0 ? lineItems.map((item, index) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Header with index and status */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs text-gray-500">#{index + 1}</span>
                <h3 className="font-medium text-gray-900">{item.client}</h3>
              </div>
              {visibleColumns.includes('status') && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  item.status === 'approved' ? 'bg-green-100 text-green-800' :
                  item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status}
                </span>
              )}
            </div>
            
            {/* Target Page */}
            {item.targetPageUrl && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-medium">Target Page</label>
                <p className="text-sm text-gray-600 truncate">{item.targetPageUrl}</p>
              </div>
            )}
            
            {/* Anchor Text */}
            {visibleColumns.includes('anchorText') && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-medium">Anchor Text</label>
                <p className="text-sm text-gray-900">{item.anchorText || '-'}</p>
              </div>
            )}
            
            {/* Suggested/Approved Site */}
            {(visibleColumns.includes('suggestedSite') || visibleColumns.includes('approvedSite')) && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-medium">
                  {visibleColumns.includes('approvedSite') ? 'Guest Post Site' : 'Suggested Site'}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {item.approvedSite || item.suggestedSite || 'Finding sites...'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Metrics */}
            {visibleColumns.includes('siteMetrics') && item.siteMetrics && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-medium">Metrics</label>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span>DR: {item.siteMetrics.dr || '-'}</span>
                  <span>Traffic: {item.siteMetrics.traffic ? `${(item.siteMetrics.traffic / 1000).toFixed(0)}k` : '-'}</span>
                </div>
              </div>
            )}
            
            {/* Content Status */}
            {visibleColumns.includes('contentStatus') && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-medium">Content</label>
                <p className="text-sm text-gray-900">{item.contentStatus || 'Not started'}</p>
              </div>
            )}
            
            {/* Published URL */}
            {visibleColumns.includes('publishedUrl') && item.publishedUrl && (
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-medium">Published</label>
                <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" 
                   className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  View Post
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            
            {/* Price */}
            {(visibleColumns.includes('price') || visibleColumns.includes('finalPrice')) && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total Investment</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(item.price || 0)}
                  </span>
                </div>
                {item.wholesalePrice && (
                  <div className="text-xs text-gray-500 text-right mt-1">
                    ${(item.wholesalePrice / 100).toFixed(0)} site + $79 content
                  </div>
                )}
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No line items to display</p>
          </div>
        )}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
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
            {lineItems.length > 0 ? lineItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {/* Client & Target Page */}
                {visibleColumns.includes('client') && (
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.client}</div>
                      {item.targetPageUrl && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.targetPageUrl}
                        </div>
                      )}
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
                        {item.traffic && <div>Traffic: {typeof item.traffic === 'number' ? item.traffic.toLocaleString() : item.traffic}</div>}
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
                    ) : order.state === 'analyzing' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Analyzing
                      </span>
                    ) : order.state === 'analyzing' && !item.submission ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Finding Sites
                      </span>
                    ) : order.status === 'draft' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Draft
                      </span>
                    ) : order.status === 'pending_confirmation' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Confirmation
                      </span>
                    ) : order.status === 'cancelled' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Cancelled
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
            )) : (
              <tr>
                <td colSpan={visibleColumns.length} className="px-6 py-8 text-center text-gray-500">
                  {order.status === 'draft' ? 'No items added to this draft order yet' :
                   order.state === 'configuring' ? 'Order is being configured...' :
                   order.state === 'analyzing' ? 'Analyzing requirements...' :
                   order.state === 'analyzing' ? 'Finding suitable sites...' :
                   'No line items available'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td 
                colSpan={Math.max(1, visibleColumns.length - 1)} 
                className="px-6 py-4 text-right text-sm font-medium text-gray-900"
              >
                Total Investment
              </td>
              <td className="px-6 py-4 text-right">
                <div className="text-sm font-bold text-gray-900">
                  {/* Always use calculated total from line items if we have approved items with prices */}
                  {totalFinal > 0 ? (
                    <>
                      {formatCurrency(totalFinal)}
                      {/* Show invoice total if different (for debugging/transparency) */}
                      {(order.invoiceData?.total && order.invoiceData.total !== totalFinal) && (
                        <div className="text-xs text-gray-500">
                          Invoice: {formatCurrency(order.invoiceData.total)}
                        </div>
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