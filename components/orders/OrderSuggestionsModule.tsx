'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, RefreshCw, Search, SlidersHorizontal, Globe, TrendingUp, DollarSign, Sparkles, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import ExpandedDomainDetailsImproved from '../../app/vetted-sites/components/ExpandedDomainDetailsImproved';
import QuickVettedSitesRequest from '../dashboard/QuickVettedSitesRequest';
import ReplaceLineItemModal from './ReplaceLineItemModal';
import type { LineItem } from './LineItemsReviewTable';

export interface SuggestionDomain {
  // Basic domain info
  id: string;
  domain: string;
  qualificationStatus: string;
  qualifiedAt: string | null;
  updatedAt: string;
  
  // User curation (keep even though not used in suggestions)
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
  price: number;
  wholesalePrice: number;
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

interface OrderSuggestionsModuleProps {
  orderId: string;
  userType?: 'internal' | 'account';
  lineItems?: LineItem[]; // Pass current line items for replace functionality
  onAddDomain?: (domain: SuggestionDomain) => void;
  onReplaceDomain?: (domain: SuggestionDomain, lineItemId: string) => void;
}

export default function OrderSuggestionsModule({
  orderId,
  userType = 'account',
  lineItems = [],
  onAddDomain,
  onReplaceDomain,
}: OrderSuggestionsModuleProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionDomain[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Expanded rows state (reusing vetted sites pattern)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Map<string, string>>(new Map());
  const [addingDomain, setAddingDomain] = useState<string | null>(null);
  
  // Replace modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [domainToReplace, setDomainToReplace] = useState<SuggestionDomain | null>(null);
  
  // Request More Sites modal state
  const [showRequestMore, setShowRequestMore] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minDR: '',
    maxDR: '',
    minTraffic: '',
    minPrice: '',
    maxPrice: '',
    expandClients: false,
    projectScope: 'all_projects' as 'all_projects' | 'current_order', // NEW: Project scope filter
  });

  // Fetch suggestions when expanded
  useEffect(() => {
    if (isExpanded && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [isExpanded]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(filters.minDR && { minDR: filters.minDR }),
        ...(filters.maxDR && { maxDR: filters.maxDR }),
        ...(filters.minTraffic && { minTraffic: filters.minTraffic }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
        expandClients: filters.expandClients.toString(),
        projectScope: filters.projectScope, // NEW: Include project scope in request
      });

      const response = await fetch(`/api/orders/${orderId}/suggestions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.domains || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = (domain: SuggestionDomain) => {
    if (onAddDomain) {
      onAddDomain(domain);
    } else {
      // Default: Open AddToOrderModalV2
      console.log('Add domain:', domain);
    }
  };

  const handleReplace = (domain: SuggestionDomain) => {
    // Open replace modal with the selected domain
    setDomainToReplace(domain);
    setReplaceModalOpen(true);
  };

  // Step 3: Inline Add Action (per documentation)
  const handleAddDomain = async (domain: SuggestionDomain, targetUrl?: string) => {
    try {
      // Show loading state
      setAddingDomain(domain.id);
      
      // CRITICAL: Need to pass the domain ID from bulkAnalysisDomains for proper relations
      // The domain.id is the bulkAnalysisDomains.id we need!
      
      // API call to add line item (following exact documentation format, but with items array)
      const response = await fetch(`/api/orders/${orderId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            clientId: domain.clientId,
            targetPageUrl: targetUrl || domain.suggestedTargetUrl || '',
            // CRITICAL FIX: Convert dollars to cents like add-domains API does
            estimatedPrice: Math.floor(domain.price * 100),
            wholesalePrice: Math.floor(domain.wholesalePrice * 100),
            status: 'assigned', // FIXED: Should be 'assigned' when domain is set, not 'draft'
            // CRITICAL: Set these in main fields, not metadata!
            assignedDomain: domain.domain,
            assignedDomainId: domain.id, // This IS the bulkAnalysisDomains.id!
            anchorText: 'AIApply', // Add default anchor text
            metadata: {
              addedFrom: 'suggestions',
              targetMatchData: domain.targetMatchData,
              matchQuality: domain.targetMatchData?.target_analysis?.find(
                (t: any) => t.target_url === targetUrl
              )?.match_quality,
              // REMOVED assignedDomain from metadata - it goes in main field!
              websiteId: domain.websiteId,
              qualificationStatus: domain.qualificationStatus,
              domainRating: domain.domainRating,
              traffic: domain.traffic,
              inclusionStatus: 'included' // Add default inclusion status
            }
          }],
          reason: 'Added from order suggestions'
        })
      });
      
      if (response.ok) {
        // Success feedback (would use toast if available)
        console.log(`Added ${domain.domain} to order`);
        
        // Remove from suggestions (update availability)
        setSuggestions(prev => prev.filter(s => s.id !== domain.id));
        
        // Notify parent component if callback provided
        if (onAddDomain) {
          onAddDomain(domain);
        }
      } else {
        throw new Error(`Failed to add domain: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to add domain:', error);
      // TODO: Show error toast
    } finally {
      setAddingDomain(null);
    }
  };

  // Row expansion handler (reusing vetted sites pattern)
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

  // Helper functions (reusing vetted sites pattern)
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

  const smartDefaultBadge = () => {
    if (!suggestions.length) return null;
    const uniqueClients = [...new Set(suggestions.map(s => s.clientName))];
    if (uniqueClients.length === 1 && uniqueClients[0]) {
      return `Based on your ${uniqueClients[0]} sites`;
    }
    return 'Smart recommendations';
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">
              Suggested Sites to Add
            </h3>
            {!isExpanded && totalCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {totalCount} relevant {totalCount === 1 ? 'suggestion' : 'suggestions'} found
                {smartDefaultBadge() && (
                  <span className="ml-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {smartDefaultBadge()}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Horizontal Filter Bar */}
          <div className="mt-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search domains..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSuggestions()}
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {showFilters && (
                  <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs">
                    Active
                  </span>
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchSuggestions}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Expand Clients Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.expandClients}
                  onChange={(e) => setFilters(prev => ({ ...prev, expandClients: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">Show all account sites</span>
              </label>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* DR Range */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Domain Rating</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded"
                        value={filters.minDR}
                        onChange={(e) => setFilters(prev => ({ ...prev, minDR: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded"
                        value={filters.maxDR}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxDR: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Traffic */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Min. Traffic</label>
                    <input
                      type="number"
                      placeholder="e.g., 10000"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={filters.minTraffic}
                      onChange={(e) => setFilters(prev => ({ ...prev, minTraffic: e.target.value }))}
                    />
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Project Scope - NEW */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Suggestion Source</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                      value={filters.projectScope}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        projectScope: e.target.value as 'all_projects' | 'current_order' 
                      }))}
                    >
                      <option value="all_projects">All Client Projects</option>
                      <option value="current_order">This Order Only</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {filters.projectScope === 'all_projects' 
                        ? 'Show domains from all bulk analysis projects for this client'
                        : 'Show only domains from bulk analysis for this specific order'
                      }
                    </p>
                  </div>
                </div>

                {/* Second Row for Apply Button */}
                <div className="mt-4">
                  {/* Apply Button */}
                  <div className="flex items-end">
                    <button
                      onClick={fetchSuggestions}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rich Suggestions Table (Based on VettedSitesTable) */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
                <p className="text-gray-500">Finding suggestions...</p>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qualification & Evidence
                    </th>
                    <th className="px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Match
                    </th>
                    <th className="px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="px-3 xl:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suggestions.map((domain) => (
                    <>
                      <tr key={domain.id} className="hover:bg-gray-50">
                        {/* Domain Column */}
                        <td className="px-3 xl:px-4 py-4">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleRowExpansion(domain.id)}
                              className="mr-2 p-1 hover:bg-gray-200 rounded"
                              title={expandedRows.has(domain.id) ? 'Collapse details' : 'Expand details'}
                            >
                              {expandedRows.has(domain.id) ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900 break-words">
                                {domain.domain}
                              </div>
                              {/* Client under domain */}
                              <div className="text-xs text-gray-500 break-words">
                                {domain.clientName || 'Unknown Client'}
                              </div>
                              {/* DR and Traffic tags under domain */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {domain.domainRating && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    DR {domain.domainRating}
                                  </span>
                                )}
                                {domain.traffic && domain.traffic > 1000 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {domain.traffic > 1000000 
                                      ? `${(domain.traffic / 1000000).toFixed(1)}M`
                                      : `${(domain.traffic / 1000).toFixed(0)}K`}
                                  </span>
                                )}
                              </div>
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
                            
                            {/* AI Authority Tags */}
                            <div className="flex flex-wrap gap-1">
                              {domain.overlapStatus === 'related' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                  RELATED
                                </span>
                              )}
                              {domain.authorityDirect === 'strong' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  STRONG
                                </span>
                              )}
                              {domain.authorityDirect === 'moderate' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                  MOD
                                </span>
                              )}
                              {/* Add LONG tag if evidence shows long-tail keywords */}
                              {domain.evidence && domain.evidence.relatedCount > 50 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  LONG
                                </span>
                              )}
                            </div>

                            {/* Evidence summary like vetted sites */}
                            {domain.evidence && (
                              <div className="text-xs text-gray-600">
                                {domain.evidence.directCount > 0 && (
                                  <div>Ranks for {domain.evidence.directCount} of your keywords avg #{domain.evidence.directMedianPosition || 'N/A'}</div>
                                )}
                                {domain.evidence.relatedCount > 0 && (
                                  <div>Ranks for {domain.evidence.relatedCount} industry keywords avg #{domain.evidence.relatedMedianPosition || 'N/A'}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Target Match Column */}
                        <td className="px-3 xl:px-4 py-4">
                          {domain.targetMatchData?.target_analysis && domain.targetMatchData.target_analysis.length > 0 ? (
                            <div className="space-y-1.5">
                              {domain.suggestedTargetUrl && (
                                <div className="text-xs text-blue-600 break-words">
                                  {domain.suggestedTargetUrl.length > 40 
                                    ? `${domain.suggestedTargetUrl.substring(0, 40)}...` 
                                    : domain.suggestedTargetUrl}
                                </div>
                              )}
                              {domain.targetMatchData.target_analysis[0] && (
                                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {domain.targetMatchData.target_analysis[0].match_quality} match
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No target match</span>
                          )}
                        </td>

                        {/* Price Column */}
                        <td className="px-3 xl:px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {domain.price > 0 ? `$${domain.price}` : 'TBD'}
                          </div>
                        </td>

                        {/* Availability Column */}
                        <td className="px-3 xl:px-4 py-4">
                          {domain.availabilityStatus === 'available' ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Available
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-700">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              In Use
                            </div>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-3 xl:px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleAddDomain(domain)}
                              disabled={addingDomain === domain.id}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              {addingDomain === domain.id ? 'Adding...' : 'Add New'}
                            </button>
                            <button
                              onClick={() => handleReplace(domain)}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Replace...
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Details */}
                      {expandedRows.has(domain.id) && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <ExpandedDomainDetailsImproved 
                              domain={domain} 
                              initialExpandedSection={expandedSections.get(domain.id)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !showRequestMore ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No suggestions available
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Try adjusting your filters or request more sites
              </p>
              <button 
                onClick={() => setShowRequestMore(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Request More Sites
              </button>
            </div>
          ) : (
            <div className="py-8">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Request More Sites
                  </h3>
                  <button
                    onClick={() => setShowRequestMore(false)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <QuickVettedSitesRequest
                  compact={true}
                  hideWhatYouReceive={true}
                  onSuccess={() => {
                    setShowRequestMore(false);
                    // Optionally show success message
                    console.log('Vetted sites request submitted successfully');
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Replace Line Item Modal */}
      <ReplaceLineItemModal
        isOpen={replaceModalOpen}
        onClose={() => {
          setReplaceModalOpen(false);
          setDomainToReplace(null);
        }}
        orderId={orderId}
        newDomain={domainToReplace}
        lineItems={lineItems}
        onSuccess={() => {
          setReplaceModalOpen(false);
          setDomainToReplace(null);
          // Refresh suggestions to update availability
          fetchSuggestions();
          // Call parent callback if provided
          if (onAddDomain) {
            onAddDomain(domainToReplace!);
          }
        }}
      />
    </div>
  );
}
