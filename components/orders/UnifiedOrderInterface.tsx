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
  XCircle, PlayCircle, FileText, Activity, Users, DollarSign, Sparkles
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

interface TargetPageStatus {
  id: string;
  url: string;
  hasKeywords: boolean;
  hasDescription: boolean;
  keywordCount: number;
  clientName: string;
  orderGroupId: string;
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
  // Internal-specific handlers
  onMarkSitesReady?: () => Promise<void>;
  onGenerateWorkflows?: () => Promise<void>;
  onSwitchDomain?: (submissionId: string, groupId: string) => Promise<void>;
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
  onModeChange,
  onMarkSitesReady,
  onGenerateWorkflows,
  onSwitchDomain
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
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [mobileView, setMobileView] = useState<'clients' | 'targets' | 'order'>('clients');
  
  // Target page keywords workflow state (from /internal page)
  const [targetPageStatuses, setTargetPageStatuses] = useState<TargetPageStatus[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<string | null>(null);
  
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
  
  // Account selection state (for internal users)
  const [accountsList, setAccountsList] = useState<Array<{
    id: string;
    email: string;
    name: string;
    company?: string;
  }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>('');
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  const [selectedAccountCompany, setSelectedAccountCompany] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Order state management
  const [isNewOrder, setIsNewOrder] = useState(!orderId);
  const [draftOrderId, setDraftOrderId] = useState<string | null>(orderId || null);
  const [requestingLineItemId, setRequestingLineItemId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

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
      const url = isAccountUser ? '/api/account/clients' : '/api/clients';
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const clientList = data.clients || data;  // Handle both formats
        // Filter out archived clients
        const activeClients = clientList.filter((client: any) => !client.archivedAt);
        setClients(activeClients.map((client: any) => ({ ...client, selected: false, linkCount: 0 })));
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }, [isAccountUser]);

  // Load accounts (for internal users)
  const loadAccounts = useCallback(async () => {
    if (isAccountUser) return;
    
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/accounts', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const accounts = await response.json();
        setAccountsList(accounts);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
    }
  }, [isAccountUser]);

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

  // Load draft order
  const loadDraftOrder = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setLoadingDraft(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        setError('Failed to load order');
        return;
      }
      
      const orderData = await response.json();
      
      // Set order state
      setIsNewOrder(false);
      setDraftOrderId(orderData.id);
      
      // Load account info if internal user
      if (session?.userType === 'internal' && orderData.accountId) {
        setSelectedAccountId(orderData.accountId);
        setSelectedAccountEmail(orderData.accountEmail || '');
        setSelectedAccountName(orderData.accountName || orderData.contactName || '');
        setSelectedAccountCompany(orderData.accountCompany || orderData.companyName || '');
      }
      
      // Initialize order groups if available
      if (orderData.orderGroups && orderData.orderGroups.length > 0) {
        const newSelectedClients = new Map<string, { selected: boolean; linkCount: number }>();
        const newLineItems: OrderLineItem[] = [];
        
        orderData.orderGroups.forEach((group: any) => {
          newSelectedClients.set(group.clientId, {
            selected: true,
            linkCount: group.linkCount
          });
          
          // Create line items from the group
          for (let i = 0; i < group.linkCount; i++) {
            newLineItems.push({
              id: `${group.id}-${i}`,
              clientId: group.clientId,
              clientName: group.clientName || group.client?.name || '',
              targetPageId: group.targetPages?.[i]?.pageId,
              targetPageUrl: group.targetPages?.[i]?.url || '',
              anchorText: group.anchorTexts?.[i] || '',
              price: group.packagePrice || packagePricing[(group.packageType as PackageType) || 'better'].price,
              selectedPackage: (group.packageType as PackageType) || 'better'
            });
          }
        });
        
        setSelectedClients(newSelectedClients);
        setLineItems(newLineItems);
      }
      
    } catch (error) {
      console.error('Failed to load order:', error);
      setError('Failed to load order');
    } finally {
      setLoadingDraft(false);
    }
  }, [orderId, session?.userType, packagePricing]);

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

  // Helper functions for order stats
  const getTotalLinks = () => lineItems.length;
  
  const getTotalClients = () => {
    return new Set(lineItems.map(item => item.clientId)).size;
  };
  
  const getTotalTargets = () => {
    return new Set(lineItems.filter(item => item.targetPageUrl).map(item => item.targetPageUrl)).size;
  };

  // Generate anchor text variations
  const generateAnchorText = (clientName: string) => {
    const variations = [
      clientName,
      `Visit ${clientName}`,
      `Learn more about ${clientName}`,
      `${clientName} services`,
      `Check out ${clientName}`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  };

  // Get target pages for a specific client
  const getClientTargetPages = (clientId: string) => {
    return availableTargets.filter(target => target.clientId === clientId);
  };

  // Handle target pages created from modal
  const handleTargetPagesCreated = (newTargetPages: any[]) => {
    // Refresh the client list to include the new target pages
    loadClients();
    
    // If called from a line item dropdown, populate that line item and create additional ones
    if (requestingLineItemId && newTargetPages.length > 0) {
      const requestingItem = lineItems.find(item => item.id === requestingLineItemId);
      if (requestingItem) {
        // Fill the requesting line item with the first new page
        const firstPage = newTargetPages[0];
        updateLineItem(requestingLineItemId, {
          targetPageUrl: firstPage.url,
          targetPageId: firstPage.id,
          anchorText: generateAnchorText(requestingItem.clientName)
        });
        
        // Create additional line items for remaining pages
        if (newTargetPages.length > 1) {
          const additionalPages = newTargetPages.slice(1);
          const newItems: OrderLineItem[] = additionalPages.map(page => ({
            id: `${Date.now()}-${Math.random()}`,
            clientId: requestingItem.clientId,
            clientName: requestingItem.clientName,
            targetPageId: page.id,
            targetPageUrl: page.url,
            anchorText: generateAnchorText(requestingItem.clientName),
            price: packagePricing[selectedPackage].price,
            selectedPackage: selectedPackage
          }));
          
          setLineItems(prev => [...prev, ...newItems]);
          
          // Update the client's link count
          setSelectedClients(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(requestingItem.clientId);
            if (existing) {
              const currentCount = lineItems.filter(item => item.clientId === requestingItem.clientId).length;
              newMap.set(requestingItem.clientId, { 
                ...existing, 
                linkCount: currentCount + additionalPages.length 
              });
            }
            return newMap;
          });
        }
      }
      
      // Reset requesting state
      setRequestingLineItemId(null);
    }
    
    // The target pages will automatically show up in the available targets
    // when clients are refreshed and updateAvailableTargets is called
  };

  // Duplicate line item
  const duplicateLineItem = (itemId: string) => {
    const item = lineItems.find(i => i.id === itemId);
    if (!item) return;
    
    const newItem: OrderLineItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`
    };
    
    setLineItems(prev => [...prev, newItem]);
    
    // Update client count
    const currentSelection = selectedClients.get(item.clientId);
    if (currentSelection) {
      setSelectedClients(prev => {
        const newMap = new Map(prev);
        newMap.set(item.clientId, {
          ...currentSelection,
          linkCount: currentSelection.linkCount + 1
        });
        return newMap;
      });
    }
  };

  // Auto-save functionality (from /edit page)
  const saveOrderDraft = useCallback(async () => {
    if (!session) return;
    
    try {
      setSaveStatus('saving');
      
      // Prepare order data based on user type
      let accountInfo: {
        accountId?: string | null;
        accountEmail: string;
        accountName: string;
        accountCompany: string;
      };
      
      if (session.userType === 'account') {
        // Account users - use their own account info
        accountInfo = {
          accountId: session.userId,
          accountEmail: session.email || '',
          accountName: session.name || '',
          accountCompany: selectedAccountCompany || '',
        };
      } else if (session.userType === 'internal') {
        // Internal users - must select an account
        if (!selectedAccountId || !selectedAccountEmail || !selectedAccountName) {
          // Don't save if account info is missing
          setSaveStatus('idle');
          return;
        }
        accountInfo = {
          accountId: selectedAccountId,
          accountEmail: selectedAccountEmail,
          accountName: selectedAccountName,
          accountCompany: selectedAccountCompany || '',
        };
      } else {
        setSaveStatus('error');
        return;
      }
      
      const orderData = {
        // Account info
        ...accountInfo,
        
        // Pricing - use correct field names expected by API
        subtotal: subtotal,
        totalPrice: total,
        totalWholesale: Math.round(total * 0.6), // Estimate wholesale cost
        profitMargin: Math.round(total * 0.4),
        
        // Groups for the new order structure - API expects 'orderGroups'
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
      
      if (draftOrderId) {
        // Update existing order
        const response = await fetch(`/api/orders/${draftOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
          setSaveStatus('saved');
          setLastSaved(new Date());
        } else {
          const errorData = await response.json();
          console.error('Failed to save order:', errorData);
          setSaveStatus('error');
        }
      }
      
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [session, lineItems, selectedClients, clients, subtotal, total, packagePricing, 
      selectedAccountId, selectedAccountEmail, selectedAccountName, selectedAccountCompany, draftOrderId]);

  // Submit handlers
  const handleSubmitClick = async () => {
    // Validate account selection for internal users
    if (userType === 'internal' && !selectedAccountId) {
      setError('Please select an account before submitting the order');
      alert('Please select an account before submitting the order');
      return;
    }
    
    // Validate required fields
    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      alert('Please add at least one line item');
      return;
    }

    // For account users, validate target pages
    if (isAccountUser) {
      const itemsWithoutTargetPages = lineItems.filter(item => !item.targetPageUrl);
      if (itemsWithoutTargetPages.length > 0) {
        setError('Please select target pages for all line items');
        alert('Please select target pages for all line items');
        return;
      }
    }
    
    // Save draft before showing confirmation
    await saveOrderDraft();
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };
  
  const handleConfirmOrder = async () => {
    try {
      setIsSubmitting(true);
      
      // Disable auto-save during submission to prevent race conditions
      setSaveStatus('idle');
      
      // First save the current changes
      await saveOrderDraft();
      
      // If we have an onSubmit prop, use it (for existing orders)
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
      } else if (orderStatus === 'draft' && draftOrderId) {
        // Fallback for new draft orders without onSubmit prop
        const response = await fetch(`/api/orders/${draftOrderId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit order');
        }
        
        // Redirect to success page for new orders
        window.location.href = `/orders/${draftOrderId}/success`;
        return;
      } else {
        throw new Error('Cannot submit order: No submit handler available');
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

  // Target page keywords workflow functions (from /internal page)
  const checkTargetPageStatuses = useCallback(async () => {
    if (!orderGroups) return;
    
    const statuses: TargetPageStatus[] = [];
    
    for (const group of orderGroups) {
      for (const targetPage of group.targetPages || []) {
        if (targetPage.pageId) {
          try {
            const response = await fetch(`/api/target-pages/${targetPage.pageId}`);
            if (response.ok) {
              const pageData = await response.json();
              statuses.push({
                id: pageData.id,
                url: pageData.url,
                hasKeywords: !!(pageData.keywords && pageData.keywords.trim() !== ''),
                hasDescription: !!(pageData.description && pageData.description.trim() !== ''),
                keywordCount: pageData.keywords ? pageData.keywords.split(',').filter((k: string) => k.trim()).length : 0,
                clientName: group.client.name,
                orderGroupId: group.id
              });
            }
          } catch (error) {
            console.error(`Failed to load target page ${targetPage.pageId}:`, error);
          }
        }
      }
    }
    
    setTargetPageStatuses(statuses);
    
    // Auto-select pages that need keywords
    const pagesNeedingKeywords = statuses.filter(p => !p.hasKeywords).map(p => p.id);
    setSelectedPages(new Set(pagesNeedingKeywords));
  }, [orderGroups]);

  const generateKeywordsForSelected = async () => {
    if (selectedPages.size === 0) {
      setMessage({ type: 'warning', text: 'Please select target pages to generate keywords for' });
      return;
    }
    
    setGeneratingKeywords(true);
    setMessage({ type: 'info', text: `Generating keywords for ${selectedPages.size} target pages...` });
    
    let successCount = 0;
    let failureCount = 0;
    let currentIndex = 0;
    const totalPages = selectedPages.size;
    
    for (const pageId of selectedPages) {
      const page = targetPageStatuses.find(p => p.id === pageId);
      if (!page) continue;
      
      currentIndex++;
      setCurrentProcessingPage(page.url);
      setMessage({ 
        type: 'info', 
        text: `Processing ${currentIndex}/${totalPages}: ${page.url}` 
      });
      
      try {
        // Generate keywords
        if (!page.hasKeywords) {
          const keywordResponse = await fetch(`/api/target-pages/${pageId}/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (!keywordResponse.ok) {
            const errorData = await keywordResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to generate keywords (${keywordResponse.status})`);
          }
        }
        
        // Generate description
        if (!page.hasDescription) {
          const descResponse = await fetch(`/api/target-pages/${pageId}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (!descResponse.ok) {
            const errorData = await descResponse.json().catch(() => ({}));
            console.error(`Failed to generate description for ${page.url}:`, errorData.error || descResponse.statusText);
            // Continue with other pages even if description fails
          }
        }
        
        successCount++;
        
        // Add a small delay between API calls to avoid rate limits
        if (currentIndex < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      } catch (error: any) {
        console.error(`Failed to generate content for ${page.url}:`, error);
        failureCount++;
      }
    }
    
    setGeneratingKeywords(false);
    setCurrentProcessingPage(null);
    
    if (failureCount === 0) {
      setMessage({ 
        type: 'success', 
        text: `Successfully generated keywords for ${successCount} target pages` 
      });
    } else {
      setMessage({ 
        type: 'warning', 
        text: `Generated keywords for ${successCount} pages, ${failureCount} failed` 
      });
    }
    
    // Reload target page statuses
    await checkTargetPageStatuses();
  };

  const handleConfirmOrderWithKeywordCheck = async () => {
    if (!orderGroups) return;
    
    // Check if all target pages have keywords
    const pagesWithoutKeywords = targetPageStatuses.filter(p => !p.hasKeywords);
    if (pagesWithoutKeywords.length > 0) {
      setMessage({ 
        type: 'warning', 
        text: `${pagesWithoutKeywords.length} target pages still need keywords. Please generate them first.` 
      });
      return;
    }
    
    // Proceed with normal order confirmation
    await handleConfirmOrder();
  };

  // Progressive UI system with workflow stages (from /internal page)
  const getWorkflowStage = useCallback(() => {
    if (!orderGroups || !siteSubmissions) return 'initial';
    if (orderState === 'completed') return 'completed';
    if (orderState === 'in_progress') return 'content_creation';
    
    // Check if we have any site submissions - if so, we're past initial selection
    const totalSubmissions = Object.values(siteSubmissions).flat().length;
    
    if (totalSubmissions > 0) {
      // If we have sites, determine if we're in selection or post-approval phase
      const approvedSubmissions = Object.values(siteSubmissions).flat()
        .filter(s => s.status === 'client_approved').length;
      
      // If more than half are approved, we're in post-approval consolidation phase
      if (approvedSubmissions / totalSubmissions > 0.5) {
        return 'post_approval';
      }
      
      // Otherwise, we're still in site selection but with consolidated view
      return 'site_selection_with_sites';
    }
    
    // No sites yet - show traditional separate columns
    return 'initial';
  }, [orderGroups, siteSubmissions, orderState]);

  const getColumnConfig = useCallback(() => {
    const workflowStage = getWorkflowStage();
    
    switch (workflowStage) {
      case 'site_selection_with_sites':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: false,
          showPublishedUrl: false,
          showStatus: true,
          columns: ['client', 'link_details', 'site', 'status']
        };
      case 'post_approval':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: false,
          showPublishedUrl: false,
          showStatus: true,
          columns: ['client', 'link_details', 'site', 'status']
        };
      case 'content_creation':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: true,
          showPublishedUrl: false,
          showStatus: true,
          columns: ['client', 'link_details', 'site', 'content_status', 'draft_url']
        };
      case 'completed':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: false,
          showPublishedUrl: true,
          showStatus: false,
          columns: ['client', 'link_details', 'site', 'published_url', 'completion']
        };
      default:
        return {
          showSeparateDetails: true,
          showGuestPostSite: false,
          showDraftUrl: false,
          showPublishedUrl: false,
          showStatus: false,
          columns: ['client', 'anchor', 'price', 'tools']
        };
    }
  }, [getWorkflowStage]);

  // Refresh functionality for real-time updates (from /internal page)
  const handleRefresh = useCallback(async () => {
    if (!orderId) {
      // For draft orders, just reload the page
      window.location.reload();
      return;
    }

    try {
      // Reload order data by triggering the parent component's refresh
      // This would typically call the same APIs that loaded the initial data
      if (orderStatus === 'pending_confirmation') {
        await checkTargetPageStatuses();
      }
      
      // For site submissions, we'd typically reload them here
      // This is a simplified refresh - in a full implementation, 
      // we'd have separate loading states and API calls
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to refresh data. Please try again.' 
      });
    }
  }, [orderId, orderStatus, checkTargetPageStatuses]);

  // Consolidated component for Link Details (from /internal page)
  const LinkDetailsCell = ({ targetPageUrl, anchorText, price }: { 
    targetPageUrl?: string; 
    anchorText?: string; 
    price?: number; 
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <Globe className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium truncate max-w-[200px]" title={targetPageUrl}>
          {targetPageUrl ? (() => {
            try {
              return new URL(targetPageUrl).pathname;
            } catch {
              return targetPageUrl.length > 30 ? targetPageUrl.substring(0, 30) + '...' : targetPageUrl;
            }
          })() : 'No target page'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <LinkIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-700 truncate max-w-[200px]" title={anchorText}>
          "{anchorText || 'No anchor text'}"
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium">
          {price ? formatCurrency(price) : 'Price TBD'}
        </span>
      </div>
    </div>
  );

  // Debounced auto-save
  const saveOrderDraftRef = useRef(saveOrderDraft);
  saveOrderDraftRef.current = saveOrderDraft;
  
  const debouncedSave = useCallback(
    debounce(() => saveOrderDraftRef.current(), 2000),
    []
  );

  // Effects
  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    // Initial data loading - inline like edit page to avoid dependency issues
    const loadInitialData = async () => {
      if (!session) return;
      
      // Load accounts if internal user
      if (session.userType === 'internal') {
        try {
          setLoadingAccounts(true);
          const response = await fetch('/api/accounts', {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          
          if (response.ok) {
            const accounts = await response.json();
            setAccountsList(accounts);
          }
        } catch (error) {
          console.error('Failed to load accounts:', error);
        } finally {
          setLoadingAccounts(false);
        }
      }
      
      // Load clients
      try {
        setLoadingClients(true);
        const url = isAccountUser ? '/api/account/clients' : '/api/clients';
        const response = await fetch(url, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const clientList = data.clients || data;  // Handle both formats
          // Filter out archived clients
          const activeClients = clientList.filter((client: any) => !client.archivedAt);
          setClients(activeClients.map((client: any) => ({ ...client, selected: false, linkCount: 0 })));
        }
      } catch (error) {
        console.error('Failed to load clients:', error);
        setError('Failed to load clients');
      } finally {
        setLoadingClients(false);
      }
      
      // Load draft order if orderId provided
      if (orderId) {
        try {
          const response = await fetch(`/api/orders/${orderId}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const order = await response.json();
            // Initialize order data
            setDraftOrderId(order.id);
            // ... other initialization logic
          }
        } catch (error) {
          console.error('Failed to load draft order:', error);
        }
      } else if (orderGroups) {
        // Initialize from orderGroups if provided
        initializeFromOrderGroups();
      }
    };
    
    loadInitialData();
  }, [session?.userType, session?.userId, orderId, isAccountUser]);

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

  // Target page status checking for internal users when order is pending_confirmation
  useEffect(() => {
    if (userType === 'internal' && orderStatus === 'pending_confirmation' && orderGroups) {
      checkTargetPageStatuses();
    }
  }, [userType, orderStatus, orderGroups, checkTargetPageStatuses]);

  // Auto-save trigger
  useEffect(() => {
    // Only auto-save if we have actual data loaded (prevents wiping on page load)
    if (currentMode === 'draft' && !isPaid && orderGroups !== null) {
      debouncedSave();
    }
  }, [selectedClients, lineItems, currentMode, isPaid, debouncedSave, orderGroups]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(isNewOrder ? '/orders' : `/orders/${draftOrderId || ''}`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isNewOrder ? 'Back to Orders' : 'Back to Order'}
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isNewOrder ? 'Create New Order' : `Edit Order ${draftOrderId ? '#' + draftOrderId.slice(0, 8) : ''}`}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isNewOrder ? 'Build your guest post campaign' : 'Update your guest post order details'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus !== 'idle' && currentMode === 'draft' && (
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
        </div>
        
        {/* Internal Action Bar */}
        {userType === 'internal' && (orderStatus === 'confirmed' || orderStatus === 'pending_confirmation') && (
          <div className="mt-4 pb-4 border-t pt-4 flex items-center gap-3">
            {/* Mark Sites Ready */}
            {orderState === 'analyzing' && onMarkSitesReady && (
              <button
                onClick={onMarkSitesReady}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Sites Ready
              </button>
            )}
            
            {/* Generate Workflows */}
            {isPaid && onGenerateWorkflows && (
              <button
                onClick={onGenerateWorkflows}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate Workflows
              </button>
            )}
            
            {/* Order State Indicator */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-500">Order State:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                orderState === 'analyzing' ? 'bg-blue-100 text-blue-700' :
                orderState === 'site_review' ? 'bg-purple-100 text-purple-700' :
                orderState === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {orderState === 'analyzing' ? 'Analyzing Sites' :
                 orderState === 'site_review' ? 'Site Review' :
                 orderState === 'in_progress' ? 'In Progress' :
                 orderState || 'Unknown'}
              </span>
            </div>
          </div>
        )}
      </div>
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
      
      {/* Main Content Area - Dynamic Layout based on user type and order status */}
      <div className="flex-1 p-4 overflow-hidden bg-gray-100">
        {/* Message System */}
        {message && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 rounded-lg p-4 flex items-start shadow-lg ${
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            message.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {message.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" /> :
             message.type === 'warning' ? <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" /> :
             message.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" /> :
             <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />}
            <div>
              <p className={
                message.type === 'error' ? 'text-red-800' :
                message.type === 'warning' ? 'text-yellow-800' :
                message.type === 'success' ? 'text-green-800' :
                'text-blue-800'
              }>{message.text}</p>
              <button 
                onClick={() => setMessage(null)}
                className={`text-sm mt-1 ${
                  message.type === 'error' ? 'text-red-600 hover:text-red-800' :
                  message.type === 'warning' ? 'text-yellow-600 hover:text-yellow-800' :
                  message.type === 'success' ? 'text-green-600 hover:text-green-800' :
                  'text-blue-600 hover:text-blue-800'
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {/* Legacy Error Display - Keep for backwards compatibility */}
        {error && !message && (
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
        
        {/* Three Column Layout for Internal Users viewing confirmed or pending confirmation orders */}
        {userType === 'internal' && (orderStatus === 'confirmed' || orderStatus === 'pending_confirmation') ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column - Progress Steps + Internal Actions + Account Info */}
            <div className="lg:col-span-1 space-y-6 overflow-y-auto">
              {/* Order Progress Steps */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Progress</h2>
                <div className="space-y-4">
                  {(() => {
                    const steps = [
                      { id: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, description: 'Order has been received and confirmed' },
                      { id: 'analyzing', label: 'Finding Sites', icon: Search, description: 'Team is identifying suitable sites' },
                      { id: 'site_review', label: 'Review Sites', icon: Users, description: 'Sites ready for client review' },
                      { id: 'in_progress', label: 'Creating Content', icon: FileText, description: 'Writing and placing links' },
                      { id: 'completed', label: 'Completed', icon: CheckCircle, description: 'All links have been placed' }
                    ];
                    
                    let currentStep = 0;
                    if (orderStatus === 'confirmed' || orderStatus === 'pending_confirmation') {
                      currentStep = 1;
                      if (orderState === 'analyzing') currentStep = 1;
                      if (orderState === 'sites_ready' || orderState === 'site_review' || orderState === 'client_reviewing') currentStep = 2;
                      if (orderState === 'selections_confirmed' || orderState === 'payment_received' || orderState === 'workflows_generated' || orderState === 'in_progress') currentStep = 3;
                    }
                    if (isPaid) currentStep = 3;
                    if (orderState === 'completed') currentStep = 4;
                    
                    return steps.map((step, index) => {
                      const Icon = step.icon;
                      const isCompleted = index < currentStep;
                      const isCurrent = index === currentStep;
                      
                      return (
                        <div key={step.id} className="relative">
                          <div className="flex items-start gap-3">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                              ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                            `}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                              }`}>
                                {step.label}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {step.description}
                              </p>
                            </div>
                          </div>
                          {index < steps.length - 1 && (
                            <div className={`
                              absolute left-4 top-8 w-0.5 h-8
                              ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                            `} />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Internal Actions Box */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Internal Actions</h3>
                  <div className="space-y-2">
                    
                    {/* Order Confirmation with Target Page Status - Only for pending_confirmation */}
                    {orderStatus === 'pending_confirmation' && (
                      <>
                        {/* Target Pages Status Section */}
                        {targetPageStatuses.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-medium text-gray-700">Target Pages Status</h4>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  {targetPageStatuses.filter(p => p.hasKeywords).length} Ready
                                </span>
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-yellow-600" />
                                  {targetPageStatuses.filter(p => !p.hasKeywords).length} Need Keywords
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {targetPageStatuses.map((page) => (
                                <div key={page.id} className={`flex items-center gap-2 p-2 rounded text-xs ${
                                  page.hasKeywords ? 'bg-gray-50' : 'bg-yellow-50'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPages.has(page.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedPages);
                                      if (e.target.checked) {
                                        newSelected.add(page.id);
                                      } else {
                                        newSelected.delete(page.id);
                                      }
                                      setSelectedPages(newSelected);
                                    }}
                                    className="rounded text-blue-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {page.hasKeywords ? (
                                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                      ) : (
                                        <AlertCircle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                      )}
                                      <span className="font-medium text-gray-900">{page.clientName}</span>
                                    </div>
                                    <div 
                                      className="text-gray-600 truncate"
                                      title={page.url}
                                    >
                                      {page.url}
                                    </div>
                                    {page.hasKeywords && (
                                      <div className="text-green-600">
                                        {page.keywordCount} keywords generated
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {targetPageStatuses.some(p => !p.hasKeywords) && (
                              <button
                                onClick={generateKeywordsForSelected}
                                disabled={generatingKeywords || selectedPages.size === 0}
                                className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {generatingKeywords ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {currentProcessingPage ? `Processing ${currentProcessingPage}...` : 'Generating Keywords...'}
                                  </>
                                ) : (
                                  <>
                                    <Type className="h-3 w-3" />
                                    Generate Keywords ({selectedPages.size} selected)
                                  </>
                                )}
                              </button>
                            )}
                            
                            {/* Confirm Order Button - only enabled if all pages have keywords */}
                            <button
                              onClick={handleConfirmOrderWithKeywordCheck}
                              disabled={targetPageStatuses.some(p => !p.hasKeywords)}
                              className="w-full mt-3 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="h-3 w-3" />
                              {targetPageStatuses.some(p => !p.hasKeywords) ? 
                                `Confirm Order (${targetPageStatuses.filter(p => !p.hasKeywords).length} pages need keywords)` :
                                'Confirm Order'
                              }
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Mark Sites Ready was already in header, but we can duplicate here for convenience */}
                    {orderState === 'analyzing' && onMarkSitesReady && (
                      <button
                        onClick={onMarkSitesReady}
                        className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                      >
                        Mark Sites Ready
                      </button>
                    )}
                    
                    {/* Generate Workflows */}
                    {isPaid && onGenerateWorkflows && (
                      <button
                        onClick={onGenerateWorkflows}
                        className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                      >
                        Generate Workflows
                      </button>
                    )}
                    
                    {/* Bulk Analysis Links */}
                    {orderState === 'analyzing' && orderGroups?.some(g => g.bulkAnalysisProjectId) && (
                      <div className="space-y-2">
                        {orderGroups.filter(g => g.bulkAnalysisProjectId).map(group => (
                          <a
                            key={group.id}
                            href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center"
                          >
                            Analyze {group.client.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Account Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Account Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedAccountName || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedAccountEmail || 'No email'}</dd>
                  </div>
                  {selectedAccountCompany && (
                    <div>
                      <dt className="text-sm text-gray-500">Company</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedAccountCompany}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              {/* Internal Activity */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Internal Activity</h3>
                </div>
                <div className="space-y-3">
                  {orderState === 'analyzing' && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Site analysis in progress</p>
                        <p className="text-xs text-gray-500">Finding placement opportunities</p>
                      </div>
                    </div>
                  )}
                  
                  {(orderState === 'sites_ready' || orderState === 'site_review') && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Client review active</p>
                        <p className="text-xs text-gray-500">
                          {Object.values(siteSubmissions).reduce((sum, subs) => 
                            sum + subs.filter(s => s.status === 'pending').length, 0
                          )} sites awaiting decision
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {orderState === 'in_progress' && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Content creation active</p>
                        <p className="text-xs text-gray-500">Workflows in progress</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Middle/Right Columns - Order Details Table */}
            <div className="lg:col-span-2">
              {/* Site Review Summary Card */}
              {(orderState === 'sites_ready' || orderState === 'site_review' || orderState === 'client_reviewing') && Object.keys(siteSubmissions).length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Site Review Status
                      </h3>
                      <p className="text-sm text-purple-700 mt-1">
                        Monitor client's site selection progress
                      </p>
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        {Object.entries(siteSubmissions).map(([groupId, submissions]) => {
                          const group = orderGroups?.find(g => g.id === groupId);
                          if (!group) return null;
                          const pending = submissions.filter(s => s.status === 'pending').length;
                          const approved = submissions.filter(s => s.submissionStatus === 'client_approved').length;
                          const rejected = submissions.filter(s => s.submissionStatus === 'client_rejected').length;
                          
                          return (
                            <div key={groupId} className="flex items-center gap-2">
                              <span className="font-medium">{group.client.name}:</span>
                              {pending > 0 && <span className="text-yellow-700">{pending} pending</span>}
                              {approved > 0 && <span className="text-green-700">{approved} approved</span>}
                              {rejected > 0 && <span className="text-red-700">{rejected} rejected</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Dynamic Order Details Table based on workflow stage */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Stage: {getWorkflowStage().replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  {/* Refresh button for real-time updates */}
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Database className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  {(() => {
                    const columnConfig = getColumnConfig();
                    const workflowStage = getWorkflowStage();
                    
                    // Define column headers
                    const columnHeaders: Record<string, string> = {
                      'client': 'Client / Target Page',
                      'anchor': 'Anchor Text',
                      'link_details': 'Link Details',
                      'site': 'Guest Post Site',
                      'price': 'Price',
                      'status': 'Status',
                      'content_status': 'Content Status',
                      'draft_url': 'Draft URL',
                      'published_url': 'Published URL',
                      'completion': 'Completion',
                      'tools': 'Actions'
                    };

                    return (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {columnConfig.columns.map((column) => (
                              <th
                                key={column}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {columnHeaders[column] || column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orderGroups && orderGroups.length > 0 ? (
                            orderGroups.map((group) => {
                              // Get site submissions for this group
                              const groupSubmissions = siteSubmissions?.[group.id] || [];
                              
                              // Render rows based on workflow stage
                              if (workflowStage === 'initial' || groupSubmissions.length === 0) {
                                // Initial stage - show traditional separate columns
                                return group.targetPages?.map((targetPage, index) => (
                                  <tr key={`${group.id}-${index}`}>
                                    {columnConfig.columns.map((column) => (
                                      <td key={column} className="px-6 py-4 whitespace-nowrap">
                                        {(() => {
                                          switch (column) {
                                            case 'client':
                                              return (
                                                <div>
                                                  <div className="text-sm font-medium text-gray-900">{group.client.name}</div>
                                                  <div className="text-sm text-gray-500">{targetPage.url}</div>
                                                </div>
                                              );
                                            case 'anchor':
                                              return (
                                                <div className="text-sm text-gray-900">
                                                  {group.anchorTexts?.[index] || 'TBD'}
                                                </div>
                                              );
                                            case 'price':
                                              return (
                                                <div className="text-sm font-medium text-gray-900">
                                                  {group.packagePrice ? formatCurrency(group.packagePrice) : 'TBD'}
                                                </div>
                                              );
                                            case 'tools':
                                              return (
                                                <div className="flex items-center gap-2">
                                                  <button className="text-blue-600 hover:text-blue-900 text-sm">
                                                    Edit
                                                  </button>
                                                </div>
                                              );
                                            default:
                                              return <span className="text-sm text-gray-500">-</span>;
                                          }
                                        })()}
                                      </td>
                                    ))}
                                  </tr>
                                )) || [];
                              } else {
                                // Advanced stages - show consolidated view with site submissions
                                return groupSubmissions.map((submission) => (
                                  <tr key={submission.id}>
                                    {columnConfig.columns.map((column) => (
                                      <td key={column} className="px-6 py-4 whitespace-nowrap">
                                        {(() => {
                                          switch (column) {
                                            case 'client':
                                              return (
                                                <div>
                                                  <div className="text-sm font-medium text-gray-900">{group.client.name}</div>
                                                  <div className="text-sm text-gray-500">{submission.targetPageUrl || 'No target page'}</div>
                                                </div>
                                              );
                                            case 'link_details':
                                              return (
                                                <LinkDetailsCell 
                                                  targetPageUrl={submission.targetPageUrl}
                                                  anchorText={submission.anchorText}
                                                  price={submission.price}
                                                />
                                              );
                                            case 'site':
                                              return (
                                                <div className="space-y-1">
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-sm font-medium text-gray-900">
                                                      {submission.domain?.domain || 'Unknown'}
                                                    </div>
                                                    
                                                    {/* AI Qualification Status with Star Ratings */}
                                                    {submission.metadata?.qualificationStatus && (
                                                      <span className={`font-medium ${
                                                        submission.metadata.qualificationStatus === 'high_quality' ? 'text-green-600' :
                                                        submission.metadata.qualificationStatus === 'good_quality' ? 'text-blue-600' :
                                                        submission.metadata.qualificationStatus === 'marginal_quality' ? 'text-yellow-600' :
                                                        'text-gray-600'
                                                      }`} title={`Quality: ${(submission.metadata.qualificationStatus as string).replace('_', ' ')}`}>
                                                        {submission.metadata.qualificationStatus === 'high_quality' ? '★★★' :
                                                         submission.metadata.qualificationStatus === 'good_quality' ? '★★' :
                                                         submission.metadata.qualificationStatus === 'marginal_quality' ? '★' :
                                                         '○'}
                                                      </span>
                                                    )}

                                                    {/* AI Analysis Badge with Overlap Status */}
                                                    {submission.metadata?.overlapStatus && (
                                                      <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full border ${
                                                        submission.metadata.overlapStatus === 'direct' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        submission.metadata.overlapStatus === 'related' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        submission.metadata.overlapStatus === 'both' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        'bg-gray-50 text-gray-700 border-gray-200'
                                                      }`} title={`AI Analysis: ${(submission.metadata.overlapStatus as string).replace('_', ' ')} overlap${submission.metadata.aiQualificationReasoning ? '\n\n' + submission.metadata.aiQualificationReasoning : ''}`}>
                                                        <Sparkles className="w-3 h-3 mr-0.5" />
                                                        AI
                                                      </span>
                                                    )}

                                                    {/* SEO Data Indicator */}
                                                    {submission.metadata?.hasDataForSeoResults && (
                                                      <span className="text-indigo-600" title="Has keyword ranking data">
                                                        <Search className="inline h-3 w-3 mr-1" />
                                                        <span className="text-xs">SEO Data</span>
                                                      </span>
                                                    )}

                                                    {/* Pool indicators */}
                                                    {submission.selectionPool && (
                                                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                                                        submission.selectionPool === 'primary' 
                                                          ? 'bg-blue-100 text-blue-800' 
                                                          : 'bg-gray-100 text-gray-800'
                                                      }`}>
                                                        {submission.selectionPool === 'primary' ? 'Primary' : 'Alt'}
                                                        {submission.poolRank && ` #${submission.poolRank}`}
                                                      </span>
                                                    )}
                                                  </div>
                                                  
                                                  <div className="text-sm text-gray-500">
                                                    DR: {submission.domainRating || 'N/A'} | Traffic: {submission.traffic || 'N/A'}
                                                  </div>

                                                  {/* AI Analysis Metadata Details */}
                                                  {submission.metadata && (submission.metadata.topicScope || submission.metadata.authorityDirect || submission.metadata.authorityRelated) && (
                                                    <div className="text-xs text-gray-500 space-y-0.5">
                                                      {submission.metadata.topicScope && (
                                                        <div>Topic: {(submission.metadata.topicScope as string).replace('_', ' ')}</div>
                                                      )}
                                                      {(submission.metadata.authorityDirect || submission.metadata.authorityRelated) && (
                                                        <div className="flex gap-2">
                                                          {submission.metadata.authorityDirect && (
                                                            <span>Direct: {submission.metadata.authorityDirect}</span>
                                                          )}
                                                          {submission.metadata.authorityRelated && (
                                                            <span>Related: {submission.metadata.authorityRelated}</span>
                                                          )}
                                                        </div>
                                                      )}
                                                      {(submission.metadata.direct_count || submission.metadata.related_count) && (
                                                        <div className="flex gap-2">
                                                          {submission.metadata.direct_count && (
                                                            <span>Direct: {submission.metadata.direct_count} keywords</span>
                                                          )}
                                                          {submission.metadata.related_count && (
                                                            <span>Related: {submission.metadata.related_count} keywords</span>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Switch domain button for internal users */}
                                                  {userType === 'internal' && onSwitchDomain && (
                                                    <button
                                                      onClick={() => onSwitchDomain(submission.id, group.id)}
                                                      className="text-xs text-blue-600 hover:text-blue-900"
                                                    >
                                                      Switch Domain
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            case 'status':
                                              return (
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                  submission.status === 'client_approved' ? 'bg-green-100 text-green-800' :
                                                  submission.status === 'client_rejected' ? 'bg-red-100 text-red-800' :
                                                  submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {submission.status?.replace('_', ' ') || 'Unknown'}
                                                </span>
                                              );
                                            case 'content_status':
                                              return <span className="text-sm text-gray-500">In Progress</span>;
                                            case 'draft_url':
                                              return (
                                                <a href="#" className="text-blue-600 hover:text-blue-900 text-sm">
                                                  View Draft
                                                </a>
                                              );
                                            case 'published_url':
                                              return (
                                                <a href="#" className="text-green-600 hover:text-green-900 text-sm">
                                                  View Published
                                                </a>
                                              );
                                            case 'completion':
                                              return <span className="text-sm text-green-600">Complete</span>;
                                            default:
                                              return <span className="text-sm text-gray-500">-</span>;
                                          }
                                        })()}
                                      </td>
                                    ))}
                                  </tr>
                                ));
                              }
                            }).flat()
                          ) : (
                            <tr>
                              <td colSpan={columnConfig.columns.length} className="px-6 py-12 text-center text-gray-500">
                                No order details available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Three Column Layout for Draft/External Users */
          <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden" style={{height: 'calc(100vh - 64px - 80px)'}}>
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
          
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Account Selection for Internal Users */}
          {currentMode === 'draft' && userType === 'internal' && (
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Account *</label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => {
                      const accountId = e.target.value;
                      const account = accountsList.find(a => a.id === accountId);
                      if (account) {
                        setSelectedAccountId(account.id);
                        setSelectedAccountEmail(account.email);
                        setSelectedAccountName(account.name);
                        setSelectedAccountCompany(account.company || '');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingAccounts}
                  >
                    <option value="">Select an account...</option>
                    {accountsList.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.email})
                        {account.company && ` - ${account.company}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Email</label>
                  <input
                    type="email"
                    value={selectedAccountEmail}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                    placeholder="Selected account email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={selectedAccountName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                    placeholder="Selected account name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={selectedAccountCompany}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                    placeholder="Company name"
                  />
                </div>
              </div>
            </div>
          )}
          
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
                                    setRequestingLineItemId(item.id);
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
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => duplicateLineItem(item.id)}
                                    className="text-gray-600 hover:text-gray-800"
                                    title="Duplicate item"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => removeLineItem(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
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
                                                          {submission.id !== finalDisplaySubmission?.id && !isPaid && userType === 'internal' && onSwitchDomain && (
                                                            <button
                                                              onClick={() => {
                                                                // Switch to this domain
                                                                onSwitchDomain(submission.id, groupId);
                                                              }}
                                                              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border"
                                                            >
                                                              Switch
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
          
          {/* Fixed Bottom Bar */}
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 md:px-6 py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left Side - Order Summary Stats and Package Selection */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:space-x-6 w-full md:w-auto">
                  {currentMode === 'draft' && (
                    <div className="hidden md:flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-700">Default Package:</span>
                      <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg">
                        {Object.entries(packagePricing).map(([key, pkg]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedPackage(key as PackageType);
                              // Update all line item prices if not custom
                              if (key !== 'custom') {
                                setLineItems(prev => prev.map(item => ({
                                  ...item,
                                  selectedPackage: key as PackageType,
                                  price: pkg.price
                                })));
                              }
                            }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              selectedPackage === key
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {pkg.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Order Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span>{getTotalClients()} brands</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <span>{getTotalLinks()} links</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4 text-gray-400" />
                      <span>{getTotalTargets()} targets</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Total and Action Buttons */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
                  </div>
                  
                  {currentMode === 'draft' && !isPaid && (
                    <button
                      onClick={handleSubmitClick}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={lineItems.length === 0 || (userType === 'internal' && !selectedAccountId)}
                    >
                      Submit Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateClientModal && (
        <CreateClientModal
          isOpen={showCreateClientModal}
          onClose={() => setShowCreateClientModal(false)}
          onClientCreated={(client) => {
            // Reload clients from server to get full data including target pages
            loadClients();
            setShowCreateClientModal(false);
            
            // Auto-select the newly created client
            setTimeout(() => {
              handleClientToggle(client.id);
            }, 100); // Small delay to ensure clients are loaded first
          }}
        />
      )}

      {showCreateTargetPageModal && (
        <CreateTargetPageModal
          isOpen={showCreateTargetPageModal}
          onClose={() => {
            setShowCreateTargetPageModal(false);
            setRequestingLineItemId(null);
          }}
          onTargetPagesCreated={(newTargetPages) => {
            handleTargetPagesCreated(newTargetPages);
            setShowCreateTargetPageModal(false);
          }}
          preSelectedClientId={
            requestingLineItemId 
              ? lineItems.find(item => item.id === requestingLineItemId)?.clientId 
              : undefined
          }
        />
      )}

      {/* Order Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{isNewOrder ? 'Confirm Your Order' : 'Confirm Order Updates'}</h2>
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
                  {isNewOrder ? (
                    <>
                      <li>• Your order will be created as a draft</li>
                      <li>• You can continue editing until you submit it</li>
                      <li>• Once submitted, our team will start finding suitable sites</li>
                      <li>• You'll receive an email notification when sites are ready for review</li>
                    </>
                  ) : (
                    <>
                      <li>• Your order updates will be saved</li>
                      <li>• {orderStatus === 'draft' ? 'You can submit the order when ready' : 'Our team will be notified of the updates'}</li>
                      <li>• Any changes to target pages or quantities will be processed</li>
                      <li>• You'll receive confirmation once changes are applied</li>
                    </>
                  )}
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