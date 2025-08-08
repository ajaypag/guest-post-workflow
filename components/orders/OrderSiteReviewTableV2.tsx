'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, Globe, LinkIcon, DollarSign, ExternalLink, 
  ChevronDown, ChevronUp, ChevronRight, AlertCircle, CheckCircle,
  Target, Package, Database, Activity, Users, RefreshCw,
  Sparkles, Search, Clock, XCircle, Info, Edit2, Trash2, MoreVertical,
  Check, X, Save, Square, CheckSquare, MinusSquare
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import DomainCell from './DomainCell';
import ExpandedDomainDetails from './ExpandedDomainDetails';
import FilterBar, { type FilterOptions } from './FilterBar';

// Permission-based configuration
export interface TablePermissions {
  canChangeStatus?: boolean;
  canAssignTargetPages?: boolean;
  canApproveReject?: boolean;
  canGenerateWorkflows?: boolean;
  canMarkSitesReady?: boolean;
  canViewInternalTools?: boolean;
  canViewPricing?: boolean;
  canEditDomainAssignments?: boolean;
  canSetExclusionReason?: boolean;
}

export interface OrderGroup {
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
  groupStatus?: string;
  siteSelections?: {
    approved: number;
    pending: number;
    total: number;
  };
}

// NEW: Line item interface for tracking individual links
export interface LineItem {
  id: string;
  orderId: string;
  clientId: string;
  targetPageUrl?: string;
  targetPageId?: string;
  anchorText?: string;
  status: string;
  assignedDomainId?: string;
  assignedDomain?: string;
  estimatedPrice?: number;
  metadata?: any;
}

export interface SiteSubmission {
  id: string;
  orderGroupId: string;
  domainId: string;
  domain: {
    id: string;
    domain: string;
    qualificationStatus?: string;
    notes?: string;
    // Analysis fields
    overlapStatus?: 'direct' | 'related' | 'both' | 'none';
    authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
    authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
    topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
    topicReasoning?: string;
    aiQualificationReasoning?: string;
    evidence?: {
      direct_count?: number;
      direct_median_position?: number | null;
      related_count?: number;
      related_median_position?: number | null;
    };
    keywordCount?: number;
    hasDataForSeoResults?: boolean;
    dataForSeoResultsCount?: number;
  } | null;
  domainRating?: number;
  traffic?: number;
  price: number;
  wholesalePrice?: number;
  serviceFee?: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'client_approved' | 'client_rejected';
  submissionStatus?: string;
  clientApprovedAt?: string;
  clientRejectedAt?: string;
  clientReviewedAt?: string;
  clientReviewNotes?: string;
  specialInstructions?: string;
  targetPageUrl?: string;
  anchorText?: string;
  createdAt?: string;
  
  // NEW: Status-based fields
  inclusionStatus?: 'included' | 'excluded' | 'saved_for_later';
  inclusionOrder?: number;
  exclusionReason?: string;
  
  // DEPRECATED: Pool fields (for backward compatibility)
  selectionPool?: 'primary' | 'alternative';
  poolRank?: number;
  
  metadata?: {
    targetPageUrl?: string;
    anchorText?: string;
    specialInstructions?: string;
    qualificationStatus?: string;
    hasDataForSeoResults?: boolean;
    overlapStatus?: 'direct' | 'related' | 'both' | 'none';
    authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
    authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
    topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
    evidence?: {
      direct_count: number;
      direct_median_position: number | null;
      related_count: number;
      related_median_position: number | null;
    };
    [key: string]: any;
  };
}

interface OrderSiteReviewTableProps {
  orderId: string;
  orderGroups: OrderGroup[];
  lineItems?: LineItem[]; // NEW: Optional line items for hybrid system
  siteSubmissions: Record<string, SiteSubmission[]>;
  userType: 'internal' | 'account';
  permissions: TablePermissions;
  workflowStage?: string;
  onAssignTargetPage?: (submissionId: string, targetPageUrl: string, groupId: string) => Promise<void>;
  onChangeInclusionStatus?: (submissionId: string, groupId: string, status: 'included' | 'excluded' | 'saved_for_later', reason?: string) => Promise<void>;
  onApprove?: (submissionId: string, groupId: string) => Promise<void>;
  onReject?: (submissionId: string, groupId: string, reason: string) => Promise<void>;
  onEditSubmission?: (submissionId: string, groupId: string, updates: any) => Promise<void>;
  onRemoveSubmission?: (submissionId: string, groupId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  selectedSubmissions?: Set<string>;
  onSelectionChange?: (submissionId: string, selected: boolean) => void;
  onAssignToLineItem?: (submissionId: string, lineItemId: string) => Promise<void>; // NEW: Assign domain to line item
  useStatusSystem?: boolean; // Feature flag to use new system
  useLineItems?: boolean; // NEW: Feature flag for line items integration
  benchmarkData?: any; // Optional benchmark data to show deviations
}

export default function OrderSiteReviewTableV2({
  orderId,
  orderGroups,
  lineItems = [],
  siteSubmissions,
  userType,
  permissions,
  workflowStage = 'site_selection_with_sites',
  onAssignTargetPage,
  onChangeInclusionStatus,
  onApprove,
  onReject,
  onEditSubmission,
  onRemoveSubmission,
  onRefresh,
  selectedSubmissions,
  onSelectionChange,
  onAssignToLineItem,
  useStatusSystem = true, // Default to new system
  useLineItems = false, // Default to not using line items yet
  benchmarkData
}: OrderSiteReviewTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(orderGroups.map(g => g.id))
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [editingSubmission, setEditingSubmission] = useState<{
    id: string;
    groupId: string;
    targetPageUrl?: string;
    anchorText?: string;
    specialInstructions?: string;
    priceOverride?: number;
    internalNotes?: string;
  } | null>(null);
  const [showLineItemAssignment, setShowLineItemAssignment] = useState<{
    submissionId: string;
    domainId: string;
    domain: string;
  } | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    qualification: 'all',
    overlap: 'all'
  });

  // Group line items by client for easy access
  const lineItemsByClient = React.useMemo(() => {
    const grouped: Record<string, LineItem[]> = {};
    lineItems.forEach(item => {
      if (!grouped[item.clientId]) {
        grouped[item.clientId] = [];
      }
      grouped[item.clientId].push(item);
    });
    return grouped;
  }, [lineItems]);

  // Get unassigned line items for a client
  const getUnassignedLineItems = (clientId: string) => {
    return (lineItemsByClient[clientId] || []).filter(
      item => !item.assignedDomainId && item.status !== 'delivered'
    );
  };

  // Helper to get effective inclusion status
  const getInclusionStatus = (submission: SiteSubmission): 'included' | 'excluded' | 'saved_for_later' => {
    if (submission.inclusionStatus) {
      return submission.inclusionStatus;
    }
    // Fallback for old pool system
    return submission.selectionPool === 'primary' ? 'included' : 'saved_for_later';
  };

  // Helper to check if a submission is in the benchmark
  const getBenchmarkStatus = (submission: SiteSubmission, groupId: string) => {
    if (!benchmarkData?.benchmarkData?.selections) return null;
    
    const groupBenchmark = benchmarkData.benchmarkData.selections.find(
      (s: any) => s.groupId === groupId
    );
    
    if (!groupBenchmark) return null;
    
    const benchmarkedSubmission = groupBenchmark.submissions.find(
      (s: any) => s.domainId === submission.domainId
    );
    
    if (!benchmarkedSubmission) return 'not_in_benchmark';
    
    // Check if status has changed
    const currentStatus = getInclusionStatus(submission);
    if (benchmarkedSubmission.status !== currentStatus) {
      return 'status_changed';
    }
    
    // Check if price has changed significantly (more than 10%)
    if (Math.abs(benchmarkedSubmission.price - submission.price) / benchmarkedSubmission.price > 0.1) {
      return 'price_changed';
    }
    
    return 'matches_benchmark';
  };

  // Filter submissions by all criteria
  const filterSubmissions = (submissions: SiteSubmission[]): SiteSubmission[] => {
    return submissions.filter(submission => {
      // Status filter
      if (filters.status !== 'all' && getInclusionStatus(submission) !== filters.status) {
        return false;
      }
      
      // DR filter
      if (filters.drMin && submission.domainRating && submission.domainRating < filters.drMin) {
        return false;
      }
      if (filters.drMax && submission.domainRating && submission.domainRating > filters.drMax) {
        return false;
      }
      
      // Price filter
      if (filters.priceMin && submission.price < filters.priceMin) {
        return false;
      }
      if (filters.priceMax && submission.price > filters.priceMax) {
        return false;
      }
      
      // Qualification filter
      if (filters.qualification !== 'all' && submission.domain) {
        const isQualified = submission.domain.qualificationStatus === 'qualified';
        if (filters.qualification === 'qualified' && !isQualified) return false;
        if (filters.qualification === 'not_qualified' && isQualified) return false;
      }
      
      // Overlap filter
      if (filters.overlap !== 'all' && submission.domain) {
        if (submission.domain.overlapStatus !== filters.overlap) return false;
      }
      
      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const domainName = submission.domain?.domain || submission.domainId;
        const matchesDomain = domainName.toLowerCase().includes(searchLower);
        const matchesAnchor = submission.anchorText?.toLowerCase().includes(searchLower);
        const matchesTarget = submission.targetPageUrl?.toLowerCase().includes(searchLower);
        const matchesNotes = submission.domain?.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesDomain && !matchesAnchor && !matchesTarget && !matchesNotes) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Get status badge color
  const getStatusColor = (status: 'included' | 'excluded' | 'saved_for_later') => {
    switch (status) {
      case 'included': return 'bg-green-100 text-green-800';
      case 'excluded': return 'bg-red-100 text-red-800';
      case 'saved_for_later': return 'bg-yellow-100 text-yellow-800';
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleRow = (submissionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleRowSelection = (submissionId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(submissionId)) {
      newSelected.delete(submissionId);
    } else {
      newSelected.add(submissionId);
    }
    setSelectedRows(newSelected);
  };

  const selectAll = (submissions: SiteSubmission[]) => {
    const allIds = submissions.map(s => s.id);
    setSelectedRows(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const handleBulkStatusChange = async (status: 'included' | 'excluded' | 'saved_for_later') => {
    if (!onChangeInclusionStatus || selectedRows.size === 0) return;
    
    let reason: string | undefined;
    if (status === 'excluded' && userType === 'internal') {
      reason = prompt('Please provide a reason for exclusion (applies to all selected):') || undefined;
    }
    
    setActionLoading({ ...actionLoading, bulk: true });
    try {
      // Process each selected submission
      const promises = Array.from(selectedRows).map(submissionId => {
        // Find which group this submission belongs to
        for (const [groupId, submissions] of Object.entries(siteSubmissions)) {
          const submission = submissions.find(s => s.id === submissionId);
          if (submission) {
            return onChangeInclusionStatus(submissionId, groupId, status, reason);
          }
        }
      });
      
      await Promise.all(promises.filter(Boolean));
      clearSelection();
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to bulk change status:', error);
    } finally {
      setActionLoading({ ...actionLoading, bulk: false });
    }
  };

  const handleChangeStatus = async (submissionId: string, groupId: string, status: 'included' | 'excluded' | 'saved_for_later') => {
    if (!onChangeInclusionStatus) return;
    
    setActionLoading({ ...actionLoading, [submissionId]: true });
    try {
      let reason: string | undefined;
      if (status === 'excluded' && userType === 'internal') {
        reason = prompt('Please provide a reason for exclusion:') || undefined;
      }
      await onChangeInclusionStatus(submissionId, groupId, status, reason);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to change status:', error);
    } finally {
      setActionLoading({ ...actionLoading, [submissionId]: false });
    }
  };

  const handleEditSubmission = async () => {
    if (!editingSubmission || !onEditSubmission) return;
    
    setActionLoading({ ...actionLoading, edit: true });
    try {
      await onEditSubmission(editingSubmission.id, editingSubmission.groupId, {
        targetPageUrl: editingSubmission.targetPageUrl,
        anchorText: editingSubmission.anchorText,
        specialInstructions: editingSubmission.specialInstructions,
        priceOverride: editingSubmission.priceOverride,
        internalNotes: editingSubmission.internalNotes
      });
      setEditingSubmission(null);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to edit submission:', error);
    } finally {
      setActionLoading({ ...actionLoading, edit: false });
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkStatusChange('included')}
              disabled={actionLoading.bulk}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Include Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('excluded')}
              disabled={actionLoading.bulk}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Exclude Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('saved_for_later')}
              disabled={actionLoading.bulk}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Save for Later
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar 
        filters={filters}
        onFiltersChange={setFilters}
        showAdvanced={true}
      />

      {/* Order Groups */}
      {orderGroups.map(group => {
        const submissions = filterSubmissions(siteSubmissions[group.id] || []);
        const includedCount = (siteSubmissions[group.id] || []).filter(s => getInclusionStatus(s) === 'included').length;
        const excludedCount = (siteSubmissions[group.id] || []).filter(s => getInclusionStatus(s) === 'excluded').length;
        const savedCount = (siteSubmissions[group.id] || []).filter(s => getInclusionStatus(s) === 'saved_for_later').length;
        const unassignedLineItems = useLineItems ? getUnassignedLineItems(group.clientId) : [];
        
        return (
          <div key={group.id} className="border rounded-lg">
            {/* Group Header */}
            <div 
              className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center gap-3">
                {expandedGroups.has(group.id) ? <ChevronDown /> : <ChevronRight />}
                <div>
                  <h3 className="font-medium">{group.client.name}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {group.linkCount} links requested • 
                    <span className="text-green-600"> {includedCount} included</span> • 
                    {excludedCount > 0 && <span className="text-red-600">{excludedCount} excluded • </span>}
                    <span className="text-yellow-600">{savedCount} saved</span>
                    {useLineItems && unassignedLineItems.length > 0 && (
                      <span className="text-blue-600"> • {unassignedLineItems.length} unassigned line items</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions Table */}
            {expandedGroups.has(group.id) && (
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600 border-b">
                      <th className="pb-2 pr-2">
                        <input
                          type="checkbox"
                          checked={submissions.length > 0 && submissions.every(s => selectedRows.has(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAll(submissions);
                            } else {
                              clearSelection();
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="pb-2">Domain</th>
                      <th className="pb-2">DR</th>
                      <th className="pb-2">Traffic</th>
                      <th className="pb-2">Status</th>
                      {useLineItems && <th className="pb-2">Line Item</th>}
                      <th className="pb-2">Target Page</th>
                      <th className="pb-2">Anchor Text</th>
                      {permissions.canViewPricing && <th className="pb-2">Price</th>}
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(submission => {
                      const status = getInclusionStatus(submission);
                      const benchmarkStatus = getBenchmarkStatus(submission, group.id);
                      // Find associated line item if assigned
                      const assignedLineItem = useLineItems ? lineItems.find(
                        item => item.assignedDomainId === submission.domainId
                      ) : null;
                      
                      return (
                        <React.Fragment key={submission.id}>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="py-3 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(submission.id)}
                                onChange={() => toggleRowSelection(submission.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="py-3 cursor-pointer" onClick={() => toggleRow(submission.id)}>
                              <div className="flex items-center gap-2">
                                {expandedRows.has(submission.id) ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                                <DomainCell 
                                  domain={submission.domain} 
                                  domainId={submission.domainId}
                                />
                                {/* Benchmark indicator */}
                                {benchmarkStatus && benchmarkStatus !== 'matches_benchmark' && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full ${
                                    benchmarkStatus === 'not_in_benchmark' ? 'bg-purple-100 text-purple-700' :
                                    benchmarkStatus === 'status_changed' ? 'bg-orange-100 text-orange-700' :
                                    benchmarkStatus === 'price_changed' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`} title={
                                    benchmarkStatus === 'not_in_benchmark' ? 'New domain not in original wishlist' :
                                    benchmarkStatus === 'status_changed' ? 'Status changed from benchmark' :
                                    benchmarkStatus === 'price_changed' ? 'Price significantly changed from benchmark' :
                                    'Deviation from benchmark'
                                  }>
                                    {benchmarkStatus === 'not_in_benchmark' ? 'NEW' :
                                     benchmarkStatus === 'status_changed' ? 'CHANGED' :
                                     benchmarkStatus === 'price_changed' ? 'PRICE Δ' :
                                     'Δ'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              {submission.metadata?.dr || '-'}
                            </td>
                            <td className="py-3 text-center">
                              {submission.metadata?.traffic ? 
                                submission.metadata.traffic.toLocaleString() :
                                '-'}
                            </td>
                          <td className="py-3">
                            {permissions.canChangeStatus ? (
                              <select
                                value={status}
                                onChange={(e) => handleChangeStatus(
                                  submission.id, 
                                  group.id, 
                                  e.target.value as 'included' | 'excluded' | 'saved_for_later'
                                )}
                                className={`px-2 py-1 text-sm rounded border ${getStatusColor(status)}`}
                                disabled={actionLoading[submission.id]}
                              >
                                <option value="included">✓ Included</option>
                                <option value="excluded">✗ Excluded</option>
                                <option value="saved_for_later">⏸ Saved</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-sm rounded ${getStatusColor(status)}`}>
                                {status === 'included' && '✓ Included'}
                                {status === 'excluded' && '✗ Excluded'}
                                {status === 'saved_for_later' && '⏸ Saved'}
                              </span>
                            )}
                            {status === 'excluded' && submission.exclusionReason && (
                              <div className="text-xs text-red-600 mt-1">
                                Reason: {submission.exclusionReason}
                              </div>
                            )}
                          </td>
                          {useLineItems && (
                            <td className="py-3 text-sm">
                              {assignedLineItem ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-xs text-green-600">Assigned</span>
                                </div>
                              ) : status === 'included' ? (
                                <button
                                  onClick={() => {
                                    if (unassignedLineItems.length > 0) {
                                      setShowLineItemAssignment({
                                        submissionId: submission.id,
                                        domainId: submission.domainId,
                                        domain: submission.domain?.domain || submission.domainId
                                      });
                                    }
                                  }}
                                  disabled={unassignedLineItems.length === 0}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Assign
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 text-sm">
                            {submission.targetPageUrl || '-'}
                          </td>
                          <td className="py-3 text-sm">
                            {submission.anchorText || '-'}
                          </td>
                          {permissions.canViewPricing && (
                            <td className="py-3 text-sm">
                              {formatCurrency(submission.price)}
                            </td>
                          )}
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {permissions.canEditDomainAssignments && onEditSubmission && (
                                <button
                                  onClick={() => setEditingSubmission({
                                    id: submission.id,
                                    groupId: group.id,
                                    targetPageUrl: submission.targetPageUrl,
                                    anchorText: submission.anchorText,
                                    specialInstructions: submission.specialInstructions,
                                    priceOverride: submission.price / 100,
                                    internalNotes: submission.metadata?.internalNotes
                                  })}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {userType === 'internal' && onRemoveSubmission && (
                                <button
                                  onClick={() => {
                                    if (confirm('Are you sure you want to remove this domain?')) {
                                      onRemoveSubmission(submission.id, group.id);
                                    }
                                  }}
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                  title="Remove"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                          </tr>
                          {expandedRows.has(submission.id) && (
                            <tr>
                              <td colSpan={useLineItems ? 8 : 7}>
                                <ExpandedDomainDetails submission={submission} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Modal */}
      {editingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Submission</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Page URL</label>
                <input
                  type="text"
                  value={editingSubmission.targetPageUrl || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    targetPageUrl: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Anchor Text</label>
                <input
                  type="text"
                  value={editingSubmission.anchorText || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    anchorText: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Special Instructions</label>
                <textarea
                  value={editingSubmission.specialInstructions || ''}
                  onChange={(e) => setEditingSubmission({
                    ...editingSubmission,
                    specialInstructions: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              
              {userType === 'internal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price Override ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSubmission.priceOverride || ''}
                      onChange={(e) => setEditingSubmission({
                        ...editingSubmission,
                        priceOverride: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Internal Notes</label>
                    <textarea
                      value={editingSubmission.internalNotes || ''}
                      onChange={(e) => setEditingSubmission({
                        ...editingSubmission,
                        internalNotes: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded"
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingSubmission(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmission}
                disabled={actionLoading.edit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading.edit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Line Item Assignment Modal */}
      {showLineItemAssignment && useLineItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Assign Domain to Line Item
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium">Domain: {showLineItemAssignment.domain}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Select a line item to assign this domain to:
              </p>
              
              {/* Find the correct client's unassigned line items */}
              {(() => {
                const groupId = Object.keys(siteSubmissions).find(gId => 
                  siteSubmissions[gId].some(s => s.id === showLineItemAssignment.submissionId)
                );
                const group = orderGroups.find(g => g.id === groupId);
                const clientLineItems = group ? getUnassignedLineItems(group.clientId) : [];
                
                if (clientLineItems.length === 0) {
                  return (
                    <p className="text-center text-gray-500 py-8">
                      No unassigned line items available for this client.
                    </p>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {clientLineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={async () => {
                          if (onAssignToLineItem) {
                            try {
                              await onAssignToLineItem(showLineItemAssignment.submissionId, item.id);
                              setShowLineItemAssignment(null);
                              if (onRefresh) await onRefresh();
                            } catch (error) {
                              console.error('Failed to assign to line item:', error);
                            }
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              Line Item #{index + 1}
                            </p>
                            {item.targetPageUrl && (
                              <p className="text-xs text-gray-600 mt-1">
                                Target: {item.targetPageUrl}
                              </p>
                            )}
                            {item.anchorText && (
                              <p className="text-xs text-gray-600">
                                Anchor: {item.anchorText}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.status}
                            </span>
                            {item.estimatedPrice && (
                              <p className="text-xs text-gray-600 mt-1">
                                ${(item.estimatedPrice / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowLineItemAssignment(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}