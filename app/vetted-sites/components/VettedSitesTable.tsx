'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StarIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useSelection } from '../hooks/useSelection';
import SelectionSummary from './SelectionSummary';
import QuickOrderModal from './QuickOrderModal';
import AddToOrderModal from './AddToOrderModal';
import ExpandedDomainDetails from './ExpandedDomainDetails';

interface Domain {
  // Basic domain info
  id: string;
  domain: string;
  qualificationStatus: string;
  qualifiedAt: string | null;
  updatedAt: string;
  
  // User curation
  userBookmarked: boolean;
  userHidden: boolean;
  userBookmarkedAt: string | null;
  userHiddenAt: string | null;
  
  // AI Qualification Intelligence - RICH DATA
  overlapStatus: string | null;
  authorityDirect: string | null;
  authorityRelated: string | null;
  topicScope: string | null;
  topicReasoning: string | null;
  evidence: {
    directCount: number;
    directMedianPosition: number | null;
    relatedCount: number;
    relatedMedianPosition: number | null;
  } | null;
  aiQualificationReasoning: string | null;
  keywordCount: number | null;
  notes: string | null;
  hasWorkflow: boolean | null;
  
  // Target URL Matching Intelligence
  suggestedTargetUrl: string | null;
  targetMatchData: any; // JSON data from AI matching
  targetMatchedAt: string | null;
  
  // Vetting context
  targetPages?: Array<{
    id: string;
    url: string;
    keywords: string | null;
    description: string | null;
  }>;
  
  // Data quality indicators
  hasDataForSeoResults: boolean | null;
  dataForSeoResultsCount: number | null;
  wasManuallyQualified: boolean | null;
  wasHumanVerified: boolean | null;
  
  // Project context
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  
  // Website metrics
  websiteId: string | null;
  domainRating: number | null;
  traffic: number | null;
  categories: string[] | null;
  niche: string[] | null;
  websiteType: string[] | null;
  overallQuality: string | null;
  
  // Pricing
  guestPostCost: string | null;
  
  // Publisher performance - RICH DATA
  avgResponseTimeHours: number | null;
  successRatePercentage: number | null;
  totalPostsPublished: number | null;
  lastCampaignDate: string | null;
  internalQualityScore: number | null;
  
  // Availability (calculated)
  activeLineItemsCount: number;
  availabilityStatus: 'available' | 'used';
}

interface VettedSitesTableProps {
  initialData: {
    domains: Domain[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      totalQualified: number;
      available: number;
      used: number;
      bookmarked: number;
      hidden: number;
    };
  };
  initialFilters: any;
  userType: string;
  onDataUpdate?: (data: {
    stats: {
      totalQualified: number;
      available: number;
      used: number;
      bookmarked: number;
      hidden: number;
    };
    total: number;
  }) => void;
}

export default function VettedSitesTable({ initialData, initialFilters, userType, onDataUpdate }: VettedSitesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  console.log('Initial data - totalPages:', initialData.totalPages, 'total:', initialData.total, 'domains:', initialData.domains?.length);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  
  // Use the selection hook
  const {
    selection,
    toggleDomain,
    selectAll,
    clearSelection,
    removeDomain,
    isSelected,
    getSelectedDomains,
    selectedCount,
    totalPrice
  } = useSelection(userType as 'internal' | 'account' | 'publisher');

  // Skip initial fetch since we already have initialData
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Update data when search params change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = new URL('/api/vetted-sites', window.location.origin);
        searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });

        const response = await fetch(url.toString());
        if (response.ok) {
          const newData = await response.json();
          console.log('Fetched data - page:', newData.page, 'totalPages:', newData.totalPages, 'total:', newData.total);
          setData(newData);
          // Update parent component with fresh stats
          onDataUpdate?.({ stats: newData.stats, total: newData.total });
        } else {
          console.error('API error:', response.status);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams.toString()]); // Use toString() to get a stable dependency

  const handleUserAction = async (domainId: string, action: 'bookmark' | 'unbookmark' | 'hide' | 'unhide') => {
    setActionLoading(prev => new Set([...prev, domainId]));
    
    try {
      const response = await fetch(`/api/vetted-sites/${domainId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local data
        setData(prevData => ({
          ...prevData,
          domains: prevData.domains.map(domain => 
            domain.id === domainId 
              ? {
                  ...domain,
                  userBookmarked: result.domain.userBookmarked,
                  userHidden: result.domain.userHidden,
                  userBookmarkedAt: result.domain.userBookmarkedAt,
                  userHiddenAt: result.domain.userHiddenAt,
                }
              : domain
          ),
        }));

        // Update stats
        if (action === 'bookmark' || action === 'unbookmark') {
          setData(prevData => ({
            ...prevData,
            stats: {
              ...prevData.stats,
              bookmarked: action === 'bookmark' 
                ? prevData.stats.bookmarked + 1
                : Math.max(0, prevData.stats.bookmarked - 1),
            },
          }));
        }
        
        if (action === 'hide' || action === 'unhide') {
          setData(prevData => ({
            ...prevData,
            stats: {
              ...prevData.stats,
              hidden: action === 'hide' 
                ? prevData.stats.hidden + 1
                : Math.max(0, prevData.stats.hidden - 1),
            },
          }));
        }
      }
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(domainId);
        return newSet;
      });
    }
  };

  // Selection handlers are now provided by useSelection hook


  const formatTraffic = (traffic: number | null) => {
    if (!traffic) return 'N/A';
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
    return traffic.toString();
  };

  const getQualificationBadge = (status: string) => {
    const statusConfig = {
      high_quality: { label: 'High Quality', className: 'bg-green-100 text-green-800' },
      good_quality: { label: 'Qualified', className: 'bg-blue-100 text-blue-800' },
      marginal_quality: { label: 'Marginal', className: 'bg-yellow-100 text-yellow-800' },
      disqualified: { label: 'Disqualified', className: 'bg-red-100 text-red-800' },
      pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getAvailabilityBadge = (status: string, count: number) => {
    if (status === 'available') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Available
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⚠ In Use ({count})
        </span>
      );
    }
  };

  const updateURL = (newParams: Record<string, string>) => {
    if (!newParams) return;
    
    const current = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });
    
    const newUrl = `/vetted-sites?${current.toString()}`;
    console.log('Updating URL to:', newUrl);
    
    // Use router.push to properly update URL and trigger re-render
    // This will automatically trigger the useEffect to fetch new data
    router.push(newUrl, { scroll: false });
  };

  const handleSort = (sortBy: string) => {
    const currentSort = searchParams.get('sortBy');
    const currentOrder = searchParams.get('sortOrder') || 'desc';
    
    let newOrder = 'desc';
    if (currentSort === sortBy && currentOrder === 'desc') {
      newOrder = 'asc';
    }
    
    updateURL({ sortBy, sortOrder: newOrder });
  };

  const handlePageChange = (page: number) => {
    console.log('handlePageChange called with page:', page);
    if (!page || page < 1) {
      console.error('Invalid page number:', page);
      return;
    }
    updateURL({ page: page.toString() });
  };

  const toggleRowExpansion = (domainId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId);
    } else {
      newExpanded.add(domainId);
    }
    setExpandedRows(newExpanded);
  };

  const handleExport = async () => {
    const selectedDomains = getSelectedDomains();
    if (selectedDomains.length === 0) {
      alert('Please select domains to export');
      return;
    }

    try {
      const domainIds = selectedDomains.map(d => d.id);
      
      const response = await fetch('/api/vetted-sites/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domainIds,
          format: 'csv'
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `vetted-sites-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export domains. Please try again.');
    }
  };

  if (loading && data.domains.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading vetted sites...</p>
        </div>
      </div>
    );
  }

  if (data.domains.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No domains found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your filters or search terms to find more domains.
          </p>
          <button
            onClick={() => router.push('/vetted-sites')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Table Header with Controls */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={selectedCount === data.domains.length && data.domains.length > 0}
              onChange={() => {
                if (selectedCount === data.domains.length) {
                  clearSelection();
                } else {
                  selectAll(data.domains);
                }
              }}
            />
            <span className="ml-2 text-sm text-gray-700">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
            </span>
          </div>
          
          {loading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
              Updating...
            </div>
          )}
        </div>

      </div>

      {/* Selection Actions Bar */}
      {selectedCount > 0 && (
        <div className="px-4 py-2 bg-blue-50/50 backdrop-blur-sm border-b border-blue-100 flex items-center justify-between">
          <div className="text-sm font-medium text-blue-900">
            {selectedCount} domain{selectedCount !== 1 ? 's' : ''} selected • Total: ${totalPrice.toFixed(0)}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowAddToOrderModal(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
              Add to Order
            </button>
            <button className="text-sm bg-white border border-gray-200 shadow-sm text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-50 hover:shadow transition-all">
              Export
            </button>
            <button 
              onClick={() => clearSelection()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed xl:table-auto xl:w-full">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all"
                  checked={selectedCount > 0 && selectedCount === data.domains.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAll(data.domains);
                    } else {
                      clearSelection();
                    }
                  }}
                  aria-label="Select all domains"
                />
              </th>
              <th 
                scope="col" 
                className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-48 xl:w-auto"
                onClick={() => handleSort('domain')}
              >
                Domain
              </th>
              {userType === 'internal' && (
                <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
              )}
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 xl:w-auto">
                Qualification Score
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 xl:w-auto">
                Evidence
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36 xl:w-auto">
                Target Match
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 xl:w-auto">
                Price
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 xl:w-auto">
                Availability
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.domains.map((domain) => {
              return (
              <React.Fragment key={domain.id}>
              <tr 
                className={`hover:bg-gray-50 ${isSelected(domain.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 xl:px-4 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 border-gray-300 rounded transition-all"
                    checked={isSelected(domain.id)}
                    onChange={() => toggleDomain(domain)}
                    disabled={domain.activeLineItemsCount > 0}
                  />
                </td>
                
                <td className="px-3 xl:px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleRowExpansion(domain.id)}
                      className="mr-2 p-1 hover:bg-gray-200 rounded"
                      title={expandedRows.has(domain.id) ? 'Collapse details' : 'Expand details'}
                    >
                      {expandedRows.has(domain.id) ? (
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    {domain.userBookmarked && (
                      <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{domain.domain}</div>
                      {domain.suggestedTargetUrl && (
                        <div className="text-xs text-gray-500 mt-1">
                          Target: {new URL(domain.suggestedTargetUrl).pathname}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {userType === 'internal' && (
                  <td className="px-3 xl:px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{domain.clientName}</div>
                    {domain.projectName && (
                      <div className="text-xs text-gray-500">{domain.projectName}</div>
                    )}
                  </td>
                )}

                {/* Qualification Score Column */}
                <td className="px-3 xl:px-4 py-4">
                  <div className="flex items-center space-x-2">
                    {getQualificationBadge(domain.qualificationStatus)}
                    <div className="text-xs text-gray-500">
                      DR {domain.domainRating || 'N/A'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTraffic(domain.traffic)} traffic
                  </div>
                  {domain.overlapStatus && (
                    <div className="text-xs text-gray-600 mt-1 capitalize">
                      {domain.overlapStatus} • {domain.authorityDirect || 'Unknown'} Authority
                    </div>
                  )}
                </td>

                {/* Evidence Column */}
                <td className="px-3 xl:px-4 py-4">
                  {domain.evidence ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {domain.evidence.directCount + domain.evidence.relatedCount} keywords
                      </div>
                      <div className="text-xs text-gray-500">
                        {domain.evidence.directCount} direct • {domain.evidence.relatedCount} related
                      </div>
                      {domain.evidence.directMedianPosition && (
                        <div className="text-xs text-gray-500">
                          Pos: #{domain.evidence.directMedianPosition}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No evidence</span>
                  )}
                </td>

                {/* Target Match Column */}
                <td className="px-3 xl:px-4 py-4">
                  {domain.suggestedTargetUrl ? (
                    <div>
                      <div className="text-sm text-gray-900 truncate max-w-32" title={domain.suggestedTargetUrl}>
                        {domain.suggestedTargetUrl.split('/').pop() || 'Target Page'}
                      </div>
                      {domain.targetMatchedAt && (
                        <div className="text-xs text-green-600">
                          ✓ AI Matched
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No target</span>
                  )}
                </td>

                {/* Price Column */}
                <td className="px-3 xl:px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      const wholesalePrice = domain.guestPostCost ? parseFloat(domain.guestPostCost) : null;
                      if (!wholesalePrice) return <span className="text-gray-400">N/A</span>;
                      
                      // For external users, show retail price (wholesale + $79)
                      // For internal users, show wholesale price
                      const displayPrice = userType === 'internal' ? wholesalePrice : wholesalePrice + 79;
                      return `$${displayPrice.toFixed(0)}`;
                    })()}
                  </div>
                </td>

                {/* Availability Column */}
                <td className="px-3 xl:px-4 py-4">
                  {domain.activeLineItemsCount > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In Use ({domain.activeLineItemsCount})
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Available
                    </span>
                  )}
                </td>

                <td className="px-3 xl:px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleUserAction(
                        domain.id, 
                        domain.userBookmarked ? 'unbookmark' : 'bookmark'
                      )}
                      disabled={actionLoading.has(domain.id)}
                      className="text-gray-400 hover:text-yellow-500 disabled:opacity-50"
                      title={domain.userBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      {domain.userBookmarked ? (
                        <StarIconSolid className="h-4 w-4" />
                      ) : (
                        <StarIcon className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleUserAction(
                        domain.id, 
                        domain.userHidden ? 'unhide' : 'hide'
                      )}
                      disabled={actionLoading.has(domain.id)}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title={domain.userHidden ? 'Show' : 'Hide'}
                    >
                      <EyeSlashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              
              {/* Expandable Row Details */}
              {expandedRows.has(domain.id) && (
                <tr>
                  <td colSpan={userType === 'internal' ? 8 : 7} className="p-0">
                    <ExpandedDomainDetails domain={domain} />
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading page...</span>
              </div>
            ) : (
              `Showing page ${data.page} of ${data.totalPages}`
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(data.page - 1)}
              disabled={data.page === 1 || loading}
              className="px-3 py-1 border border-gray-200 rounded-lg shadow-sm text-sm text-gray-600 hover:bg-gray-50 hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, data.page - 2) + i;
              if (pageNum > data.totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                  className={`px-3 py-1 border rounded-lg shadow-sm text-sm transition-all ${
                    pageNum === data.page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : loading 
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(data.page + 1)}
              disabled={data.page === data.totalPages || loading}
              className="px-3 py-1 border border-gray-200 rounded-lg shadow-sm text-sm text-gray-600 hover:bg-gray-50 hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Selection Summary Bar */}
      <SelectionSummary
        selectedCount={selectedCount}
        totalPrice={totalPrice}
        selectedDomains={getSelectedDomains()}
        onClearSelection={clearSelection}
        onRemoveDomain={removeDomain}
        onCreateOrder={() => setShowOrderModal(true)}
        onExport={handleExport}
        onAddToOrder={() => setShowAddToOrderModal(true)}
        userType={userType as 'internal' | 'account' | 'publisher'}
      />

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        selectedDomains={getSelectedDomains()}
        totalPrice={totalPrice}
        onOrderCreated={(orderId) => {
          // Clear selection and navigate to order
          clearSelection();
          router.push(`/orders/${orderId}`);
        }}
      />

      {/* Add to Order Modal */}
      <AddToOrderModal
        isOpen={showAddToOrderModal}
        onClose={() => setShowAddToOrderModal(false)}
        selectedDomains={getSelectedDomains()}
        onOrderSelected={async (orderId) => {
          try {
            const response = await fetch(`/api/orders/${orderId}/add-domains`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                domainIds: getSelectedDomains().map(d => d.id),
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to add domains to order');
            }

            // Success - clear selection and navigate to order edit page
            clearSelection();
            setShowAddToOrderModal(false);
            router.push(`/orders/${orderId}/edit`);
          } catch (error: any) {
            console.error('Error adding to order:', error);
            // Error is handled by the modal component
          }
        }}
        onCreateNew={() => {
          setShowAddToOrderModal(false);
          setShowOrderModal(true);
        }}
      />
    </div>
  );
}