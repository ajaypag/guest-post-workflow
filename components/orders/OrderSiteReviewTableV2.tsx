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
import TargetPageSelector from './TargetPageSelector';

// Feedback Modal Component for collecting rejection reasons
interface FeedbackModalProps {
  isOpen: boolean;
  siteDomain: string;
  onClose: () => void;
  onSubmit: (feedback: { reason: string; notes: string }) => void;
  userType: 'internal' | 'account';
}

function FeedbackModal({ isOpen, siteDomain, onClose, onSubmit, userType }: FeedbackModalProps) {
  const [selectedReason, setSelectedReason] = useState('Too Expensive'); // Default selection
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedReason('Too Expensive');
      setNotes('');
    }
  }, [isOpen]);

  const commonReasons = [
    { id: 'too_expensive', label: 'Too Expensive', icon: '💰', popular: true },
    { id: 'low_authority', label: 'Low Domain Rating/Authority', icon: '📉', popular: true },
    { id: 'irrelevant_niche', label: 'Irrelevant Niche/Industry', icon: '🎯', popular: true },
    { id: 'poor_content', label: 'Poor Content Quality', icon: '📝', popular: false },
    { id: 'site_spammy', label: 'Site Appears Spammy', icon: '🚫', popular: false },
    { id: 'no_guest_posts', label: 'Not Accepting Guest Posts', icon: '✋', popular: false },
    { id: 'technical_issues', label: 'Technical Issues (Site Down/Slow)', icon: '⚠️', popular: false },
    { id: 'competitor', label: 'Competitor Site', icon: '🏢', popular: false },
    { id: 'other', label: 'Other', icon: '❓', popular: false }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ reason: selectedReason, notes });
      onClose();
      setSelectedReason('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto transform transition-all">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {userType === 'account' ? '🤔 Why skip this site?' : 'Rejection Reason'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{siteDomain}</span> • Help us understand your preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-800 mb-4">
              {userType === 'account' ? 'Most common reasons:' : 'Primary reason:'}
            </label>
            
            {/* Popular reasons first */}
            <div className="space-y-3 mb-4">
              {commonReasons.filter(r => r.popular).map((reason) => (
                <label 
                  key={reason.id} 
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-200 ${
                    selectedReason === reason.label 
                      ? 'border-blue-500 bg-blue-50 text-blue-900' 
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.label}
                    checked={selectedReason === reason.label}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-lg mr-3">{reason.icon}</span>
                  <span className="font-medium">{reason.label}</span>
                  {selectedReason === reason.label && (
                    <CheckCircle className="h-5 w-5 text-blue-600 ml-auto" />
                  )}
                </label>
              ))}
            </div>
            
            {/* Other reasons */}
            <details className="group">
              <summary className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium text-gray-700">Other reasons</span>
                <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-2 pl-3">
                {commonReasons.filter(r => !r.popular).map((reason) => (
                  <label 
                    key={reason.id} 
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedReason === reason.label 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'text-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.label}
                      checked={selectedReason === reason.label}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-base mr-2">{reason.icon}</span>
                    <span className="text-sm">{reason.label}</span>
                    {selectedReason === reason.label && (
                      <CheckCircle className="h-4 w-4 text-blue-600 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            </details>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              📝 Additional details <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={userType === 'account' 
                ? "e.g., 'Price is too high for our budget' or 'Looking for sites with higher traffic'..." 
                : "Additional context about this rejection..."}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedReason || isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  {userType === 'account' ? 'Skipping...' : 'Rejecting...'}
                </>
              ) : (
                <>
                  {userType === 'account' ? '⏭️ Skip This Site' : '❌ Reject Site'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Permission-based configuration
export interface TablePermissions {
  canChangeStatus?: boolean;
  canAssignTargetPages?: boolean;
  canApproveReject?: boolean;
  canGenerateWorkflows?: boolean;
  canMarkSitesReady?: boolean;
  canViewInternalTools?: boolean;
  canViewPricing?: boolean;
  canEditPricing?: boolean;
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
  client?: {
    id: string;
    name: string;
    website: string;
  };
  targetPageUrl?: string;
  targetPageId?: string;
  anchorText?: string;
  status: string;
  assignedDomainId?: string;
  assignedDomain?: any; // Changed to any to match actual data structure
  estimatedPrice?: number;
  wholesalePrice?: number;
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
  useLineItems = true, // FORCED: Migration to lineItems in progress
  benchmarkData
}: OrderSiteReviewTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set() // Will be populated with all group IDs after render
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  
  // Auto-expand all groups on mount
  React.useEffect(() => {
    if (orderGroups.length > 0) {
      setExpandedGroups(new Set(orderGroups.map(g => g.id)));
    } else if (lineItems.length > 0) {
      // For virtual groups from lineItems
      const clientIds = new Set(lineItems.map(item => item.clientId));
      setExpandedGroups(clientIds);
    }
  }, [orderGroups, lineItems]);
  
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
  
  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    submissionId: string;
    groupId: string;
    siteDomain: string;
  } | null>(null);

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

  // Filter and sort submissions by all criteria
  const filterSubmissions = (submissions: SiteSubmission[]): SiteSubmission[] => {
    const filtered = submissions.filter(submission => {
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

    // Sort submissions: 'included' first, then 'saved_for_later', then others
    return filtered.sort((a, b) => {
      const statusA = getInclusionStatus(a);
      const statusB = getInclusionStatus(b);
      
      // Priority order: included (1), saved_for_later (2), excluded (3)
      const getPriority = (status: string) => {
        switch (status) {
          case 'included': return 1;
          case 'saved_for_later': return 2;
          case 'excluded': return 3;
          default: return 4;
        }
      };
      
      return getPriority(statusA) - getPriority(statusB);
    });
  };

  // Get status badge color
  const getStatusColor = (status: 'included' | 'excluded' | 'saved_for_later') => {
    switch (status) {
      case 'included': return 'bg-green-100 text-green-800 border-green-300';
      case 'excluded': return 'bg-red-100 text-red-800 border-red-300';
      case 'saved_for_later': return userType === 'account' 
        ? 'bg-purple-100 text-purple-800 border-purple-300' 
        : 'bg-yellow-100 text-yellow-800 border-yellow-300';
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
    
    // If user is excluding a site, show feedback modal to collect reason
    if (status === 'excluded') {
      // Find the submission to get the site domain
      const submission = Object.values(siteSubmissions)
        .flat()
        .find(s => s.id === submissionId);
      
      const siteDomain = submission?.domain?.domain || submission?.domainId || 'Unknown site';
      
      setFeedbackModal({
        isOpen: true,
        submissionId,
        groupId,
        siteDomain
      });
      return;
    }
    
    // For non-excluded status changes, proceed immediately
    setActionLoading({ ...actionLoading, [submissionId]: true });
    try {
      await onChangeInclusionStatus(submissionId, groupId, status);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to change status:', error);
    } finally {
      setActionLoading({ ...actionLoading, [submissionId]: false });
    }
  };

  const handleFeedbackSubmit = async (feedback: { reason: string; notes: string }) => {
    if (!feedbackModal || !onChangeInclusionStatus) return;

    const { submissionId, groupId } = feedbackModal;
    
    setActionLoading({ ...actionLoading, [submissionId]: true });
    try {
      const combinedReason = feedback.notes 
        ? `${feedback.reason}: ${feedback.notes}`
        : feedback.reason;
        
      await onChangeInclusionStatus(submissionId, groupId, 'excluded', combinedReason);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to change status:', error);
    } finally {
      setActionLoading({ ...actionLoading, [submissionId]: false });
      setFeedbackModal(null);
    }
  };

  const toggleExpandedDomain = (submissionId: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedDomains(newExpanded);
  };

  const handleRequestMoreSites = async (groupId: string, groupData: OrderGroup) => {
    const submissions = siteSubmissions[groupId] || [];
    const approvedCount = submissions.filter(s => getInclusionStatus(s) === 'included').length;
    const rejectedSubmissions = submissions.filter(s => getInclusionStatus(s) === 'excluded');
    const shortfallCount = Math.max(0, groupData.linkCount - approvedCount);
    
    if (shortfallCount <= 0) {
      alert('No additional sites needed - you have already approved enough sites!');
      return;
    }

    // Collect rejection reasons from the excluded submissions
    const rejectionReasons: Record<string, { reason: string; notes: string }> = {};
    rejectedSubmissions.forEach(submission => {
      if (submission.exclusionReason) {
        const [reason, ...notesParts] = submission.exclusionReason.split(': ');
        rejectionReasons[submission.id] = {
          reason: reason || 'Other',
          notes: notesParts.join(': ') || ''
        };
      }
    });

    // Prompt for general feedback
    const generalFeedback = prompt(
      `You've approved ${approvedCount} of ${groupData.linkCount} requested sites. ` +
      `We'll request ${shortfallCount} additional sites.\n\n` +
      `Any specific requirements for the additional sites? (Optional)`
    ) || '';

    setActionLoading({ ...actionLoading, [`request-more-${groupId}`]: true });
    try {
      const response = await fetch(`/api/orders/${orderId}/groups/${groupId}/request-more-sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shortfallCount,
          rejectionReasons,
          requestedTotal: groupData.linkCount,
          approvedCount,
          generalFeedback
        })
      });

      if (!response.ok) {
        throw new Error('Failed to request more sites');
      }

      const result = await response.json();
      
      // Show success message
      alert(`✅ Successfully requested ${shortfallCount} additional sites. ` +
            `Our team will find more sites based on your feedback and notify you when ready for review.`);
            
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to request more sites:', error);
      alert('❌ Failed to request more sites. Please try again or contact support.');
    } finally {
      setActionLoading({ ...actionLoading, [`request-more-${groupId}`]: false });
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
      {(() => {
        // Handle migration: Create virtual groups from lineItems when orderGroups is empty
        let groupsToRender = orderGroups;
        
        if (orderGroups.length === 0 && lineItems.length > 0) {
          console.log('[DEBUG] Creating virtual groups from lineItems:', lineItems);
          // Create virtual groups from lineItems by client
          const clientsMap = new Map();
          lineItems.forEach(item => {
            if (!clientsMap.has(item.clientId)) {
              // Get client info from the first line item for this client
              const clientLineItem = lineItems.find(li => li.clientId === item.clientId && li.client);
              const client = clientLineItem?.client || item.client || { 
                id: item.clientId, 
                name: 'Unknown Client', 
                website: '' 
              };
              
              console.log('[DEBUG] Creating virtual group for client:', client);
              
              clientsMap.set(item.clientId, {
                id: item.clientId, // Use clientId as virtual group ID
                clientId: item.clientId,
                client: client,
                linkCount: lineItems.filter(li => li.clientId === item.clientId).length,
                bulkAnalysisProjectId: item.metadata?.bulkAnalysisProjectId,
                targetPages: [],
                anchorTexts: [],
                groupStatus: 'sites_ready',
                siteSelections: { approved: 0, pending: 0, total: 0 }
              });
            }
          });
          groupsToRender = Array.from(clientsMap.values());
          console.log('[DEBUG] Virtual groups created:', groupsToRender);
        }
        
        return groupsToRender.map(group => {
        // Create virtual submissions from lineItems if no actual submissions exist
        // Check both group.id and group.clientId since virtual groups use clientId as id
        let submissions = siteSubmissions[group.id] || siteSubmissions[group.clientId] || [];
        
        if (submissions.length === 0 && lineItems.length > 0) {
          console.log('[DEBUG] Creating virtual submissions for group:', group.id, 'clientId:', group.clientId);
          // Create virtual submissions from lineItems for this client
          const clientLineItems = lineItems.filter(item => item.clientId === group.clientId);
          console.log('[DEBUG] Found client line items:', clientLineItems);
          submissions = clientLineItems.map(item => {
            console.log('[DEBUG] Creating submission from item:', {
              id: item.id,
              targetPageUrl: item.targetPageUrl,
              anchorText: item.anchorText,
              assignedDomain: item.assignedDomain
            });
            // Extract domain data from assignedDomain object
            const domainData = item.assignedDomain || {};
            const domainRating = domainData.evidence?.da || parseInt(domainData.authorityDirect) || null;
            const traffic = domainData.evidence?.traffic || domainData.traffic || null;
            
            // Parse traffic string if needed (e.g., "1.2M" -> 1200000)
            let trafficNumber = null;
            if (traffic) {
              if (typeof traffic === 'string') {
                const match = traffic.match(/^([\d.]+)([KMB])?$/i);
                if (match) {
                  trafficNumber = parseFloat(match[1]);
                  if (match[2]) {
                    const multiplier = { 'K': 1000, 'M': 1000000, 'B': 1000000000 }[match[2].toUpperCase()];
                    trafficNumber *= multiplier || 1;
                  }
                }
              } else {
                trafficNumber = traffic;
              }
            }
            
            const submission = {
              id: item.id,
              orderId: item.orderId,
              groupId: group.id,
              orderGroupId: group.id, // Add missing property
              domainId: item.assignedDomainId || '',
              domain: domainData,
              domainRating: domainRating,
              traffic: trafficNumber,
              targetPageUrl: item.targetPageUrl || '',
              anchorText: item.anchorText || '',
              price: item.wholesalePrice || item.estimatedPrice || 0,
              inclusionStatus: 'included' as const,
              selectionPool: 'primary' as const,
              poolRank: 1,
              status: (item.status as any) || 'pending', // Add missing property
              metadata: {
                ...item.metadata,
                qualificationStatus: domainData.qualificationStatus,
                hasDataForSeoResults: domainData.hasDataForSeoResults,
                domainRating: domainRating,
                traffic: trafficNumber
              }
            };
            console.log('[DEBUG] Created submission:', submission);
            return submission;
          });
        }
        
        console.log('[DEBUG] siteSubmissions[group.id]:', siteSubmissions[group.id]);
        console.log('[DEBUG] siteSubmissions[group.clientId]:', siteSubmissions[group.clientId]);
        console.log('[DEBUG] virtual submissions:', submissions);
        const allSubmissions = siteSubmissions[group.id] || siteSubmissions[group.clientId] || submissions; // Use virtual submissions if no real ones
        console.log('[DEBUG] allSubmissions being used:', allSubmissions);
        const filteredSubmissions = filterSubmissions(allSubmissions);
        const includedCount = allSubmissions.filter(s => getInclusionStatus(s) === 'included').length;
        const excludedCount = allSubmissions.filter(s => getInclusionStatus(s) === 'excluded').length;
        const savedCount = allSubmissions.filter(s => getInclusionStatus(s) === 'saved_for_later').length;
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

              {/* Request More Sites Button - Show for account users when they have shortfall */}
              {userType === 'account' && includedCount < group.linkCount && excludedCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent group toggle
                    handleRequestMoreSites(group.id, group);
                  }}
                  disabled={actionLoading[`request-more-${group.id}`]}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {actionLoading[`request-more-${group.id}`] ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Request More Sites ({group.linkCount - includedCount})
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Submissions Table - Desktop */}
            {expandedGroups.has(group.id) && (
              <>
                {/* Mobile Cards View */}
                <div className="md:hidden p-4 space-y-4">
                  {filteredSubmissions.map(submission => {
                    const status = getInclusionStatus(submission);
                    const benchmarkStatus = getBenchmarkStatus(submission, group.id);
                    const assignedLineItem = useLineItems ? lineItems.find(
                      item => item.assignedDomainId === submission.domainId
                    ) : null;

                    return (
                      <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        {/* Header with checkbox and domain */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(submission.id)}
                              onChange={() => toggleRowSelection(submission.id)}
                              className="mt-1 rounded"
                            />
                            <div>
                              <DomainCell domain={submission.domain} domainId={submission.domainId} />
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span>DR: {submission.domainRating || submission.metadata?.domainRating || '-'}</span>
                                <span>Traffic: {submission.traffic || submission.metadata?.traffic ? 
                                  `${((submission.traffic || submission.metadata?.traffic || 0) / 1000).toFixed(0)}k` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Line Item Assignment (if enabled) */}
                        {useLineItems && (
                          <div className="mb-3 p-2 bg-gray-50 rounded">
                            <label className="text-xs text-gray-500 font-medium">Line Item Assignment</label>
                            <div className="text-sm text-gray-900 mt-1">
                              {assignedLineItem ? 
                                `#${assignedLineItem.id.slice(0, 8)} - ${assignedLineItem.targetPageUrl}` :
                                'Not assigned'
                              }
                            </div>
                          </div>
                        )}

                        {/* Target Page & Anchor Text */}
                        <div className="space-y-2 mb-3">
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Target Page</label>
                            <p className="text-sm text-gray-900 break-all">
                              {submission.targetPageUrl || assignedLineItem?.targetPageUrl || '-'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Anchor Text</label>
                            <p className="text-sm text-gray-900">
                              {submission.anchorText || assignedLineItem?.anchorText || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        {permissions.canViewPricing && (
                          <div className="mb-3">
                            <label className="text-xs text-gray-500 font-medium">Investment</label>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(submission.price || 0)}
                            </p>
                          </div>
                        )}

                        {/* Status Selection - Mobile */}
                        <div className="mb-3">
                          <label className="text-xs text-gray-500 font-medium mb-1 block">Status</label>
                          {permissions.canChangeStatus ? (
                            <select
                              value={status}
                              onChange={(e) => handleChangeStatus(
                                submission.id, 
                                group.id, 
                                e.target.value as 'included' | 'excluded' | 'saved_for_later'
                              )}
                              className={`w-full px-3 py-2 text-sm rounded-lg border min-h-[44px] ${getStatusColor(status)}`}
                              disabled={actionLoading[submission.id]}
                            >
                              <option value="included">{userType === 'account' ? '✅ Use This Site' : '✓ Included'}</option>
                              <option value="excluded">{userType === 'account' ? '❌ Not Interested' : '✗ Excluded'}</option>
                              <option value="saved_for_later">{userType === 'account' ? '💾 Save for Later' : '⏸ Saved'}</option>
                            </select>
                          ) : (
                            <div className={`px-3 py-2 text-sm rounded-lg text-center ${getStatusColor(status)}`}>
                              {status === 'included' && (userType === 'account' ? '✅ Using This Site' : '✓ Included')}
                              {status === 'excluded' && (userType === 'account' ? '❌ Not Interested' : '✗ Excluded')}
                              {status === 'saved_for_later' && (userType === 'account' ? '💾 Saved for Later' : '⏸ Saved')}
                            </div>
                          )}
                          {status === 'excluded' && submission.exclusionReason && (
                            <div className="text-xs text-red-600 mt-1">
                              Reason: {submission.exclusionReason}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">

                          <button
                            onClick={() => toggleExpandedDomain(submission.id)}
                            className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 min-h-[44px] flex items-center justify-center"
                          >
                            {expandedDomains.has(submission.id) ? 'Less Info' : 'More Info'}
                          </button>
                        </div>

                        {/* Expanded Domain Details */}
                        {expandedDomains.has(submission.id) && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <ExpandedDomainDetails 
                              submission={submission}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-600 border-b">
                        <th className="pb-2 pr-2">
                          <input
                            type="checkbox"
                            checked={filteredSubmissions.length > 0 && filteredSubmissions.every(s => selectedRows.has(s.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAll(filteredSubmissions);
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
                    {filteredSubmissions.map(submission => {
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
                              {submission.domainRating || '-'}
                            </td>
                            <td className="py-3 text-center">
                              {submission.traffic ? 
                                (typeof submission.traffic === 'number' ? 
                                  submission.traffic.toLocaleString() : 
                                  submission.traffic) :
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
                                <option value="included">{userType === 'account' ? '✅ Use This Site' : '✓ Included'}</option>
                                <option value="excluded">{userType === 'account' ? '❌ Not Interested' : '✗ Excluded'}</option>
                                <option value="saved_for_later">{userType === 'account' ? '💾 Save for Later' : '⏸ Saved'}</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-sm rounded ${getStatusColor(status)}`}>
                                {status === 'included' && (userType === 'account' ? '✅ Using' : '✓ Included')}
                                {status === 'excluded' && (userType === 'account' ? '❌ Skipped' : '✗ Excluded')}
                                {status === 'saved_for_later' && (userType === 'account' ? '💾 Banked' : '⏸ Saved')}
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
                            {(() => {
                              console.log('[RENDER] Submission target:', submission.id, submission.targetPageUrl);
                              return submission.targetPageUrl || '-';
                            })()}
                          </td>
                          <td className="py-3 text-sm">
                            {(() => {
                              console.log('[RENDER] Submission anchor:', submission.id, submission.anchorText);
                              return submission.anchorText || '-';
                            })()}
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
              </>
            )}
          </div>
        );
      });
      })()}

      {/* Edit Modal */}
      {editingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Submission</h3>
            
            <div className="space-y-4">
              {/* Target Page Selection with Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">Target Page & Anchor Text</label>
                {(() => {
                  // Find the group for this submission
                  const group = orderGroups.find(g => g.id === editingSubmission.groupId);
                  const targetPages: Array<{ url: string; anchorText?: string; requestedLinks?: number }> = [];
                  
                  // Build target pages array with anchor texts
                  if (group?.targetPages) {
                    group.targetPages.forEach((page, index) => {
                      targetPages.push({
                        url: page.url,
                        anchorText: group.anchorTexts?.[index] || '',
                        requestedLinks: 1
                      });
                    });
                  }
                  
                  // If we have benchmark data, prefer that
                  if (benchmarkData?.benchmarkData?.clientGroups) {
                    const benchmarkGroup = benchmarkData.benchmarkData.clientGroups.find(
                      (bg: any) => bg.clientId === group?.clientId
                    );
                    
                    if (benchmarkGroup?.targetPages) {
                      // Clear and rebuild from benchmark
                      targetPages.length = 0;
                      benchmarkGroup.targetPages.forEach((page: any) => {
                        // Check if page has requestedDomains with anchor texts
                        if (page.requestedDomains && page.requestedDomains.length > 0) {
                          const anchors = new Set<string>();
                          page.requestedDomains.forEach((domain: any) => {
                            if (domain.anchorText) {
                              anchors.add(domain.anchorText);
                            }
                          });
                          
                          if (anchors.size > 0) {
                            // Create entry for each unique anchor text
                            anchors.forEach(anchorText => {
                              targetPages.push({
                                url: page.url,
                                anchorText: anchorText,
                                requestedLinks: page.requestedLinks || 1
                              });
                            });
                          } else {
                            // No specific anchors, add without
                            targetPages.push({
                              url: page.url,
                              requestedLinks: page.requestedLinks || 1
                            });
                          }
                        } else {
                          // No requested domains, use basic info
                          targetPages.push({
                            url: page.url,
                            requestedLinks: page.requestedLinks || 1
                          });
                        }
                      });
                    }
                  }
                  
                  return (
                    <TargetPageSelector
                      value={{
                        targetPageUrl: editingSubmission.targetPageUrl,
                        anchorText: editingSubmission.anchorText
                      }}
                      onChange={({ targetPageUrl, anchorText }) => {
                        setEditingSubmission({
                          ...editingSubmission,
                          targetPageUrl,
                          anchorText
                        });
                      }}
                      availableTargetPages={targetPages}
                      groupName={group?.client?.name}
                      allowCustom={true}
                    />
                  );
                })()}
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
              
              {permissions.canEditPricing && (
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
              )}
              
              {userType === 'internal' && (
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal?.isOpen || false}
        siteDomain={feedbackModal?.siteDomain || ''}
        onClose={() => setFeedbackModal(null)}
        onSubmit={handleFeedbackSubmit}
        userType={userType}
      />
    </div>
  );
}