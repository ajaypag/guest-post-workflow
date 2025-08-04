'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  CheckCircle,
  XCircle,
  DollarSign,
  Globe,
  Users,
  Link2,
  Mail,
  TrendingUp,
  ChevronRight,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sessionStorage } from '@/lib/userStorage';
import { type AuthSession } from '@/lib/auth';
import { debounce } from 'lodash';
import WebsiteDetailModal from '@/components/websites/WebsiteDetailModal';
import QualificationModal from '@/components/websites/QualificationModal';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface Website {
  id: string;
  airtableId: string;
  domain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: number | null;
  categories: string[];
  type: string[];
  websiteType: string[]; // SaaS, Blog, News, eCommerce, etc.
  niche: string[]; // Multiple niches
  status: string;
  hasGuestPost: boolean;
  hasLinkInsert: boolean;
  publishedOpportunities: number;
  overallQuality: string | null;
  lastSyncedAt: string;
  airtableCreatedAt?: string;
  airtableUpdatedAt?: string;
  contacts: Array<{
    id: string;
    email: string;
    isPrimary: boolean;
    hasPaidGuestPost: boolean;
    hasSwapOption: boolean;
    guestPostCost: number | null;
    requirement: string | null;
  }>;
  qualification?: {
    qualifiedAt: string;
    qualifiedBy: string;
    status: string;
    notes: string | null;
  };
}

interface Filters {
  search: string;
  minDR?: number;
  maxDR?: number;
  minTraffic?: number;
  maxTraffic?: number;
  minCost?: number;
  maxCost?: number;
  categories: string[];
  hasGuestPost?: boolean;
  hasLinkInsert?: boolean;
  status?: string;
  qualificationStatus?: 'all' | 'qualified' | 'unqualified';
  clientId?: string;
  // Airtable metadata filters
  airtableUpdatedAfter?: string;
  airtableUpdatedBefore?: string;
  lastSyncedAfter?: string;
  lastSyncedBefore?: string;
}

function WebsitesPageContent() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedWebsites, setSelectedWebsites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    categories: [],
    qualificationStatus: 'all'
  });
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [selectedWebsiteDomain, setSelectedWebsiteDomain] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQualificationModal, setShowQualificationModal] = useState(false);

  // Load websites
  const loadWebsites = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/websites/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            searchTerm: filters.search,
            minDR: filters.minDR,
            maxDR: filters.maxDR,
            minTraffic: filters.minTraffic,
            maxTraffic: filters.maxTraffic,
            minCost: filters.minCost,
            maxCost: filters.maxCost,
            categories: filters.categories,
            hasGuestPost: filters.hasGuestPost,
            hasLinkInsert: filters.hasLinkInsert,
            status: filters.status,
            airtableUpdatedAfter: filters.airtableUpdatedAfter,
            airtableUpdatedBefore: filters.airtableUpdatedBefore,
            lastSyncedAfter: filters.lastSyncedAfter,
            lastSyncedBefore: filters.lastSyncedBefore
          },
          limit: 50,
          offset: page * 50,
          clientId: filters.clientId,
          onlyQualified: filters.qualificationStatus === 'qualified',
          onlyUnqualified: filters.qualificationStatus === 'unqualified'
        })
      });
      const data = await response.json();
      
      setWebsites(data.websites || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load websites:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // Load initial data
  useEffect(() => {
    setSession(sessionStorage.getSession());
  }, []);

  useEffect(() => {
    if (session) {
      loadWebsites();
      loadClients();
      loadCategories();
    }
  }, [session, loadWebsites]);

  // Handle indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = 
        selectedWebsites.size > 0 && selectedWebsites.size < websites.length;
    }
  }, [selectedWebsites, websites]);

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadCategories = async () => {
    try {
      // Get unique categories from all websites
      const response = await fetch('/api/websites/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {},
          limit: 1000,
          offset: 0
        })
      });
      const data = await response.json();
      const allCategories = new Set<string>();
      data.websites?.forEach((w: Website) => {
        w.categories?.forEach(cat => allCategories.add(cat));
      });
      setCategories(Array.from(allCategories).sort());
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to static list
      setCategories([
        'Technology', 'Marketing', 'Business', 'Finance', 'Health',
        'Travel', 'Fashion', 'Food', 'Sports', 'Entertainment'
      ]);
    }
  };

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((search: string) => {
      setFilters(prev => ({ ...prev, search }));
      setPage(0);
    }, 300),
    [setFilters, setPage]
  );

  const handleSelectAll = () => {
    if (selectedWebsites.size === websites.length) {
      setSelectedWebsites(new Set());
    } else {
      setSelectedWebsites(new Set(websites.map(w => w.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelection = new Set(selectedWebsites);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedWebsites(newSelection);
  };

  const getCostIndicator = (cost: number | null) => {
    if (!cost) return '-';
    if (cost <= 50) return '$';
    if (cost <= 150) return '$$';
    if (cost <= 300) return '$$$';
    return '$$$$';
  };

  const getTrafficDisplay = (traffic: number | null) => {
    if (!traffic) return '-';
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
    return traffic.toString();
  };

  const handleWebsiteClick = (websiteId: string, domain: string) => {
    setSelectedWebsiteId(websiteId);
    setSelectedWebsiteDomain(domain);
    setShowDetailModal(true);
  };

  const handleQualifyClick = (websiteId: string, domain: string) => {
    setSelectedWebsiteId(websiteId);
    setSelectedWebsiteDomain(domain);
    setShowQualificationModal(true);
  };

  const handleQualify = async (clientId: string, status: string, notes: string) => {
    const response = await fetch(`/api/websites/${selectedWebsiteId}/qualifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        status,
        notes,
        userId: session?.userId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save qualification');
    }

    // Reload websites to show updated qualification status
    loadWebsites();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Website Directory</h1>
          <p className="text-gray-600">
            Browse and manage {total.toLocaleString()} websites from your Airtable database
          </p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search domains..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                showFilters ? 'bg-gray-50 border-gray-300' : ''
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.keys(filters).filter(k => 
                k !== 'search' && k !== 'qualificationStatus' && 
                filters[k as keyof Filters] !== undefined
              ).length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {Object.keys(filters).filter(k => 
                    k !== 'search' && k !== 'qualificationStatus' && 
                    filters[k as keyof Filters] !== undefined
                  ).length}
                </span>
              )}
            </button>

            {/* Bulk Actions */}
            {selectedWebsites.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {selectedWebsites.size} selected
                </span>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Add to Project
                </button>
                <span className="text-gray-400">|</span>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Export
                </button>
                <span className="text-gray-400">|</span>
                <button 
                  onClick={() => setSelectedWebsites(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* DR Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Rating
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-1/2 px-3 py-1.5 border rounded text-sm"
                    value={filters.minDR || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minDR: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-1/2 px-3 py-1.5 border rounded text-sm"
                    value={filters.maxDR || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxDR: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              {/* Traffic Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Traffic
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-1/2 px-3 py-1.5 border rounded text-sm"
                    value={filters.minTraffic || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minTraffic: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-1/2 px-3 py-1.5 border rounded text-sm"
                    value={filters.maxTraffic || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxTraffic: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              {/* Cost Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Post Cost
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-1/2 px-3 py-1.5 border rounded text-sm"
                    value={filters.minCost || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minCost: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-1/2 px-3 py-1.5 border rounded text-sm"
                    value={filters.maxCost || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxCost: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              {/* Access Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Types
                </label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasGuestPost === true}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        hasGuestPost: e.target.checked ? true : undefined 
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm">Guest Post</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasLinkInsert === true}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        hasLinkInsert: e.target.checked ? true : undefined 
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm">Link Insert</span>
                  </label>
                </div>
              </div>

              {/* Qualification Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qualification Status
                </label>
                <select
                  className="w-full px-3 py-1.5 border rounded text-sm"
                  value={filters.qualificationStatus}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    qualificationStatus: e.target.value as any 
                  }))}
                >
                  <option value="all">All Websites</option>
                  <option value="qualified">Qualified Only</option>
                  <option value="unqualified">Never Qualified</option>
                </select>
              </div>

              {/* Client Filter */}
              {filters.qualificationStatus === 'qualified' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualified For Client
                  </label>
                  <select
                    className="w-full px-3 py-1.5 border rounded text-sm"
                    value={filters.clientId || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      clientId: e.target.value || undefined 
                    }))}
                  >
                    <option value="">All Clients</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Airtable Metadata Filters */}
          {showFilters && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Airtable Metadata Filters
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Airtable Updated Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Airtable Updated Date
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      placeholder="From"
                      className="w-1/2 px-3 py-1.5 border rounded text-sm"
                      value={filters.airtableUpdatedAfter || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        airtableUpdatedAfter: e.target.value || undefined 
                      }))}
                    />
                    <input
                      type="date"
                      placeholder="To"
                      className="w-1/2 px-3 py-1.5 border rounded text-sm"
                      value={filters.airtableUpdatedBefore || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        airtableUpdatedBefore: e.target.value || undefined 
                      }))}
                    />
                  </div>
                </div>

                {/* Last Synced Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Last Synced Date
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      placeholder="From"
                      className="w-1/2 px-3 py-1.5 border rounded text-sm"
                      value={filters.lastSyncedAfter || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        lastSyncedAfter: e.target.value || undefined 
                      }))}
                    />
                    <input
                      type="date"
                      placeholder="To"
                      className="w-1/2 px-3 py-1.5 border rounded text-sm"
                      value={filters.lastSyncedBefore || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        lastSyncedBefore: e.target.value || undefined 
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories */}
          {showFilters && categories.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {categories.map(category => (
                  <label key={category} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            categories: [...prev.categories, category] 
                          }));
                        } else {
                          setFilters(prev => ({ 
                            ...prev, 
                            categories: prev.categories.filter(c => c !== category) 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {showFilters && (
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setFilters({ 
                  search: filters.search, 
                  categories: [],
                  qualificationStatus: 'all' 
                })}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading websites...</p>
            </div>
          ) : websites.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No websites found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={selectedWebsites.size === websites.length && websites.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    DR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Traffic
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Access
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contacts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {websites.map((website) => (
                  <tr 
                    key={website.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedWebsites.has(website.id)}
                        onChange={() => handleSelect(website.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div 
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => handleWebsiteClick(website.id, website.domain)}
                      >
                        <div className="font-medium text-gray-900">
                          {website.domain}
                        </div>
                        {website.categories.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {website.categories.slice(0, 2).map((cat, i) => (
                              <span 
                                key={i}
                                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                              >
                                {cat}
                              </span>
                            ))}
                            {website.categories.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{website.categories.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {website.domainRating || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span>{getTrafficDisplay(website.totalTraffic)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">
                          {getCostIndicator(website.guestPostCost)}
                        </span>
                        {website.guestPostCost && (
                          <span className="text-sm text-gray-600">
                            ${website.guestPostCost}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {website.hasGuestPost && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            <CheckCircle className="w-3 h-3" />
                            GP
                          </span>
                        )}
                        {website.hasLinkInsert && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            <Link2 className="w-3 h-3" />
                            LI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {website.contacts.length}
                        </span>
                        {website.contacts.some(c => c.isPrimary) && (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {website.qualification ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          <CheckCircle className="w-3 h-3" />
                          Qualified
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!website.qualification && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQualifyClick(website.id, website.domain);
                            }}
                            className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            Qualify
                          </button>
                        )}
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {websites.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {page * 50 + 1} to {Math.min((page + 1) * 50, total)} of {total.toLocaleString()} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(0, prev - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={(page + 1) * 50 >= total}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Website Detail Modal */}
        {selectedWebsiteId && (
          <WebsiteDetailModal
            websiteId={selectedWebsiteId}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedWebsiteId(null);
            }}
            onQualify={(websiteId) => {
              setShowDetailModal(false);
              handleQualifyClick(websiteId, selectedWebsiteDomain);
            }}
          />
        )}

        {/* Qualification Modal */}
        {selectedWebsiteId && (
          <QualificationModal
            websiteId={selectedWebsiteId}
            websiteDomain={selectedWebsiteDomain}
            isOpen={showQualificationModal}
            onClose={() => {
              setShowQualificationModal(false);
              setSelectedWebsiteId(null);
            }}
            onQualify={handleQualify}
          />
        )}
      </div>
    </div>
  );
}

export default function WebsitesPage() {
  return (
    <AuthWrapper>
      <WebsitesPageContent />
    </AuthWrapper>
  );
}