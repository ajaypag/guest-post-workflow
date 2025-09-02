'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';
import { useRouter, useSearchParams } from 'next/navigation';
import { StarIcon, EyeSlashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useSelection } from '../hooks/useSelection';
import SelectionSummary from './SelectionSummary';
import QuickOrderModal from './QuickOrderModalV2';
import AddToOrderModalV2 from './AddToOrderModalV2';
import ExpandedDomainDetails from './ExpandedDomainDetails';
import ExpandedDomainDetailsImproved from './ExpandedDomainDetailsImproved';
import VettingContext from './VettingContext';

interface TargetPage {
  id: string;
  url: string;
  keywords: string | null;
  description: string | null;
}

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
  targetPages?: TargetPage[];
  
  // Data quality indicators
  hasDataForSeoResults: boolean | null;
  dataForSeoResultsCount: number | null;
  wasManuallyQualified: boolean | null;
  wasHumanVerified: boolean | null;
  
  // Project context
  clientId: string;
  clientName: string | null;
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
  guestPostCost: number | null;
  
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
  initialFilters?: any;
  userType?: string;
  isPublicView?: boolean;
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

export default function VettedSitesTable({ initialData, initialFilters, userType = 'account', isPublicView = false, onDataUpdate }: VettedSitesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  console.log('Initial data - totalPages:', initialData.totalPages, 'total:', initialData.total, 'domains:', initialData.domains?.length);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  
  // Update data when initialData changes (e.g., when filters are applied)
  // This handles server-side rendered data updates
  useEffect(() => {
    console.log('InitialData changed, updating local data');
    setData(initialData);
  }, [initialData]);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Map<string, string>>(new Map());
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  const [addToOrderError, setAddToOrderError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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

  const handleUserAction = async (domainId: string, action: 'bookmark' | 'unbookmark' | 'hide' | 'unhide') => {
    // Optimistic update - update UI immediately
    setData(prevData => ({
      ...prevData,
      domains: prevData.domains.map(domain => {
        if (domain.id === domainId) {
          if (action === 'bookmark' || action === 'unbookmark') {
            return { ...domain, userBookmarked: action === 'bookmark' };
          } else if (action === 'hide' || action === 'unhide') {
            return { ...domain, userHidden: action === 'hide' };
          }
        }
        return domain;
      }).filter(domain => {
        // If hiding, remove from view immediately
        if (domain.id === domainId && action === 'hide') {
          return false;
        }
        return true;
      }),
      stats: prevData.stats ? {
        ...prevData.stats,
        // Update stats if hiding/unhiding
        hidden: action === 'hide' ? prevData.stats.hidden + 1 : 
                action === 'unhide' ? prevData.stats.hidden - 1 : 
                prevData.stats.hidden,
        bookmarked: action === 'bookmark' ? prevData.stats.bookmarked + 1 :
                    action === 'unbookmark' ? prevData.stats.bookmarked - 1 :
                    prevData.stats.bookmarked,
      } : prevData.stats
    }));
    
    setActionLoading(prev => new Set([...prev, domainId]));
    
    try {
      const response = await fetch(`/api/vetted-sites/${domainId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        throw new Error('Failed to update');
      }

      const result = await response.json();
      
      // Server confirmed - update with server data if needed
      setData(prevData => ({
        ...prevData,
        domains: prevData.domains.map(domain => 
          domain.id === domainId && result.domain
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
    } catch (error) {
      console.error('Error performing action:', error);
      
      // Revert the optimistic update on error
      const response = await fetch(`/api/vetted-sites/${domainId}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const { domain: revertedDomain } = await response.json();
        setData(prevData => ({
          ...prevData,
          domains: prevData.domains.map(domain => 
            domain.id === domainId ? revertedDomain : domain
          ),
          // Recalculate stats based on actual data
          stats: prevData.stats
        }));
      }
      
      // Show error message to user
      alert('Failed to update. Please try again.');
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
      high_quality: { label: 'High Quality', className: 'text-green-700', dotClass: 'bg-green-500' },
      good_quality: { label: 'Qualified', className: 'text-blue-700', dotClass: 'bg-blue-500' },
      marginal_quality: { label: 'Marginal', className: 'text-yellow-700', dotClass: 'bg-yellow-500' },
      disqualified: { label: 'Disqualified', className: 'text-red-700', dotClass: 'bg-red-500' },
      pending: { label: 'Pending', className: 'text-gray-700', dotClass: 'bg-gray-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.className}`}>
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`}></span>
        {config.label}
      </div>
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
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

  const toggleRowExpansion = (domainId: string, section?: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId);
      // Clear any section tracking when collapsing
      setExpandedSections(prev => {
        const next = new Map(prev);
        next.delete(domainId);
        return next;
      });
    } else {
      newExpanded.add(domainId);
      // If a specific section is requested, track it
      if (section) {
        setExpandedSections(prev => {
          const next = new Map(prev);
          next.set(domainId, section);
          return next;
        });
      }
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
      {/* Success Message Banner */}
      {successMessage && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="text-sm font-medium text-green-800">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
      
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed xl:table-auto xl:w-full">
          <thead className="bg-gray-50">
            <tr>
              {!isPublicView && (
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
              )}
              <th 
                scope="col" 
                className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-36 xl:w-auto"
                onClick={() => handleSort('domain')}
              >
                Domain
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56 xl:w-auto">
                Qualification & Evidence
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 xl:w-auto">
                Target Match
              </th>
              {userType === 'internal' && (
                <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 xl:w-auto">
                  Client
                </th>
              )}
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 xl:w-auto">
                Price
              </th>
              <th scope="col" className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 xl:w-auto">
                Availability
              </th>
              {!isPublicView && (
                <th scope="col" className="px-3 xl:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.domains.map((domain) => {
              return (
              <React.Fragment key={domain.id}>
              <tr 
                className={`hover:bg-gray-50 ${isSelected(domain.id) ? 'bg-blue-50' : ''}`}
              >
                {!isPublicView && (
                  <td className="px-3 xl:px-4 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 border-gray-300 rounded transition-all"
                      checked={isSelected(domain.id)}
                      onChange={() => {
                        const result = toggleDomain(domain, (error) => {
                          alert(error); // Simple error display for now
                        });
                      }}
                      // Removed disabled - domains can be selected even if in use
                    />
                  </td>
                )}
                
                <td className="px-3 xl:px-4 py-4">
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
                      <div className="text-sm font-medium text-gray-900 break-words">{domain.domain}</div>
                      {(domain.domainRating || domain.traffic) && (
                        <div className="text-xs text-gray-500 mt-1">
                          DR {domain.domainRating || 'N/A'} • {formatTraffic(domain.traffic)}
                        </div>
                      )}
                      {domain.suggestedTargetUrl && (
                        <div className="text-xs text-gray-500 mt-1 break-words">
                          AI Target: {new URL(domain.suggestedTargetUrl).pathname}
                        </div>
                      )}
                      {domain.targetPages && domain.targetPages.length > 0 && (
                        <div className="mt-1">
                          <VettingContext targetPages={domain.targetPages} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Qualification & Evidence Column */}
                <td className="px-3 xl:px-4 py-4">
                  <div className="space-y-1.5">
                    {/* Qualification badge */}
                    <div className="mb-2">
                      {getQualificationBadge(domain.qualificationStatus)}
                    </div>
                    
                    {/* Evidence data */}
                    {domain.evidence ? (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {/* Your exact keywords */}
                        {domain.evidence.directCount > 0 && (
                          <div>
                            Ranks for {domain.evidence.directCount} of your keywords
                            {domain.evidence.directMedianPosition && (
                              <span> avg #{domain.evidence.directMedianPosition.toFixed(0)}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Related industry keywords */}
                        {domain.evidence.relatedCount > 0 && (
                          <div>
                            Ranks for {domain.evidence.relatedCount} industry keywords
                            {domain.evidence.relatedMedianPosition && (
                              <span> avg #{domain.evidence.relatedMedianPosition.toFixed(0)}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Show message if no evidence */}
                        {domain.evidence.directCount === 0 && domain.evidence.relatedCount === 0 && (
                          <div>No keyword overlap found</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">No analysis available</div>
                    )}
                  </div>
                </td>

                {/* Target Match Column */}
                <td className="px-3 xl:px-4 py-4">
                  {domain.targetMatchData?.target_analysis && domain.targetMatchData.target_analysis.length > 0 ? (
                    <div className="space-y-1.5">
                      {/* AI Suggested Target - Simple and Clean */}
                      {domain.suggestedTargetUrl && (
                        (() => {
                          const topMatch = domain.targetMatchData.target_analysis.find((a: any) => 
                            a.target_url === domain.suggestedTargetUrl
                          );
                          const directCount = topMatch?.evidence?.direct_count || 0;
                          const relatedCount = topMatch?.evidence?.related_count || 0;
                          const quality = topMatch?.match_quality || 'unknown';
                          
                          // Simple quality indicator
                          const qualityColors = {
                            'excellent': 'text-green-600',
                            'good': 'text-blue-600',
                            'fair': 'text-yellow-600',
                            'poor': 'text-gray-400'
                          } as const;
                          const qualityColor = qualityColors[quality as keyof typeof qualityColors] || 'text-gray-400';
                          
                          return (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-900 break-words" title={domain.suggestedTargetUrl}>
                                {new URL(domain.suggestedTargetUrl).pathname || '/'}
                              </div>
                              <div className="text-xs">
                                <span className={qualityColor}>● {quality}</span>
                                {(directCount > 0 || relatedCount > 0) && (
                                  <span className="text-gray-500"> • {directCount + relatedCount} matches</span>
                                )}
                              </div>
                              {domain.targetMatchData.target_analysis.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpansion(domain.id, 'targetMatch');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 block"
                                >
                                  +{domain.targetMatchData.target_analysis.length - 1} more targets
                                </button>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {domain.suggestedTargetUrl ? (
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          🎯 
                          <span className="break-words text-xs" title={domain.suggestedTargetUrl}>
                            {new URL(domain.suggestedTargetUrl).pathname || '/'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No targets</span>
                      )}
                    </div>
                  )}
                </td>

                {userType === 'internal' && (
                  <td className="px-3 xl:px-4 py-4">
                    <div className="text-sm text-gray-900 break-words" title={domain.clientName || undefined}>
                      {domain.clientName || 'Unknown Client'}
                    </div>
                    {domain.projectName && (
                      <div className="text-xs text-gray-500 break-words" title={domain.projectName}>
                        {domain.projectName}
                      </div>
                    )}
                  </td>
                )}

                {/* Price Column */}
                <td className="px-3 xl:px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      const wholesalePriceCents = domain.guestPostCost;
                      if (!wholesalePriceCents) return <span className="text-gray-400">N/A</span>;
                      
                      // Convert cents to dollars and add service fee
                      const wholesalePriceDollars = wholesalePriceCents / 100;
                      const displayPrice = wholesalePriceDollars + (SERVICE_FEE_CENTS / 100);
                      return `$${displayPrice.toFixed(0)}`;
                    })()}
                  </div>
                </td>

                {/* Availability Column */}
                <td className="px-3 xl:px-4 py-4">
                  {domain.activeLineItemsCount > 0 ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      In Use ({domain.activeLineItemsCount})
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Available
                    </div>
                  )}
                </td>

                {!isPublicView && (
                  <td className="px-3 xl:px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleUserAction(
                          domain.id, 
                          domain.userBookmarked ? 'unbookmark' : 'bookmark'
                        )}
                        disabled={actionLoading.has(domain.id)}
                        className={`transition-all duration-200 transform hover:scale-110 ${
                          domain.userBookmarked 
                            ? 'text-yellow-500' 
                            : 'text-gray-400 hover:text-yellow-500'
                        } disabled:opacity-50`}
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
                      className={`transition-all duration-200 transform hover:scale-110 ${
                        domain.userHidden 
                          ? 'text-red-400 hover:text-gray-600' 
                          : 'text-gray-400 hover:text-red-400'
                      } disabled:opacity-50`}
                      title={domain.userHidden ? 'Show' : 'Hide'}
                    >
                      {domain.userHidden ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
                )}
              </tr>
              
              {/* Expandable Row Details */}
              {expandedRows.has(domain.id) && (
                <tr>
                  <td colSpan={userType === 'internal' ? 7 : 6} className="p-0">
                    <ExpandedDomainDetailsImproved 
                      domain={domain} 
                      initialExpandedSection={expandedSections.get(domain.id)}
                    />
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
      {!isPublicView && (
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
      )}

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        selectedDomains={getSelectedDomains()}
        totalPrice={totalPrice}
        onOrderCreatedAndContinue={(orderId) => {
          // Clear selection, stay on page, show success message
          const domainCount = getSelectedDomains().length;
          const orderDisplayId = orderId.slice(-8);
          clearSelection();
          setShowOrderModal(false);
          setSuccessMessage(`Successfully created Order ${orderDisplayId} with ${domainCount} domain${domainCount > 1 ? 's' : ''}`);
          
          // Auto-hide success message after 5 seconds
          setTimeout(() => setSuccessMessage(null), 5000);
        }}
        onOrderCreatedAndReview={(orderId) => {
          // Clear selection and navigate to order (original behavior)
          clearSelection();
          router.push(`/orders/${orderId}`);
        }}
      />

      {/* Add to Order Modal */}
      <AddToOrderModalV2
        isOpen={showAddToOrderModal}
        onClose={() => {
          setShowAddToOrderModal(false);
          setAddToOrderError(null);
        }}
        selectedDomains={getSelectedDomains()}
        error={addToOrderError}
        onOrderSelectedAndContinue={async (orderId, domainTargets) => {
          try {
            setAddToOrderError(null);
            const response = await fetch(`/api/orders/${orderId}/add-domains`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                domainIds: getSelectedDomains().map(d => d.id),
                domainTargets: domainTargets || [],
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || data.details || 'Failed to add domains to order');
            }

            // Success - clear selection, close modal, stay on page, show success message
            const domainCount = getSelectedDomains().length;
            const orderDisplayId = orderId.slice(-8);
            clearSelection();
            setShowAddToOrderModal(false);
            setAddToOrderError(null);
            setSuccessMessage(`Successfully added ${domainCount} domain${domainCount > 1 ? 's' : ''} to Order ${orderDisplayId}`);
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
          } catch (error: any) {
            console.error('Error adding to order:', error);
            setAddToOrderError(error.message || 'Failed to add domains to order. Please try again.');
          }
        }}
        onOrderSelectedAndReview={async (orderId, domainTargets) => {
          try {
            setAddToOrderError(null);
            const response = await fetch(`/api/orders/${orderId}/add-domains`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                domainIds: getSelectedDomains().map(d => d.id),
                domainTargets: domainTargets || [],
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || data.details || 'Failed to add domains to order');
            }

            // Success - clear selection and navigate to order edit page (original behavior)
            clearSelection();
            setShowAddToOrderModal(false);
            setAddToOrderError(null);
            router.push(`/orders/${orderId}/edit`);
          } catch (error: any) {
            console.error('Error adding to order:', error);
            setAddToOrderError(error.message || 'Failed to add domains to order. Please try again.');
          }
        }}
        onCreateNew={() => {
          setShowAddToOrderModal(false);
          setAddToOrderError(null);
          setShowOrderModal(true);
        }}
      />
    </div>
  );
}