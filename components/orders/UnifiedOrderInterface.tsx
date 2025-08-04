'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import CreateClientModal from '@/components/ui/CreateClientModal';
import CreateTargetPageModal from '@/components/ui/CreateTargetPageModal';
import { 
  Building, Package, Plus, X, ChevronDown, ChevronUp, ChevronRight,
  Search, Target, Link as LinkIcon, Type, CheckCircle,
  AlertCircle, Copy, Trash2, User, Globe, ExternalLink,
  ArrowLeft, Loader2, Clock, Database, Edit, Eye, Zap,
  XCircle, PlayCircle, FileText
} from 'lucide-react';

type PackageType = 'good' | 'better' | 'best';
type OrderMode = 'draft' | 'site_management' | 'approval';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface OrderLineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  price: number;
  selectedPackage: PackageType;
}

interface ClientWithSelection {
  id: string;
  name: string;
  website: string;
  description?: string;
  targetPages: Array<{
    id: string;
    url: string;
    domain: string;
    status: 'active' | 'completed' | 'inactive';
    keywords?: string;
    description?: string;
    addedAt: Date;
    completedAt?: Date;
  }>;
  selected: boolean;
  linkCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  accountId?: string;
  archivedAt?: Date | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
}

interface TargetPageWithMetadata {
  id: string;
  url: string;
  domain: string;
  status: 'active' | 'completed' | 'inactive';
  keywords?: string;
  keywordArray?: string[];
  description?: string;
  dr: number;
  traffic: number;
  clientId: string;
  clientName: string;
  usageCount: number;
  addedAt: Date;
  completedAt?: Date;
}

interface OrderGroup {
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

interface SiteSubmission {
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
    [key: string]: any;
  };
}

interface UnifiedOrderInterfaceProps {
  orderId?: string;
  initialMode?: OrderMode;
  orderGroups?: OrderGroup[];
  siteSubmissions?: Record<string, SiteSubmission[]>;
  userType: 'internal' | 'external' | 'account';
  orderStatus: string;
  orderState?: string;
  isPaid: boolean;
  onSave?: (orderData: any) => Promise<void>;
  onSubmit?: (orderData: any) => Promise<void>;
  onModeChange?: (mode: OrderMode) => void;
}

export default function UnifiedOrderInterface({
  orderId,
  initialMode = 'draft',
  orderGroups = [],
  siteSubmissions = {},
  userType,
  orderStatus,
  orderState,
  isPaid,
  onSave,
  onSubmit,
  onModeChange
}: UnifiedOrderInterfaceProps) {
  const router = useRouter();
  const session = AuthService.getSession();
  const isAccountUser = session?.userType === 'account';
  
  // Mode state
  const [currentMode, setCurrentMode] = useState<OrderMode>(initialMode);
  
  // Client management (from /edit page)
  const [clients, setClients] = useState<ClientWithSelection[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  
  // Three-column state (from /edit page)
  const [selectedClients, setSelectedClients] = useState<Map<string, { selected: boolean; linkCount: number }>>(new Map());
  const [availableTargets, setAvailableTargets] = useState<TargetPageWithMetadata[]>([]);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  
  // UI state (from /edit page)
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [mobileView, setMobileView] = useState<'clients' | 'targets' | 'order'>('clients');
  
  // Pricing state (from /edit page)
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('better');
  const packagePricing = {
    good: { price: 230, name: 'Good Guest Posts', description: 'DR 20-34' },
    better: { price: 279, name: 'Better Guest Posts', description: 'DR 35-49' },
    best: { price: 349, name: 'Best Guest Posts', description: 'DR 50-80' }
  };
  
  // Auto-save state (from /edit page)
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Expansion state (from /edit page)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [groupByMode, setGroupByMode] = useState<'client' | 'status' | 'none'>('client');
  
  // Site management state (from /internal page)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingLineItem, setEditingLineItem] = useState<{groupId: string, index: number} | null>(null);
  
  // Modal state
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreateTargetPageModal, setShowCreateTargetPageModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine what mode to show based on order state and available data
  const getAppropriateMode = useCallback((): OrderMode => {
    if (orderStatus === 'draft') return 'draft';
    if (orderState === 'site_review' || (Object.keys(siteSubmissions).length > 0 && !isPaid)) return 'site_management';
    if (orderState === 'in_progress' || orderStatus === 'completed') return 'site_management';
    return currentMode;
  }, [orderStatus, orderState, siteSubmissions, currentMode, isPaid]);

  // Mode switching
  const switchMode = (newMode: OrderMode) => {
    setCurrentMode(newMode);
    onModeChange?.(newMode);
  };

  // Load clients (from /edit page logic)
  const loadClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const response = await fetch('/api/clients', { credentials: 'include' });
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData.map((client: any) => ({ ...client, selected: false, linkCount: 0 })));
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }, []);

  // Initialize from order groups
  const initializeFromOrderGroups = useCallback(() => {
    if (orderGroups.length === 0) return;

    // Convert order groups back to client selections and line items
    const newSelectedClients = new Map<string, { selected: boolean; linkCount: number }>();
    const newLineItems: OrderLineItem[] = [];

    orderGroups.forEach(group => {
      newSelectedClients.set(group.clientId, {
        selected: true,
        linkCount: group.linkCount
      });

      // Create line items from the group
      for (let i = 0; i < group.linkCount; i++) {
        newLineItems.push({
          id: `${group.id}-${i}`,
          clientId: group.clientId,
          clientName: group.client.name,
          targetPageId: group.targetPages?.[i]?.pageId,
          targetPageUrl: group.targetPages?.[i]?.url || '',
          anchorText: group.anchorTexts?.[i] || '',
          price: group.packagePrice || 279,
          selectedPackage: (group.packageType as PackageType) || 'better'
        });
      }
    });

    setSelectedClients(newSelectedClients);
    setLineItems(newLineItems);
  }, [orderGroups]);

  // Calculate pricing (from /edit page)
  const calculatePricing = useCallback((items: OrderLineItem[]) => {
    const itemSubtotal = items.reduce((sum, item) => sum + item.price, 0);
    setSubtotal(itemSubtotal);
    setTotal(itemSubtotal);
  }, []);

  // Update available targets (from /edit page logic)
  const updateAvailableTargets = useCallback(() => {
    const targets: TargetPageWithMetadata[] = [];
    
    selectedClients.forEach((clientData, clientId) => {
      if (clientData.selected) {
        const client = clients.find(c => c.id === clientId);
        if (client && client.targetPages) {
          client.targetPages.forEach(page => {
            if (page.status !== 'active') return;
            
            const usageCount = lineItems.filter(item => 
              item.clientId === clientId && item.targetPageId === page.id
            ).length;
            
            const keywordArray = page.keywords ? 
              page.keywords.split(',').map(k => k.trim()).filter(k => k) : 
              [];
            
            targets.push({
              id: page.id,
              url: page.url,
              domain: page.domain,
              status: page.status,
              keywords: page.keywords,
              keywordArray,
              description: page.description,
              dr: 70,
              traffic: 10000,
              clientId,
              clientName: client.name,
              usageCount,
              addedAt: page.addedAt,
              completedAt: page.completedAt
            });
          });
        }
      }
    });
    
    targets.sort((a, b) => b.dr - a.dr);
    setAvailableTargets(targets);
  }, [selectedClients, clients, lineItems]);

  // Client selection handlers (from /edit page)
  const handleClientToggle = (clientId: string) => {
    const newSelected = new Map(selectedClients);
    const current = newSelected.get(clientId);
    
    if (current?.selected) {
      // Deselecting - remove all line items for this client
      newSelected.set(clientId, { selected: false, linkCount: 0 });
      setLineItems(prev => prev.filter(item => item.clientId !== clientId));
    } else {
      // Selecting - add with 1 link by default
      newSelected.set(clientId, { selected: true, linkCount: 1 });
      const client = clients.find(c => c.id === clientId);
      if (client) {
        const newItem: OrderLineItem = {
          id: `${clientId}-${Date.now()}`,
          clientId,
          clientName: client.name,
          targetPageUrl: '',
          anchorText: '',
          price: packagePricing.better.price,
          selectedPackage: 'better'
        };
        setLineItems(prev => [...prev, newItem]);
      }
    }
    
    setSelectedClients(newSelected);
  };

  const handleLinkCountChange = (clientId: string, newCount: number) => {
    const current = selectedClients.get(clientId);
    if (!current?.selected) return;

    const newSelected = new Map(selectedClients);
    newSelected.set(clientId, { selected: true, linkCount: newCount });
    setSelectedClients(newSelected);

    // Adjust line items
    const currentItems = lineItems.filter(item => item.clientId === clientId);
    const client = clients.find(c => c.id === clientId);
    
    if (newCount > currentItems.length) {
      // Add new items
      const itemsToAdd = newCount - currentItems.length;
      const newItems: OrderLineItem[] = [];
      
      for (let i = 0; i < itemsToAdd; i++) {
        newItems.push({
          id: `${clientId}-${Date.now()}-${i}`,
          clientId,
          clientName: client?.name || '',
          targetPageUrl: '',
          anchorText: '',
          price: packagePricing.better.price,
          selectedPackage: 'better'
        });
      }
      
      setLineItems(prev => [...prev.filter(item => item.clientId !== clientId), ...currentItems, ...newItems]);
    } else if (newCount < currentItems.length) {
      // Remove excess items
      const itemsToKeep = currentItems.slice(0, newCount);
      setLineItems(prev => [...prev.filter(item => item.clientId !== clientId), ...itemsToKeep]);
    }
  };

  // Add line item from target (from /edit page)
  const addLineItemFromTarget = (target: TargetPageWithMetadata) => {
    const emptyItem = lineItems.find(item => 
      item.clientId === target.clientId && !item.targetPageUrl
    );
    
    if (emptyItem) {
      // Fill empty slot
      setLineItems(prev => prev.map(item => 
        item.id === emptyItem.id
          ? {
              ...item,
              targetPageId: target.id,
              targetPageUrl: target.url,
              anchorText: target.keywordArray?.[0] || ''
            }
          : item
      ));
    } else {
      // Add new item and increase count
      const currentSelection = selectedClients.get(target.clientId);
      if (currentSelection) {
        const newSelected = new Map(selectedClients);
        newSelected.set(target.clientId, {
          selected: true,
          linkCount: currentSelection.linkCount + 1
        });
        setSelectedClients(newSelected);
        
        const newItem: OrderLineItem = {
          id: `${target.clientId}-${Date.now()}`,
          clientId: target.clientId,
          clientName: target.clientName,
          targetPageId: target.id,
          targetPageUrl: target.url,
          anchorText: target.keywordArray?.[0] || '',
          price: packagePricing.better.price,
          selectedPackage: 'better'
        };
        setLineItems(prev => [...prev, newItem]);
      }
    }
  };

  // Line item handlers
  const updateLineItem = (itemId: string, updates: Partial<OrderLineItem>) => {
    setLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const removeLineItem = (itemId: string) => {
    const item = lineItems.find(i => i.id === itemId);
    if (!item) return;

    setLineItems(prev => prev.filter(i => i.id !== itemId));
    
    // Update client count
    const currentSelection = selectedClients.get(item.clientId);
    if (currentSelection && currentSelection.linkCount > 1) {
      const newSelected = new Map(selectedClients);
      newSelected.set(item.clientId, {
        selected: true,
        linkCount: currentSelection.linkCount - 1
      });
      setSelectedClients(newSelected);
    } else {
      // Remove client selection if this was the last item
      handleClientToggle(item.clientId);
    }
  };

  // Filter targets based on search
  const getFilteredTargets = () => {
    if (!searchQuery.trim()) return availableTargets;
    
    const query = searchQuery.toLowerCase();
    return availableTargets.filter(target =>
      target.url.toLowerCase().includes(query) ||
      target.domain.toLowerCase().includes(query) ||
      target.clientName.toLowerCase().includes(query) ||
      target.keywordArray?.some(keyword => keyword.toLowerCase().includes(query))
    );
  };

  // Auto-save functionality (from /edit page)
  const saveOrderDraft = useCallback(async () => {
    if (!session || !onSave) return;
    
    try {
      setSaveStatus('saving');
      
      const orderData = {
        subtotal: subtotal,
        totalPrice: total,
        orderGroups: Array.from(selectedClients.entries())
          .filter(([_, data]) => data.selected && data.linkCount > 0)
          .map(([clientId, data]) => {
            const client = clients.find(c => c.id === clientId);
            const clientItems = lineItems.filter(item => item.clientId === clientId);
            
            const targetPages = clientItems
              .filter(item => item.targetPageUrl)
              .map(item => ({
                url: item.targetPageUrl,
                pageId: item.targetPageId
              }));
            
            const anchorTexts = clientItems
              .filter(item => item.anchorText)
              .map(item => item.anchorText);
            
            return {
              clientId,
              clientName: client?.name || '',
              linkCount: data.linkCount,
              targetPages: targetPages,
              anchorTexts: anchorTexts,
              packageType: clientItems[0]?.selectedPackage || 'better',
              packagePrice: packagePricing[clientItems[0]?.selectedPackage || 'better'].price,
            };
          })
      };
      
      await onSave(orderData);
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [session, lineItems, selectedClients, clients, subtotal, total, packagePricing, onSave]);

  // Submit handlers
  const handleSubmitClick = async () => {
    // Validate required fields
    if (lineItems.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    const itemsWithoutTargetPages = lineItems.filter(item => !item.targetPageUrl);
    if (itemsWithoutTargetPages.length > 0) {
      alert('Please select target pages for all line items');
      return;
    }
    
    // Save draft before showing confirmation
    await saveOrderDraft();
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };
  
  const handleConfirmOrder = async () => {
    try {
      setIsSubmitting(true);
      
      // First save the current changes
      await saveOrderDraft();
      
      // Submit through the onSubmit prop
      if (onSubmit) {
        const orderData = {
          subtotal: subtotal,
          totalPrice: total,
          orderGroups: Array.from(selectedClients.entries())
            .filter(([_, data]) => data.selected && data.linkCount > 0)
            .map(([clientId, data]) => {
              const client = clients.find(c => c.id === clientId);
              const clientItems = lineItems.filter(item => item.clientId === clientId);
              
              const targetPages = clientItems
                .filter(item => item.targetPageUrl)
                .map(item => ({
                  url: item.targetPageUrl,
                  pageId: item.targetPageId
                }));
              
              const anchorTexts = clientItems
                .filter(item => item.anchorText)
                .map(item => item.anchorText);
              
              return {
                clientId,
                clientName: client?.name || '',
                linkCount: data.linkCount,
                targetPages: targetPages,
                anchorTexts: anchorTexts,
                packageType: clientItems[0]?.selectedPackage || 'better',
                packagePrice: packagePricing[clientItems[0]?.selectedPackage || 'better'].price,
              };
            })
        };
        
        await onSubmit(orderData);
      }
      
      // Close modal
      setShowConfirmModal(false);
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Debounced auto-save
  const saveOrderDraftRef = useRef(saveOrderDraft);
  saveOrderDraftRef.current = saveOrderDraft;
  
  const debouncedSave = useCallback(
    debounce(() => saveOrderDraftRef.current(), 2000),
    []
  );

  // Effects
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    initializeFromOrderGroups();
  }, [initializeFromOrderGroups]);

  useEffect(() => {
    calculatePricing(lineItems);
  }, [lineItems, calculatePricing]);

  useEffect(() => {
    updateAvailableTargets();
  }, [updateAvailableTargets]);

  useEffect(() => {
    const mode = getAppropriateMode();
    if (mode !== currentMode) {
      setCurrentMode(mode);
    }
  }, [getAppropriateMode, currentMode]);

  // Auto-save trigger
  useEffect(() => {
    if (currentMode === 'draft' && !isPaid) {
      debouncedSave();
    }
  }, [selectedClients, lineItems, currentMode, isPaid, debouncedSave]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex space-x-1">
          <button
            onClick={() => setMobileView('clients')}
            className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
              mobileView === 'clients' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Brands ({Array.from(selectedClients.values()).filter(c => c.selected).length})
          </button>
          <button
            onClick={() => setMobileView('targets')}
            className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
              mobileView === 'targets' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Targets ({availableTargets.length})
          </button>
          <button
            onClick={() => setMobileView('order')}
            className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
              mobileView === 'order' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Order ({lineItems.length})
          </button>
        </div>
      </div>
      
      {/* Main Content Area - Three Column Layout (Desktop) / Single Column (Mobile) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden bg-gray-100" style={{height: 'calc(100vh - 64px - 80px)'}}>
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <p className="text-red-800">{error}</p>
              <button 
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800 text-sm mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Left Column - Client Selection (hidden in site management mode) */}
        {currentMode !== 'site_management' && (
          <div className={`w-full md:w-64 bg-white rounded-lg shadow-sm flex flex-col h-full ${
            mobileView === 'clients' ? 'block md:block' : 'hidden md:block'
          }`}>
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Select Brands</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedClients.size} of {clients.length} selected
                </p>
              </div>
              <button 
                onClick={() => setShowCreateClientModal(true)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="Add new brand"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map(client => {
                  const clientSelection = selectedClients.get(client.id);
                  const isSelected = clientSelection?.selected || false;
                  const linkCount = clientSelection?.linkCount || (isSelected ? 1 : 0);
                  
                  return (
                    <div key={client.id} className="space-y-2">
                      <div 
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handleClientToggle(client.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-blue-500' : 'bg-gray-300'
                              }`} />
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {client.name}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {client.website}
                            </p>
                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                              <span>{client.targetPages?.length || 0} pages</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="ml-4 p-2 bg-gray-50 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Links needed:</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (linkCount > 1) handleLinkCountChange(client.id, linkCount - 1);
                                }}
                                className="w-6 h-6 rounded border bg-white hover:bg-gray-50 flex items-center justify-center text-xs"
                                disabled={linkCount <= 1}
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{linkCount}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLinkCountChange(client.id, linkCount + 1);
                                }}
                                className="w-6 h-6 rounded border bg-white hover:bg-gray-50 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        )}

        {/* Middle Column - Target Pages (hidden in site management mode) */}
        {currentMode !== 'site_management' && (
          <div className={`w-full md:w-80 bg-white rounded-lg shadow-sm flex flex-col h-full ${
            mobileView === 'targets' ? 'block md:block' : 'hidden md:block'
          }`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Target Pages</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {availableTargets.length} pages available
                </p>
              </div>
              <button 
                onClick={() => setShowCreateTargetPageModal(true)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="Add custom target"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search domains, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {selectedClients.size === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-base">No targets available</p>
                <p className="text-sm mt-2 text-gray-400">Select brands to see their target pages</p>
              </div>
            ) : getFilteredTargets().length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-base">No results found</p>
                <p className="text-sm mt-2 text-gray-400">Try adjusting your search</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="divide-y divide-gray-100">
                  {Object.entries(
                    getFilteredTargets().reduce((acc, target) => {
                      if (!acc[target.domain]) acc[target.domain] = [];
                      acc[target.domain].push(target);
                      return acc;
                    }, {} as Record<string, TargetPageWithMetadata[]>)
                  ).map(([domain, targets]) => {
                    const isExpanded = !expandedDomains.has(domain);
                    const totalUsage = targets.reduce((sum, t) => sum + t.usageCount, 0);
                    
                    return (
                      <div key={domain}>
                        <button
                          onClick={() => {
                            setExpandedDomains(prev => {
                              const newSet = new Set(prev);
                              if (isExpanded) {
                                newSet.add(domain);
                              } else {
                                newSet.delete(domain);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <div className="text-left min-w-0">
                              <h3 className="font-medium text-sm text-gray-900 truncate">{domain}</h3>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                                <span>{targets.length} {targets.length === 1 ? 'page' : 'pages'}</span>
                                {totalUsage > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-600">Used {totalUsage}x</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="bg-gray-50/50">
                            {targets.map(target => (
                              <div 
                                key={`${target.clientId}-${target.id}`} 
                                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors flex items-center group border-l-2 border-transparent hover:border-blue-400 ml-4"
                                onClick={() => addLineItemFromTarget(target)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 break-words line-clamp-2" title={target.url}>
                                    {target.url.replace(`https://${target.domain}`, '').replace(`http://${target.domain}`, '') || '/'}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-xs text-gray-500">{target.clientName}</span>
                                    {target.usageCount > 0 && (
                                      <span className="text-xs text-blue-600">Used {target.usageCount}x</span>
                                    )}
                                  </div>
                                  {target.keywordArray && target.keywordArray.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {target.keywordArray.slice(0, 2).map((keyword, idx) => (
                                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-white text-gray-600 border border-gray-200">
                                          {keyword}
                                        </span>
                                      ))}
                                      {target.keywordArray.length > 2 && (
                                        <span className="text-xs text-gray-400">+{target.keywordArray.length - 2}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Right Column - Order Management (ADAPTIVE - will switch between modes) */}
        <div className={`flex-1 bg-white rounded-lg shadow-sm flex flex-col h-full ${
          mobileView === 'order' ? 'block md:block' : 'hidden md:block'
        }`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentMode === 'draft' && 'Order Details'}
                    {currentMode === 'site_management' && 'Site Management'}
                    {currentMode === 'approval' && 'Review & Approve'}
                  </h2>
                  {saveStatus !== 'idle' && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' :
                      saveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {saveStatus === 'saving' ? 'Saving...' :
                       saveStatus === 'saved' ? 'Saved' :
                       'Save failed'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {lineItems.length} items • {lineItems.filter(item => item.targetPageUrl).length} assigned
                  {lastSaved && (
                    <span className="text-gray-400"> • Last saved {new Date(lastSaved).toLocaleTimeString()}</span>
                  )}
                </p>
              </div>
              
              {/* Mode switcher for testing */}
              {userType === 'internal' && (
                <div className="flex items-center space-x-2">
                  <select 
                    value={currentMode}
                    onChange={(e) => switchMode(e.target.value as OrderMode)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="draft">Draft Mode</option>
                    <option value="site_management">Site Management</option>
                    <option value="approval">Approval Mode</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {currentMode === 'draft' && (
              // DRAFT MODE - Order building table (from /edit page)
              <>
                {lineItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-base">No items added yet</p>
                    <p className="text-sm mt-2 text-gray-400">Select brands and target pages to build your order</p>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Page</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anchor Text</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lineItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">{item.clientName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={item.targetPageUrl || ''}
                                onChange={(e) => {
                                  const url = e.target.value;
                                  if (url === '__ADD_NEW__') {
                                    setShowCreateTargetPageModal(true);
                                    return;
                                  }
                                  const targetPage = availableTargets.find(tp => tp.url === url);
                                  updateLineItem(item.id, {
                                    targetPageUrl: url,
                                    targetPageId: targetPage?.id
                                  });
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                disabled={isPaid}
                              >
                                <option value="">Select target page...</option>
                                {availableTargets
                                  .filter(target => target.clientId === item.clientId)
                                  .map(target => (
                                    <option key={target.id} value={target.url}>
                                      {target.url}
                                    </option>
                                  ))
                                }
                                <option value="__ADD_NEW__">+ Add New Target Page</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.anchorText || ''}
                                onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                                placeholder="Enter anchor text..."
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                disabled={isPaid || !item.targetPageUrl}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={item.selectedPackage}
                                onChange={(e) => {
                                  const pkg = e.target.value as PackageType;
                                  updateLineItem(item.id, { 
                                    selectedPackage: pkg, 
                                    price: packagePricing[pkg].price 
                                  });
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                disabled={isPaid}
                              >
                                {Object.entries(packagePricing).map(([key, pkg]) => (
                                  <option key={key} value={key}>
                                    {pkg.name} (${pkg.price})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(item.price)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {!isPaid && (
                                <button
                                  onClick={() => removeLineItem(item.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            
            {currentMode === 'site_management' && (
              // SITE MANAGEMENT MODE - Nested tables with pool management
              <>
                {!orderGroups || orderGroups.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-base">No site management data</p>
                    <p className="text-sm mt-2 text-gray-400">Submit your order to begin site selection</p>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client / Target Page
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Anchor Text
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Site Selection
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          {userType === 'internal' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tools
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orderGroups.map(group => {
                          const groupId = group.id;
                          const isGroupExpanded = expandedGroup === groupId;
                          const groupSubmissions = siteSubmissions[groupId] || [];
                          
                          // Calculate statistics
                          const totalSuggestions = groupSubmissions.length;
                          const approvedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_approved').length;
                          const pendingCount = groupSubmissions.filter(s => s.submissionStatus === 'pending').length;
                          const rejectedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_rejected').length;
                          
                          return (
                            <React.Fragment key={groupId}>
                              {/* Client group header row */}
                              <tr className="bg-gray-50">
                                <td colSpan={userType === 'internal' ? 5 : 4} className="px-6 py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">{group.client.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {group.linkCount} link{group.linkCount > 1 ? 's' : ''} needed
                                        </div>
                                      </div>
                                      {totalSuggestions > 0 && (
                                        <div className="flex items-center gap-3 text-xs">
                                          <span className="text-gray-500">
                                            {totalSuggestions} site{totalSuggestions !== 1 ? 's' : ''} suggested
                                          </span>
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
                                        </div>
                                      )}
                                    </div>
                                    {group.bulkAnalysisProjectId && userType === 'internal' && (
                                      <a
                                        href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        <Database className="h-3 w-3 mr-1" />
                                        Bulk Analysis
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Line items for this client */}
                              {[...Array(group.linkCount)].map((_, index) => {
                                const targetPageUrl = group.targetPages?.[index]?.url;
                                const anchorText = group.anchorTexts?.[index];
                                
                                // Find matching submissions
                                const matchingSubmissions = groupSubmissions.filter(sub => 
                                  sub.targetPageUrl === targetPageUrl || sub.metadata?.targetPageUrl === targetPageUrl
                                );
                                
                                // Pool-based selection logic
                                const primarySubmissions = matchingSubmissions
                                  .filter(sub => sub.selectionPool === 'primary')
                                  .sort((a, b) => (a.poolRank || 1) - (b.poolRank || 1));
                                
                                const displaySubmission = primarySubmissions[index] || null;
                                
                                const alternativeSubmissions = matchingSubmissions
                                  .filter(sub => sub.selectionPool === 'alternative')
                                  .sort((a, b) => (a.poolRank || 1) - (b.poolRank || 1));
                                
                                const suggestedMatch = !displaySubmission ? alternativeSubmissions[0] : null;
                                const finalDisplaySubmission = displaySubmission || suggestedMatch;
                                
                                // Available options for dropdown
                                const availableForTarget = groupSubmissions.filter(sub => {
                                  const isForThisTarget = sub.targetPageUrl === targetPageUrl || 
                                                         sub.metadata?.targetPageUrl === targetPageUrl;
                                  const isUnassigned = !sub.targetPageUrl && !sub.metadata?.targetPageUrl;
                                  const isNotRejected = sub.submissionStatus !== 'client_rejected';
                                  
                                  return (isForThisTarget || isUnassigned) && isNotRejected;
                                });
                                
                                const isExpanded = editingLineItem?.groupId === groupId && editingLineItem?.index === index;
                                
                                return (
                                  <React.Fragment key={`${groupId}-${index}`}>
                                    <tr className="hover:bg-gray-50">
                                      {/* Client/Target Page */}
                                      <td className="px-6 py-4">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">
                                              Link {index + 1}
                                            </span>
                                          </div>
                                          <div className="text-sm text-gray-600 ml-6">
                                            {targetPageUrl ? (
                                              <span className="truncate max-w-[200px] block" title={targetPageUrl}>
                                                {(() => {
                                                  try {
                                                    const url = new URL(targetPageUrl);
                                                    return url.pathname === '/' ? url.hostname : url.pathname;
                                                  } catch {
                                                    return targetPageUrl.length > 40 ? targetPageUrl.substring(0, 40) + '...' : targetPageUrl;
                                                  }
                                                })()}
                                              </span>
                                            ) : 'No target page selected'}
                                          </div>
                                        </div>
                                      </td>
                                      
                                      {/* Anchor Text */}
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <LinkIcon className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm text-gray-700">
                                            {anchorText || '-'}
                                          </span>
                                        </div>
                                      </td>
                                      
                                      {/* Site Selection */}
                                      <td className="px-6 py-4">
                                        <div className="space-y-2">
                                          {finalDisplaySubmission ? (
                                            <>
                                              {/* Primary Selection */}
                                              <div className={`flex items-center justify-between p-2 rounded border ${
                                                displaySubmission ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                                              }`}>
                                                <div className="flex items-center gap-2">
                                                  {displaySubmission ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                  ) : (
                                                    <Clock className="h-4 w-4 text-yellow-600" />
                                                  )}
                                                  <div>
                                                    <div className="text-sm font-medium">
                                                      {finalDisplaySubmission.domain?.domain || 'Unknown'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                      {finalDisplaySubmission.domainRating && (
                                                        <span>DR: {finalDisplaySubmission.domainRating}</span>
                                                      )}
                                                      {finalDisplaySubmission.traffic && (
                                                        <span>Traffic: {finalDisplaySubmission.traffic.toLocaleString()}</span>
                                                      )}
                                                      <span className="font-medium">{formatCurrency(finalDisplaySubmission.price)}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                {availableForTarget.length > 1 && !isPaid && (
                                                  <button
                                                    onClick={() => {
                                                      setEditingLineItem(
                                                        isExpanded ? null : { groupId, index }
                                                      );
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                                                  >
                                                    {isExpanded ? 'Close' : 'Compare'}
                                                  </button>
                                                )}
                                              </div>
                                              
                                              {/* Alternative count indicator */}
                                              {alternativeSubmissions.length > 0 && !isExpanded && (
                                                <div className="text-xs text-gray-500 pl-2">
                                                  {alternativeSubmissions.length} alternative{alternativeSubmissions.length !== 1 ? 's' : ''} available
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                                              <AlertCircle className="h-4 w-4 text-gray-400" />
                                              <span className="text-sm text-gray-600">No sites suggested yet</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      
                                      {/* Price */}
                                      <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-medium text-gray-900">
                                          {formatCurrency(finalDisplaySubmission?.price || group.packagePrice || 279)}
                                        </span>
                                      </td>
                                      
                                      {/* Internal Tools */}
                                      {userType === 'internal' && (
                                        <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                // Add site suggestion logic
                                                console.log('Add site suggestion for', groupId, index);
                                              }}
                                              className="text-blue-600 hover:text-blue-800 text-xs"
                                              title="Add site suggestion"
                                            >
                                              <Plus className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                // Bulk analysis logic
                                                console.log('Run bulk analysis for', groupId, index);
                                              }}
                                              className="text-purple-600 hover:text-purple-800 text-xs"
                                              title="Run bulk analysis"
                                            >
                                              <Database className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                    
                                    {/* Expandable comparison table */}
                                    {isExpanded && availableForTarget.length > 1 && (
                                      <tr className="bg-white border-l-4 border-indigo-200">
                                        <td colSpan={userType === 'internal' ? 5 : 4} className="px-6 py-4">
                                          <div className="bg-gray-50 rounded-lg p-4">
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
                                                      Authority
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Traffic
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Pool
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Price
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Actions
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                  {availableForTarget.map((submission, subIndex) => (
                                                    <tr key={submission.id} className={`hover:bg-gray-50 ${
                                                      submission.id === finalDisplaySubmission?.id ? 'bg-blue-50' : ''
                                                    }`}>
                                                      <td className="px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                          {submission.id === finalDisplaySubmission?.id && (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                          )}
                                                          <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                              {submission.domain?.domain || 'Unknown'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                              {submission.selectionPool === 'primary' ? 'Primary' : 'Alternative'}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </td>
                                                      <td className="px-3 py-2 text-sm text-gray-900">
                                                        {submission.domainRating ? `DR ${submission.domainRating}` : '-'}
                                                      </td>
                                                      <td className="px-3 py-2 text-sm text-gray-900">
                                                        {submission.traffic ? submission.traffic.toLocaleString() : '-'}
                                                      </td>
                                                      <td className="px-3 py-2">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                          submission.selectionPool === 'primary'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                          {submission.selectionPool === 'primary' ? 'Primary' : 'Alternative'}
                                                        </span>
                                                      </td>
                                                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                                        {formatCurrency(submission.price)}
                                                      </td>
                                                      <td className="px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                          {submission.id !== finalDisplaySubmission?.id && !isPaid && (
                                                            <button
                                                              onClick={() => {
                                                                // Switch to this domain
                                                                console.log('Switch to domain:', submission.id);
                                                              }}
                                                              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border"
                                                            >
                                                              Select
                                                            </button>
                                                          )}
                                                          {userType === 'external' && (
                                                            <>
                                                              <button
                                                                onClick={() => {
                                                                  // Approve submission
                                                                  console.log('Approve:', submission.id);
                                                                }}
                                                                className="text-xs text-green-700 hover:text-green-800 px-2 py-1 rounded border border-green-300"
                                                                disabled={isPaid}
                                                              >
                                                                ✓
                                                              </button>
                                                              <button
                                                                onClick={() => {
                                                                  // Reject submission
                                                                  console.log('Reject:', submission.id);
                                                                }}
                                                                className="text-xs text-red-700 hover:text-red-800 px-2 py-1 rounded border border-red-300"
                                                                disabled={isPaid}
                                                              >
                                                                ✗
                                                              </button>
                                                            </>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                            
                                            {/* Special Instructions */}
                                            <div className="mt-4">
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Special Instructions for this link:
                                              </label>
                                              <textarea
                                                placeholder="Any special requirements or notes for this placement..."
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                rows={2}
                                                disabled={isPaid}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Unassigned Pool View - Show domains that haven't been assigned to target pages */}
                        {orderGroups.map(group => {
                          const groupId = group.id;
                          const isGroupExpanded = expandedGroup === groupId;
                          const groupSubmissions = siteSubmissions[groupId] || [];
                          
                          // Get unassigned submissions for this group
                          const unassignedSubmissions = groupSubmissions.filter(s => 
                            !s.targetPageUrl && !s.metadata?.targetPageUrl && s.submissionStatus !== 'client_rejected'
                          );
                          
                          if (unassignedSubmissions.length === 0) return null;
                          
                          return (
                            <React.Fragment key={`unassigned-${groupId}`}>
                              {/* Unassigned pool header */}
                              <tr className="bg-blue-50 border-t-2 border-blue-200">
                                <td colSpan={userType === 'internal' ? 5 : 4} className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setExpandedGroup(isGroupExpanded ? null : groupId)}
                                      className="flex items-center gap-1 p-1 hover:bg-blue-100 rounded"
                                      title={`${unassignedSubmissions.length} unassigned domains available`}
                                    >
                                      {isGroupExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-blue-600" />
                                      )}
                                      <span className="text-sm text-blue-700 font-medium">
                                        {group.client.name} - Unassigned Pool ({unassignedSubmissions.length} domains)
                                      </span>
                                    </button>
                                    <div className="flex items-center gap-2 text-xs text-blue-600">
                                      <Database className="h-3 w-3" />
                                      <span>Available for assignment</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expandable unassigned domains */}
                              {isGroupExpanded && (
                                <tr>
                                  <td colSpan={userType === 'internal' ? 5 : 4} className="px-6 py-4 bg-blue-25">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                      {unassignedSubmissions.map((submission) => (
                                        <div key={submission.id} className="bg-white p-3 rounded-lg border border-blue-200 hover:border-blue-300">
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <div className="text-sm font-medium text-gray-900">
                                                  {submission.domain?.domain || 'Unknown'}
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                  submission.selectionPool === 'primary'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                  {submission.selectionPool === 'primary' ? 'Primary' : 'Alternative'}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                                {submission.domainRating && (
                                                  <span>DR: {submission.domainRating}</span>
                                                )}
                                                {submission.traffic && (
                                                  <span>Traffic: {submission.traffic.toLocaleString()}</span>
                                                )}
                                                <span className="font-medium">{formatCurrency(submission.price)}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {userType === 'internal' && !isPaid && (
                                                <>
                                                  <button
                                                    onClick={() => {
                                                      // Assign to target page logic
                                                      console.log('Assign domain:', submission.id);
                                                    }}
                                                    className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                                                  >
                                                    Assign
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      // Add as new link logic
                                                      console.log('Add as new link:', submission.id);
                                                    }}
                                                    className="text-xs bg-green-600 text-white hover:bg-green-700 px-2 py-1 rounded transition-colors"
                                                  >
                                                    Add as New Link
                                                  </button>
                                                </>
                                              )}
                                              {group.bulkAnalysisProjectId && submission.domainId && (
                                                <a
                                                  href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}?guided=${submission.domainId}`}
                                                  className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                  title="View detailed bulk analysis"
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                  Analysis
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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
              </>
            )}
            
            {currentMode === 'approval' && (
              // APPROVAL MODE - Final review and confirmation
              <>
                {!orderGroups || orderGroups.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-base">No selections to approve</p>
                    <p className="text-sm mt-2 text-gray-400">Complete site selection first</p>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    {/* Summary Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Review Your Selections
                          </h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Please review and confirm your site selections before proceeding to payment
                          </p>
                          <div className="flex items-center gap-6 mt-3 text-sm">
                            {orderGroups.map(group => {
                              const groupSubmissions = siteSubmissions[group.id] || [];
                              const primaryCount = groupSubmissions.filter(s => s.selectionPool === 'primary').length;
                              const approvedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_approved').length;
                              
                              return (
                                <div key={group.id} className="flex items-center gap-2">
                                  <span className="font-medium">{group.client.name}:</span>
                                  <span className="text-blue-800">
                                    {Math.max(primaryCount, approvedCount)} of {group.linkCount} selected
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Approval Table */}
                    <div className="bg-white rounded-lg border border-gray-200">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Final Order Summary</h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Link Details
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Selected Site
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Special Instructions
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price
                              </th>
                              {!isPaid && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Action
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {orderGroups.map(group => {
                              const groupSubmissions = siteSubmissions[group.id] || [];
                              
                              return [...Array(group.linkCount)].map((_, index) => {
                                const targetPageUrl = group.targetPages?.[index]?.url;
                                const anchorText = group.anchorTexts?.[index];
                                
                                // Find the confirmed selection for this link
                                const matchingSubmissions = groupSubmissions.filter(sub => 
                                  sub.targetPageUrl === targetPageUrl || sub.metadata?.targetPageUrl === targetPageUrl
                                );
                                
                                const confirmedSubmission = matchingSubmissions.find(s => 
                                  s.submissionStatus === 'client_approved'
                                ) || matchingSubmissions.find(s => 
                                  s.selectionPool === 'primary'
                                );
                                
                                return (
                                  <tr key={`${group.id}-${index}`} className="hover:bg-gray-50">
                                    {/* Link Details */}
                                    <td className="px-6 py-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <Building className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm font-medium text-gray-900">
                                            {group.client.name} - Link {index + 1}
                                          </span>
                                        </div>
                                        <div className="text-sm text-gray-600 ml-6">
                                          {targetPageUrl ? (
                                            <span className="block" title={targetPageUrl}>
                                              Target: {(() => {
                                                try {
                                                  const url = new URL(targetPageUrl);
                                                  return url.pathname === '/' ? url.hostname : url.pathname;
                                                } catch {
                                                  return targetPageUrl.length > 30 ? targetPageUrl.substring(0, 30) + '...' : targetPageUrl;
                                                }
                                              })()}
                                            </span>
                                          ) : 'No target page'}
                                          {anchorText && (
                                            <span className="block text-gray-500">
                                              Anchor: "{anchorText}"
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    
                                    {/* Selected Site */}
                                    <td className="px-6 py-4">
                                      {confirmedSubmission ? (
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">
                                              {confirmedSubmission.domain?.domain || 'Unknown'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                              {confirmedSubmission.domainRating && (
                                                <span>DR: {confirmedSubmission.domainRating}</span>
                                              )}
                                              {confirmedSubmission.traffic && (
                                                <span>Traffic: {confirmedSubmission.traffic.toLocaleString()}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-yellow-600">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="text-sm">No site selected</span>
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* Special Instructions */}
                                    <td className="px-6 py-4">
                                      {!isPaid ? (
                                        <textarea
                                          placeholder="Special instructions..."
                                          defaultValue={confirmedSubmission?.specialInstructions || ''}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                          rows={2}
                                        />
                                      ) : (
                                        <span className="text-sm text-gray-700">
                                          {confirmedSubmission?.specialInstructions || 'None'}
                                        </span>
                                      )}
                                    </td>
                                    
                                    {/* Price */}
                                    <td className="px-6 py-4 text-right">
                                      <span className="text-sm font-medium text-gray-900">
                                        {formatCurrency(confirmedSubmission?.price || group.packagePrice || 279)}
                                      </span>
                                    </td>
                                    
                                    {/* Action */}
                                    {!isPaid && (
                                      <td className="px-6 py-4">
                                        <button
                                          onClick={() => switchMode('site_management')}
                                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border"
                                        >
                                          Change
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={isPaid ? 4 : 5} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium text-gray-900">
                                    Order Total
                                  </div>
                                  <div className="text-lg font-bold text-gray-900">
                                    {formatCurrency(total)}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                    
                    {/* Terms and Final Actions */}
                    {!isPaid && (
                      <div className="mt-6 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              id="terms"
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="terms" className="text-sm text-gray-700">
                              I have reviewed and approve all site selections. I understand that changes after payment may incur additional fees.
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => switchMode('site_management')}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            ← Back to Site Selection
                          </button>
                          
                          <div className="space-x-3">
                            <button
                              onClick={() => {
                                // Request changes logic
                                console.log('Request changes');
                              }}
                              className="px-4 py-2 text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50"
                            >
                              Request Changes
                            </button>
                            <button
                              onClick={() => {
                                // Proceed to payment
                                if (onSubmit) {
                                  onSubmit({
                                    subtotal,
                                    totalPrice: total,
                                    approved: true,
                                    orderGroups: orderGroups.map(group => ({
                                      ...group,
                                      confirmed: true
                                    }))
                                  });
                                }
                              }}
                              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                              Approve & Proceed to Payment
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer with totals and actions */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total: <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentMode === 'draft' && !isPaid && (
                  <button
                    onClick={handleSubmitClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    disabled={lineItems.length === 0}
                  >
                    Submit Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateClientModal && (
        <CreateClientModal
          isOpen={showCreateClientModal}
          onClose={() => setShowCreateClientModal(false)}
          onClientCreated={(client) => {
            setClients(prev => [...prev, { ...client, selected: false, linkCount: 0 }]);
            setShowCreateClientModal(false);
          }}
        />
      )}

      {showCreateTargetPageModal && (
        <CreateTargetPageModal
          isOpen={showCreateTargetPageModal}
          onClose={() => setShowCreateTargetPageModal(false)}
          onTargetPagesCreated={() => {
            loadClients(); // Reload to get updated target pages
            setShowCreateTargetPageModal(false);
          }}
        />
      )}

      {/* Order Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Confirm Your Order</h2>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Order Summary */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Links:</span>
                    <span className="font-medium">{lineItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number of Clients:</span>
                    <span className="font-medium">{new Set(lineItems.map(item => item.clientId)).size}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Price:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Client Details */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="space-y-3">
                  {Array.from(new Set(lineItems.map(item => item.clientId))).map(clientId => {
                    const clientItems = lineItems.filter(item => item.clientId === clientId);
                    const clientName = clientItems[0]?.clientName || 'Unknown Client';
                    return (
                      <div key={clientId} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{clientName}</p>
                            <p className="text-sm text-gray-600">{clientItems.length} links</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600 font-medium">Target Pages:</p>
                          {clientItems.slice(0, 3).map((item, idx) => (
                            <p key={idx} className="text-sm text-gray-600 ml-2">
                              • {item.targetPageUrl || 'No target page selected'}
                            </p>
                          ))}
                          {clientItems.length > 3 && (
                            <p className="text-sm text-gray-500 ml-2">
                              + {clientItems.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* What Happens Next */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">What Happens Next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your order will be submitted for processing</li>
                  <li>• Our team will analyze and find suitable guest post sites</li>
                  <li>• You'll receive site recommendations for review</li>
                  <li>• Once approved, we'll begin content creation and outreach</li>
                </ul>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Confirm Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}