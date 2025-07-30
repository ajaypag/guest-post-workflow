'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Plus,
  X,
  Search,
  Building,
  Globe,
  Mail,
  User,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
  Target,
  Link as LinkIcon,
  Trash2,
  Settings,
  DollarSign,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';

interface Account {
  id?: string;
  email: string;
  name: string;
  company?: string;
}

interface Client {
  id: string;
  name: string;
  website: string;
  targetPages?: TargetPage[];
  defaultRequirements?: any;
}

interface TargetPage {
  id: string;
  url: string;
  keywords?: string;
  description?: string;
  status: string;
}

interface OrderGroup {
  clientId: string;
  client?: Client;
  linkCount: number;
  targetPages: string[]; // Target page IDs
  requirements: {
    minDR?: number;
    minTraffic?: number;
    niches?: string[];
    customGuidelines?: string;
  };
}

interface PricingCalculation {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  clientReviewFee: number;
  rushFee: number;
  total: number;
  profitMargin: number;
}

export default function NewOrderPage() {
  return (
    <AuthWrapper>
      <Header />
      <NewOrderContent />
    </AuthWrapper>
  );
}

function NewOrderContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Account Management
  const [accountSearch, setAccountSearch] = useState('');
  const [existingAccounts, setExistingAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [newAccount, setNewAccount] = useState<Account>({
    email: '',
    name: '',
    company: ''
  });

  // Client & Order Groups
  const [clients, setClients] = useState<Client[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Pricing & Options
  const [includesClientReview, setIncludesClientReview] = useState(false);
  const [rushDelivery, setRushDelivery] = useState(false);
  const [pricing, setPricing] = useState<PricingCalculation>({
    subtotal: 0,
    discountPercent: 0,
    discountAmount: 0,
    clientReviewFee: 0,
    rushFee: 0,
    total: 0,
    profitMargin: 0
  });

  // Internal notes
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    loadClients();
    loadAccounts();
  }, []);

  useEffect(() => {
    calculatePricing();
  }, [orderGroups, includesClientReview, rushDelivery]);

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts?simple=true');
      if (response.ok) {
        const data = await response.json();
        setExistingAccounts(data);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const searchAccounts = (query: string) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return existingAccounts.filter(acc => 
      acc.email.toLowerCase().includes(lowerQuery) ||
      acc.name.toLowerCase().includes(lowerQuery) ||
      (acc.company && acc.company.toLowerCase().includes(lowerQuery))
    ).slice(0, 5);
  };

  const addOrderGroup = () => {
    setOrderGroups([...orderGroups, {
      clientId: '',
      linkCount: 5,
      targetPages: [],
      requirements: {}
    }]);
    setExpandedGroups(new Set([...expandedGroups, orderGroups.length]));
  };

  const removeOrderGroup = (index: number) => {
    setOrderGroups(orderGroups.filter((_, i) => i !== index));
  };

  const updateOrderGroup = (index: number, updates: Partial<OrderGroup>) => {
    const newGroups = [...orderGroups];
    newGroups[index] = { ...newGroups[index], ...updates };
    
    // If client changed, load its data
    if (updates.clientId) {
      const client = clients.find(c => c.id === updates.clientId);
      if (client) {
        newGroups[index].client = client;
        // Auto-populate requirements from client defaults
        if (client.defaultRequirements) {
          newGroups[index].requirements = {
            ...client.defaultRequirements,
            ...newGroups[index].requirements
          };
        }
      }
    }
    
    setOrderGroups(newGroups);
  };

  const toggleGroupExpanded = (index: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGroups(newExpanded);
  };

  const calculatePricing = async () => {
    try {
      const totalLinks = orderGroups.reduce((sum, group) => sum + group.linkCount, 0);
      
      const response = await fetch('/api/orders/calculate-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCount: totalLinks,
          includesClientReview,
          rushDelivery
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPricing(data);
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  const validateOrder = () => {
    // Validate account
    if (!selectedAccount && !isNewAccount) {
      setMessage('Please select or create an account');
      setMessageType('error');
      return false;
    }

    if (isNewAccount) {
      if (!newAccount.email || !newAccount.name) {
        setMessage('Please fill in all required account fields');
        setMessageType('error');
        return false;
      }
    }

    // Validate order groups
    if (orderGroups.length === 0) {
      setMessage('Please add at least one client to the order');
      setMessageType('error');
      return false;
    }

    for (let i = 0; i < orderGroups.length; i++) {
      const group = orderGroups[i];
      if (!group.clientId) {
        setMessage(`Please select a client for group ${i + 1}`);
        setMessageType('error');
        return false;
      }
      if (group.linkCount < 1) {
        setMessage(`Link count must be at least 1 for ${group.client?.name || 'group ' + (i + 1)}`);
        setMessageType('error');
        return false;
      }
      if (group.targetPages.length === 0) {
        setMessage(`Please select target pages for ${group.client?.name || 'group ' + (i + 1)}`);
        setMessageType('error');
        return false;
      }
    }

    return true;
  };

  const createOrder = async () => {
    if (!validateOrder()) return;

    setSaving(true);
    setMessage('');

    try {
      const orderData = {
        account: isNewAccount ? newAccount : selectedAccount,
        isNewAccount,
        orderGroups: orderGroups.map(group => ({
          clientId: group.clientId,
          linkCount: group.linkCount,
          targetPages: group.targetPages,
          requirements: group.requirements
        })),
        includesClientReview,
        rushDelivery,
        internalNotes
      };

      const response = await fetch('/api/orders/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const { orderId } = await response.json();
        router.push(`/orders/${orderId}`);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to create order');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setMessage('Failed to create order');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const totalLinks = orderGroups.reduce((sum, group) => sum + group.linkCount, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Multi-Client Order</h1>
          <p className="text-gray-600 mt-2">
            Build orders for multiple clients with automatic bulk analysis and transparent site selection
          </p>
        </div>

        {/* Main Form */}
        <div className="space-y-8">
          {/* Step 1: Account Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold mr-3">
                1
              </div>
              <h2 className="text-xl font-semibold">Account Information</h2>
            </div>

            {/* Account Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search existing accounts or create new
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={accountSearch}
                  onChange={(e) => {
                    setAccountSearch(e.target.value);
                    setIsNewAccount(false);
                  }}
                  placeholder="Search by email, name, or company..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              {accountSearch && !selectedAccount && (
                <div className="mt-2 border border-gray-200 rounded-lg divide-y">
                  {searchAccounts(accountSearch).map((account) => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccount(account);
                        setAccountSearch('');
                        setIsNewAccount(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start"
                    >
                      <Building className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                        {account.company && (
                          <div className="text-sm text-gray-500">{account.company}</div>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setIsNewAccount(true);
                      setSelectedAccount(null);
                      setNewAccount({
                        email: accountSearch.includes('@') ? accountSearch : '',
                        name: '',
                        company: ''
                      });
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center text-blue-600"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    Create new account
                  </button>
                </div>
              )}
            </div>

            {/* Selected Account or New Account Form */}
            {selectedAccount && !isNewAccount && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-start justify-between">
                <div>
                  <div className="font-medium">{selectedAccount.name}</div>
                  <div className="text-sm text-gray-500">{selectedAccount.email}</div>
                  {selectedAccount.company && (
                    <div className="text-sm text-gray-500">{selectedAccount.company}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedAccount(null);
                    setAccountSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {isNewAccount && (
              <div className="space-y-4 bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">New Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newAccount.email}
                      onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={newAccount.company}
                      onChange={(e) => setNewAccount({ ...newAccount, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Client Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold mr-3">
                  2
                </div>
                <h2 className="text-xl font-semibold">Clients & Link Requirements</h2>
              </div>
              <button
                onClick={addOrderGroup}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </button>
            </div>

            {orderGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No clients added yet</p>
                <button
                  onClick={addOrderGroup}
                  className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first client
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orderGroups.map((group, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <button
                            onClick={() => toggleGroupExpanded(index)}
                            className="mr-3 text-gray-400 hover:text-gray-600"
                          >
                            {expandedGroups.has(index) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex-1">
                              <select
                                value={group.clientId}
                                onChange={(e) => updateOrderGroup(index, { clientId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Client</option>
                                {clients.map((client) => (
                                  <option key={client.id} value={client.id}>
                                    {client.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-4 w-4 text-gray-400" />
                              <input
                                type="number"
                                min="1"
                                value={group.linkCount}
                                onChange={(e) => updateOrderGroup(index, { linkCount: parseInt(e.target.value) || 1 })}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-500">links</span>
                            </div>
                            
                            {group.client && (
                              <div className="text-sm text-gray-500">
                                <Globe className="h-4 w-4 inline mr-1" />
                                {group.client.website}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeOrderGroup(index)}
                          className="ml-4 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {expandedGroups.has(index) && group.client && (
                        <div className="mt-4 space-y-4 pt-4 border-t">
                          {/* Target Pages Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Target Pages
                            </label>
                            {group.client.targetPages && group.client.targetPages.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {group.client.targetPages
                                  .filter(page => page.status === 'active')
                                  .map((page) => (
                                    <label key={page.id} className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={group.targetPages.includes(page.id)}
                                        onChange={(e) => {
                                          const newTargetPages = e.target.checked
                                            ? [...group.targetPages, page.id]
                                            : group.targetPages.filter(id => id !== page.id);
                                          updateOrderGroup(index, { targetPages: newTargetPages });
                                        }}
                                        className="mt-1 mr-3"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{page.url}</div>
                                        {page.keywords && (
                                          <div className="text-xs text-gray-500">
                                            {page.keywords.split(',').length} keywords
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No target pages available for this client</p>
                            )}
                          </div>

                          {/* Requirements Override */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Settings className="h-4 w-4 inline mr-1" />
                              Requirements (Optional Overrides)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Min DR</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={group.requirements.minDR || ''}
                                  onChange={(e) => updateOrderGroup(index, {
                                    requirements: { ...group.requirements, minDR: parseInt(e.target.value) || undefined }
                                  })}
                                  placeholder={group.client.defaultRequirements?.minDR || '30'}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Min Traffic</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={group.requirements.minTraffic || ''}
                                  onChange={(e) => updateOrderGroup(index, {
                                    requirements: { ...group.requirements, minTraffic: parseInt(e.target.value) || undefined }
                                  })}
                                  placeholder={group.client.defaultRequirements?.minTraffic || '1000'}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Order Summary */}
            {orderGroups.length > 0 && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">Total Clients:</span>
                    <span className="ml-2 font-semibold">{orderGroups.length}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total Links:</span>
                    <span className="ml-2 font-semibold">{totalLinks}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Order Options */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold mr-3">
                3
              </div>
              <h2 className="text-xl font-semibold">Additional Options</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesClientReview}
                  onChange={(e) => setIncludesClientReview(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">Include Client Review</div>
                  <div className="text-sm text-gray-500">
                    Allow the account to review and approve content before publishing
                  </div>
                  <div className="text-sm font-medium text-green-600 mt-1">
                    +{formatCurrency(50000)}
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rushDelivery}
                  onChange={(e) => setRushDelivery(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center">
                    <Zap className="h-4 w-4 mr-1 text-orange-500" />
                    Rush Delivery
                  </div>
                  <div className="text-sm text-gray-500">
                    Prioritize this order for faster completion
                  </div>
                  <div className="text-sm font-medium text-orange-600 mt-1">
                    +{formatCurrency(100000)}
                  </div>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Optional)
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Any special instructions or notes for the team..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({totalLinks} links)</span>
                <span>{formatCurrency(pricing.subtotal)}</span>
              </div>
              
              {pricing.discountPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Volume Discount ({pricing.discountPercent}%)</span>
                  <span>-{formatCurrency(pricing.discountAmount)}</span>
                </div>
              )}
              
              {includesClientReview && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Client Review</span>
                  <span>{formatCurrency(pricing.clientReviewFee)}</span>
                </div>
              )}
              
              {rushDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rush Delivery</span>
                  <span>{formatCurrency(pricing.rushFee)}</span>
                </div>
              )}
              
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(pricing.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Estimated Profit Margin</span>
                  <span>{formatCurrency(pricing.profitMargin)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-lg flex items-start ${
              messageType === 'error' ? 'bg-red-50 text-red-800' :
              messageType === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {messageType === 'error' ? (
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              ) : messageType === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/orders')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            
            <button
              onClick={createOrder}
              disabled={saving || orderGroups.length === 0 || (!selectedAccount && !isNewAccount)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  Create Order
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}