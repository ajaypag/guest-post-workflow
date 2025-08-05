'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, Globe, LinkIcon, DollarSign, ExternalLink, 
  ChevronDown, ChevronUp, ChevronRight, AlertCircle, CheckCircle,
  Target, Package, Database, Activity, Users, RefreshCw,
  Sparkles, Search, Clock, XCircle, Info
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

// Permission-based configuration
export interface TablePermissions {
  canRebalancePools?: boolean;
  canAssignTargetPages?: boolean;
  canSwitchPools?: boolean;
  canApproveReject?: boolean;
  canGenerateWorkflows?: boolean;
  canMarkSitesReady?: boolean;
  canViewInternalTools?: boolean;
  canViewPricing?: boolean;
  canEditDomainAssignments?: boolean;
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

export interface SiteSubmission {
  id: string;
  orderGroupId: string;
  domainId: string;
  domain: {
    id: string;
    domain: string;
    qualificationStatus?: string;
    notes?: string;
  } | null;
  domainRating?: number;
  traffic?: number;
  price: number;
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
  siteSubmissions: Record<string, SiteSubmission[]>;
  userType: 'internal' | 'account';
  permissions: TablePermissions;
  workflowStage?: string;
  onAssignTargetPage?: (submissionId: string, targetPageUrl: string, groupId: string) => Promise<void>;
  onSwitchPool?: (submissionId: string, groupId: string) => Promise<void>;
  onApprove?: (submissionId: string, groupId: string) => Promise<void>;
  onReject?: (submissionId: string, groupId: string, reason: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  selectedSubmissions?: Set<string>;
  onSelectionChange?: (submissionId: string, selected: boolean) => void;
}

export default function OrderSiteReviewTable({
  orderId,
  orderGroups,
  siteSubmissions,
  userType,
  permissions,
  workflowStage = 'site_selection_with_sites',
  onAssignTargetPage,
  onSwitchPool,
  onApprove,
  onReject,
  onRefresh,
  selectedSubmissions,
  onSelectionChange
}: OrderSiteReviewTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(orderGroups.map(g => g.id))
  );
  const [editingLineItem, setEditingLineItem] = useState<{ groupId: string; index: number } | null>(null);
  const [assigningDomain, setAssigningDomain] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Handle click outside and escape key for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.edit-dropdown')) {
        setEditingLineItem(null);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingLineItem(null);
      }
    };

    if (editingLineItem) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [editingLineItem]);

  // Column configuration based on workflow stage and permissions
  const getColumnConfig = useCallback(() => {
    // Dynamic columns based on workflow stage
    switch (workflowStage) {
      case 'site_selection_with_sites':
        return {
          columns: ['client', 'link_details', 'site', 'status', 
            ...(permissions.canViewInternalTools ? ['tools'] : [])]
        };
      case 'post_approval':
        return {
          columns: ['client', 'link_details', 'site', 'status',
            ...(permissions.canViewInternalTools ? ['tools'] : [])]
        };
      case 'content_creation':
        return {
          columns: ['client', 'link_details', 'site', 'content_status', 'draft_url',
            ...(permissions.canViewInternalTools ? ['tools'] : [])]
        };
      case 'completed':
        return {
          columns: ['client', 'link_details', 'site', 'published_url', 'completion']
        };
      default:
        // Initial stage - separate columns
        return {
          columns: ['client', 'anchor', 
            ...(permissions.canViewPricing ? ['price'] : []),
            ...(permissions.canViewInternalTools ? ['tools'] : [])]
        };
    }
  }, [permissions, userType, workflowStage]);

  const columnConfig = getColumnConfig();

  // Column header renderer
  const getColumnHeader = (column: string) => {
    switch (column) {
      case 'client': return 'Client / Target Page';
      case 'anchor': return 'Anchor Text';
      case 'link_details': return 'Link Details';
      case 'site': return 'Guest Post Site';
      case 'price': return 'Price';
      case 'status': return 'Status';
      case 'content_status': return 'Content Status';
      case 'draft_url': return 'Draft URL';
      case 'published_url': return 'Published URL';
      case 'completion': return 'Completion';
      case 'tools': return 'Internal Tools';
      default: return column;
    }
  };

  // Link Details Cell Component
  const LinkDetailsCell = ({ targetPageUrl, anchorText, price }: { 
    targetPageUrl?: string; 
    anchorText?: string; 
    price?: number; 
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <Globe className="h-3 w-3 text-gray-400 flex-shrink-0" />
        {targetPageUrl ? (
          <a href={targetPageUrl} target="_blank" rel="noopener noreferrer" 
             className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[200px]"
             title={targetPageUrl}>
            {(() => {
              try {
                const url = new URL(targetPageUrl);
                return url.pathname;
              } catch {
                return targetPageUrl;
              }
            })()}
          </a>
        ) : (
          <span className="text-gray-400 italic">No target page</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <LinkIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-700 truncate" title={anchorText}>
          {anchorText || <span className="text-gray-400 italic">No anchor text</span>}
        </span>
      </div>
      {permissions.canViewPricing && price !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <span className="font-medium text-gray-900">{formatCurrency(price)}</span>
        </div>
      )}
    </div>
  );

  // Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'client_approved': return 'bg-green-100 text-green-800';
        case 'client_rejected': return 'bg-red-100 text-red-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'submitted': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'client_approved': return 'Approved';
        case 'client_rejected': return 'Rejected';
        case 'pending': return 'Pending Review';
        case 'submitted': return 'Submitted';
        default: return status;
      }
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };


  // Handle domain switching
  const handleSwitchDomain = async (submissionId: string, groupId: string) => {
    if (!onSwitchPool) return;
    
    setAssigningDomain(submissionId);
    try {
      await onSwitchPool(submissionId, groupId);
    } catch (error) {
      console.error('Error switching domain:', error);
    } finally {
      setAssigningDomain(null);
    }
  };

  // Cell renderer
  const renderTableCell = (
    column: string,
    data: {
      group: OrderGroup;
      index: number;
      targetPageUrl?: string;
      anchorText?: string;
      displaySubmission?: SiteSubmission | null;
      availableForTarget: SiteSubmission[];
      showPoolView?: boolean;
      groupId: string;
    }
  ) => {
    const { group, index, targetPageUrl, anchorText, displaySubmission, availableForTarget, groupId } = data;

    switch (column) {
      case 'client':
        return (
          <td className="px-6 py-4 pl-8">
            <div className="flex items-center gap-2">
              {data.showPoolView && availableForTarget.length > 1 && (
                <button
                  className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded"
                  onClick={() => setEditingLineItem(
                    editingLineItem?.groupId === groupId && editingLineItem?.index === index 
                      ? null 
                      : { groupId, index }
                  )}
                  title={`${availableForTarget.length} alternative domains available`}
                >
                  {editingLineItem?.groupId === groupId && editingLineItem?.index === index ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}
              <div className="space-y-1">
                <div className="font-medium text-gray-900">{group.client.name}</div>
                {targetPageUrl && (
                  <div className="text-xs text-gray-500 truncate max-w-[200px]" title={targetPageUrl}>
                    {(() => {
                      try {
                        const url = new URL(targetPageUrl);
                        return url.pathname;
                      } catch {
                        return targetPageUrl;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          </td>
        );

      case 'link_details':
        return (
          <td className="px-6 py-4 text-sm">
            <LinkDetailsCell 
              targetPageUrl={targetPageUrl}
              anchorText={anchorText}
              price={displaySubmission?.price}
            />
          </td>
        );

      case 'site':
        return (
          <td className="px-6 py-4 text-sm">
            {displaySubmission ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <a href={`https://${displaySubmission.domain?.domain}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-600 hover:text-blue-800 hover:underline font-medium relative"
                       onMouseEnter={(e) => {
                         // Debug: Log what data we have
                         console.log('Domain hover data:', {
                           id: displaySubmission.id,
                           domain: displaySubmission.domain?.domain,
                           notes: displaySubmission.domain?.notes,
                           aiReasoning: displaySubmission.metadata?.aiQualificationReasoning,
                           topicReasoning: displaySubmission.metadata?.topicReasoning,
                           metadata: displaySubmission.metadata
                         });
                         
                         if (displaySubmission.domain?.notes || displaySubmission.metadata?.aiQualificationReasoning || displaySubmission.metadata?.topicReasoning) {
                           const rect = e.currentTarget.getBoundingClientRect();
                           setTooltipPosition({ x: rect.left, y: rect.bottom + 5 });
                           setHoveredDomain(displaySubmission.id);
                         }
                       }}
                       onMouseLeave={() => setHoveredDomain(null)}>
                      {displaySubmission.domain?.domain}
                      {(displaySubmission.domain?.notes || displaySubmission.metadata?.aiQualificationReasoning || displaySubmission.metadata?.topicReasoning) && (
                        <Info className="inline-block w-3 h-3 ml-1 text-gray-400" />
                      )}
                    </a>
                    {displaySubmission.selectionPool && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        displaySubmission.selectionPool === 'primary' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {displaySubmission.selectionPool === 'primary' ? 'Primary' : 'Alt'} #{displaySubmission.poolRank}
                      </span>
                    )}
                  </div>
                  {permissions.canSwitchPools && availableForTarget.length > 1 && (
                    <button
                      className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded"
                      onClick={() => setEditingLineItem(
                        editingLineItem?.groupId === groupId && editingLineItem?.index === index 
                          ? null 
                          : { groupId, index }
                      )}
                      title={`${availableForTarget.length} available domains`}
                    >
                      {editingLineItem?.groupId === groupId && editingLineItem?.index === index ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {availableForTarget.filter(s => s.selectionPool === 'alternative').length} alternatives
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* DR and Traffic - TODO: Fetch from websites table */}
                  <span className="text-xs text-gray-500">
                    DR: N/A | Traffic: N/A
                  </span>
                  {/* Qualification Status */}
                  {displaySubmission.metadata?.qualificationStatus && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      displaySubmission.metadata.qualificationStatus === 'high_quality' 
                        ? 'bg-green-100 text-green-700' 
                        : displaySubmission.metadata.qualificationStatus === 'good_quality'
                        ? 'bg-blue-100 text-blue-700'
                        : displaySubmission.metadata.qualificationStatus === 'marginal_quality'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {displaySubmission.metadata.qualificationStatus === 'high_quality' ? '★★★' :
                       displaySubmission.metadata.qualificationStatus === 'good_quality' ? '★★' :
                       displaySubmission.metadata.qualificationStatus === 'marginal_quality' ? '★' :
                       displaySubmission.metadata.qualificationStatus}
                    </span>
                  )}
                  {/* DataForSEO indicator */}
                  {displaySubmission.metadata?.hasDataForSeoResults && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      SEO
                    </span>
                  )}
                  {/* Special instructions */}
                  {displaySubmission.specialInstructions && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700" title={displaySubmission.specialInstructions}>
                      Instructions
                    </span>
                  )}
                </div>
              </div>
            ) : permissions.canAssignTargetPages && availableForTarget.length > 0 ? (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <select
                  className="text-sm border-gray-300 rounded-md flex-1"
                  defaultValue=""
                  disabled={!!assigningDomain}
                  onChange={async (e) => {
                    if (e.target.value && targetPageUrl && onAssignTargetPage) {
                      // Update the selected domain's target URL
                      await onAssignTargetPage(e.target.value, targetPageUrl, groupId);
                    }
                  }}
                >
                  <option value="">Select from pool ({availableForTarget.length} available)</option>
                  {availableForTarget.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.domain?.domain} 
                      {sub.metadata?.targetPageUrl && sub.metadata.targetPageUrl !== targetPageUrl ? ' - suggested for other' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-gray-400 italic">No sites available</span>
            )}
          </td>
        );

      case 'status':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            {displaySubmission ? (
              <StatusBadge status={displaySubmission.submissionStatus || displaySubmission.status} />
            ) : (
              <span className="text-gray-400 italic">-</span>
            )}
          </td>
        );

      case 'tools':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
            <div className="flex items-center justify-end gap-2">
              {group.bulkAnalysisProjectId && (
                <a
                  href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                  className="text-indigo-600 hover:text-indigo-800"
                  title="View Bulk Analysis"
                >
                  <Database className="h-4 w-4" />
                </a>
              )}
              <button
                className="text-gray-400 hover:text-gray-600"
                title="More options"
              >
                <Activity className="h-4 w-4" />
              </button>
            </div>
          </td>
        );

      case 'price':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
            <span className="font-medium text-gray-900">
              {index === 0 && group.packagePrice ? formatCurrency(group.packagePrice) : 
               displaySubmission ? formatCurrency(displaySubmission.price) : '-'}
            </span>
          </td>
        );
        
      case 'anchor':
        return (
          <td className="px-6 py-4 text-sm text-gray-900">
            {anchorText || '-'}
          </td>
        );
        
      case 'content_status':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="text-gray-500">In Progress</span>
          </td>
        );
        
      case 'draft_url':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="text-gray-400 italic">Not ready</span>
          </td>
        );
        
      case 'published_url':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="text-gray-400 italic">Not published</span>
          </td>
        );
        
      case 'completion':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </td>
        );

      default:
        return <td className="px-6 py-4 text-sm">-</td>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage site selections
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={actionLoading.refresh}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <RefreshCw className={`h-4 w-4 ${actionLoading.refresh ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columnConfig.columns.map((column) => (
                <th
                  key={column}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column === 'tools' || column === 'price' ? 'text-right' : 'text-left'
                  }`}
                >
                  {getColumnHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderGroups.map((group) => {
              const groupSubmissions = siteSubmissions[group.id] || [];
              const isExpanded = expandedGroups.has(group.id);
              
              // Calculate assigned vs unassigned submissions
              const assignedSubmissions = groupSubmissions.filter(s => s.targetPageUrl || s.metadata?.targetPageUrl);
              const unassignedSubmissions = groupSubmissions.filter(s => !s.targetPageUrl && !s.metadata?.targetPageUrl);
              
              // Check if we should show pool view (more suggestions than needed or has unassigned)
              const showPoolView = groupSubmissions.length > group.linkCount || unassignedSubmissions.length > 0;
              
              return (
                <React.Fragment key={group.id}>
                  {/* Group Header Row */}
                  <tr className="bg-gray-50">
                    <td colSpan={columnConfig.columns.length} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedGroups);
                            if (isExpanded) {
                              newExpanded.delete(group.id);
                            } else {
                              newExpanded.add(group.id);
                            }
                            setExpandedGroups(newExpanded);
                          }}
                          className="flex items-center gap-6 text-left flex-1"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{group.client.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {group.linkCount} link{group.linkCount > 1 ? 's' : ''} needed
                              </div>
                            </div>
                          </div>
                          {groupSubmissions.length > 0 && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500">
                                {groupSubmissions.length} site{groupSubmissions.length !== 1 ? 's' : ''} suggested
                              </span>
                              {(() => {
                                const approvedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_approved').length;
                                const pendingCount = groupSubmissions.filter(s => s.submissionStatus === 'pending').length;
                                const rejectedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_rejected').length;
                                return (
                                  <>
                                    {approvedCount > 0 && (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle className="h-3 w-3" />
                                        {approvedCount} approved
                                      </span>
                                    )}
                                    {pendingCount > 0 && (
                                      <span className="flex items-center gap-1 text-yellow-600">
                                        <Clock className="h-3 w-3" />
                                        {pendingCount} pending
                                      </span>
                                    )}
                                    {rejectedCount > 0 && (
                                      <span className="flex items-center gap-1 text-red-600">
                                        <XCircle className="h-3 w-3" />
                                        {rejectedCount} rejected
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                          <div className="ml-auto">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </button>
                        {group.bulkAnalysisProjectId && permissions.canViewInternalTools && (
                          <a
                            href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 ml-4"
                          >
                            <Database className="h-3 w-3 mr-1" />
                            Bulk Analysis
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <>
                      {/* Render rows based on link count */}
                      {Array.from({ length: group.linkCount }, (_, index) => {
                        const targetPageUrl = group.targetPages?.[index]?.url;
                        const anchorText = group.anchorTexts?.[index];
                        
                        // Pool-based selection logic
                        const matchingSubmissions = groupSubmissions.filter(sub => 
                          sub.targetPageUrl === targetPageUrl || sub.metadata?.targetPageUrl === targetPageUrl
                        );
                        
                        const primarySubmissions = matchingSubmissions
                          .filter(sub => sub.selectionPool === 'primary')
                          .sort((a, b) => (a.poolRank || 1) - (b.poolRank || 1));
                        
                        const displaySubmission = primarySubmissions[index] || null;
                        
                        const availableForTarget = groupSubmissions.filter(sub => {
                          const isForThisTarget = sub.targetPageUrl === targetPageUrl || 
                                                 sub.metadata?.targetPageUrl === targetPageUrl;
                          const isUnassigned = !sub.targetPageUrl && !sub.metadata?.targetPageUrl;
                          const isNotRejected = sub.submissionStatus !== 'client_rejected';
                          
                          return (isForThisTarget || isUnassigned) && isNotRejected;
                        });
                        
                        return (
                          <React.Fragment key={`${group.id}-${index}`}>
                            <tr className="hover:bg-gray-50">
                              {columnConfig.columns.map((column) => 
                                renderTableCell(column, {
                                  group,
                                  index,
                                  targetPageUrl,
                                  anchorText,
                                  displaySubmission,
                                  availableForTarget,
                                  showPoolView,
                                  groupId: group.id
                                })
                              )}
                            </tr>
                            
                            {/* Expandable domain comparison - Full featured version */}
                            {editingLineItem?.groupId === group.id && 
                             editingLineItem?.index === index && 
                             availableForTarget.length > 1 && (
                              <tr className="bg-white border-l-4 border-indigo-200 edit-dropdown">
                                <td colSpan={columnConfig.columns.length} className="px-6 py-4">
                                  <div className="bg-gray-50 rounded-lg p-4 edit-dropdown">
                                    <div className="mb-3">
                                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                                        Domain Comparison ({availableForTarget.length} options)
                                      </h4>
                                      <p className="text-xs text-gray-600">
                                        Compare all available domains for this link placement
                                      </p>
                                    </div>
                                    
                                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Domain
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Keywords
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Authority
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Overlap
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Quality
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Actions
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {availableForTarget.map((submission, subIndex) => (
                                            <tr key={`${group.id}-${index}-sub-${subIndex}`} 
                                                className={submission.id === displaySubmission?.id ? 'bg-green-50' : 'hover:bg-gray-50'}>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                  {submission.id === displaySubmission?.id ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                  ) : (
                                                    <div className="w-4 h-4" />
                                                  )}
                                                  <div>
                                                    <div className="text-sm font-medium">
                                                      <a
                                                        href={`https://${submission.domain?.domain}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-900 hover:text-blue-600 hover:underline flex items-center gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title={`Visit ${submission.domain?.domain}`}
                                                      >
                                                        {submission.domain?.domain}
                                                        <ExternalLink className="w-3 h-3 text-gray-400" />
                                                      </a>
                                                    </div>
                                                    {submission.id === displaySubmission?.id && (
                                                      <span className="text-xs text-green-600 font-medium">Current selection</span>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs">
                                                  {(submission.domain as any)?.keywordCount ? (
                                                    <span className="font-medium text-gray-900">{(submission.domain as any).keywordCount} kw</span>
                                                  ) : submission.metadata?.evidence ? (
                                                    <span className="font-medium text-gray-900">
                                                      {submission.metadata.evidence.direct_count + submission.metadata.evidence.related_count} kw
                                                    </span>
                                                  ) : (
                                                    <span className="text-gray-500">No data</span>
                                                  )}
                                                  {(submission.domain as any)?.evidence || submission.metadata?.evidence ? (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                      {((submission.domain as any)?.evidence || submission.metadata?.evidence).direct_count > 0 && 
                                                        `${((submission.domain as any)?.evidence || submission.metadata?.evidence).direct_count} direct`}
                                                      {((submission.domain as any)?.evidence || submission.metadata?.evidence).direct_count > 0 && 
                                                       ((submission.domain as any)?.evidence || submission.metadata?.evidence).related_count > 0 && ', '}
                                                      {((submission.domain as any)?.evidence || submission.metadata?.evidence).related_count > 0 && 
                                                        `${((submission.domain as any)?.evidence || submission.metadata?.evidence).related_count} related`}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs">
                                                  {((submission.domain as any)?.authorityDirect || submission.metadata?.authorityDirect) && 
                                                   ((submission.domain as any)?.authorityDirect || submission.metadata?.authorityDirect) !== 'n/a' && (
                                                    <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mb-1 ${
                                                      ((submission.domain as any)?.authorityDirect || submission.metadata?.authorityDirect) === 'strong' ? 'bg-green-100 text-green-700' :
                                                      ((submission.domain as any)?.authorityDirect || submission.metadata?.authorityDirect) === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-red-100 text-red-700'
                                                    }`}>
                                                      Direct: {(submission.domain as any)?.authorityDirect || submission.metadata?.authorityDirect}
                                                    </div>
                                                  )}
                                                  {((submission.domain as any)?.authorityRelated || submission.metadata?.authorityRelated) && 
                                                   ((submission.domain as any)?.authorityRelated || submission.metadata?.authorityRelated) !== 'n/a' && (
                                                    <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                                      ((submission.domain as any)?.authorityRelated || submission.metadata?.authorityRelated) === 'strong' ? 'bg-green-100 text-green-700' :
                                                      ((submission.domain as any)?.authorityRelated || submission.metadata?.authorityRelated) === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-red-100 text-red-700'
                                                    }`}>
                                                      Related: {(submission.domain as any)?.authorityRelated || submission.metadata?.authorityRelated}
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                {((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) && (
                                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    ((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) === 'both' ? 'bg-purple-100 text-purple-700' :
                                                    ((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) === 'direct' ? 'bg-green-100 text-green-700' :
                                                    ((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) === 'related' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    <Target className="w-3 h-3 mr-1" />
                                                    {((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) === 'both' ? 'STRONGEST' :
                                                     ((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) === 'direct' ? 'VERY STRONG' :
                                                     ((submission.domain as any)?.overlapStatus || submission.metadata?.overlapStatus) === 'related' ? 'DECENT' :
                                                     'NO MATCH'}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                  {((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) && (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                                      ((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) === 'high_quality' ? 'bg-green-100 text-green-700' :
                                                      ((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) === 'good_quality' ? 'bg-blue-100 text-blue-700' :
                                                      ((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) === 'marginal_quality' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-gray-100 text-gray-600'
                                                    }`}>
                                                      {((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) === 'high_quality' ? '★★★' :
                                                       ((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) === 'good_quality' ? '★★' :
                                                       ((submission.domain as any)?.qualificationStatus || submission.metadata?.qualificationStatus) === 'marginal_quality' ? '★' :
                                                       '○'}
                                                    </span>
                                                  )}
                                                  {((submission.domain as any)?.hasDataForSeoResults || submission.metadata?.hasDataForSeoResults) && (
                                                    <span className="text-xs text-indigo-600 flex items-center">
                                                      <Database className="w-3 h-3 mr-1" />
                                                      SEO data
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                  {submission.id !== displaySubmission?.id && (
                                                    <>
                                                      {submission.selectionPool === 'primary' ? (
                                                        <span className="text-xs text-gray-500 italic">In use</span>
                                                      ) : (
                                                        <>
                                                          {permissions.canSwitchPools && (
                                                            <button 
                                                              className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                                              onClick={async (e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                await handleSwitchDomain(submission.id, group.id);
                                                              }}
                                                              disabled={!!assigningDomain}
                                                            >
                                                              {assigningDomain === submission.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                              ) : (
                                                                'Make Primary'
                                                              )}
                                                            </button>
                                                          )}
                                                          {permissions.canEditDomainAssignments && (
                                                            <button 
                                                              className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                                                              onClick={async (e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                // TODO: Implement add as new link functionality
                                                                console.log('Add as new link:', submission.id);
                                                              }}
                                                            >
                                                              Add as New Link
                                                            </button>
                                                          )}
                                                        </>
                                                      )}
                                                    </>
                                                  )}
                                                  {group.bulkAnalysisProjectId && submission.domainId && permissions.canViewInternalTools && (
                                                    <a
                                                      href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}?guided=${submission.domainId}`}
                                                      className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                      title="View detailed bulk analysis"
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      <Database className="w-3 h-3" />
                                                      Analysis
                                                      <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      
                      {/* Site Pool View - Only show when we have pool paradigm */}
                      {showPoolView && groupSubmissions.length > 0 && unassignedSubmissions.length > 0 && (
                        <>
                          <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td colSpan={columnConfig.columns.length} className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                            const newExpanded = new Set(expandedGroups);
                            if (isExpanded) {
                              newExpanded.delete(group.id);
                            } else {
                              newExpanded.add(group.id);
                            }
                            setExpandedGroups(newExpanded);
                          }}
                                  className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded"
                                  title={`${unassignedSubmissions.length} unassigned domains available`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4 text-gray-600" />
                                  )}
                                  <span className="text-xs text-gray-500 font-medium">
                                    {unassignedSubmissions.length} unassigned
                                  </span>
                                </button>
                                <Package className="h-4 w-4 text-gray-600" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    Site Pool
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    Additional suggestions available for selection
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={columnConfig.columns.length} className="px-6 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {unassignedSubmissions.map((submission) => (
                                    <div key={submission.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                          <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="text-sm font-medium text-gray-900">
                                                {submission.domain?.domain || 'Unknown'}
                                              </div>
                                              {group.bulkAnalysisProjectId && submission.domainId && permissions.canViewInternalTools && (
                                                <a
                                                  href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}?guided=${submission.domainId}`}
                                                  className="text-xs text-blue-600 hover:text-blue-800"
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  <ExternalLink className="h-3 w-3" />
                                                </a>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                              <span>DR: N/A</span>
                                              <span>•</span>
                                              <span>Traffic: N/A</span>
                                              {submission.metadata?.hasDataForSeoResults && (
                                                <>
                                                  <span>•</span>
                                                  <span className="text-blue-600">SEO Data</span>
                                                </>
                                              )}
                                            </div>
                                            {submission.metadata?.qualificationStatus && (
                                              <div className="mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                  submission.metadata.qualificationStatus === 'high_quality' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : submission.metadata.qualificationStatus === 'good_quality'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : submission.metadata.qualificationStatus === 'marginal_quality'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                  {submission.metadata.qualificationStatus === 'high_quality' ? '★★★' :
                                                   submission.metadata.qualificationStatus === 'good_quality' ? '★★' :
                                                   submission.metadata.qualificationStatus === 'marginal_quality' ? '★' :
                                                   submission.metadata.qualificationStatus}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {permissions.canAssignTargetPages && (
                                          <select
                                            className="text-xs border border-gray-300 rounded px-2 py-1"
                                            defaultValue=""
                                            onChange={async (e) => {
                                              if (e.target.value && onAssignTargetPage) {
                                                await onAssignTargetPage(submission.id, e.target.value, group.id);
                                              }
                                            }}
                                          >
                                            <option value="">Assign to...</option>
                                            {group.targetPages?.map((page, idx) => (
                                              <option key={idx} value={page.url}>
                                                Target {idx + 1}: {page.url}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* AI Reasoning Tooltip */}
      {hoveredDomain && (
        <div
          className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-md"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
          onMouseEnter={() => setHoveredDomain(hoveredDomain)}
          onMouseLeave={() => setHoveredDomain(null)}
        >
          {(() => {
            const submission = Object.values(siteSubmissions).flat().find(s => s.id === hoveredDomain);
            if (!submission) return null;
            
            return (
              <div className="space-y-2">
                {submission.domain?.notes && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Domain Notes:</p>
                    <p className="text-sm">{submission.domain.notes}</p>
                  </div>
                )}
                {submission.metadata?.aiQualificationReasoning && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">AI Analysis:</p>
                    <p className="text-sm whitespace-pre-wrap">{submission.metadata.aiQualificationReasoning}</p>
                  </div>
                )}
                {submission.metadata?.topicReasoning && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Topic Analysis:</p>
                    <p className="text-sm whitespace-pre-wrap">{submission.metadata.topicReasoning}</p>
                  </div>
                )}
                {submission.metadata?.qualificationStatus && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Qualification Status:</p>
                    <p className="text-sm capitalize">{submission.metadata.qualificationStatus.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {submission.metadata?.evidence && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Evidence:</p>
                    <p className="text-sm">
                      Direct: {submission.metadata.evidence.direct_count} results
                      {submission.metadata.evidence.direct_median_position && ` (median pos: ${submission.metadata.evidence.direct_median_position})`}
                    </p>
                    {submission.metadata.evidence.related_count > 0 && (
                      <p className="text-sm">
                        Related: {submission.metadata.evidence.related_count} results
                        {submission.metadata.evidence.related_median_position && ` (median pos: ${submission.metadata.evidence.related_median_position})`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}