'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Check,
  ChevronDown,
  ChevronRight,
  Globe
} from 'lucide-react';
import { sessionStorage } from '@/lib/userStorage';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  email: string;
  clientCount?: number;
}

interface Client {
  id: string;
  name: string;
  accountId: string;
  targetUrlCount?: number;
}

interface TargetUrl {
  url: string;
  type: 'original' | 'ai_suggested' | 'analyzed';
  clientId: string;
  clientName: string;
  usageCount: number;
  hasMatchData: boolean;
}

export default function NewVettedSitesRequestClient() {
  const router = useRouter();
  const [userType, setUserType] = useState<'internal' | 'account'>('internal');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [targetUrls, setTargetUrls] = useState<TargetUrl[]>([]);
  
  // Filter state
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  
  // Target URL selection state
  const [selectedTargetUrls, setSelectedTargetUrls] = useState<string[]>([]);
  const [targetUrlSearch, setTargetUrlSearch] = useState('');
  
  // Manual target URLs
  const [showAddUrls, setShowAddUrls] = useState(false);
  const [newTargetUrls, setNewTargetUrls] = useState('');
  
  // Filter dropdowns
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  
  // Preferences (optional)
  const [showPreferences, setShowPreferences] = useState(false);
  const [filters, setFilters] = useState({
    price_min: '',
    price_max: '',
    dr_min: '',
    dr_max: '',
    traffic_min: '',
  });
  
  // Filter dropdown states for preferences
  const [showDRFilter, setShowDRFilter] = useState(false);
  const [showTrafficFilter, setShowTrafficFilter] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Get user type from session
  useEffect(() => {
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType as 'internal' | 'account' || 'internal');
    }
    setSessionLoading(false);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load accounts for internal users
        if (userType === 'internal') {
          const accountsResponse = await fetch('/api/accounts');
          if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            setAccounts(accountsData.accounts || []);
          }
        }
        
        // Load clients
        const clientsResponse = await fetch('/api/clients');
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.clients || []);
        }
        
        // Load target URLs
        const targetUrlsResponse = await fetch('/api/vetted-sites/target-urls');
        if (targetUrlsResponse.ok) {
          const targetUrlsData = await targetUrlsResponse.json();
          setTargetUrls(targetUrlsData.targetUrls || []);
          console.log('Loaded target URLs:', targetUrlsData);
        } else {
          console.error('Failed to load target URLs:', targetUrlsResponse.status, await targetUrlsResponse.text());
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    if (!sessionLoading) {
      loadInitialData();
    }
  }, [userType, sessionLoading]);

  // Filtered accounts for dropdown
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const query = accountSearch.toLowerCase();
    return accounts.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.email.toLowerCase().includes(query)
    );
  }, [accounts, accountSearch]);

  // Filtered clients for dropdown
  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    // Filter by selected accounts
    if (selectedAccounts.length > 0) {
      filtered = filtered.filter(client =>
        selectedAccounts.includes(client.accountId)
      );
    }
    
    // Apply search filter
    if (clientSearch) {
      const query = clientSearch.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [clients, selectedAccounts, clientSearch]);

  // Filtered target URLs
  const filteredTargetUrls = useMemo(() => {
    let filtered = targetUrls;
    
    // Filter by selected clients
    if (selectedClients.length > 0) {
      filtered = filtered.filter(url =>
        selectedClients.includes(url.clientId)
      );
    }
    
    // Apply search filter
    if (targetUrlSearch) {
      const query = targetUrlSearch.toLowerCase();
      filtered = filtered.filter(url =>
        url.url.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [targetUrls, selectedClients, targetUrlSearch]);

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
    } else {
      setSelectedAccounts(prev => [...prev, accountId]);
    }
    setShowAccountDropdown(false);
    setAccountSearch('');
  };

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(prev => prev.filter(id => id !== clientId));
    } else {
      setSelectedClients(prev => [...prev, clientId]);
    }
    setShowClientDropdown(false);
    setClientSearch('');
  };

  // Handle add new URLs
  const handleAddUrls = async () => {
    if (!newTargetUrls.trim()) return;
    
    const urls = newTargetUrls.split('\n').filter(url => url.trim());
    
    // Process URLs and add to target URLs list
    const processedUrls = urls.map((url) => ({
      url: url.trim(),
      type: 'original' as const,
      clientId: 'new',
      clientName: 'New URLs',
      usageCount: 0,
      hasMatchData: false
    }));
    
    setTargetUrls(prev => [...prev, ...processedUrls]);
    setSelectedTargetUrls(prev => [...prev, ...processedUrls.map(url => url.url)]);
    setNewTargetUrls('');
    setShowAddUrls(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTargetUrls.length === 0) {
      alert('Please select at least one target URL');
      return;
    }
    
    setLoading(true);
    try {
      // Transform filters to match API expectations
      const transformedFilters = {
        dr_min: filters.dr_min ? parseInt(filters.dr_min) : undefined,
        dr_max: filters.dr_max ? parseInt(filters.dr_max) : undefined,
        traffic_min: filters.traffic_min ? parseInt(filters.traffic_min) : undefined,
        price_min: filters.price_min ? parseFloat(filters.price_min) * 100 : undefined, // Convert to cents
        price_max: filters.price_max ? parseFloat(filters.price_max) * 100 : undefined, // Convert to cents
        niches: (filters as any).niches || [],
        categories: (filters as any).categories || [],
        site_types: (filters as any).siteTypes || [],
      };

      const requestData = {
        target_urls: selectedTargetUrls, // Changed from targetUrls to target_urls
        filters: transformedFilters,
        notes: (filters as any).notes || ''
      };
      
      const response = await fetch('/api/vetted-sites/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        router.push('/vetted-sites/requests');
      } else {
        throw new Error('Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/vetted-sites/requests">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
              <h1 className="text-lg font-medium text-gray-900">New Vetted Sites Request</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit}>
          
          {/* One-liner explanation */}
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Select your target URLs to receive vetted website recommendations for guest posting
            </p>
          </div>

          {/* Main Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            
            {/* Inline Filters Bar */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                
                {/* Account Filter - Internal Users Only */}
                {userType === 'internal' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:border-gray-300 bg-white"
                    >
                      <span className="text-gray-700">
                        {selectedAccounts.length === 0 
                          ? 'All accounts' 
                          : selectedAccounts.length === 1
                          ? accounts.find(a => a.id === selectedAccounts[0])?.name
                          : `${selectedAccounts.length} accounts`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                    
                    {showAccountDropdown && (
                      <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
                        <div className="p-1.5 border-b border-gray-100">
                          <input
                            type="text"
                            value={accountSearch}
                            onChange={(e) => setAccountSearch(e.target.value)}
                            placeholder="Search accounts..."
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredAccounts.map(account => {
                            const isSelected = selectedAccounts.includes(account.id);
                            return (
                              <button
                                key={account.id}
                                type="button"
                                onClick={() => handleAccountSelect(account.id)}
                                className={`w-full px-2 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                                  isSelected ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-gray-900 truncate">{account.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{account.email}</div>
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brand/Client Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:border-gray-300 bg-white"
                  >
                    <span className="text-gray-700">
                      {selectedClients.length === 0 
                        ? userType === 'internal' ? 'All brands' : 'All brands'
                        : selectedClients.length === 1
                        ? clients.find(c => c.id === selectedClients[0])?.name
                        : `${selectedClients.length} brands`}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  
                  {showClientDropdown && (
                    <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
                      <div className="p-1.5 border-b border-gray-100">
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search brands..."
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredClients.map(client => {
                          const isSelected = selectedClients.includes(client.id);
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleClientSelect(client.id)}
                              className={`w-full px-2 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="text-xs font-medium text-gray-900 truncate">{client.name}</div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={targetUrlSearch}
                    onChange={(e) => setTargetUrlSearch(e.target.value)}
                    placeholder="Search your target URLs..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Add URLs Button */}
                <button
                  type="button"
                  onClick={() => setShowAddUrls(!showAddUrls)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add URLs
                </button>
              </div>
            </div>

            {/* Add URLs Section */}
            {showAddUrls && (
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
                <div className="text-sm font-medium text-gray-700 mb-1">Add New Target URLs</div>
                <div className="text-xs text-gray-600 mb-2">Enter one URL per line</div>
                <Textarea
                  placeholder="https://example.com/page1"
                  value={newTargetUrls}
                  onChange={(e) => setNewTargetUrls(e.target.value)}
                  rows={4}
                  className="text-sm mb-2"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddUrls}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add & Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUrls(false);
                      setNewTargetUrls('');
                    }}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Target URLs List */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">Target URLs</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedTargetUrls.length} selected
                  </Badge>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredTargetUrls.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                    No target URLs found
                  </div>
                ) : (
                  <div>
                    {filteredTargetUrls.map(targetUrl => {
                      const isSelected = selectedTargetUrls.includes(targetUrl.url);
                      const domain = (() => {
                        try {
                          return new URL(targetUrl.url).hostname.replace('www.', '');
                        } catch {
                          return targetUrl.url;
                        }
                      })();

                      return (
                        <div
                          key={targetUrl.url}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTargetUrls(prev => prev.filter(url => url !== targetUrl.url));
                            } else {
                              setSelectedTargetUrls(prev => [...prev, targetUrl.url]);
                            }
                          }}
                          className={`px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-all hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected 
                                    ? 'bg-blue-600 border-blue-600' 
                                    : 'border-gray-300'
                                }`}>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {targetUrl.url}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {domain}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="outline" className="text-xs">
                                {targetUrl.clientName}
                              </Badge>
                              {targetUrl.usageCount > 0 && (
                                <span className="text-xs text-gray-400">
                                  Used {targetUrl.usageCount} times
                                </span>
                              )}
                              {targetUrl.hasMatchData && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  Analysis data
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Optional Preferences */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setShowPreferences(!showPreferences)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${
                  showPreferences ? 'rotate-90' : ''
                }`} />
                Website Preferences (Optional)
              </button>

              {showPreferences && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex gap-3">
                    {/* DR Filter */}
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setShowDRFilter(!showDRFilter)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md hover:border-gray-300 transition-colors ${
                          (filters.dr_min || filters.dr_max) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className={`${(filters.dr_min || filters.dr_max) ? 'text-blue-700' : 'text-gray-700'}`}>
                          Domain Rating {(filters.dr_min || filters.dr_max) && `(${filters.dr_min || '0'}-${filters.dr_max || '100'})`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      {showDRFilter && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filters.dr_min}
                            onChange={(e) => setFilters(prev => ({ ...prev, dr_min: e.target.value }))}
                            className="w-1/2 px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filters.dr_max}
                            onChange={(e) => setFilters(prev => ({ ...prev, dr_max: e.target.value }))}
                            className="w-1/2 px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Traffic Filter */}
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setShowTrafficFilter(!showTrafficFilter)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md hover:border-gray-300 transition-colors ${
                          filters.traffic_min ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className={`${filters.traffic_min ? 'text-blue-700' : 'text-gray-700'}`}>
                          Traffic {filters.traffic_min && `(${filters.traffic_min}+)`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      {showTrafficFilter && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Min traffic"
                            value={filters.traffic_min}
                            onChange={(e) => setFilters(prev => ({ ...prev, traffic_min: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Price Filter */}
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setShowPriceFilter(!showPriceFilter)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md hover:border-gray-300 transition-colors ${
                          (filters.price_min || filters.price_max) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className={`${(filters.price_min || filters.price_max) ? 'text-blue-700' : 'text-gray-700'}`}>
                          Price {(filters.price_min || filters.price_max) && `($${filters.price_min || '0'}-$${filters.price_max || '∞'})`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      {showPriceFilter && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="number"
                            placeholder="Min $"
                            value={filters.price_min}
                            onChange={(e) => setFilters(prev => ({ ...prev, price_min: e.target.value }))}
                            className="w-1/2 px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Max $"
                            value={filters.price_max}
                            onChange={(e) => setFilters(prev => ({ ...prev, price_max: e.target.value }))}
                            className="w-1/2 px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <Button
                type="submit"
                disabled={loading || selectedTargetUrls.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Request...
                  </>
                ) : (
                  `Create Request (${selectedTargetUrls.length} URLs)`
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}