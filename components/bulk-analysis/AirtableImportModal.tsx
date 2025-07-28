'use client';

import { useState, useEffect } from 'react';
import { X, Search, Filter, Database, CheckSquare, Square, Loader2, AlertCircle } from 'lucide-react';
import { ProcessedWebsite, WebsiteFilters } from '@/types/airtable';

interface AirtableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (websites: ProcessedWebsite[]) => void;
  clientId: string;
  projectId: string;
}

export default function AirtableImportModal({
  isOpen,
  onClose,
  onImport,
  clientId,
  projectId
}: AirtableImportModalProps) {
  // Filter state
  const [filters, setFilters] = useState<WebsiteFilters>({
    minDR: 30,
    minTraffic: 1000,
    status: 'Active',
    hasGuestPost: true
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websites, setWebsites] = useState<ProcessedWebsite[]>([]);
  const [selectedWebsites, setSelectedWebsites] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  
  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<string | undefined>();

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      searchWebsites();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/airtable/websites/search', {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const searchWebsites = async (append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/airtable/websites/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            ...filters,
            searchTerm: searchTerm || undefined
          },
          limit: 50,
          offset: append ? nextOffset : undefined,
          includeEnhancedData: false // For faster initial load
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search websites');
      }

      const data = await response.json();
      
      if (append) {
        setWebsites(prev => [...prev, ...data.websites]);
      } else {
        setWebsites(data.websites);
      }
      
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (error: any) {
      setError(error.message || 'Failed to load websites');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<WebsiteFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const toggleWebsiteSelection = (websiteId: string) => {
    setSelectedWebsites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(websiteId)) {
        newSet.delete(websiteId);
      } else {
        newSet.add(websiteId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedWebsites.size === websites.length) {
      setSelectedWebsites(new Set());
    } else {
      setSelectedWebsites(new Set(websites.map(w => w.id)));
    }
  };

  const handleImport = () => {
    const selected = websites.filter(w => selectedWebsites.has(w.id));
    onImport(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-6xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Import from Airtable</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchWebsites()}
              placeholder="Search by domain name..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* DR Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Domain Rating
                  </label>
                  <input
                    type="number"
                    value={filters.minDR || ''}
                    onChange={(e) => handleFilterChange({ minDR: parseInt(e.target.value) || undefined })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                
                {/* Traffic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Traffic
                  </label>
                  <input
                    type="number"
                    value={filters.minTraffic || ''}
                    onChange={(e) => handleFilterChange({ minTraffic: parseInt(e.target.value) || undefined })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                
                {/* Max Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Cost ($)
                  </label>
                  <input
                    type="number"
                    value={filters.maxCost || ''}
                    onChange={(e) => handleFilterChange({ maxCost: parseInt(e.target.value) || undefined })}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status || 'All'}
                    onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="All">All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                
                {/* Categories */}
                {categories.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categories
                    </label>
                    <select
                      multiple
                      value={filters.categories || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        handleFilterChange({ categories: selected });
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                      size={4}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Apply Filters Button */}
                <div className="col-span-2 md:col-span-4 flex justify-end">
                  <button
                    onClick={() => searchWebsites()}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Results */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">
                {loading ? 'Loading...' : `Found ${websites.length} websites`}
              </h3>
              {websites.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {selectedWebsites.size === websites.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            
            {/* Website List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {loading && websites.length === 0 ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-gray-500">Searching Airtable...</p>
                  </div>
                ) : websites.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No websites found matching your filters
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DR
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Traffic
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categories
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opportunities
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {websites.map((website) => (
                        <tr
                          key={website.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedWebsites.has(website.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => toggleWebsiteSelection(website.id)}
                        >
                          <td className="px-4 py-3">
                            {selectedWebsites.has(website.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {website.domain}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {website.domainRating || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {website.totalTraffic ? website.totalTraffic.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {website.guestPostCost ? `$${website.guestPostCost}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {website.categories.slice(0, 2).map((cat, i) => (
                                <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {cat}
                                </span>
                              ))}
                              {website.categories.length > 2 && (
                                <span className="text-xs text-gray-400">
                                  +{website.categories.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {website.publishedOpportunities}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Load More */}
              {hasMore && !loading && (
                <div className="p-3 text-center border-t">
                  <button
                    onClick={() => searchWebsites(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedWebsites.size} websites selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedWebsites.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedWebsites.size > 0 && `(${selectedWebsites.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}