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
        newMap.set(clientId, { selected: true, linkCount: prev.get(clientId)?.linkCount || 0 });
      } else {
        newMap.delete(clientId);
        // Remove line items for this client
        setLineItems(prevItems => prevItems.filter(item => item.clientId !== clientId));
      }
      return newMap;
    });
  };

  const updateClientLinkCount = (clientId: string, count: number) => {
    setSelectedClients(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(clientId);
      if (existing) {
        newMap.set(clientId, { ...existing, linkCount: count });
      }
      return newMap;
    });
  };

  const addLineItemFromTarget = (target: TargetPageWithMetadata) => {
    const newItem: OrderLineItem = {
      id: `${Date.now()}-${Math.random()}`,
      clientId: target.clientId,
      clientName: target.clientName,
      targetPageId: target.id,
      targetPageUrl: target.url,
      anchorText: generateAnchorText(target.clientName),
      price: 100 // TODO: Calculate based on metrics
    };
    
    setLineItems(prev => [...prev, newItem]);
  };

  const addEmptyLineItem = () => {
    const newItem: OrderLineItem = {
      id: Date.now().toString(),
      clientId: '',
      clientName: '',
      price: 100
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Full-screen three-column layout */}
        <div className="h-[calc(100vh-64px)] flex">
          {error && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start shadow-lg">
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
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Clients</h2>
              <p className="text-sm text-gray-600">Choose clients and set link counts for your order</p>
            </div>
            
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map(client => {
                  const clientSelection = selectedClients.get(client.id);
                  const isSelected = clientSelection?.selected || false;
                  const linkCount = clientSelection?.linkCount || 0;
                  
                  return (
                    <div 
                      key={client.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleClientSelection(client.id, e.target.checked)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{client.name}</h3>
                            <p className="text-sm text-gray-500">{client.website}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {client.targetPages?.length || 0} target pages
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <label className="block text-sm font-medium text-blue-900 mb-1">
                            Links for this client
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={linkCount}
                            onChange={(e) => updateClientLinkCount(client.id, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Totals */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Links:</span>
                  <span className="font-medium">{getTotalLinks()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selected Clients:</span>
                  <span className="font-medium">{getTotalClients()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total Cost:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Order Line Items */}
          <div className="flex-1 bg-white p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Line Items</h2>
              <p className="text-sm text-gray-600">Click target URLs on the right to populate order items</p>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {lineItems.length} items • {formatCurrency(total)} total
                </div>
                <button
                  onClick={addEmptyLineItem}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Manual Item
                </button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium mb-2">No order items yet</p>
                <p className="text-sm mb-4">Select clients on the left, then click target URLs on the right to build your order</p>
                <div className="text-xs text-gray-400">
                  <p>1. ← Select clients with checkboxes</p>
                  <p>2. → Click target URLs to add line items</p>
                  <p>3. Edit anchor text and details here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        {/* Client Info */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{item.clientName}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {clients.find(c => c.id === item.clientId)?.website}
                          </div>
                        </div>
                        
                        {/* Target Page */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Target Page</label>
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                            <span className="text-sm truncate">{item.targetPageUrl}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-sm font-medium">{formatCurrency(item.price)}</span>
                        <button
                          onClick={() => duplicateLineItem(item.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Anchor Text */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Anchor Text</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={item.anchorText || ''}
                          onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                          placeholder="Enter anchor text for this link"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        {!item.anchorText && item.clientName && (
                          <button
                            onClick={() => updateLineItem(item.id, { anchorText: generateAnchorText(item.clientName) })}
                            className="px-3 py-2 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg"
                          >
                            Auto-generate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Action Button */}
            {lineItems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  Continue to Site Selection
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            )}
          </div>
          
          {/* Right Sidebar - Target URLs */}
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Target URLs</h2>
              <p className="text-sm text-gray-600">Click URLs to add them to your order</p>
              
              {/* Search */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by domain, keywords, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {selectedClients.size === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm mb-1">Select clients first</p>
                <p className="text-xs text-gray-400">Choose clients on the left to see their target pages here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredTargets().map(target => (
                  <div key={`${target.clientId}-${target.id}`} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                       onClick={() => addLineItemFromTarget(target)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate" title={target.url}>
                          {target.domain}
                        </h4>
                        <p className="text-xs text-gray-500">{target.clientName}</p>
                        {target.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2" title={target.description}>
                            {target.description.substring(0, 80)}...
                          </p>
                        )}
                      </div>
                      {target.usageCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 ml-2">
                          Used {target.usageCount}x
                        </span>
                      )}
                    </div>
                    
                    {/* Keywords */}
                    {target.keywordArray && target.keywordArray.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {target.keywordArray.slice(0, 3).map((keyword, idx) => (
                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                              {keyword}
                            </span>
                          ))}
                          {target.keywordArray.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{target.keywordArray.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          DR: {target.dr}
                        </div>
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                          {(target.traffic / 1000).toFixed(0)}k traffic
                        </div>
                      </div>
                      
                      <div className="text-xs text-blue-600 font-medium">
                        Click to add →
                      </div>
                    </div>
                  </div>
                ))}
                
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
    </AuthWrapper>
  );
}