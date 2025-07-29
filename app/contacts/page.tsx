'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  CheckCircle,
  DollarSign,
  Globe,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sessionStorage } from '@/lib/userStorage';
import { type AuthSession } from '@/lib/auth';
import { debounce } from 'lodash';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface Contact {
  id: string;
  email: string;
  websiteId: string;
  websiteDomain: string;
  websiteCategories: string[];
  isPrimary: boolean;
  hasPaidGuestPost: boolean;
  hasSwapOption: boolean;
  guestPostCost: number | null;
  linkInsertCost: number | null;
  requirement: string | null;
  status: string;
  lastContacted: string | null;
  responseRate: number | null;
  averageResponseTime: number | null;
  notes: string | null;
}

interface ContactStats {
  totalContacts: number;
  primaryContacts: number;
  averageCost: number;
  swapAvailable: number;
  paidOnly: number;
  averageResponseRate: number;
}

interface Filters {
  search: string;
  isPrimary?: boolean;
  requirement?: string;
  minCost?: number;
  maxCost?: number;
  categories: string[];
  hasBeenContacted?: boolean;
}

function ContactsPageContent() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    categories: []
  });
  const [categories, setCategories] = useState<string[]>([]);

  // Load contacts
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            searchTerm: filters.search,
            isPrimary: filters.isPrimary,
            requirement: filters.requirement,
            minCost: filters.minCost,
            maxCost: filters.maxCost,
            categories: filters.categories,
            hasBeenContacted: filters.hasBeenContacted
          },
          limit: 50,
          offset: page * 50
        })
      });
      const data = await response.json();
      
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to load contacts:', error);
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
      loadContacts();
      loadCategories();
    }
  }, [session, loadContacts]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/websites/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((search: string) => {
      setFilters(prev => ({ ...prev, search }));
      setPage(0);
    }, 300),
    []
  );

  const getCostDisplay = (cost: number | null) => {
    if (!cost) return '-';
    return `$${cost}`;
  };

  const getResponseRateColor = (rate: number | null) => {
    if (!rate) return 'text-gray-500';
    if (rate >= 70) return 'text-green-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportContacts = async () => {
    try {
      const response = await fetch('/api/contacts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Failed to export contacts:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Contact Directory</h1>
          <p className="text-gray-600">
            View and analyze {total.toLocaleString()} contacts from your synced websites
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Contacts</p>
                  <p className="text-2xl font-semibold">{stats.totalContacts.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Primary Contacts</p>
                  <p className="text-2xl font-semibold">{stats.primaryContacts}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Cost</p>
                  <p className="text-2xl font-semibold">${stats.averageCost}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Swap Available</p>
                  <p className="text-2xl font-semibold">{stats.swapAvailable}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paid Only</p>
                  <p className="text-2xl font-semibold">{stats.paidOnly}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Response</p>
                  <p className="text-2xl font-semibold">{stats.averageResponseRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by email or website..."
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
                k !== 'search' && k !== 'categories' && 
                filters[k as keyof Filters] !== undefined
              ).length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {Object.keys(filters).filter(k => 
                    k !== 'search' && k !== 'categories' && 
                    filters[k as keyof Filters] !== undefined
                  ).length}
                </span>
              )}
            </button>

            {/* Export */}
            <button 
              onClick={exportContacts}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Contact Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type
                  </label>
                  <select
                    className="w-full px-3 py-1.5 border rounded text-sm"
                    value={filters.isPrimary === undefined ? 'all' : filters.isPrimary ? 'primary' : 'secondary'}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      isPrimary: e.target.value === 'all' ? undefined : e.target.value === 'primary'
                    }))}
                  >
                    <option value="all">All Contacts</option>
                    <option value="primary">Primary Only</option>
                    <option value="secondary">Secondary Only</option>
                  </select>
                </div>

                {/* Requirement Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requirement
                  </label>
                  <select
                    className="w-full px-3 py-1.5 border rounded text-sm"
                    value={filters.requirement || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      requirement: e.target.value || undefined
                    }))}
                  >
                    <option value="">All Types</option>
                    <option value="Paid">Paid Only</option>
                    <option value="Swap">Swap Available</option>
                    <option value="Both">Both Options</option>
                  </select>
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

                {/* Contact Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Status
                  </label>
                  <select
                    className="w-full px-3 py-1.5 border rounded text-sm"
                    value={filters.hasBeenContacted === undefined ? 'all' : filters.hasBeenContacted ? 'contacted' : 'not-contacted'}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      hasBeenContacted: e.target.value === 'all' ? undefined : e.target.value === 'contacted'
                    }))}
                  >
                    <option value="all">All Contacts</option>
                    <option value="contacted">Contacted</option>
                    <option value="not-contacted">Not Contacted</option>
                  </select>
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website Categories
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

              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => setFilters({ search: filters.search, categories: [] })}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No contacts found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Website
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Response Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {contact.email}
                          </span>
                          {contact.isPrimary && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.notes && (
                          <p className="text-sm text-gray-600 mt-1">{contact.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-1">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{contact.websiteDomain}</span>
                        </div>
                        {contact.websiteCategories.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {contact.websiteCategories.slice(0, 2).map((cat, i) => (
                              <span 
                                key={i}
                                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {contact.hasPaidGuestPost && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            <DollarSign className="w-3 h-3" />
                            Paid
                          </span>
                        )}
                        {contact.hasSwapOption && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            <Users className="w-3 h-3" />
                            Swap
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {contact.guestPostCost && (
                          <div className="text-sm">
                            <span className="text-gray-500">GP:</span> {getCostDisplay(contact.guestPostCost)}
                          </div>
                        )}
                        {contact.linkInsertCost && (
                          <div className="text-sm">
                            <span className="text-gray-500">LI:</span> {getCostDisplay(contact.linkInsertCost)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {contact.responseRate !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getResponseRateColor(contact.responseRate)}`}>
                            {contact.responseRate}%
                          </span>
                          {contact.averageResponseTime && (
                            <span className="text-sm text-gray-500">
                              ({contact.averageResponseTime}h avg)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {contact.lastContacted ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(contact.lastContacted).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                        contact.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {contacts.length > 0 && (
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
      </div>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <AuthWrapper>
      <ContactsPageContent />
    </AuthWrapper>
  );
}