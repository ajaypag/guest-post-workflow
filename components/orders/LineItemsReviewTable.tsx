'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Search, ChevronDown, ChevronRight, ChevronUp, Edit2, Edit, Trash2, 
  CheckCircle, XCircle, AlertCircle, Save, X, Plus, Filter,
  Square, CheckSquare, MinusSquare, Loader2, Globe
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import DomainCell from './DomainCell';
import ExpandedDomainDetails from './ExpandedDomainDetails';
import EnhancedTargetPageSelector from './EnhancedTargetPageSelector';
import TableTargetDropdown from './TableTargetDropdown';
import InlineAnchorEditor from './InlineAnchorEditor';
import StatusToggle from './StatusToggle';
import ActionColumnToggle from './ActionColumnToggle';
import DomainTags from './DomainTags';

// Simple hook to fetch workflow progress
const useWorkflowProgress = (workflowId?: string) => {
  const [progress, setProgress] = useState<{
    percentage: number;
    currentStep: string;
    isComplete: boolean;
  } | null>(null);

  useEffect(() => {
    if (!workflowId) return;
    
    // Fetch workflow progress
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/progress`);
        if (response.ok) {
          const data = await response.json();
          setProgress({
            percentage: data.completionPercentage || 0,
            currentStep: data.currentStepTitle || 'In Progress',
            isComplete: data.isComplete || false
          });
        }
      } catch (error) {
        console.error('Error fetching workflow progress:', error);
      }
    };

    fetchProgress();
  }, [workflowId]);

  return progress;
};

// Workflow Status Cell Component
const WorkflowStatusCell = ({ workflowId, userType }: { workflowId?: string; userType: 'internal' | 'account' }) => {
  const progress = useWorkflowProgress(workflowId);

  if (!workflowId) {
    return <span className="text-xs text-gray-400">No workflow</span>;
  }

  if (!progress) {
    return (
      <div className="space-y-1">
        {userType === 'internal' && (
          <Link 
            href={`/workflow/${workflowId}`}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
          >
            View →
          </Link>
        )}
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {userType === 'internal' && (
          <Link 
            href={`/workflow/${workflowId}`}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
          >
            View →
          </Link>
        )}
        <span className="text-xs font-medium text-gray-700">
          {progress.percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${
            progress.isComplete ? 'bg-green-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 truncate">
        {progress.isComplete ? 'Complete' : progress.currentStep}
      </div>
    </div>
  );
};

// ============ INTERFACES ============
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
  assignedDomain?: any;
  estimatedPrice?: number;
  wholesalePrice?: number;
  workflowId?: string;
  metadata?: any;
  modifiedAt?: string | Date; // For tracking when line item was last modified for invoice regeneration
  // Publisher attribution fields
  publisherId?: string | null;
  publisherOfferingId?: string | null;
  publisherPrice?: number | null;
  publisher?: {
    id: string;
    contactName?: string | null;
    companyName?: string | null;
    email: string;
  } | null;
}

interface TablePermissions {
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

interface LineItemsReviewTableProps {
  orderId: string;
  lineItems: LineItem[];
  userType: 'internal' | 'account';
  permissions?: TablePermissions;
  workflowStage?: string;
  benchmarkData?: any;
  // Event handlers
  onChangeStatus?: (itemId: string, status: 'included' | 'excluded', reason?: string) => Promise<void>;
  onEditItem?: (itemId: string, updates: any) => Promise<void>;
  onRemoveItem?: (itemId: string) => Promise<void>;
  onApprove?: (itemId: string, clientId: string) => Promise<void>;
  onReject?: (itemId: string, clientId: string, reason: string) => Promise<void>;
  onAssignTargetPage?: (itemId: string, targetPageUrl: string, clientId: string) => Promise<void>;
  onRequestMoreSites?: (clientId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

// ============ FEEDBACK MODAL ============
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

// ============ EDIT MODAL ============
interface EditModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
  permissions: TablePermissions;
  availableTargetPages?: any[];
}

function EditModal({ isOpen, item, onClose, onSave, permissions, availableTargetPages = [] }: EditModalProps) {
  const [targetPageUrl, setTargetPageUrl] = useState('');
  const [targetPageId, setTargetPageId] = useState<string | undefined>();
  const [anchorText, setAnchorText] = useState('');
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setTargetPageUrl(item.targetPageUrl || '');
      setTargetPageId(item.targetPageId);
      setAnchorText(item.anchorText || '');
      setPrice((item.estimatedPrice || 0) / 100);
      setNotes(item.notes || '');
    }
  }, [item]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        targetPageUrl,
        targetPageId,
        anchorText,
        priceOverride: price,
        specialInstructions: notes
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Submission</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {permissions.canAssignTargetPages && item && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Page URL
              </label>
              <EnhancedTargetPageSelector
                value={{ 
                  targetPageUrl, 
                  anchorText,
                  targetPageId 
                }}
                onChange={({ targetPageUrl: url, anchorText: text, targetPageId: id }) => {
                  setTargetPageUrl(url);
                  setTargetPageId(id);
                  if (text) setAnchorText(text);
                }}
                currentClientId={item.clientId}
                orderId={item.orderId}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Always show anchor text field for external users who can edit */}
          {(permissions.canEditDomainAssignments || permissions.canAssignTargetPages) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anchor Text
              </label>
              <input
                type="text"
                value={anchorText}
                onChange={(e) => setAnchorText(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Link text"
              />
            </div>
          )}

          {permissions.canEditPricing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Override ($)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any special instructions..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function LineItemsReviewTable({
  orderId,
  lineItems,
  userType,
  permissions = {},
  workflowStage = 'sites_ready',
  benchmarkData,
  onChangeStatus,
  onEditItem,
  onRemoveItem,
  onApprove,
  onReject,
  onAssignTargetPage,
  onRequestMoreSites,
  onRefresh
}: LineItemsReviewTableProps) {
  // Check if any workflows exist - determines workflow column visibility
  const hasAnyWorkflows = lineItems.some(item => item.workflowId);
  
  // State
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('none'); // Default to no sorting
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{
    isOpen: boolean;
    action: string;
    count: number;
  }>({ isOpen: false, action: '', count: 0 });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    itemId: string;
    clientId: string;
    domain: string;
  }>({ isOpen: false, itemId: '', clientId: '', domain: '' });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    item: any;
  }>({ isOpen: false, item: null });
  const [clientTargetPages, setClientTargetPages] = useState<Record<string, any[]>>({});
  const [loadingTargetPages, setLoadingTargetPages] = useState<Set<string>>(new Set());
  
  // Dropdown management state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    drMin: null as number | null,
    drMax: null as number | null,
    priceMin: null as number | null,
    priceMax: null as number | null,
    qualification: 'all',
    overlap: 'all'
  });

  // Fetch target pages for a client
  const fetchClientTargetPages = async (clientId: string) => {
    if (clientTargetPages[clientId] || loadingTargetPages.has(clientId)) {
      return;
    }

    setLoadingTargetPages(prev => new Set(prev).add(clientId));
    try {
      const response = await fetch(`/api/clients/${clientId}/target-pages`);
      if (response.ok) {
        const data = await response.json();
        const pages = data.targetPages || data || [];
        setClientTargetPages(prev => ({ ...prev, [clientId]: pages }));
      }
    } catch (error) {
      console.error('Failed to fetch target pages:', error);
    } finally {
      setLoadingTargetPages(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  // Sort line items based on selected sort option
  const sortedLineItems = [...lineItems].sort((a, b) => {
    // First always sort by client name to maintain grouping
    const clientNameA = a.client?.name || 'Unknown';
    const clientNameB = b.client?.name || 'Unknown';
    const clientCompare = clientNameA.localeCompare(clientNameB);
    if (clientCompare !== 0) return clientCompare;
    
    // Then apply secondary sorting within each client group
    switch (sortBy) {
      case 'none':
        // Preserve the original order from database (displayOrder, then addedAt)
        // Since items come pre-sorted from the API, just maintain stable order
        return 0;
      
      case 'price_asc':
        // Sort by price ascending
        const priceA = a.estimatedPrice || 0;
        const priceB = b.estimatedPrice || 0;
        return priceA - priceB;
      
      case 'price_desc':
        // Sort by price descending
        const priceADesc = a.estimatedPrice || 0;
        const priceBDesc = b.estimatedPrice || 0;
        return priceBDesc - priceADesc;
      
      case 'dr_asc':
        // Sort by domain rating ascending
        const drA = a.assignedDomain?.evidence?.da || parseInt(a.assignedDomain?.authorityDirect) || 0;
        const drB = b.assignedDomain?.evidence?.da || parseInt(b.assignedDomain?.authorityDirect) || 0;
        return drA - drB;
      
      case 'dr_desc':
        // Sort by domain rating descending
        const drADesc = a.assignedDomain?.evidence?.da || parseInt(a.assignedDomain?.authorityDirect) || 0;
        const drBDesc = b.assignedDomain?.evidence?.da || parseInt(b.assignedDomain?.authorityDirect) || 0;
        return drBDesc - drADesc;
      
      case 'domain':
        // Sort alphabetically by domain
        const domainA = a.assignedDomain?.domain || '';
        const domainB = b.assignedDomain?.domain || '';
        return domainA.localeCompare(domainB);
      
      case 'target_page':
        // Sort alphabetically by target page URL
        const targetA = a.targetPageUrl || '';
        const targetB = b.targetPageUrl || '';
        return targetA.localeCompare(targetB);
      
      case 'status':
        // Sort by inclusion status with logical order: included -> excluded
        const statusOrder: Record<string, number> = {
          'included': 1,
          'excluded': 2
        };
        const statusA = a.metadata?.inclusionStatus || 'included';
        const statusB = b.metadata?.inclusionStatus || 'included';
        return (statusOrder[statusA] || 999) - (statusOrder[statusB] || 999);
      
      default:
        // Default to client sorting
        return 0;
    }
  });

  // Group line items by client
  const groupedByClient = sortedLineItems.reduce((acc, item) => {
    const clientId = item.clientId;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: item.client || { id: clientId, name: 'Unknown Client', website: '' },
        items: []
      };
    }
    acc[clientId].items.push(item);
    return acc;
  }, {} as Record<string, { client: any; items: LineItem[] }>);

  // Filter items
  const filterItems = (items: LineItem[]) => {
    return items.filter(item => {
      // Search filter
      if (searchText) {
        const search = searchText.toLowerCase();
        const domain = item.assignedDomain?.domain || '';
        const targetPage = item.targetPageUrl || '';
        const anchor = item.anchorText || '';
        
        if (!domain.toLowerCase().includes(search) && 
            !targetPage.toLowerCase().includes(search) &&
            !anchor.toLowerCase().includes(search)) {
          return false;
        }
      }
      
      // Status filter - default to 'included' for consistency
      if (statusFilter !== 'all') {
        const itemStatus = item.metadata?.inclusionStatus || 'included';
        if (statusFilter !== itemStatus) return false;
      }

      // DR filter
      const dr = item.assignedDomain?.evidence?.da || parseInt(item.assignedDomain?.authorityDirect) || 0;
      if (filters.drMin && dr < filters.drMin) return false;
      if (filters.drMax && dr > filters.drMax) return false;

      // Price filter (use client-facing price only)
      const price = item.estimatedPrice || 0;
      if (filters.priceMin && price < filters.priceMin * 100) return false;
      if (filters.priceMax && price > filters.priceMax * 100) return false;

      // Qualification filter
      if (filters.qualification !== 'all' && item.assignedDomain) {
        const isQualified = item.assignedDomain.qualificationStatus === 'high_quality' || 
                          item.assignedDomain.qualificationStatus === 'qualified';
        if (filters.qualification === 'qualified' && !isQualified) return false;
        if (filters.qualification === 'not_qualified' && isQualified) return false;
      }
      
      return true;
    });
  };

  // Get domain metrics
  const getDomainMetrics = (item: LineItem) => {
    if (!item.assignedDomain) return { dr: null, traffic: null };
    
    // First check metadata for DR and traffic (from websites table)
    const metadata = item.metadata as any;
    if (metadata?.domainRating || metadata?.traffic) {
      return {
        dr: metadata.domainRating || null,
        traffic: metadata.traffic ? metadata.traffic.toLocaleString() : null
      };
    }
    
    // Fallback to old logic if metadata doesn't have it
    if (typeof item.assignedDomain === 'object') {
      const domain = item.assignedDomain as any;
      const dr = domain.evidence?.da || parseInt(domain.authorityDirect) || null;
      const trafficStr = domain.evidence?.traffic || domain.traffic || '';
      
      let traffic = null;
      if (trafficStr) {
        if (typeof trafficStr === 'string') {
          traffic = trafficStr;
        } else {
          traffic = trafficStr.toLocaleString();
        }
      }
      
      return { dr, traffic };
    }
    
    return { dr: null, traffic: null };
  };

  // Get item status - default to 'included' for better UX
  const getItemStatus = (item: LineItem) => {
    return item.metadata?.inclusionStatus || 'included';
  };

  // Handle target URL update for dropdown
  const handleTargetUrlUpdate = async (itemId: string, targetUrl: string) => {
    if (!onEditItem) return;
    
    try {
      await onEditItem(itemId, { targetPageUrl: targetUrl });
      // Refresh is handled by parent component
    } catch (error) {
      console.error('Failed to update target URL:', error);
      throw error; // Re-throw so TableTargetDropdown can show error
    }
  };

  // Handle anchor text update for inline editor
  const handleAnchorTextUpdate = async (itemId: string, anchorText: string) => {
    if (!onEditItem) return;
    
    try {
      await onEditItem(itemId, { anchorText });
      // Refresh is handled by parent component
    } catch (error) {
      console.error('Failed to update anchor text:', error);
      throw error; // Re-throw so InlineAnchorEditor can show error
    }
  };

  // Handle status change
  const handleStatusChange = async (itemId: string, newStatus: string) => {
    if (!onChangeStatus) return;
    
    if (newStatus === 'excluded') {
      const item = lineItems.find(i => i.id === itemId);
      setFeedbackModal({
        isOpen: true,
        itemId,
        clientId: item?.clientId || '',
        domain: item?.assignedDomain?.domain || 'this domain'
      });
    } else {
      await onChangeStatus(itemId, newStatus as any);
    }
  };

  // Handle inclusion toggle
  const handleInclusionToggle = async (itemId: string, included: boolean) => {
    const newStatus = included ? 'included' : 'excluded';
    await handleStatusChange(itemId, newStatus);
  };

  // Dropdown management functions
  const handleDropdownOpen = (itemId: string) => {
    if (openDropdown === itemId) {
      setOpenDropdown(null); // Close if already open
    } else {
      setOpenDropdown(itemId); // Open this dropdown and close others
    }
  };

  const handleDropdownClose = () => {
    setOpenDropdown(null);
  };

  const isDropdownOpen = (itemId: string) => {
    return openDropdown === itemId;
  };

  // Handle bulk status change with confirmation and batch processing
  const handleBulkStatusChange = async (newStatus: string) => {
    if (!onChangeStatus) return;
    
    // Show confirmation for destructive actions
    if (newStatus === 'excluded' && !showBulkConfirm.isOpen) {
      setShowBulkConfirm({
        isOpen: true,
        action: newStatus,
        count: selectedItems.size
      });
      return;
    }
    
    // Close confirmation dialog if open
    setShowBulkConfirm({ isOpen: false, action: '', count: 0 });
    setBulkActionLoading(true);
    
    try {
      // Process in batches of 5 for better performance
      const itemIds = Array.from(selectedItems);
      const batchSize = 5;
      
      for (let i = 0; i < itemIds.length; i += batchSize) {
        const batch = itemIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(itemId => onChangeStatus(itemId, newStatus as any))
        );
      }
      
      // Show success message
      const actionText = newStatus === 'included' ? 'included' : 
                        newStatus === 'excluded' ? 'excluded' : 'included';
      setSuccessMessage(`Successfully ${actionText} ${selectedItems.size} items`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setSelectedItems(new Set());
      
      // Trigger a single refresh after all updates are complete
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      setSuccessMessage('Some items failed to update. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle selection
  const toggleSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Select all in group
  const selectAllInGroup = (items: LineItem[]) => {
    const newSelected = new Set(selectedItems);
    items.forEach(item => newSelected.add(item.id));
    setSelectedItems(newSelected);
  };

  // Toggle row expansion
  const toggleRow = (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar - Hide for client review (claim page) */}
      {workflowStage !== 'client_review' && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="w-full md:flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search domains..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">Order Added</option>
              <option value="domain">Sort by Domain</option>
              <option value="target_page">Sort by Target Page</option>
              <option value="dr_desc">Sort by DR (High to Low)</option>
              <option value="dr_asc">Sort by DR (Low to High)</option>
              <option value="price_desc">Sort by Price (High to Low)</option>
              <option value="price_asc">Sort by Price (Low to High)</option>
              <option value="status">Sort by Status</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="included">Included</option>
              <option value="excluded">Excluded</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-600">DR Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.drMin || ''}
                  onChange={(e) => setFilters({...filters, drMin: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.drMax || ''}
                  onChange={(e) => setFilters({...filters, drMax: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Price Range ($)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin || ''}
                  onChange={(e) => setFilters({...filters, priceMin: e.target.value ? parseFloat(e.target.value) : null})}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax || ''}
                  onChange={(e) => setFilters({...filters, priceMax: e.target.value ? parseFloat(e.target.value) : null})}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Qualification</label>
              <select
                value={filters.qualification}
                onChange={(e) => setFilters({...filters, qualification: e.target.value})}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="all">All</option>
                <option value="qualified">Qualified</option>
                <option value="not_qualified">Not Qualified</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Overlap Status</label>
              <select
                value={filters.overlap}
                onChange={(e) => setFilters({...filters, overlap: e.target.value})}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="all">All</option>
                <option value="direct">Direct</option>
                <option value="related">Related</option>
                <option value="both">Both</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </span>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedItems.size > 0 && permissions.canChangeStatus && (
        <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {bulkActionLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing {selectedItems.size} items...
              </span>
            ) : (
              `${selectedItems.size} items selected`
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkStatusChange('included')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Include All
            </button>
            <button
              onClick={() => handleBulkStatusChange('excluded')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Exclude All
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Client Groups */}
      {Object.entries(groupedByClient).map(([clientId, group]) => {
        const filteredItems = filterItems(group.items);
        const assignedCount = group.items.filter(i => i.assignedDomainId).length;
        // Count only non-cancelled items
        const activeItems = group.items.filter(i => i.status !== 'cancelled' && i.status !== 'refunded');
        const includedCount = activeItems.filter(i => getItemStatus(i) === 'included').length;
        const excludedCount = activeItems.filter(i => getItemStatus(i) === 'excluded').length;
        const cancelledCount = group.items.filter(i => i.status === 'cancelled').length;
        const savedCount = 0; // Site bank concept removed
        
        return (
          <div key={clientId} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Client Header */}
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{group.client.name}</h3>
                  <p className="text-sm text-gray-600">
                    {workflowStage === 'client_review' ? (
                      `${group.items.length} high-quality sites selected for your campaign`
                    ) : (
                      <>
                        {activeItems.length} active links • 
                        <span className="text-green-600">{includedCount} included</span> • 
                        <span className="text-red-600">{excludedCount} excluded</span>
                        {cancelledCount > 0 && (
                          <span className="text-gray-500"> • {cancelledCount} cancelled</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                {permissions.canApproveReject && onRequestMoreSites && (
                  <button
                    onClick={() => onRequestMoreSites(clientId)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Request More Sites
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block p-4">
              {/* Horizontal scroll container with sticky first column */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                      {permissions.canChangeStatus && (
                        <th className="pb-2 pr-2 sticky left-0 bg-white z-10">
                          <input
                            type="checkbox"
                            checked={filteredItems.length > 0 && filteredItems.every(i => selectedItems.has(i.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAllInGroup(filteredItems);
                              } else {
                                const newSelected = new Set(selectedItems);
                                filteredItems.forEach(i => newSelected.delete(i.id));
                                setSelectedItems(newSelected);
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                      )}
                      <th className="pb-2 font-medium sticky left-0 bg-white z-10 pr-4 min-w-[150px]">Domain</th>
                      {hasAnyWorkflows && (
                        <th className="pb-2 font-medium min-w-[120px]">Workflow</th>
                      )}
                      <th className="pb-2 font-medium min-w-[200px] pr-4">Target Page</th>
                      <th className="pb-2 font-medium min-w-[250px] hidden xl:table-cell">Anchor Text</th>
                      <th className="pb-2 font-medium min-w-[180px] xl:hidden">Anchor</th>
                      {permissions.canViewPricing && <th className="pb-2 font-medium min-w-[80px]">Price</th>}
                      {userType === 'internal' && <th className="pb-2 font-medium min-w-[120px]">Publisher</th>}
                      <th className="pb-2 font-medium min-w-[120px]">Action</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const metrics = getDomainMetrics(item);
                    const hasAssignedDomain = !!item.assignedDomainId;
                    const itemStatus = getItemStatus(item);
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          {permissions.canChangeStatus && (
                            <td className="py-3 pr-2 sticky left-0 bg-white">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={() => toggleSelection(item.id)}
                                className="rounded"
                              />
                            </td>
                          )}
                          <td className="py-3 cursor-pointer sticky left-0 bg-white pr-4" onClick={() => toggleRow(item.id)}>
                            <div className="flex items-center gap-2 min-w-[150px]">
                              {expandedRows.has(item.id) ? (
                                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              {item.assignedDomain ? (
                                <div className="space-y-1">
                                  {/* Domain name with DR and traffic tags on same line */}
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <a 
                                      href={`https://${typeof item.assignedDomain === 'object' && item.assignedDomain.domain 
                                        ? item.assignedDomain.domain 
                                        : item.assignedDomain}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {typeof item.assignedDomain === 'object' && item.assignedDomain.domain 
                                        ? item.assignedDomain.domain 
                                        : item.assignedDomain}
                                    </a>
                                    <DomainTags 
                                      dr={metrics.dr}
                                      traffic={metrics.traffic}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                  {/* Quality badges below if domain is an object */}
                                  {typeof item.assignedDomain === 'object' && item.assignedDomain.domain && (
                                    <DomainCell 
                                      domain={item.assignedDomain} 
                                      domainId={item.assignedDomainId || ''}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">No domain assigned</span>
                              )}
                            </div>
                          </td>
                          {/* Workflow Progress Column - Show when workflows exist */}
                          {hasAnyWorkflows && (
                            <td className="py-3 px-3">
                              <WorkflowStatusCell workflowId={item.workflowId} userType={userType} />
                            </td>
                          )}
                          <td className="py-3 pl-2 pr-4 text-sm max-w-[250px]">
                            <TableTargetDropdown
                              currentTarget={item.targetPageUrl}
                              clientId={item.clientId}
                              onSelect={(targetUrl) => handleTargetUrlUpdate(item.id, targetUrl)}
                              matchData={(item.metadata as any)?.targetMatchData}
                              disabled={!permissions.canAssignTargetPages}
                              className="w-full"
                              isOpen={isDropdownOpen(item.id)}
                              onToggle={() => handleDropdownOpen(item.id)}
                              onClose={handleDropdownClose}
                            />
                          </td>
                          {/* Full anchor text for very wide screens */}
                          <td className="py-3 px-3 text-sm hidden xl:table-cell">
                            <div className="max-w-[250px]">
                              <InlineAnchorEditor
                                value={item.anchorText || ''}
                                onSave={(newValue) => handleAnchorTextUpdate(item.id, newValue)}
                                disabled={!permissions.canAssignTargetPages && !permissions.canEditDomainAssignments}
                                placeholder="Enter anchor text..."
                                className="w-full"
                              />
                            </div>
                          </td>
                          {/* Shortened anchor text for medium screens */}
                          <td className="py-3 px-3 text-sm xl:hidden">
                            <div className="max-w-[180px]">
                              <InlineAnchorEditor
                                value={item.anchorText || ''}
                                onSave={(newValue) => handleAnchorTextUpdate(item.id, newValue)}
                                disabled={!permissions.canAssignTargetPages && !permissions.canEditDomainAssignments}
                                placeholder="Anchor text..."
                                className="w-full"
                              />
                            </div>
                          </td>
                          {permissions.canViewPricing && (
                            <td className="py-3 px-3 text-sm">
                              {(() => {
                                // If domain is assigned, show actual price
                                if (item.assignedDomainId && item.estimatedPrice) {
                                  return <span className="font-bold">{formatCurrency(item.estimatedPrice)}</span>;
                                }
                                
                                // If no domain assigned but we have a target estimate from benchmark
                                if (!item.assignedDomainId && benchmarkData?.benchmarkData) {
                                  // Find the target price from benchmark data
                                  const clientGroup = benchmarkData.benchmarkData.clientGroups?.find(
                                    (bg: any) => bg.clientId === item.clientId
                                  );
                                  
                                  if (clientGroup?.targetPages) {
                                    const targetPage = clientGroup.targetPages.find(
                                      (tp: any) => tp.url === item.targetPageUrl
                                    );
                                    
                                    // Calculate average price from requested domains or use default
                                    if (targetPage?.requestedDomains?.length > 0) {
                                      const avgPrice = targetPage.requestedDomains.reduce(
                                        (sum: number, d: any) => sum + (d.retailPrice || 0), 0
                                      ) / targetPage.requestedDomains.length;
                                      
                                      if (avgPrice > 0) {
                                        return <span className="text-gray-500 font-bold">~{formatCurrency(Math.round(avgPrice))}</span>;
                                      }
                                    }
                                  }
                                }
                                
                                // If we have an estimated price but no domain, show with ~
                                if (!item.assignedDomainId && item.estimatedPrice) {
                                  return <span className="text-gray-500 font-bold">~{formatCurrency(item.estimatedPrice)}</span>;
                                }
                                
                                // Default: show placeholder if no price info
                                return <span className="text-gray-400 font-bold">Price TBD</span>;
                              })()}
                            </td>
                          )}
                          {/* Publisher Column - Show for internal users */}
                          {userType === 'internal' && (
                            <td className="py-3 px-3 text-sm">
                              {(() => {
                                if (!item.publisherId) {
                                  return <span className="text-gray-400 italic">Not assigned</span>;
                                }
                                
                                if (item.publisher) {
                                  const name = item.publisher.companyName || 
                                               item.publisher.contactName || 
                                               item.publisher.email.split('@')[0];
                                  
                                  // Check if it's an internal/shadow publisher
                                  const isInternal = item.metadata?.attributionSource === 'shadow_publisher';
                                  const displayName = isInternal ? `${name} (Internal)` : name;
                                  
                                  return (
                                    <div className="space-y-1">
                                      <span className="text-gray-900 font-medium">{displayName}</span>
                                      {item.publisherPrice && item.publisherPrice > 0 && (
                                        <div className="text-xs text-gray-500">
                                          Cost: ${(item.publisherPrice / 100).toFixed(2)}
                                        </div>
                                      )}
                                      {item.metadata?.pricingStrategy && (
                                        <div className="text-xs text-gray-500">
                                          {item.metadata.pricingStrategy.replace('_', ' ')}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                
                                return <span className="text-gray-600">Publisher assigned</span>;
                              })()}
                            </td>
                          )}
                          {/* Combined Action Column - Now at the end */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <ActionColumnToggle
                                included={itemStatus === 'included'}
                                onToggle={(included) => handleInclusionToggle(item.id, included)}
                                status={item.status}
                                canChangeStatus={permissions.canChangeStatus}
                                disabled={false}
                                className="flex-1 max-w-[120px]"
                              />
                              <Link
                                href={`/orders/${orderId}/edit`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                title="Edit order setup (targets & anchor text)"
                              >
                                <Edit className="w-3 h-3" />
                                <span className="hidden lg:inline">Setup</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Details Row */}
                        {expandedRows.has(item.id) && item.assignedDomain && (
                          <tr>
                            <td colSpan={permissions.canChangeStatus ? 10 : 9} className="p-4 bg-gray-50">
                              <ExpandedDomainDetails submission={{
                                domain: {
                                  qualificationStatus: (item.metadata as any)?.domainQualificationStatus,
                                  aiQualificationReasoning: (item.metadata as any)?.aiQualificationReasoning,
                                  overlapStatus: (item.metadata as any)?.overlapStatus,
                                  authorityDirect: (item.metadata as any)?.authorityDirect,
                                  authorityRelated: (item.metadata as any)?.authorityRelated,
                                  topicScope: (item.metadata as any)?.topicScope,
                                  keywordCount: (item.metadata as any)?.keywordCount,
                                  dataForSeoResultsCount: (item.metadata as any)?.dataForSeoResultsCount,
                                  evidence: (item.metadata as any)?.evidence,
                                  notes: (item.metadata as any)?.notes
                                },
                                metadata: {
                                  ...item.metadata,
                                  // Ensure target match data is passed through
                                  suggestedTargetUrl: (item.metadata as any)?.suggestedTargetUrl,
                                  targetMatchData: (item.metadata as any)?.targetMatchData,
                                  targetPageUrl: item.targetPageUrl
                                },
                                clientReviewNotes: (item as any).clientReviewNotes,
                                exclusionReason: (item as any).exclusionReason
                              }} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
              {filteredItems.map(item => {
                const metrics = getDomainMetrics(item);
                const itemStatus = getItemStatus(item);
                
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    {/* Domain & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => toggleRow(item.id)}>
                        {item.assignedDomain ? (
                          <div className="space-y-1">
                            {/* Domain name with DR and traffic tags on same line */}
                            <div className="flex items-center gap-2">
                              {/* Chevron for expansion */}
                              {expandedRows.has(item.id) ? (
                                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <a 
                                href={`https://${typeof item.assignedDomain === 'object' && item.assignedDomain.domain 
                                  ? item.assignedDomain.domain 
                                  : item.assignedDomain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {typeof item.assignedDomain === 'object' && item.assignedDomain.domain 
                                  ? item.assignedDomain.domain 
                                  : item.assignedDomain}
                              </a>
                              <DomainTags 
                                dr={metrics.dr}
                                traffic={metrics.traffic}
                                className="flex-shrink-0"
                              />
                            </div>
                            {/* Quality badges below if domain is an object */}
                            {typeof item.assignedDomain === 'object' && item.assignedDomain.domain && (
                              <DomainCell 
                                domain={item.assignedDomain} 
                                domainId={item.assignedDomainId || ''}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No domain assigned</span>
                        )}
                      </div>
                      {/* Combined Action for Mobile */}
                      <div className="flex items-center gap-2">
                        <ActionColumnToggle
                          included={itemStatus === 'included'}
                          onToggle={(included) => handleInclusionToggle(item.id, included)}
                          status={item.status}
                          canChangeStatus={permissions.canChangeStatus}
                          disabled={false}
                          className="max-w-[120px]"
                        />
                        <Link
                          href={`/orders/${orderId}/edit`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                          title="Edit order setup"
                        >
                          <Edit className="w-3 h-3" />
                          Setup
                        </Link>
                      </div>
                    </div>
                    
                    {/* Pricing */}
                    {permissions.canViewPricing && (
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="ml-1 font-bold">
                            {formatCurrency(item.estimatedPrice || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Publisher - Show for internal users */}
                    {userType === 'internal' && (
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Publisher:</span>
                          <span className="ml-1">
                            {(() => {
                              if (!item.publisherId) {
                                return <span className="text-gray-400 italic">Not assigned</span>;
                              }
                              
                              if (item.publisher) {
                                const name = item.publisher.companyName || 
                                             item.publisher.contactName || 
                                             item.publisher.email.split('@')[0];
                                
                                // Check if it's an internal/shadow publisher
                                const isInternal = item.metadata?.attributionSource === 'shadow_publisher';
                                const displayName = isInternal ? `${name} (Internal)` : name;
                                
                                return (
                                  <div className="inline-flex flex-col gap-1">
                                    <span className="text-gray-900 font-medium">{displayName}</span>
                                    {item.publisherPrice && item.publisherPrice > 0 && (
                                      <span className="text-xs text-gray-500">
                                        Cost: ${(item.publisherPrice / 100).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              
                              return <span className="text-gray-600">Publisher assigned</span>;
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Target & Anchor - Now with interactive elements */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">Target:</span>
                        <div className="flex-1">
                          <TableTargetDropdown
                            currentTarget={item.targetPageUrl}
                            clientId={item.clientId}
                            onSelect={(targetUrl) => handleTargetUrlUpdate(item.id, targetUrl)}
                            matchData={(item.metadata as any)?.targetMatchData}
                            disabled={!permissions.canAssignTargetPages}
                            className="w-full"
                            isOpen={isDropdownOpen(item.id)}
                            onToggle={() => handleDropdownOpen(item.id)}
                            onClose={handleDropdownClose}
                          />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">Anchor:</span>
                        <div className="flex-1">
                          <InlineAnchorEditor
                            value={item.anchorText || ''}
                            onSave={(newValue) => handleAnchorTextUpdate(item.id, newValue)}
                            disabled={!permissions.canAssignTargetPages && !permissions.canEditDomainAssignments}
                            placeholder="Enter anchor text..."
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Domain Details for Mobile */}
                    {expandedRows.has(item.id) && item.assignedDomain && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <ExpandedDomainDetails submission={{
                          domain: {
                            qualificationStatus: (item.metadata as any)?.domainQualificationStatus,
                            aiQualificationReasoning: (item.metadata as any)?.domainQualificationReasons,
                            dataForSeoResultsCount: (item.metadata as any)?.dataForSeoResultsCount,
                          },
                          metadata: item.metadata as any,
                        }} />
                      </div>
                    )}
                    
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modals */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        siteDomain={feedbackModal.domain}
        onClose={() => setFeedbackModal({ isOpen: false, itemId: '', clientId: '', domain: '' })}
        onSubmit={async (feedback) => {
          if (onReject) {
            await onReject(feedbackModal.itemId, feedbackModal.clientId, feedback.reason + (feedback.notes ? ': ' + feedback.notes : ''));
          } else if (onChangeStatus) {
            await onChangeStatus(feedbackModal.itemId, 'excluded', feedback.reason);
          }
          setFeedbackModal({ isOpen: false, itemId: '', clientId: '', domain: '' });
        }}
        userType={userType}
      />

      <EditModal
        isOpen={editModal.isOpen}
        item={editModal.item}
        onClose={() => setEditModal({ isOpen: false, item: null })}
        onSave={async (updates) => {
          if (onEditItem) {
            await onEditItem(editModal.item.id, updates);
          }
          setEditModal({ isOpen: false, item: null });
        }}
        permissions={permissions}
        availableTargetPages={editModal.item?.clientId ? clientTargetPages[editModal.item.clientId] || [] : []}
      />

      {/* Bulk Exclude Confirmation Dialog */}
      {showBulkConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Bulk Exclude
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to exclude {showBulkConfirm.count} selected items? 
              This will remove them from the order.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkConfirm({ isOpen: false, action: '', count: 0 })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkStatusChange('excluded')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Exclude {showBulkConfirm.count} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}