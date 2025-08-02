'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import CreateClientModal from '@/components/ui/CreateClientModal';
import CreateTargetPageModal from '@/components/ui/CreateTargetPageModal';
import { 
  Building, Package, Plus, X, ChevronDown, ChevronUp, ChevronRight,
  Search, Target, Link, Type, CheckCircle,
  AlertCircle, Copy, Trash2, User, Globe, ExternalLink
} from 'lucide-react';

type PackageType = 'good' | 'better' | 'best';

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
    keywords?: string; // Comma-separated keywords from AI
    description?: string; // AI-generated description
    addedAt: Date;
    completedAt?: Date;
  }>;
  selected: boolean;
  linkCount: number;
  // Fields from database but not used in UI
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
  keywords?: string; // Comma-separated from database
  keywordArray?: string[]; // Parsed for display
  description?: string;
  dr: number; // TODO: Get from actual SEO data
  traffic: number; // TODO: Get from actual SEO data
  clientId: string;
  clientName: string;
  usageCount: number;
  addedAt: Date;
  completedAt?: Date;
}

export default function NewOrderPage() {
  const router = useRouter();
  const session = AuthService.getSession();
  const isAccountUser = session?.userType === 'account';
  
  // Client management
  const [clients, setClients] = useState<ClientWithSelection[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  
  // Three-column state
  const [selectedClients, setSelectedClients] = useState<Map<string, { selected: boolean; linkCount: number }>>(new Map());
  const [availableTargets, setAvailableTargets] = useState<TargetPageWithMetadata[]>([]);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Pricing state
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('better');
  const packagePricing = {
    good: { price: 230, name: 'Good Guest Posts', description: 'DR 20-34' },
    better: { price: 279, name: 'Better Guest Posts', description: 'DR 35-49' },
    best: { price: 349, name: 'Best Guest Posts', description: 'DR 50-80' }
  };
  
  // Draft order state
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [existingDrafts, setExistingDrafts] = useState<Array<{
    id: string;
    accountName: string;
    accountEmail: string;
    totalRetail: number;
    updatedAt: string;
  }>>([]);
  const [showDraftPicker, setShowDraftPicker] = useState(false);
  
  // Account selection state (for internal users)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('');
  const [selectedAccountCompany, setSelectedAccountCompany] = useState('');
  const [accountsList, setAccountsList] = useState<Array<{
    id: string;
    email: string;
    contactName: string;
    companyName: string;
    status: string;
  }>>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // UI state
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [groupByMode, setGroupByMode] = useState<'client' | 'status' | 'none'>('client');
  
  // Modal state
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreateTargetPageModal, setShowCreateTargetPageModal] = useState(false);
  const [requestingLineItemId, setRequestingLineItemId] = useState<string | null>(null);
  
  // Mobile view state
  const [mobileView, setMobileView] = useState<'clients' | 'order' | 'targets'>('order');

  const loadClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const url = isAccountUser ? '/api/account/clients' : '/api/clients';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const clientList = data.clients || data;
        // Filter out archived clients
        const activeClients = clientList.filter((client: any) => !client.archivedAt);
        setClients(activeClients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }, [isAccountUser]);

  const handleClientCreated = (newClient: any) => {
    // Refresh the client list to include the new client
    loadClients();
    // Optionally auto-select the new client
    if (newClient) {
      setTimeout(() => {
        toggleClientSelection(newClient.id, true);
      }, 100);
    }
  };

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
            price: packagePricing[selectedPackage].price || 100,
            selectedPackage: selectedPackage
          }));
          
          setLineItems(prev => [...prev, ...newItems]);
          
          // Update the client's link count
          setSelectedClients(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(requestingItem.clientId);
            if (existing) {
              const currentCount = lineItems.filter(item => item.clientId === requestingItem.clientId).length;
              newMap.set(requestingItem.clientId, { ...existing, linkCount: currentCount + additionalPages.length });
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

  // Load accounts for internal users
  const loadAccounts = useCallback(async () => {
    if (session?.userType !== 'internal') return;
    
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/accounts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccountsList(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  }, [session]);
  
  // Load existing draft orders
  const loadDrafts = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/orders/drafts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.drafts && data.drafts.length > 0) {
          setExistingDrafts(data.drafts);
          setShowDraftPicker(true);
        }
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  }, [session]);

  useEffect(() => {
    // Only load data once when session is available
    if (!session) return;
    
    loadClients();
    loadDrafts();
    
    // Load accounts for internal users
    if (session.userType === 'internal') {
      loadAccounts();
    }
    
    // Set account data for account users
    if (session.userType === 'account') {
      setSelectedAccountId(session.userId);
      setSelectedAccountEmail(session.email || '');
      setSelectedAccountName(session.name || '');
      // Company name would need to be fetched or stored in session
    }
  }, [session?.userType, session?.userId]); // Only depend on session properties, not functions

  const updateAvailableTargets = useCallback(() => {
    const targets: TargetPageWithMetadata[] = [];
    
    selectedClients.forEach((clientData, clientId) => {
      if (clientData.selected) {
        const client = clients.find(c => c.id === clientId);
        if (client && client.targetPages) {
          client.targetPages.forEach(page => {
            // Only include active target pages
            if (page.status !== 'active') return;
            
            const usageCount = lineItems.filter(item => 
              item.clientId === clientId && item.targetPageId === page.id
            ).length;
            
            // Parse keywords if they exist
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
              dr: 70, // TODO: Get real metrics from SEO tools
              traffic: 10000, // TODO: Get real metrics from SEO tools
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
    
    // Sort by domain rating (descending) only - don't re-sort by usage to prevent jumping
    targets.sort((a, b) => b.dr - a.dr);
    
    setAvailableTargets(targets);
  }, [selectedClients, clients, lineItems]);

  useEffect(() => {
    calculatePricing(lineItems);
  }, [lineItems]);

  useEffect(() => {
    updateAvailableTargets();
  }, [updateAvailableTargets]);
  
  // Auto-save functionality
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
        
        // Pricing
        subtotalRetail: subtotal,
        totalRetail: total,
        totalWholesale: Math.round(total * 0.6), // Estimate wholesale cost
        profitMargin: Math.round(total * 0.4),
        
        // Groups for the new order structure
        groups: Array.from(selectedClients.entries())
          .filter(([_, data]) => data.selected && data.linkCount > 0)
          .map(([clientId, data]) => {
            const client = clients.find(c => c.id === clientId);
            const clientItems = lineItems.filter(item => item.clientId === clientId);
            const groupSubtotal = clientItems.reduce((sum, item) => sum + item.price, 0);
            
            return {
              clientId,
              clientName: client?.name || '',
              linkCount: data.linkCount,
              packageType: clientItems[0]?.selectedPackage || 'better',
              packagePrice: packagePricing[clientItems[0]?.selectedPackage || 'better'].price,
              subtotal: groupSubtotal,
              selections: clientItems.map(item => ({
                domainId: '', // Will be filled when domain selection is implemented
                targetPageId: item.targetPageId || '',
                domain: '', // Will be filled when domain selection is implemented
                domainRating: 0,
                traffic: 0,
                retailPrice: item.price,
                wholesalePrice: Math.round(item.price * 0.6),
              }))
            };
          })
      };
      
      if (draftOrderId) {
        // Update existing draft
        const response = await fetch(`/api/orders/drafts/${draftOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderData })
        });
        
        if (response.ok) {
          setSaveStatus('saved');
          setLastSaved(new Date());
        } else {
          setSaveStatus('error');
        }
      } else if (lineItems.length > 0) {
        // Create new draft only if there are items
        const response = await fetch('/api/orders/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderData })
        });
        
        if (response.ok) {
          const { orderId } = await response.json();
          setDraftOrderId(orderId);
          setSaveStatus('saved');
          setLastSaved(new Date());
        } else {
          setSaveStatus('error');
        }
      }
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [session, draftOrderId, lineItems, selectedClients, clients, subtotal, total, packagePricing, 
      selectedAccountId, selectedAccountEmail, selectedAccountName, selectedAccountCompany]);
  
  // Use ref to avoid recreating debounced function
  const saveOrderDraftRef = useRef(saveOrderDraft);
  saveOrderDraftRef.current = saveOrderDraft;
  
  // Debounced auto-save - stable reference
  const debouncedSave = useCallback(
    debounce(() => saveOrderDraftRef.current(), 2000),
    [] // No dependencies, stable function
  );
  
  // Trigger auto-save when order changes
  useEffect(() => {
    if (lineItems.length > 0) {
      debouncedSave();
    }
  }, [lineItems.length, debouncedSave]); // Only depend on lineItems.length to avoid deep comparison
  
  // Draft loading is handled by loadDrafts() in the main useEffect above

  const toggleClientSelection = (clientId: string, selected: boolean) => {
    setSelectedClients(prev => {
      const newMap = new Map(prev);
      if (selected) {
        newMap.set(clientId, { selected: true, linkCount: prev.get(clientId)?.linkCount || 1 });
        // Automatically create 1 placeholder when selecting a client
        const client = clients.find(c => c.id === clientId);
        if (client && !prev.has(clientId)) {
          setLineItems(prevItems => [...prevItems, {
            id: `${clientId}-placeholder-${Date.now()}-0`,
            clientId,
            clientName: client.name,
            targetPageId: undefined,
            targetPageUrl: undefined,
            anchorText: undefined,
            price: packagePricing[selectedPackage].price || 100,
            selectedPackage: selectedPackage,
          }]);
        }
      } else {
        newMap.delete(clientId);
        // Remove line items for this client
        setLineItems(prevItems => prevItems.filter(item => item.clientId !== clientId));
      }
      return newMap;
    });
  };

  const updateClientLinkCount = (clientId: string, count: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Update the link count in selected clients
    setSelectedClients(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(clientId);
      if (existing) {
        newMap.set(clientId, { ...existing, linkCount: count });
      }
      return newMap;
    });

    // Update placeholder line items
    setLineItems(prevItems => {
      // Get existing items for this client
      const existingItems = prevItems.filter(item => item.clientId === clientId);
      const nonClientItems = prevItems.filter(item => item.clientId !== clientId);
      
      // Calculate how many placeholders we need
      const currentCount = existingItems.length;
      const difference = count - currentCount;
      
      if (difference > 0) {
        // Add placeholder items
        const newItems: OrderLineItem[] = [];
        for (let i = 0; i < difference; i++) {
          newItems.push({
            id: `${clientId}-placeholder-${Date.now()}-${i}`,
            clientId,
            clientName: client.name,
            targetPageId: undefined,
            targetPageUrl: undefined,
            anchorText: undefined,
            price: packagePricing[selectedPackage].price || 100,
            selectedPackage: selectedPackage,
          });
        }
        return [...nonClientItems, ...existingItems, ...newItems];
      } else if (difference < 0) {
        // Remove excess items (remove placeholders first, then filled items from the end)
        const placeholders = existingItems.filter(item => !item.targetPageId);
        const filledItems = existingItems.filter(item => item.targetPageId);
        
        const itemsToKeep = count;
        const keptItems = [...filledItems.slice(0, itemsToKeep), ...placeholders.slice(0, Math.max(0, itemsToKeep - filledItems.length))].slice(0, itemsToKeep);
        
        return [...nonClientItems, ...keptItems];
      }
      
      return prevItems;
    });
  };

  const addLineItemFromTarget = (target: TargetPageWithMetadata) => {
    // Check if we're creating a new item (no placeholder)
    const hasPlaceholder = lineItems.some(
      item => item.clientId === target.clientId && !item.targetPageId
    );
    
    setLineItems(prev => {
      // Find first placeholder for this client
      const placeholderIndex = prev.findIndex(
        item => item.clientId === target.clientId && !item.targetPageId
      );
      
      if (placeholderIndex !== -1) {
        // Fill the placeholder
        const updated = [...prev];
        updated[placeholderIndex] = {
          ...updated[placeholderIndex],
          targetPageId: target.id,
          targetPageUrl: target.url,
          anchorText: generateAnchorText(target.clientName),
        };
        return updated;
      } else {
        // No placeholder, create new item
        const newItem: OrderLineItem = {
          id: `${Date.now()}-${Math.random()}`,
          clientId: target.clientId,
          clientName: target.clientName,
          targetPageId: target.id,
          targetPageUrl: target.url,
          anchorText: generateAnchorText(target.clientName),
          price: packagePricing[selectedPackage].price || 100,
          selectedPackage: selectedPackage
        };
        return [...prev, newItem];
      }
    });
    
    // Update the client's link count if we created a new item
    if (!hasPlaceholder) {
      setSelectedClients(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(target.clientId);
        if (existing) {
          const currentCount = lineItems.filter(item => item.clientId === target.clientId).length;
          newMap.set(target.clientId, { ...existing, linkCount: currentCount + 1 });
        }
        return newMap;
      });
    }
  };

  const updateLineItem = (id: string, updates: Partial<OrderLineItem>) => {
    setLineItems(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      calculatePricing(updated);
      return updated;
    });
  };

  const handleTargetPageChange = (lineItemId: string, targetPageUrl: string) => {
    if (targetPageUrl === '__ADD_NEW__') {
      // Open modal for adding new target page
      setRequestingLineItemId(lineItemId);
      setShowCreateTargetPageModal(true);
      return;
    }
    
    const targetPage = availableTargets.find(tp => tp.url === targetPageUrl);
    updateLineItem(lineItemId, {
      targetPageUrl,
      targetPageId: targetPage?.id
    });
  };

  const getClientTargetPages = (clientId: string) => {
    return availableTargets.filter(target => target.clientId === clientId);
  };

  const removeLineItem = (id: string) => {
    const itemToRemove = lineItems.find(item => item.id === id);
    if (!itemToRemove) return;
    
    setLineItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      calculatePricing(updated);
      return updated;
    });
    
    // Update the link count in selected clients
    const clientItems = lineItems.filter(item => item.clientId === itemToRemove.clientId);
    const newCount = clientItems.length - 1; // -1 for the item being removed
    
    if (newCount === 0) {
      // If no items left for this client, deselect it
      toggleClientSelection(itemToRemove.clientId, false);
    } else {
      // Update the count
      setSelectedClients(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(itemToRemove.clientId);
        if (existing) {
          newMap.set(itemToRemove.clientId, { ...existing, linkCount: newCount });
        }
        return newMap;
      });
    }
  };

  const duplicateLineItem = (id: string) => {
    const itemToDuplicate = lineItems.find(item => item.id === id);
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        id: Date.now().toString()
      };
      setLineItems([...lineItems, newItem]);
    }
  };

  const getTotalLinks = () => {
    return lineItems.length;
  };
  
  const getTotalClients = () => {
    const clientIds = new Set(lineItems.map(item => item.clientId).filter(Boolean));
    return clientIds.size;
  };
  
  const getFilteredTargets = () => {
    if (!searchQuery) return availableTargets;
    
    const query = searchQuery.toLowerCase();
    return availableTargets.filter(target => 
      target.url.toLowerCase().includes(query) ||
      target.domain.toLowerCase().includes(query) ||
      target.clientName.toLowerCase().includes(query) ||
      target.description?.toLowerCase().includes(query) ||
      target.keywordArray?.some(keyword => keyword.toLowerCase().includes(query))
    );
  };

  const generateAnchorText = (clientName: string) => {
    // Simple anchor text generation - in real app would be more sophisticated
    const variations = [
      clientName,
      `Visit ${clientName}`,
      `Learn more about ${clientName}`,
      `${clientName} services`,
      `Check out ${clientName}`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  };

  const calculatePricing = (items: OrderLineItem[]) => {
    const sub = items.reduce((sum, item) => sum + item.price, 0);
    setSubtotal(sub);
    setTotal(sub); // Add discounts, fees, etc. here
  };

  const handleSubmit = async () => {
    // Validate line items
    const invalidItems = lineItems.filter(item => !item.clientId);
    
    if (invalidItems.length > 0) {
      setError('Please complete all order details');
      return;
    }
    
    // Check if all items have target pages selected
    const missingTargets = lineItems.filter(item => !item.targetPageId);
    if (missingTargets.length > 0) {
      setError(`Please select target pages for all ${missingTargets.length} link${missingTargets.length > 1 ? 's' : ''}`);
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      // Prepare order data
      const orderGroups = lineItems.reduce((groups: any[], item) => {
        const existingGroup = groups.find(g => g.clientId === item.clientId);
        
        if (existingGroup) {
          existingGroup.targetPages.push({
            pageId: item.targetPageId,
            url: item.targetPageUrl
          });
          existingGroup.anchorTexts.push(item.anchorText || '');
          existingGroup.linkCount++;
        } else {
          groups.push({
            clientId: item.clientId!,
            linkCount: 1,
            targetPages: [{
              pageId: item.targetPageId,
              url: item.targetPageUrl
            }],
            anchorTexts: [item.anchorText || '']
          });
        }
        
        return groups;
      }, []);
      
      // For account users, we need to create a draft first
      if (session?.userType === 'account') {
        // Create draft order
        const draftResponse = await fetch('/api/orders/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            orderData: {
              accountId: session.userId,
              accountEmail: session.email || '',
              accountName: session.name || '',
              accountCompany: '', // Would need to get from account profile
              orderType: 'guest_post',
              orderGroups
            }
          })
        });
        
        if (!draftResponse.ok) {
          const error = await draftResponse.json();
          throw new Error(error.error || 'Failed to create draft order');
        }
        
        const { order } = await draftResponse.json();
        router.push(`/account/orders/${order.id}/confirm`);
        return;
      }
      
      // For internal users, use the existing endpoint
      const response = await fetch('/api/orders/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderType: 'guest_post',
          subtotal,
          total,
          orderGroups
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }
      
      const { order } = await response.json();
      
      // Navigate to order detail for internal users
      router.push(`/orders/${order.id}/detail`);
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Order</h1>
              <p className="text-sm text-gray-600 mt-1">Build your guest post order with target pages and anchor text</p>
            </div>
          </div>
        </div>

        {/* Draft Orders Picker */}
        {showDraftPicker && existingDrafts.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  You have {existingDrafts.length} draft order{existingDrafts.length > 1 ? 's' : ''}. 
                  Would you like to continue working on one?
                </p>
              </div>
              <button
                onClick={() => setShowDraftPicker(false)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Start Fresh
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {existingDrafts.map(draft => (
                <button
                  key={draft.id}
                  onClick={() => {
                    // Navigate to the edit page for this draft
                    router.push(`/orders/${draft.id}/edit`);
                  }}
                  className="w-full text-left px-4 py-3 bg-white rounded-md border border-blue-200 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {draft.accountName || 'Unnamed Order'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {draft.accountEmail} • Last saved {new Date(draft.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(draft.totalRetail / 100)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Account Selection (Internal Users Only) */}
        {session?.userType === 'internal' && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Account *</label>
                <select
                  value={selectedAccountId || ''}
                  onChange={(e) => {
                    const accountId = e.target.value;
                    setSelectedAccountId(accountId);
                    // Find selected account and populate fields
                    const account = accountsList.find(a => a.id === accountId);
                    if (account) {
                      setSelectedAccountEmail(account.email);
                      setSelectedAccountName(account.contactName);
                      setSelectedAccountCompany(account.companyName || '');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose an account...</option>
                  {accountsList.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.companyName || account.contactName} ({account.email})
                    </option>
                  ))}
                </select>
              </div>
              {selectedAccountId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={selectedAccountName}
                      onChange={(e) => setSelectedAccountName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedAccountEmail}
                      onChange={(e) => setSelectedAccountEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={selectedAccountCompany}
                      onChange={(e) => setSelectedAccountCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Company name (optional)"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Mobile Navigation (shown on small screens) */}
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setMobileView('clients')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                mobileView === 'clients' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Brands ({selectedClients.size})
            </button>
            <button
              onClick={() => setMobileView('targets')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                mobileView === 'targets' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Targets ({availableTargets.length})
            </button>
            <button
              onClick={() => setMobileView('order')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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

          {/* Left Column - Client Selection */}
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
                      <div 
                        key={client.id} 
                        className={`border rounded-lg p-3 transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleClientSelection(client.id, e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900 truncate">{client.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{client.website}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {client.targetPages?.filter(p => p.status === 'active').length || 0} pages
                              </span>
                              {isSelected && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateClientLinkCount(client.id, Math.max(0, linkCount - 1));
                                    }}
                                    className="p-0.5 text-gray-400 hover:text-gray-600"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={linkCount}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateClientLinkCount(client.id, parseInt(e.target.value) || 0);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-12 px-1 py-0.5 text-sm text-center border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateClientLinkCount(client.id, linkCount + 1);
                                    }}
                                    className="p-0.5 text-gray-400 hover:text-gray-600"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Target Pages */}
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
              
              {/* Search */}
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
                    {/* Group targets by domain */}
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

          {/* Right Column - Order Details */}
          <div className={`flex-1 bg-white rounded-lg shadow-sm flex flex-col h-full ${
            mobileView === 'order' ? 'block md:block' : 'hidden md:block'
          }`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
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
                <div className="flex items-center space-x-2">
                  <select 
                    value={groupByMode}
                    onChange={(e) => setGroupByMode(e.target.value as 'client' | 'status' | 'none')}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="client">Group by Brand</option>
                    <option value="status">Group by Status</option>
                    <option value="none">No Grouping</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {lineItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">No items added yet</p>
                  <p className="text-sm mt-2 text-gray-400">Select brands and target pages to build your order</p>
                </div>
              ) : groupByMode === 'none' ? (
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
                            <p className="text-sm font-medium text-gray-900">{item.clientName}</p>
                          </td>
                          <td className="px-4 py-3">
                            {item.targetPageUrl ? (
                              <div className="flex items-center space-x-1">
                                <p className="text-sm text-gray-600 truncate max-w-xs" title={item.targetPageUrl}>
                                  {item.targetPageUrl}
                                </p>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">Click a target page →</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.anchorText || ''}
                              onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                              placeholder="Enter anchor text..."
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              disabled={!item.targetPageUrl}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.selectedPackage || 'better'}
                              onChange={(e) => {
                                const pkg = e.target.value as keyof typeof packagePricing;
                                updateLineItem(item.id, { 
                                  price: packagePricing[pkg].price || item.price,
                                  selectedPackage: pkg 
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="good">Good (DR 20-34)</option>
                              <option value="better">Better (DR 35-49)</option>
                              <option value="best">Best (DR 50-80)</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">${item.price}</p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  {/* Grouped view */}
                  {Object.entries(
                    lineItems.reduce((acc, item) => {
                      const groupKey = groupByMode === 'client' ? item.clientName : (item.targetPageUrl ? 'Assigned' : 'Unassigned');
                      if (!acc[groupKey]) acc[groupKey] = [];
                      acc[groupKey].push(item);
                      return acc;
                    }, {} as Record<string, typeof lineItems>)
                  ).map(([groupName, items]) => {
                    const isExpanded = !expandedClients.has(groupName);
                    const assignedCount = items.filter(item => item.targetPageUrl).length;
                    
                    return (
                      <div key={groupName} className="border-b last:border-b-0">
                        <button
                          onClick={() => {
                            setExpandedClients(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(groupName)) {
                                newSet.delete(groupName);
                              } else {
                                newSet.add(groupName);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between sticky top-0 z-10"
                        >
                          <div className="flex items-center space-x-2">
                            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <span className="font-medium text-gray-900">{groupName}</span>
                            <span className="text-sm text-gray-500">({items.length} items)</span>
                            {assignedCount > 0 && (
                              <span className="text-sm text-green-600">{assignedCount} assigned</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            ${items.reduce((sum, item) => sum + (packagePricing[item.selectedPackage as keyof typeof packagePricing]?.price || 0), 0)}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="">
                            <table className="w-full">
                              <tbody className="divide-y divide-gray-100">
                                {items.map((item, index) => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      <span className="text-gray-500 mr-2">{index + 1}.</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={item.targetPageUrl || ''}
                                        onChange={(e) => handleTargetPageChange(item.id, e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="">Select target page...</option>
                                        {getClientTargetPages(item.clientId).map(page => (
                                          <option key={page.id} value={page.url}>
                                            {page.url} {page.usageCount > 0 && `(${page.usageCount})`}
                                          </option>
                                        ))}
                                        <option value="__ADD_NEW__" className="text-blue-600 font-medium">
                                          + Add new target page...
                                        </option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        value={item.anchorText}
                                        onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                                        placeholder="Enter anchor text..."
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={item.selectedPackage}
                                        onChange={(e) => {
                                          const newPackage = e.target.value as PackageType;
                                          updateLineItem(item.id, { 
                                            selectedPackage: newPackage,
                                            price: packagePricing[newPackage].price
                                          });
                                        }}
                                        className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                                      >
                                        {Object.entries(packagePricing).map(([key, pkg]) => (
                                          <option key={key} value={key}>
                                            {pkg.name} {pkg.price > 0 && `($${pkg.price})`}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      ${packagePricing[item.selectedPackage as keyof typeof packagePricing]?.price || 0}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => removeLineItem(item.id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </div>
        
        {/* Fixed Bottom Bar */}
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left Side - Order Summary Stats and Package Selection */}
              <div className="flex flex-col md:flex-row items-center gap-4 md:space-x-6 w-full md:w-auto">
                <div className="hidden md:flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Default Package:</span>
                  <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg">
                    {Object.entries(packagePricing).filter(([key]) => key !== 'custom').map(([key, pkg]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedPackage(key as typeof selectedPackage);
                          // Update all line item prices if not custom
                          if (key !== 'custom') {
                            setLineItems(prev => prev.map(item => ({
                              ...item,
                              price: pkg.price
                            })));
                          }
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          selectedPackage === key 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        title={`${pkg.name} - ${pkg.description}`}
                      >
                        {pkg.name} (${pkg.price})
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="hidden md:block h-8 w-px bg-gray-200"></div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{getTotalClients()}</span>
                    <span className="text-gray-500">brands</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Link className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{getTotalLinks()}</span>
                    <span className="text-gray-500">links</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {new Set(lineItems.map(item => item.targetPageId).filter(Boolean)).size}
                    </span>
                    <span className="text-gray-500">targets</span>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Total and Continue */}
              <div className="flex items-center space-x-4 md:space-x-6 w-full md:w-auto">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Order Total</p>
                  <p className="text-2xl font-bold text-gray-900">${total}</p>
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={lineItems.length === 0 || lineItems.some(item => !item.clientId) || submitting}
                  className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 
                           transition-colors flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed flex-1 md:flex-initial justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Creating order...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden md:inline">Continue to Site Selection</span>
                      <span className="md:hidden">Continue</span>
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Create Client Modal */}
        <CreateClientModal
          isOpen={showCreateClientModal}
          onClose={() => setShowCreateClientModal(false)}
          onClientCreated={handleClientCreated}
        />
        
        {/* Create Target Page Modal */}
        <CreateTargetPageModal
          isOpen={showCreateTargetPageModal}
          onClose={() => {
            setShowCreateTargetPageModal(false);
            setRequestingLineItemId(null);
          }}
          onTargetPagesCreated={handleTargetPagesCreated}
          preSelectedClientId={requestingLineItemId ? lineItems.find(item => item.id === requestingLineItemId)?.clientId : undefined}
        />
      </div>
    </AuthWrapper>
  );
}