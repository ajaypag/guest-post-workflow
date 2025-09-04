'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Database, TrendingUp, DollarSign } from 'lucide-react';
import { ProcessedWebsite } from '@/types/airtable';
import { debounce } from 'lodash';

interface InlineDatabaseSelectorProps {
  clientId: string;
  projectId: string;
  selectedWebsites: ProcessedWebsite[];
  onSelectionChange: (websites: ProcessedWebsite[]) => void;
}

export default function InlineDatabaseSelector({
  clientId,
  projectId,
  selectedWebsites,
  onSelectionChange
}: InlineDatabaseSelectorProps) {
  const [websites, setWebsites] = useState<ProcessedWebsite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(selectedWebsites.map(w => w.id))
  );
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableNiches, setAvailableNiches] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Map<string, number>>(new Map());
  const [nicheCounts, setNicheCounts] = useState<Map<string, number>>(new Map());
  const [categorySearch, setCategorySearch] = useState('');
  const [nicheSearch, setNicheSearch] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    minDR: undefined as number | undefined,
    maxDR: undefined as number | undefined,
    minTraffic: undefined as number | undefined,
    maxTraffic: undefined as number | undefined,
    maxCost: undefined as number | undefined,
    categories: [] as string[],
    niches: [] as string[],
    hasOfferings: undefined as boolean | undefined
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Load websites
  const loadWebsites = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/websites/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            searchTerm: searchTerm || undefined,
            ...filters,
            status: 'Active'
          },
          limit: pageSize,
          offset: reset ? 0 : page * pageSize,
          clientId,
          projectId
        })
      });

      const data = await response.json();
      
      setWebsites(data.websites || []);
      setTotal(data.total || 0);
      
      if (reset) {
        setPage(0);
      }
    } catch (error) {
      console.error('Failed to load websites:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, page, pageSize, clientId, projectId]);

  // Load categories and niches with counts
  const loadCategoriesAndNiches = useCallback(async () => {
    try {
      // Get unique categories and niches with counts from all websites
      const categoryCount = new Map<string, number>();
      const nicheCount = new Map<string, number>();
      
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
      
      data.websites?.forEach((w: ProcessedWebsite) => {
        w.categories?.forEach(cat => {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        });
        w.niche?.forEach(niche => {
          nicheCount.set(niche, (nicheCount.get(niche) || 0) + 1);
        });
      });
      
      // Sort by count (descending) then by name
      const categoriesWithCounts = Array.from(categoryCount.entries())
        .sort(([aName, aCount], [bName, bCount]) => {
          if (bCount !== aCount) return bCount - aCount;
          return aName.localeCompare(bName);
        })
        .map(([name]) => name);
        
      const nichesWithCounts = Array.from(nicheCount.entries())
        .sort(([aName, aCount], [bName, bCount]) => {
          if (bCount !== aCount) return bCount - aCount;
          return aName.localeCompare(bName);
        })
        .map(([name]) => name);
      
      setAvailableCategories(categoriesWithCounts);
      setAvailableNiches(nichesWithCounts);
      
      // Store the counts for display
      setCategoryCounts(categoryCount);
      setNicheCounts(nicheCount);
    } catch (error) {
      console.error('Failed to load categories and niches:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadWebsites(true);
    loadCategoriesAndNiches();
  }, []);

  // Load when page changes
  useEffect(() => {
    if (page > 0) {
      loadWebsites();
    }
  }, [page, loadWebsites]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
      setPage(0);
      loadWebsites(true);
    }, 300),
    [loadWebsites]
  );

  // Apply filters
  const applyFilters = () => {
    setPage(0);
    loadWebsites(true);
  };

  // Toggle selection
  const toggleSelection = (website: ProcessedWebsite) => {
    const newSelectedIds = new Set(selectedIds);
    const newSelectedWebsites = [...selectedWebsites];
    
    if (newSelectedIds.has(website.id)) {
      newSelectedIds.delete(website.id);
      const index = newSelectedWebsites.findIndex(w => w.id === website.id);
      if (index > -1) newSelectedWebsites.splice(index, 1);
    } else {
      newSelectedIds.add(website.id);
      newSelectedWebsites.push(website);
    }
    
    setSelectedIds(newSelectedIds);
    onSelectionChange(newSelectedWebsites);
  };

  // Select all visible
  const selectAllVisible = () => {
    const newSelectedIds = new Set(selectedIds);
    const newSelectedWebsites = [...selectedWebsites];
    
    websites.forEach(website => {
      if (!newSelectedIds.has(website.id)) {
        newSelectedIds.add(website.id);
        newSelectedWebsites.push(website);
      }
    });
    
    setSelectedIds(newSelectedIds);
    onSelectionChange(newSelectedWebsites);
  };

  // Select all matching filters
  const selectAllMatching = async () => {
    setLoading(true);
    try {
      // Fetch ALL websites matching current filters (not just current page)
      const response = await fetch('/api/websites/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            searchTerm: searchTerm || undefined,
            ...filters,
            status: 'Active'
          },
          limit: 10000, // Get all matching websites
          offset: 0,
          clientId,
          projectId
        })
      });

      const data = await response.json();
      const allMatchingWebsites = data.websites || [];
      
      // Update selection
      const newSelectedIds = new Set(selectedIds);
      const newSelectedWebsites = [...selectedWebsites];
      
      allMatchingWebsites.forEach((website: ProcessedWebsite) => {
        if (!newSelectedIds.has(website.id)) {
          newSelectedIds.add(website.id);
          newSelectedWebsites.push(website);
        }
      });
      
      setSelectedIds(newSelectedIds);
      onSelectionChange(newSelectedWebsites);
      
      // Show a message about how many were selected
      if (allMatchingWebsites.length > 0) {
        alert(`Selected all ${allMatchingWebsites.length} websites matching current filters`);
      }
    } catch (error) {
      console.error('Failed to select all matching websites:', error);
      alert('Failed to select all matching websites');
    } finally {
      setLoading(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    onSelectionChange([]);
  };

  const getTrafficDisplay = (traffic: number | null) => {
    if (!traffic) return '-';
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
    return traffic.toString();
  };

  // Helper function to check if text matches search term
  const isMatchingSearch = (text: string) => {
    if (!searchTerm) return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Helper function to get highlight class
  const getHighlightClass = (isMatch: boolean) => {
    return isMatch ? 'bg-yellow-100' : '';
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search domains, categories, or niches..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50 ${
            showFilters ? 'bg-gray-50 border-gray-300' : ''
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* DR Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain Rating</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={filters.minDR || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minDR: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Traffic</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={filters.minTraffic || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minTraffic: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={filters.maxTraffic || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    maxTraffic: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
              </div>
            </div>

            {/* Max Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Cost ($)</label>
              <input
                type="number"
                placeholder="No limit"
                className="w-full px-2 py-1 border rounded text-sm"
                value={filters.maxCost ? filters.maxCost / 100 : ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  maxCost: e.target.value ? parseInt(e.target.value) * 100 : undefined // Convert dollars to cents
                }))}
              />
            </div>

            {/* Has Offerings Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offerings</label>
              <select
                className="w-full px-2 py-1 border rounded text-sm"
                value={filters.hasOfferings === undefined ? 'all' : filters.hasOfferings ? 'with' : 'without'}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  hasOfferings: e.target.value === 'all' ? undefined : e.target.value === 'with' 
                }))}
              >
                <option value="all">All Websites</option>
                <option value="with">Has Offerings</option>
                <option value="without">No Offerings</option>
              </select>
            </div>
          </div>

          {/* Categories */}
          {availableCategories.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Filter categories..."
                  className="w-full px-3 py-1.5 border rounded text-sm"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {availableCategories
                  .filter(category => category.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map(category => (
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
                    <span className="text-sm text-gray-700">
                      {category}
                      <span className="ml-1 text-xs text-gray-500">
                        ({categoryCounts.get(category) || 0})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Niches */}
          {availableNiches.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Niches</label>
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Filter niches..."
                  className="w-full px-3 py-1.5 border rounded text-sm"
                  value={nicheSearch}
                  onChange={(e) => setNicheSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {availableNiches
                  .filter(niche => niche.toLowerCase().includes(nicheSearch.toLowerCase()))
                  .map(niche => (
                  <label key={niche} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={filters.niches.includes(niche)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            niches: [...prev.niches, niche] 
                          }));
                        } else {
                          setFilters(prev => ({ 
                            ...prev, 
                            niches: prev.niches.filter(n => n !== niche) 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      {niche}
                      <span className="ml-1 text-xs text-gray-500">
                        ({nicheCounts.get(niche) || 0})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => {
                setFilters({
                  minDR: undefined,
                  maxDR: undefined,
                  minTraffic: undefined,
                  maxTraffic: undefined,
                  maxCost: undefined,
                  categories: [],
                  niches: [],
                  hasOfferings: undefined
                });
                setCategorySearch('');
                setNicheSearch('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear filters
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              {selectedIds.size} website{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllVisible}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select visible ({websites.length})
            </button>
            <button
              onClick={selectAllMatching}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              disabled={loading}
            >
              {loading ? 'Loading...' : `Select all matching (${total})`}
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Website Table */}
      <div className="border rounded-lg overflow-hidden">
        {loading && websites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Loading websites...
          </div>
        ) : websites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No websites found matching your criteria
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={websites.length > 0 && websites.every(w => selectedIds.has(w.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAllVisible();
                      } else {
                        // Clear only visible websites from selection
                        const newSelectedIds = new Set(selectedIds);
                        const newSelectedWebsites = selectedWebsites.filter(w => 
                          !websites.some(vw => vw.id === w.id)
                        );
                        websites.forEach(w => newSelectedIds.delete(w.id));
                        setSelectedIds(newSelectedIds);
                        onSelectionChange(newSelectedWebsites);
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DR
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traffic
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Niches
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offerings
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {websites.map((website) => (
                <tr 
                  key={website.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedIds.has(website.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleSelection(website)}
                >
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(website.id)}
                      onChange={() => toggleSelection(website)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className={`text-sm font-medium text-gray-900 ${getHighlightClass(isMatchingSearch(website.domain))} px-1 rounded`}>
                      {website.domain}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {website.domainRating || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <TrendingUp className="w-4 h-4 text-gray-400 mr-1" />
                      {getTrafficDisplay(website.totalTraffic)}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {website.guestPostCost ? (
                        <span className="flex items-center">
                          <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                          ${(website.guestPostCost / 100).toFixed(2)}
                        </span>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {website.categories.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {website.categories.slice(0, 2).map((cat, i) => (
                            <span 
                              key={i}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                isMatchingSearch(cat) ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
                              }`}
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
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {website.niche && website.niche.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {website.niche.slice(0, 2).map((n, i) => (
                            <span 
                              key={i}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                isMatchingSearch(n) ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {n}
                            </span>
                          ))}
                          {website.niche.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{website.niche.length - 2}
                            </span>
                          )}
                        </div>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {website.offeringsCount || 0}
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
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()} results
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Show:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value));
                      setPage(0);
                      loadWebsites(true);
                    }}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPage(prev => Math.max(0, prev - 1));
                      loadWebsites();
                    }}
                    disabled={page === 0}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      setPage(prev => prev + 1);
                      loadWebsites();
                    }}
                    disabled={(page + 1) * pageSize >= total}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}