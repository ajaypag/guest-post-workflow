'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, ChevronDown, ChevronRight, ChevronUp, Edit2, Trash2, 
  CheckCircle, XCircle, AlertCircle, Save, X, Plus, Filter,
  Square, CheckSquare, MinusSquare, Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import DomainCell from './DomainCell';
import ExpandedDomainDetails from './ExpandedDomainDetails';
import EnhancedTargetPageSelector from './EnhancedTargetPageSelector';

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
  metadata?: any;
  modifiedAt?: string | Date; // For tracking when line item was last modified for invoice regeneration
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
  onChangeStatus?: (itemId: string, status: 'included' | 'excluded' | 'saved_for_later', reason?: string) => Promise<void>;
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
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commonReasons = [
    'Low Domain Rating/Authority',
    'Irrelevant Niche/Industry',
    'Poor Content Quality',
    'Too Expensive',
    'Site Appears Spammy',
    'Not Accepting Guest Posts',
    'Technical Issues (Site Down/Slow)',
    'Competitor Site',
    'Other'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {userType === 'internal' ? 'Exclude Domain' : 'Why are you rejecting this site?'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Domain: {siteDomain}</p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-4">
            {commonReasons.map(reason => (
              <label key={reason} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please specify..."
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4"
              rows={3}
              required
            />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedReason || isSubmitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {userType === 'internal' ? 'Exclude' : 'Reject Site'}
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
        // No additional sorting, just use ID for stability
        return a.id.localeCompare(b.id);
      
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
        // Sort by inclusion status with logical order: included -> saved_for_later -> excluded
        const statusOrder: Record<string, number> = {
          'included': 1,
          'saved_for_later': 2,
          'excluded': 3
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
                        newStatus === 'excluded' ? 'excluded' : 'saved for later';
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
      {/* Filter Bar */}
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
              <option value="none">Default Order</option>
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
              <option value="saved_for_later">Saved for Later</option>
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
              onClick={() => handleBulkStatusChange('saved_for_later')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save for Later
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
        const includedCount = group.items.filter(i => getItemStatus(i) === 'included').length;
        const excludedCount = group.items.filter(i => getItemStatus(i) === 'excluded').length;
        const savedCount = group.items.filter(i => getItemStatus(i) === 'saved_for_later').length;
        
        return (
          <div key={clientId} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Client Header */}
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{group.client.name}</h3>
                  <p className="text-sm text-gray-600">
                    {group.items.length} links requested • 
                    <span className="text-green-600"> {includedCount} included</span> • 
                    <span className="text-yellow-600"> {savedCount} saved</span> • 
                    <span className="text-red-600"> {excludedCount} excluded</span>
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
                      <th className="pb-2 font-medium text-center min-w-[50px] hidden lg:table-cell">DR</th>
                      <th className="pb-2 font-medium text-center min-w-[80px] hidden lg:table-cell">Traffic</th>
                      <th className="pb-2 font-medium text-center min-w-[60px] lg:hidden">DR/Traffic</th>
                      {permissions.canChangeStatus && <th className="pb-2 font-medium min-w-[100px]">Status</th>}
                      <th className="pb-2 font-medium min-w-[200px] pr-4">Target Page</th>
                      <th className="pb-2 font-medium min-w-[150px] hidden xl:table-cell">Anchor Text</th>
                      <th className="pb-2 font-medium min-w-[100px] xl:hidden">Anchor</th>
                      {permissions.canViewPricing && <th className="pb-2 font-medium min-w-[80px]">Price</th>}
                      {(permissions.canEditDomainAssignments || permissions.canApproveReject) && (
                        <th className="pb-2 font-medium min-w-[80px]">Actions</th>
                      )}
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
                                <div className="truncate">
                                  <DomainCell 
                                    domain={item.assignedDomain} 
                                    domainId={item.assignedDomainId || ''}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">No domain assigned</span>
                              )}
                            </div>
                          </td>
                          {/* Separate DR and Traffic columns for large screens */}
                          <td className="py-3 px-2 text-center hidden lg:table-cell">
                            {metrics.dr || '-'}
                          </td>
                          <td className="py-3 px-2 text-center hidden lg:table-cell">
                            {metrics.traffic || '-'}
                          </td>
                          {/* Combined DR/Traffic column for medium screens */}
                          <td className="py-3 px-2 text-center text-xs lg:hidden">
                            <div className="space-y-1">
                              <div>DR: {metrics.dr || '-'}</div>
                              <div>T: {metrics.traffic || '-'}</div>
                            </div>
                          </td>
                          {permissions.canChangeStatus && (
                            <td className="py-3 pr-4">
                              <select
                                value={itemStatus}
                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                className={`px-2 py-1 text-xs rounded-full border w-full max-w-[110px] ${
                                  itemStatus === 'included' 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : itemStatus === 'excluded'
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : itemStatus === 'saved_for_later'
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                <option value="included">Included</option>
                                <option value="excluded">Excluded</option>
                                <option value="saved_for_later">Saved for Later</option>
                              </select>
                            </td>
                          )}
                          <td className="py-3 pl-2 pr-4 text-sm max-w-[250px]">
                            {item.targetPageUrl ? (
                              <a 
                                href={item.targetPageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline inline-block break-words"
                                title={item.targetPageUrl}
                              >
                                {item.targetPageUrl}
                              </a>
                            ) : '-'}
                          </td>
                          {/* Full anchor text for very wide screens */}
                          <td className="py-3 px-3 text-sm hidden xl:table-cell max-w-[150px]">
                            <div className="truncate" title={item.anchorText || '-'}>
                              {item.anchorText || '-'}
                            </div>
                          </td>
                          {/* Shortened anchor text for medium screens */}
                          <td className="py-3 px-3 text-sm xl:hidden max-w-[100px]">
                            <div className="truncate" title={item.anchorText || '-'}>
                              {item.anchorText ? item.anchorText.substring(0, 15) + (item.anchorText.length > 15 ? '...' : '') : '-'}
                            </div>
                          </td>
                          {permissions.canViewPricing && (
                            <td className="py-3 px-3 text-sm">
                              {(() => {
                                // If domain is assigned, show actual price
                                if (item.assignedDomainId && item.estimatedPrice) {
                                  return formatCurrency(item.estimatedPrice);
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
                                        return <span className="text-gray-500">~{formatCurrency(Math.round(avgPrice))}</span>;
                                      }
                                    }
                                  }
                                }
                                
                                // If we have an estimated price but no domain, show with ~
                                if (!item.assignedDomainId && item.estimatedPrice) {
                                  return <span className="text-gray-500">~{formatCurrency(item.estimatedPrice)}</span>;
                                }
                                
                                // Default: show placeholder if no price info
                                return <span className="text-gray-400">Price TBD</span>;
                              })()}
                            </td>
                          )}
                          {(permissions.canEditDomainAssignments || permissions.canApproveReject) && (
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {permissions.canEditDomainAssignments && (
                                  <button
                                    onClick={() => {
                                      if (item.clientId) {
                                        fetchClientTargetPages(item.clientId);
                                      }
                                      setEditModal({ isOpen: true, item });
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                )}
                                {permissions.canApproveReject && onApprove && (
                                  <button
                                    onClick={() => onApprove(item.id, clientId)}
                                    className="text-green-600 hover:text-green-700"
                                    title="Approve"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                )}
                                {permissions.canApproveReject && onReject && (
                                  <button
                                    onClick={() => setFeedbackModal({
                                      isOpen: true,
                                      itemId: item.id,
                                      clientId,
                                      domain: item.assignedDomain?.domain || 'this domain'
                                    })}
                                    className="text-red-600 hover:text-red-700"
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
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
                      <div className="flex-1">
                        {item.assignedDomain ? (
                          <DomainCell 
                            domain={item.assignedDomain} 
                            domainId={item.assignedDomainId || ''}
                          />
                        ) : (
                          <span className="text-gray-400">No domain assigned</span>
                        )}
                      </div>
                      {permissions.canChangeStatus ? (
                        <select
                          value={itemStatus}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            itemStatus === 'included' 
                              ? 'bg-green-100 text-green-700' 
                              : itemStatus === 'excluded'
                              ? 'bg-red-100 text-red-700'
                              : itemStatus === 'saved_for_later'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <option value="included">Included</option>
                          <option value="excluded">Excluded</option>
                          <option value="saved_for_later">Saved</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                          itemStatus === 'included' 
                            ? 'bg-green-100 text-green-700' 
                            : itemStatus === 'excluded'
                            ? 'bg-red-100 text-red-700'
                            : itemStatus === 'saved_for_later'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {itemStatus === 'included' ? 'Included' : 
                           itemStatus === 'excluded' ? 'Excluded' :
                           itemStatus === 'saved_for_later' ? 'Saved' : 'Pending'}
                        </span>
                      )}
                    </div>
                    
                    {/* Metrics */}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">DR:</span>
                        <span className="ml-1 font-medium">{metrics.dr || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Traffic:</span>
                        <span className="ml-1 font-medium">{metrics.traffic || '-'}</span>
                      </div>
                      {permissions.canViewPricing && (
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="ml-1 font-medium">
                            {formatCurrency(item.estimatedPrice || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Target & Anchor */}
                    {(item.targetPageUrl || item.anchorText) && (
                      <div className="space-y-1 text-sm">
                        {item.targetPageUrl && (
                          <div>
                            <span className="text-gray-500">Target:</span>
                            <span className="ml-1 text-gray-900 break-all">{item.targetPageUrl}</span>
                          </div>
                        )}
                        {item.anchorText && (
                          <div>
                            <span className="text-gray-500">Anchor:</span>
                            <span className="ml-1 text-gray-900">{item.anchorText}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    {(permissions.canEditDomainAssignments || permissions.canApproveReject) && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        {permissions.canEditDomainAssignments && (
                          <button
                            onClick={() => setEditModal({ isOpen: true, item })}
                            className="text-gray-500 hover:text-gray-700"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {permissions.canApproveReject && onApprove && (
                          <button
                            onClick={() => onApprove(item.id, clientId)}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {permissions.canApproveReject && onReject && (
                          <button
                            onClick={() => setFeedbackModal({
                              isOpen: true,
                              itemId: item.id,
                              clientId,
                              domain: item.assignedDomain?.domain || 'this domain'
                            })}
                            className="text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
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