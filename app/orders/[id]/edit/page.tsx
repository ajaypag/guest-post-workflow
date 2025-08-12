'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { isLineItemsSystemEnabled } from '@/lib/config/featureFlags';
import CreateClientModal from '@/components/ui/CreateClientModal';
import CreateTargetPageModal from '@/components/ui/CreateTargetPageModal';
import OrderProgressView from '@/components/orders/OrderProgressView';
import PricingEstimator from '@/components/orders/PricingEstimator';
import { 
  Building, Package, Plus, X, ChevronDown, ChevronUp, ChevronRight,
  Search, Target, Link as LinkIcon, Type, CheckCircle,
  AlertCircle, Copy, Trash2, User, Globe, ExternalLink,
  ArrowLeft, Loader2, Clock, Users, CreditCard, AlertTriangle, TrendingUp
} from 'lucide-react';
import { SERVICE_FEE_CENTS, PRICING_CONFIG } from '@/lib/config/pricing';

interface OrderLineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  price: number; // Total price (wholesale + service fee)
  wholesalePrice?: number; // Wholesale cost from database
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
  clientId: string;
  clientName: string;
  usageCount: number;
  addedAt: Date;
  completedAt?: Date;
}

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Pricing state - flat service fee model
  const [estimatedPricePerLink, setEstimatedPricePerLink] = useState<number>(PRICING_CONFIG.defaults.retailPricePerLink);
  const [estimatedWholesalePerLink, setEstimatedWholesalePerLink] = useState(20000); // Default $200, updated by pricing estimator
  const [orderPreferences, setOrderPreferences] = useState<any>(null);
  
  // Get current wholesale estimate for new line items
  const getCurrentWholesaleEstimate = () => {
    return estimatedWholesalePerLink; // Use pricing estimator data
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
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [isNewOrder, setIsNewOrder] = useState(false);
  
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
  const [accountDetails, setAccountDetails] = useState<{ email: string; name: string; company?: string } | null>(null);
  
  // Mobile view state with improved localStorage persistence
  const [mobileView, setMobileView] = useState<'clients' | 'order' | 'targets'>(() => {
    // Persist mobile view in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orderEdit-mobileView');
      if (saved && ['clients', 'order', 'targets'].includes(saved)) {
        return saved as 'clients' | 'order' | 'targets';
      }
    }
    return 'clients'; // Default to brands on mobile
  });
  
  const [showMobilePricing, setShowMobilePricing] = useState(() => {
    // Persist mobile pricing state in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showMobilePricing');
      return saved === 'true';
    }
    return false;
  });

  // Update localStorage when mobile pricing state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showMobilePricing', showMobilePricing.toString());
    }
  }, [showMobilePricing]);

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
          anchorText: requestingItem.anchorText || generateAnchorText(requestingItem.clientName)
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
            wholesalePrice: getCurrentWholesaleEstimate(), // Dynamic wholesale from pricing estimator
            price: getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS
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
  
  // Load draft order data
  const loadDraftOrder = useCallback(async (orderId: string, clientList: ClientWithSelection[]) => {
    if (!session) return;
    
    try {
      setLoadingDraft(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const order = await response.json();
        
        // Set the draft order ID
        setDraftOrderId(order.id);
        
        // Load account data
        if (order.accountId && session.userType === 'internal') {
          setSelectedAccountId(order.accountId);
        }
        setSelectedAccountEmail(order.account?.email || '');
        setSelectedAccountName(order.account?.contactName || order.account?.companyName || '');
        setSelectedAccountCompany(order.account?.companyName || '');
        
        // Set order status
        setOrderStatus(order.status || 'draft');
        setOrderState(order.state || 'configuring');
        
        // Load preferences from database - load if ANY preference exists
        if (order.preferencesDrMin !== undefined || order.preferencesDrMax !== undefined || 
            order.preferencesTrafficMin !== undefined || order.preferencesCategories || 
            order.preferencesTypes) {
          const loadedPreferences = {
            drRange: [order.preferencesDrMin || 0, order.preferencesDrMax || 100] as [number, number],
            minTraffic: order.preferencesTrafficMin || 0,
            categories: order.preferencesCategories || [],
            types: order.preferencesTypes || [],
            linkCount: order.estimatedLinksCount || 10
          };
          setOrderPreferences(loadedPreferences);
          
          // Also set estimated price if available
          if (order.estimatedPricePerLink) {
            setEstimatedPricePerLink(order.estimatedPricePerLink);
          }
        }
        
        // Determine if this is a new order (just created from /orders/new)
        const isNew = order.status === 'draft' && 
                     (!order.orderGroups || order.orderGroups.length === 0) &&
                     new Date(order.createdAt).getTime() > Date.now() - 60000; // Created within last minute
        setIsNewOrder(isNew);
        
        // Load line items from the line items system if available
        if (isLineItemsSystemEnabled() && order.lineItems && order.lineItems.length > 0) {
          console.log('[LOAD_ORDER] Loading from line items system');
          
          const newLineItems: OrderLineItem[] = [];
          const newSelectedClients = new Map<string, { selected: boolean; linkCount: number }>();
          
          // Track clients and their line item counts
          const clientCounts = new Map<string, number>();
          
          order.lineItems.forEach((dbItem: any) => {
            // Create UI line item from database line item
            newLineItems.push({
              id: dbItem.id, // Use actual database ID
              clientId: dbItem.clientId,
              clientName: dbItem.client?.name || 'Unknown Client',
              targetPageId: dbItem.targetPageId,
              targetPageUrl: dbItem.targetPageUrl,
              anchorText: dbItem.anchorText,
              wholesalePrice: dbItem.metadata?.wholesalePrice || (dbItem.estimatedPrice - SERVICE_FEE_CENTS),
              price: dbItem.approvedPrice || dbItem.estimatedPrice || (getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS)
            });
            
            // Count line items per client
            const count = clientCounts.get(dbItem.clientId) || 0;
            clientCounts.set(dbItem.clientId, count + 1);
          });
          
          // Set selected clients based on line items
          clientCounts.forEach((count, clientId) => {
            newSelectedClients.set(clientId, { 
              selected: true, 
              linkCount: count 
            });
          });
          
          setLineItems(newLineItems);
          setSelectedClients(newSelectedClients);
        }
        // Fallback to loading from order groups (legacy system)
        else if (order.orderGroups && order.orderGroups.length > 0) {
          console.log('[LOAD_ORDER] Loading from orderGroups system (fallback)');
          const newLineItems: OrderLineItem[] = [];
          const newSelectedClients = new Map<string, { selected: boolean; linkCount: number }>();
          
          order.orderGroups.forEach((group: any) => {
            // Mark client as selected
            newSelectedClients.set(group.clientId, { 
              selected: true, 
              linkCount: group.linkCount 
            });
            
            // Create line items from target pages
            if (group.targetPages && group.targetPages.length > 0) {
              group.targetPages.forEach((targetPage: any, index: number) => {
                newLineItems.push({
                  id: `${Date.now()}-${Math.random()}-${index}`,
                  clientId: group.clientId,
                  clientName: group.client?.name || clientList.find(c => c.id === group.clientId)?.name || 'Unknown Client',
                  targetPageId: targetPage.pageId || targetPage.id,
                  targetPageUrl: targetPage.url,
                  anchorText: group.anchorTexts?.[index] || '',
                  wholesalePrice: getCurrentWholesaleEstimate(), // Dynamic wholesale from pricing estimator
                  price: getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS
                });
              });
            } else {
              // Create placeholder line items based on link count
              for (let i = 0; i < group.linkCount; i++) {
                newLineItems.push({
                  id: `${Date.now()}-${Math.random()}-${i}`,
                  clientId: group.clientId,
                  clientName: group.client?.name || clientList.find(c => c.id === group.clientId)?.name || 'Unknown Client',
                  targetPageId: undefined,
                  targetPageUrl: undefined,
                  anchorText: undefined,
                  wholesalePrice: getCurrentWholesaleEstimate(), // Dynamic wholesale from pricing estimator
                  price: getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS
                });
              }
            }
          });
          
          setLineItems(newLineItems);
          setSelectedClients(newSelectedClients);
        }
        
        setLastSaved(new Date(order.updatedAt));
        
        // Store account details for the progress view
        if (order.account?.email) {
          setAccountDetails({
            email: order.account.email,
            name: order.account.contactName || order.account.companyName || '',
            company: order.account.companyName
          });
        }
      } else {
        setError('Failed to load draft order');
        router.push('/orders');
      }
    } catch (error) {
      console.error('Error loading draft order:', error);
      setError('Failed to load draft order');
      router.push('/orders');
    } finally {
      setLoadingDraft(false);
    }
  }, [session, router, estimatedPricePerLink]);

  useEffect(() => {
    // Only load data once when session is available
    if (!session) return;
    
    // Load the order ID from params
    const loadOrderData = async () => {
      const { id } = await params;
      setDraftOrderId(id);
      
      // Load clients first
      setLoadingClients(true);
      const url = isAccountUser ? '/api/account/clients' : '/api/clients';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const clientList = data.clients || data;
        // Filter out archived clients
        const activeClients = clientList.filter((client: any) => !client.archivedAt);
        setClients(activeClients);
        
        // Then load the draft order with the client list
        await loadDraftOrder(id, activeClients);
      }
      setLoadingClients(false);
    };
    
    loadOrderData();
    
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
  }, [session?.userType, session?.userId, params]); // Only depend on session properties, not functions

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
    
    // Sort by usage count (descending) only - don't re-sort by DR since we don't have that data for client pages
    targets.sort((a, b) => b.usageCount - a.usageCount);
    
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
          accountId: session.userId, // Include accountId for account users
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
      
      console.log('[AUTO_SAVE] Preparing to save order:', {
        selectedClientsSize: selectedClients.size,
        lineItemsCount: lineItems.length,
        draftOrderId,
        sessionType: session.userType
      });
      
      const orderData = {
        // Account info
        ...accountInfo,
        
        // Pricing - use correct field names expected by API
        subtotal: subtotal,
        totalPrice: total,
        // Calculate actual wholesale and profit based on line items
        totalWholesale: lineItems.reduce((sum, item) => 
          sum + (item.wholesalePrice || (item.price - SERVICE_FEE_CENTS)), 0
        ),
        profitMargin: lineItems.length * SERVICE_FEE_CENTS, // Profit = number of links × $79 service fee
        
        // Preferences from pricing estimator
        ...(orderPreferences && {
          estimatedLinksCount: orderPreferences.linkCount,
          preferencesDrMin: orderPreferences.drRange[0],
          preferencesDrMax: orderPreferences.drRange[1],
          preferencesTrafficMin: orderPreferences.minTraffic,
          preferencesCategories: orderPreferences.categories,
          preferencesTypes: orderPreferences.types,
          estimatedPricePerLink: estimatedPricePerLink,
          estimatedBudgetMin: orderPreferences.estimatedBudgetMin,
          estimatedBudgetMax: orderPreferences.estimatedBudgetMax,
          estimatorSnapshot: orderPreferences.estimatorSnapshot,
        }),
        
        // Groups for the new order structure - API expects 'orderGroups'
        orderGroups: Array.from(selectedClients.entries())
          .filter(([_, data]) => data.selected && data.linkCount > 0)
          .map(([clientId, data]) => {
            const client = clients.find(c => c.id === clientId);
            const clientItems = lineItems.filter(item => item.clientId === clientId);
            
            // Extract target pages and anchor texts from line items
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
              estimatedPrice: clientItems[0]?.price || estimatedPricePerLink,
              wholesalePrice: clientItems[0]?.wholesalePrice || (estimatedPricePerLink - SERVICE_FEE_CENTS),
            };
          })
      };
      
      console.log('[AUTO_SAVE] Order data being sent:', orderData);
      
      if (draftOrderId) {
        // Check if line items system is enabled
        if (isLineItemsSystemEnabled() && lineItems.length > 0) {
          console.log('[AUTO_SAVE] Using line items system');
          
          // Update order with basic info first
          const orderUpdateResponse = await fetch(`/api/orders/${draftOrderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ...accountInfo,
              subtotal: subtotal,
              totalPrice: total,
              totalWholesale: lineItems.reduce((sum, item) => 
                sum + (item.wholesalePrice || (item.price - SERVICE_FEE_CENTS)), 0
              ),
              profitMargin: lineItems.length * SERVICE_FEE_CENTS,
              // Don't send orderGroups for line items system
              orderGroups: []
            })
          });
          
          if (orderUpdateResponse.ok) {
            // Now save line items via the line items API
            const lineItemsData = lineItems.map(item => ({
              clientId: item.clientId,
              targetPageId: item.targetPageId,
              targetPageUrl: item.targetPageUrl,
              anchorText: item.anchorText,
              estimatedPrice: item.price,
              metadata: {
                wholesalePrice: item.wholesalePrice || (item.price - SERVICE_FEE_CENTS),
                serviceFee: SERVICE_FEE_CENTS,
                clientName: item.clientName
              }
            }));
            
            // First get existing line items to clear them
            const existingItemsResponse = await fetch(`/api/orders/${draftOrderId}/line-items`, {
              credentials: 'include'
            });
            
            let existingItems = [];
            if (existingItemsResponse.ok) {
              const existingData = await existingItemsResponse.json();
              existingItems = existingData.lineItems || [];
            }
            
            // Clear existing line items if any exist
            if (existingItems.length > 0) {
              const existingItemIds = existingItems.map((item: any) => item.id);
              await fetch(`/api/orders/${draftOrderId}/line-items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  itemIds: existingItemIds,
                  reason: 'Clearing items before draft save'
                })
              });
            }
            
            // Now create new line items
            const lineItemsResponse = await fetch(`/api/orders/${draftOrderId}/line-items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                items: lineItemsData,
                reason: 'Order draft saved from edit page'
              })
            });
            
            if (lineItemsResponse.ok) {
              console.log('[AUTO_SAVE] Successfully saved order and line items');
              setSaveStatus('saved');
              setLastSaved(new Date());
            } else {
              const errorData = await lineItemsResponse.json();
              console.error('[AUTO_SAVE] Failed to save line items:', errorData);
              setSaveStatus('error');
            }
          } else {
            const errorData = await orderUpdateResponse.json();
            console.error('[AUTO_SAVE] Failed to update order:', errorData);
            setSaveStatus('error');
          }
        } else {
          // Fallback to old orderGroups system
          console.log('[AUTO_SAVE] Using orderGroups system (fallback)');
          const response = await fetch(`/api/orders/${draftOrderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(orderData)
          });
          
          if (response.ok) {
            console.log('[AUTO_SAVE] Successfully saved order');
            setSaveStatus('saved');
            setLastSaved(new Date());
          } else {
            const errorData = await response.json();
            console.error('[AUTO_SAVE] Failed to save order:', errorData);
            setSaveStatus('error');
          }
        }
      }
      // Note: Removed auto-creation of new drafts
      // New orders should be created via /orders/new page
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [session, draftOrderId, lineItems, selectedClients, clients, subtotal, total, estimatedPricePerLink,
      selectedAccountId, selectedAccountEmail, selectedAccountName, selectedAccountCompany]);
  
  // Auto-save removed - manual save only
  
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
            wholesalePrice: getCurrentWholesaleEstimate(), // Dynamic wholesale from pricing estimator
            price: getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS,
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
            wholesalePrice: getCurrentWholesaleEstimate(), // Dynamic wholesale from pricing estimator
            price: getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS,
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
          anchorText: updated[placeholderIndex].anchorText || generateAnchorText(target.clientName),
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
          anchorText: generateAnchorText(target.clientName), // New items get generated anchor text
          wholesalePrice: getCurrentWholesaleEstimate(), // Dynamic wholesale from pricing estimator
          price: getCurrentWholesaleEstimate() + SERVICE_FEE_CENTS
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

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Order status tracking  
  const [orderStatus, setOrderStatus] = useState('draft');
  const [orderState, setOrderState] = useState('configuring');

  const handleSubmit = async () => {
    // Validate line items
    const invalidItems = lineItems.filter(item => !item.clientId);
    
    if (invalidItems.length > 0) {
      setError('Please complete all order details');
      return;
    }
    
    // For account users, validate they have target pages selected
    if (isAccountUser) {
      const itemsWithoutTargetPages = lineItems.filter(item => !item.targetPageUrl);
      if (itemsWithoutTargetPages.length > 0) {
        setError('Please select target pages for all line items');
        return;
      }
    }
    
    // Show confirmation modal (no auto-save - user must confirm to save)
    setShowConfirmModal(true);
  };
  
  const handleConfirmOrder = async () => {
    try {
      setIsSubmitting(true);
      
      // First save the current changes
      await saveOrderDraft();
      
      // If this is a draft order and we're submitting it
      if (orderStatus === 'draft') {
        // Submit the order (move from draft to pending_confirmation)
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
      } else if (orderStatus === 'pending_confirmation' || orderStatus === 'confirmed') {
        // Resubmit the order for review with optional notes
        const resubmitNotes = (document.getElementById('resubmit-notes') as HTMLTextAreaElement)?.value || '';
        
        const response = await fetch(`/api/orders/${draftOrderId}/resubmit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes: resubmitNotes })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to resubmit order');
        }
        
        const result = await response.json();
        console.log('Order resubmitted:', result.message);
      }
      
      // Close modal and redirect back to order details
      setShowConfirmModal(false);
      setIsSubmitting(false);
      
      // Show success message briefly then redirect
      setSaveStatus('saved');
      setTimeout(() => {
        router.push(`/orders/${draftOrderId}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error updating order:', error);
      setError(error.message || 'Failed to update order');
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href={isNewOrder ? '/orders' : `/orders/${draftOrderId || ''}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="sm:hidden">Back</span>
                <span className="hidden sm:inline">{isNewOrder ? 'Back to Orders' : 'Back to Order'}</span>
              </Link>
              <div className="flex-1">
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {isNewOrder ? 'New Order' : `Order ${draftOrderId ? '#' + draftOrderId.slice(0, 8) : ''}`}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  {isNewOrder ? 'Build your guest post campaign' : 'Update your guest post order details'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
          </div>
        </div>


        {/* Account Selection (Internal Users Only) */}
        {session?.userType === 'internal' && (
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Select Account *</label>
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
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  <div className="hidden sm:block">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={selectedAccountName}
                      onChange={(e) => setSelectedAccountName(e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div className="hidden md:block">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedAccountEmail}
                      onChange={(e) => setSelectedAccountEmail(e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div className="hidden md:block">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={selectedAccountCompany}
                      onChange={(e) => setSelectedAccountCompany(e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md"
                      placeholder="Company name (optional)"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Mobile Navigation (shown on small screens) */}
        <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex">
            <button
              onClick={() => {
                setMobileView('clients');
                if (typeof window !== 'undefined') {
                  localStorage.setItem('orderEdit-mobileView', 'clients');
                }
              }}
              className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors relative touch-manipulation min-h-[44px] flex items-center justify-center ${
                mobileView === 'clients' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span>Brands</span>
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                mobileView === 'clients' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{selectedClients.size}</span>
            </button>
            <button
              onClick={() => {
                setMobileView('targets');
                if (typeof window !== 'undefined') {
                  localStorage.setItem('orderEdit-mobileView', 'targets');
                }
              }}
              className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors relative touch-manipulation min-h-[44px] flex items-center justify-center ${
                mobileView === 'targets' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span>Targets</span>
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                mobileView === 'targets' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{availableTargets.length}</span>
            </button>
            <button
              onClick={() => {
                setMobileView('order');
                if (typeof window !== 'undefined') {
                  localStorage.setItem('orderEdit-mobileView', 'order');
                }
              }}
              className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors relative touch-manipulation min-h-[44px] flex items-center justify-center ${
                mobileView === 'order' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span>Order</span>
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                mobileView === 'order' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{lineItems.length}</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Pricing Summary - Collapsible */}
        <div className="md:hidden bg-white border-b border-gray-200">
          <button 
            onClick={() => setShowMobilePricing(!showMobilePricing)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  Pricing: {estimatedPricePerLink > 0 ? formatCurrency(estimatedPricePerLink) : '$250'}/link
                </p>
                <p className="text-xs text-gray-500">
                  {orderPreferences?.estimatorSnapshot?.sitesAvailable || 'Set preferences to see'} sites available
                </p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
              showMobilePricing ? 'rotate-180' : ''
            }`} />
          </button>
          
          {showMobilePricing && (
            <div className="border-t border-gray-200">
              <PricingEstimator 
                className=""
                initialPreferences={orderPreferences || undefined}
                onEstimateChange={(estimate, preferences) => {
                  // Store preferences for saving with the order
                  if (estimate && preferences) {
                    // Update the estimated price per link (wholesale + service fee)
                    setEstimatedPricePerLink(estimate.clientMedian);
                    // Update wholesale estimate for new line items
                    setEstimatedWholesalePerLink(estimate.wholesaleMedian);
                    
                    // Calculate budget range based on total links and price range
                    const clientLinksTotal = Array.from(selectedClients.values()).reduce((sum, client) => 
                      sum + (client.selected ? client.linkCount : 0), 0);
                    const totalLinks = clientLinksTotal > 0 ? clientLinksTotal : 
                                      (lineItems.length > 0 ? lineItems.length : 
                                      preferences.linkCount || 1);
                    const budgetMin = totalLinks * estimate.clientMin;
                    const budgetMax = totalLinks * estimate.clientMax;
                    
                    // Create estimator snapshot of what user saw
                    const estimatorSnapshot = {
                      sitesAvailable: estimate.count,
                      medianPrice: estimate.wholesaleMedian,
                      averagePrice: estimate.wholesaleAverage,
                      priceRange: { min: estimate.wholesaleMin, max: estimate.wholesaleMax },
                      examples: estimate.examples || [],
                      timestamp: new Date().toISOString()
                    };
                    
                    const enhancedPreferences = {
                      ...preferences,
                      linkCount: totalLinks,
                      estimatedBudgetMin: budgetMin,
                      estimatedBudgetMax: budgetMax,
                      estimatorSnapshot: estimatorSnapshot
                    };
                    
                    setOrderPreferences(enhancedPreferences);
                    
                    // Save to local state for persistence
                    sessionStorage.setItem('orderPreferences', JSON.stringify({
                      estimate,
                      preferences: enhancedPreferences,
                      timestamp: new Date().toISOString()
                    }));
                    
                    // Update line items that are still using default pricing
                    setLineItems(prev => prev.map(item => {
                      const isDefaultPricing = !item.wholesalePrice || item.wholesalePrice === 20000 || item.price === (item.wholesalePrice + SERVICE_FEE_CENTS);
                      if (isDefaultPricing) {
                        return {
                          ...item,
                          wholesalePrice: estimate.wholesaleMedian,
                          price: estimate.clientMedian
                        };
                      }
                      return item;
                    }));
                  }
                }}
              />
            </div>
          )}
        </div>
        
        {/* Desktop Pricing Estimator - Full featured */}
        <div className="hidden md:block">
          <PricingEstimator 
            className=""
            initialPreferences={orderPreferences || undefined}
            onEstimateChange={(estimate, preferences) => {
              // Store preferences for saving with the order
              if (estimate && preferences) {
                // Update the estimated price per link (wholesale + service fee)
                setEstimatedPricePerLink(estimate.clientMedian);
                // Update wholesale estimate for new line items
                setEstimatedWholesalePerLink(estimate.wholesaleMedian);
                
                // Calculate budget range based on total links and price range
                // Prioritize client link counts over line items (line items might be placeholders)
                const clientLinksTotal = Array.from(selectedClients.values()).reduce((sum, client) => 
                  sum + (client.selected ? client.linkCount : 0), 0);
                const totalLinks = clientLinksTotal > 0 ? clientLinksTotal : 
                                  (lineItems.length > 0 ? lineItems.length : 
                                  preferences.linkCount || 1);
                const budgetMin = totalLinks * estimate.clientMin;
                const budgetMax = totalLinks * estimate.clientMax;
                
                // Create estimator snapshot of what user saw
                const estimatorSnapshot = {
                  sitesAvailable: estimate.count,
                  medianPrice: estimate.wholesaleMedian,
                  averagePrice: estimate.wholesaleAverage,
                  priceRange: { min: estimate.wholesaleMin, max: estimate.wholesaleMax },
                  examples: estimate.examples || [],
                  timestamp: new Date().toISOString()
                };
                
                const enhancedPreferences = {
                  ...preferences,
                  linkCount: totalLinks, // Make sure linkCount is included!
                  estimatedBudgetMin: budgetMin,
                  estimatedBudgetMax: budgetMax,
                  estimatorSnapshot: estimatorSnapshot
                };
                
                setOrderPreferences(enhancedPreferences);
                
                // Save to local state for persistence
                sessionStorage.setItem('orderPreferences', JSON.stringify({
                  estimate,
                  preferences: enhancedPreferences,
                  timestamp: new Date().toISOString()
                }));
                
                // Update line items that are still using default pricing (not custom prices)
                setLineItems(prev => prev.map(item => {
                  // Only update items that have the old default wholesale price or no specific price
                  const isDefaultPricing = !item.wholesalePrice || item.wholesalePrice === 20000 || item.price === (item.wholesalePrice + SERVICE_FEE_CENTS);
                  if (isDefaultPricing) {
                    return {
                      ...item,
                      wholesalePrice: estimate.wholesaleMedian,
                      price: estimate.clientMedian
                    };
                  }
                  return item;
                }));
                
              }
            }}
          />
        </div>
        
        {/* Main Content Area - Three Column Layout (Desktop) / Single Column (Mobile) */}
        <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 p-2 sm:p-4 pt-0 overflow-hidden bg-gray-100 md:style-height" style={{height: 'auto'}}>
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
            <div className="p-3 sm:p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Select Brands</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
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
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Order Details</h2>
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
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                    {lineItems.length} items • {lineItems.filter(item => item.targetPageUrl).length} assigned
                    {lastSaved && (
                      <span className="text-gray-400 hidden sm:inline"> • Last saved {new Date(lastSaved).toLocaleTimeString()}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <select 
                    value={groupByMode}
                    onChange={(e) => setGroupByMode(e.target.value as 'client' | 'status' | 'none')}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="client">Group by Brand</option>
                    <option value="status" className="hidden sm:block">Group by Status</option>
                    <option value="none" className="hidden sm:block">No Grouping</option>
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
                  {/* Mobile Cards View */}
                  <div className="md:hidden space-y-3 p-3">
                    {lineItems.map((item, index) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                            <h3 className="font-medium text-gray-900">{item.clientName}</h3>
                          </div>
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-50"
                            title="Remove line item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Target Page</label>
                            {item.targetPageUrl ? (
                              <div className="flex items-center gap-1 mt-1">
                                <p className="text-sm text-gray-600 truncate max-w-[250px] block" title={item.targetPageUrl}>
                                  {item.targetPageUrl}
                                </p>
                                <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic mt-1">Tap a target page →</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Anchor Text</label>
                            <input
                              type="text"
                              value={item.anchorText || ''}
                              onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                              placeholder="Enter anchor text..."
                              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] touch-manipulation"
                              disabled={!item.targetPageUrl}
                            />
                          </div>
                          
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Total Investment</span>
                              <span className="text-lg font-semibold text-gray-900">
                                ${(item.price / 100).toFixed(0)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ${((item.wholesalePrice || (item.price - SERVICE_FEE_CENTS)) / 100).toFixed(0)} site + $79 content
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Desktop Table View - With Horizontal Scroll */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Brand</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Target Page</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">Anchor Text</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">Investment Details</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]"></th>
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
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] touch-manipulation"
                              disabled={!item.targetPageUrl}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                ${(item.price / 100).toFixed(0)}
                              </div>
                              <div className="text-xs text-gray-500">
                                ${((item.wholesalePrice || (item.price - SERVICE_FEE_CENTS)) / 100).toFixed(0)} site + $79 SEO content package
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                2000-word article, semantic SEO, images, internal links
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">${item.price}</p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded"
                              title="Remove line item"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                    {/* Scroll indicator for mobile */}
                    <div className="text-xs text-gray-500 text-center mt-2 md:hidden">
                      ← Scroll horizontally to see all columns →
                    </div>
                  </div>
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
                            ${items.reduce((sum, item) => sum + (item.price || 0), 0) / 100}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="hidden md:block">
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
                                        value={item.anchorText || ''}
                                        onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                                        placeholder="Enter anchor text..."
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-sm">
                                        <div className="font-medium text-gray-900">
                                          ${(item.price / 100).toFixed(0)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          ${((item.wholesalePrice || (item.price - SERVICE_FEE_CENTS)) / 100).toFixed(0)} + $79
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      ${(item.price / 100).toFixed(0)}
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
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* Mobile: Compact Stats */}
              <div className="flex sm:hidden items-center justify-around w-full text-xs">
                <div className="flex items-center space-x-1">
                  <Building className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{getTotalClients()}</span>
                  <span className="text-gray-500">brands</span>
                </div>
                <div className="flex items-center space-x-1">
                  <LinkIcon className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{getTotalLinks()}</span>
                  <span className="text-gray-500">links</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {new Set(lineItems.map(item => item.targetPageId).filter(Boolean)).size}
                  </span>
                  <span className="text-gray-500">targets</span>
                </div>
              </div>
              
              {/* Desktop: Full Stats */}
              <div className="hidden sm:flex flex-col md:flex-row items-center gap-4 md:space-x-6 w-full md:w-auto">
                <div className="hidden md:flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Pricing:</span>
                  <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-lg">
                    <span className="text-sm text-green-800">
                      Wholesale + $79 Service Fee
                    </span>
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
                    <LinkIcon className="h-4 w-4 text-gray-400" />
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
              <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 md:space-x-6 w-full sm:w-auto">
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
                  <p className="text-xs text-gray-400 hidden sm:block">Site costs + strategic SEO content creation</p>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href={isNewOrder ? '/orders' : `/orders/${draftOrderId || ''}`}
                    className="px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-3 border border-gray-300 text-gray-700 font-medium text-xs sm:text-sm 
                             rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={lineItems.length === 0 || lineItems.some(item => !item.clientId)}
                    className="px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-3 bg-blue-600 text-white font-medium text-xs sm:text-sm 
                             rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden md:inline">
                      {isNewOrder ? 'Review & Submit Order' : 
                       orderStatus === 'pending_confirmation' ? 'Resubmit for Review' :
                       orderStatus === 'confirmed' ? 'Request Changes' :
                       'Save Changes'}
                    </span>
                    <span className="md:hidden">
                      {isNewOrder ? 'Submit' : 
                       orderStatus === 'pending_confirmation' ? 'Resubmit' :
                       'Save'}
                    </span>
                  </button>
                </div>
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
        
        {/* Order Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                    {isNewOrder ? 'Confirm Your Order' : 
                     orderStatus === 'pending_confirmation' ? 'Resubmit Order for Review' :
                     orderStatus === 'confirmed' ? 'Request Order Changes' :
                     'Confirm Order Updates'}
                  </h2>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-5 sm:h-6 w-5 sm:w-6" />
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
                        <span>Estimated Total:</span>
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
                          {isAccountUser && (
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Resubmission Notes (only for pending_confirmation or confirmed orders) */}
                {(orderStatus === 'pending_confirmation' || orderStatus === 'confirmed') && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">What Changed?</h3>
                    <textarea
                      id="resubmit-notes"
                      placeholder="Briefly describe what you changed in this order (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This helps our team quickly understand what needs to be reviewed
                    </p>
                  </div>
                )}
                
                {/* What Happens Next */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">What Happens Next?</h3>
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 text-sm">What happens next:</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      {isNewOrder ? (
                        <>
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Your order will be confirmed</div>
                              <div className="text-xs text-gray-500">Order details locked and sent to our team</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              <div className="font-medium">We'll find perfect sites (24-48 hours)</div>
                              <div className="text-xs text-gray-500">Our team analyzes your requirements and identifies high-quality sites</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Users className="h-4 w-4 text-purple-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Review & approve recommended sites</div>
                              <div className="text-xs text-gray-500">You'll receive an email when sites are ready for your review</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Pay invoice to start content creation</div>
                              <div className="text-xs text-gray-500">Final pricing based on approved sites</div>
                            </div>
                          </div>
                        </>
                      ) : orderStatus === 'pending_confirmation' ? (
                        <>
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Your changes will be saved and resubmitted</div>
                              <div className="text-xs text-gray-500">Our team will be notified to review your updated order</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Team will review within 24 hours</div>
                              <div className="text-xs text-gray-500">You'll receive confirmation once the review is complete</div>
                            </div>
                          </div>
                        </>
                      ) : orderStatus === 'confirmed' ? (
                        <>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Requesting changes to confirmed order</div>
                              <div className="text-xs text-gray-500">Our team will review if changes can be accommodated</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              <div className="font-medium">May affect site selection timeline</div>
                              <div className="text-xs text-gray-500">Significant changes may require new site research</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Your order changes will be saved</div>
                              <div className="text-xs text-gray-500">Updates will be applied to your existing order</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              <div className="font-medium">{orderStatus === 'draft' ? 'You can submit the order when ready' : 'Our team will be notified of the updates'}</div>
                              <div className="text-xs text-gray-500">Track your order progress from the order details page</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Continue Editing
                  </button>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isNewOrder ? 'Create Order' : 
                         orderStatus === 'draft' ? 'Save & Submit Order' :
                         orderStatus === 'pending_confirmation' ? 'Save & Resubmit for Review' :
                         orderStatus === 'confirmed' ? 'Save & Request Changes' :
                         'Save & Update Order'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}