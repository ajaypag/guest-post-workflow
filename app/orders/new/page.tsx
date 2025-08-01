'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Building, Package, Plus, X, ChevronDown, ChevronUp, ChevronRight,
  Search, Target, Link, Type, CheckCircle,
  AlertCircle, Copy, Trash2, User, Globe, ExternalLink
} from 'lucide-react';

interface OrderLineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  price: number;
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
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Pricing state
  const [selectedPackage, setSelectedPackage] = useState<'bronze' | 'silver' | 'gold' | 'custom'>('silver');
  const packagePricing = {
    bronze: { price: 75, name: 'Bronze', description: 'Basic sites (DR 20-40)' },
    silver: { price: 125, name: 'Silver', description: 'Quality sites (DR 40-60)' },
    gold: { price: 200, name: 'Gold', description: 'Premium sites (DR 60+)' },
    custom: { price: 0, name: 'Custom', description: 'Mix and match' }
  };
  
  // Mode state
  const [orderMode, setOrderMode] = useState<'detailed' | 'simple'>('detailed');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const loadClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const url = isAccountUser ? '/api/account/clients' : '/api/clients';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const clientList = data.clients || data;
        setClients(clientList);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }, [isAccountUser]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

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
    
    // Sort by domain rating (descending) then by usage count (ascending)
    targets.sort((a, b) => {
      if (a.dr !== b.dr) return b.dr - a.dr;
      return a.usageCount - b.usageCount;
    });
    
    setAvailableTargets(targets);
  }, [selectedClients, clients, lineItems]);

  useEffect(() => {
    calculatePricing(lineItems);
  }, [lineItems]);

  useEffect(() => {
    updateAvailableTargets();
  }, [updateAvailableTargets]);

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
          price: packagePricing[selectedPackage].price || 100
        };
        return [...prev, newItem];
      }
    });
  };

  const addEmptyLineItem = () => {
    const newItem: OrderLineItem = {
      id: Date.now().toString(),
      clientId: '',
      clientName: '',
      price: packagePricing[selectedPackage].price || 100
    };
    setLineItems([...lineItems, newItem]);
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

  const removeLineItem = (id: string) => {
    setLineItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      calculatePricing(updated);
      return updated;
    });
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
    
    // Submit order logic here
    console.log('Submitting order:', { lineItems, total });
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        {/* Mode Toggle */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Order</h1>
              <p className="text-sm text-gray-600 mt-1">Build your guest post order</p>
            </div>
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setOrderMode('simple')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  orderMode === 'simple' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Simple Mode
              </button>
              <button
                onClick={() => setOrderMode('detailed')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  orderMode === 'detailed' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Detailed Mode
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        {orderMode === 'simple' ? (
          /* Simple Mode Interface */
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-4xl mx-auto p-8">
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
                {/* Step 1: Select Clients */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Select Brands</h3>
                  <div className="space-y-3">
                    {clients.map(client => (
                      <label key={client.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.id)}
                          onChange={(e) => toggleClientSelection(client.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.website}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Step 2: Total Links */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: How many links do you need?</h3>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lineItems.length || 1}
                    onChange={(e) => {
                      const totalLinks = parseInt(e.target.value) || 0;
                      // Auto-distribute links across selected clients
                      const clientIds = Array.from(selectedClients.keys());
                      if (clientIds.length > 0) {
                        const linksPerClient = Math.ceil(totalLinks / clientIds.length);
                        clientIds.forEach(clientId => {
                          updateClientLinkCount(clientId, linksPerClient);
                        });
                      }
                    }}
                    className="w-32 px-4 py-2 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-2">Links will be automatically distributed across selected brands</p>
                </div>
                
                {/* Step 3: Package Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Step 3: Select Package</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(packagePricing).filter(([key]) => key !== 'custom').map(([key, pkg]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedPackage(key as typeof selectedPackage);
                          setLineItems(prev => prev.map(item => ({
                            ...item,
                            price: pkg.price
                          })));
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedPackage === key 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{pkg.name}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">${pkg.price}</p>
                        <p className="text-sm text-gray-500">per link</p>
                        <p className="text-xs text-gray-400 mt-2">{pkg.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Summary */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Order</p>
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {lineItems.length} links × {formatCurrency(packagePricing[selectedPackage].price)} each
                      </p>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={lineItems.length === 0 || selectedClients.size === 0}
                      className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 
                               transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Continue to Site Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Detailed Mode - Three Column Layout */
          <div className="flex-1 flex gap-4 p-4 overflow-hidden relative bg-gray-100">
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

          {/* Left Sidebar - Client Selection */}
          <div className="w-80 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Select Brands</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedClients.size} of {clients.length} selected
                  </p>
                </div>
                <button 
                  onClick={() => {
                    // TODO: Implement inline client creation modal
                    console.log('Add new client');
                  }}
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

          {/* Middle Column - Order Line Items */}
          <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {lineItems.length} items • {lineItems.filter(item => item.targetPageUrl).length} assigned
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <select className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option>Group by Client</option>
                    <option>Group by Status</option>
                    <option>No Grouping</option>
                  </select>
                  <button
                    onClick={addEmptyLineItem}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No items added yet.</p>
                  <p className="text-sm mt-2">Select clients from the left to get started.</p>
                </div>
              ) : (
                <div>
                  {/* Group items by client */}
                  {Object.entries(
                    lineItems.reduce((acc, item) => {
                      if (!acc[item.clientName]) acc[item.clientName] = [];
                      acc[item.clientName].push(item);
                      return acc;
                    }, {} as Record<string, typeof lineItems>)
                  ).map(([clientName, items]) => {
                    const isExpanded = !expandedClients.has(clientName); // Default to expanded (not in set = expanded)
                    const assignedCount = items.filter(item => item.targetPageUrl).length;
                    
                    return (
                      <div key={clientName} className="border-b last:border-b-0">
                        <button
                          onClick={() => {
                            setExpandedClients(prev => {
                              const newSet = new Set(prev);
                              if (isExpanded) {
                                newSet.delete(clientName);
                              } else {
                                newSet.add(clientName);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between sticky top-0 z-10"
                        >
                          <div className="flex items-center space-x-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <h3 className="font-medium text-sm text-gray-700">{clientName}</h3>
                            <span className="text-xs text-gray-500">
                              {items.length} links • {assignedCount} assigned
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(items.reduce((sum, item) => sum + item.price, 0))}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="divide-y">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="px-4 py-2 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                              >
                                <div className="flex-1 min-w-0">
                                  {item.targetPageUrl ? (
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{item.targetPageUrl}</p>
                                        <input
                                          type="text"
                                          value={item.anchorText || ''}
                                          onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                                          placeholder="Anchor text..."
                                          className="mt-1 w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                      <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateLineItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                        className="w-16 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm text-gray-500 italic">⚡ Unassigned - click target to fill</p>
                                      <span className="text-xs text-gray-400">${item.price}</span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeLineItem(item.id)}
                                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Sidebar - Target URLs */}
          <div className="w-80 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Target Pages</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {availableTargets.length} pages available
                  </p>
                </div>
                <button 
                  onClick={() => {
                    // TODO: Implement inline target page creation modal
                    console.log('Add custom target');
                  }}
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
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {selectedClients.size === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm mb-1">Select clients first</p>
                  <p className="text-xs text-gray-400">Choose clients on the left to see their target pages</p>
                </div>
              ) : (
                <div>
                  {/* Group targets by domain */}
                  {Object.entries(
                    getFilteredTargets().reduce((acc, target) => {
                      if (!acc[target.domain]) acc[target.domain] = [];
                      acc[target.domain].push(target);
                      return acc;
                    }, {} as Record<string, TargetPageWithMetadata[]>)
                  ).map(([domain, targets]) => {
                    const isExpanded = !expandedDomains.has(domain); // Default to expanded (not in set = expanded)
                    const totalUsage = targets.reduce((sum, t) => sum + t.usageCount, 0);
                    const avgDr = Math.round(targets.reduce((sum, t) => sum + t.dr, 0) / targets.length);
                    
                    return (
                      <div key={domain} className="border-b last:border-b-0">
                        <button
                          onClick={() => {
                            setExpandedDomains(prev => {
                              const newSet = new Set(prev);
                              if (isExpanded) {
                                newSet.delete(domain);
                              } else {
                                newSet.add(domain);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between sticky top-0 z-10"
                        >
                          <div className="flex items-center space-x-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div className="text-left">
                              <h3 className="font-medium text-sm text-gray-900">{domain}</h3>
                              <div className="flex items-center space-x-3 text-xs text-gray-500 mt-0.5">
                                <span>{targets.length} pages</span>
                                <span>DR {avgDr}</span>
                                {totalUsage > 0 && <span className="text-blue-600">Used {totalUsage}x</span>}
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="divide-y">
                            {targets.map(target => (
                              <div 
                                key={`${target.clientId}-${target.id}`} 
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between"
                                onClick={() => addLineItemFromTarget(target)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 truncate" title={target.url}>
                                    {target.url.replace(`https://${target.domain}`, '').replace(`http://${target.domain}`, '') || '/'}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500">{target.clientName}</span>
                                    {target.usageCount > 0 && (
                                      <span className="text-xs text-blue-600">• Used {target.usageCount}x</span>
                                    )}
                                  </div>
                                  {target.keywordArray && target.keywordArray.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {target.keywordArray.slice(0, 2).map((keyword, idx) => (
                                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                          {keyword}
                                        </span>
                                      ))}
                                      {target.keywordArray.length > 2 && (
                                        <span className="text-xs text-gray-400">+{target.keywordArray.length - 2}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {getFilteredTargets().length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No targets found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
        
        {/* Fixed Bottom Bar - Only in Detailed Mode */}
        {orderMode === 'detailed' && (
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-full px-6 py-4">
            {/* Package Selection */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="block text-xs font-medium text-gray-700 mb-2">Select Package</label>
              <div className="flex items-center space-x-3">
                {Object.entries(packagePricing).map(([key, pkg]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPackage(key as typeof selectedPackage);
                      // Update all line item prices
                      setLineItems(prev => prev.map(item => ({
                        ...item,
                        price: pkg.price || item.price
                      })));
                    }}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedPackage === key 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">{pkg.name}</div>
                    <div className="text-xs text-gray-500">{pkg.price > 0 ? `$${pkg.price}/link` : 'Variable pricing'}</div>
                    <div className="text-xs text-gray-400">{pkg.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              {/* Left Side - Order Summary Stats */}
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Clients</p>
                    <p className="text-lg font-semibold text-gray-900">{getTotalClients()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Link className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Total Links</p>
                    <p className="text-lg font-semibold text-gray-900">{getTotalLinks()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Unique Targets</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Set(lineItems.map(item => item.targetPageId).filter(Boolean)).size}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Type className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Avg. Price/Link</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {lineItems.length > 0 ? formatCurrency(total / lineItems.length) : '$0'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Actions and Total */}
              <div className="flex items-center space-x-6">
                {/* Quick Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setLineItems([])}
                    disabled={lineItems.length === 0}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement save draft
                      console.log('Saving draft...');
                    }}
                    disabled={lineItems.length === 0}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Draft
                  </button>
                </div>
                
                <div className="h-12 w-px bg-gray-200"></div>
                
                {/* Total and Continue */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Order Total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={lineItems.length === 0 || lineItems.some(item => !item.clientId)}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 
                             transition-colors flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Continue to Site Selection
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Step 1: Build Order</span>
                </div>
                <ChevronRight className="h-4 w-4" />
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                  <span>Step 2: Select Publishing Sites</span>
                </div>
                <ChevronRight className="h-4 w-4" />
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                  <span>Step 3: Review & Confirm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </AuthWrapper>
  );
}