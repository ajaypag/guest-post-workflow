'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, CheckSquare, Square, ChevronDown, ChevronUp, X, Database, TrendingUp, DollarSign, Tag } from 'lucide-react';
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
  
  // Filters
  const [filters, setFilters] = useState({
    minDR: undefined as number | undefined,
    maxDR: undefined as number | undefined,
    minTraffic: undefined as number | undefined,
    maxTraffic: undefined as number | undefined,
    maxCost: undefined as number | undefined,
    categories: [] as string[],
    qualificationStatus: 'unqualified' as 'all' | 'qualified' | 'unqualified'
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

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
          projectId,
          onlyUnqualified: filters.qualificationStatus === 'unqualified',
          onlyQualified: filters.qualificationStatus === 'qualified'
        })
      });

      const data = await response.json();
      
      if (reset) {
        setWebsites(data.websites || []);
        setPage(0);
      } else {
        setWebsites(prev => [...prev, ...(data.websites || [])]);
      }
      
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Failed to load websites:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, page, clientId, projectId]);

  // Initial load
  useEffect(() => {
    loadWebsites(true);
  }, []);

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

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search domains..."
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
                value={filters.maxCost || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  maxCost: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>

            {/* Qualification Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-2 py-1 border rounded text-sm"
                value={filters.qualificationStatus}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  qualificationStatus: e.target.value as any 
                }))}
              >
                <option value="all">All Websites</option>
                <option value="qualified">Qualified for Client</option>
                <option value="unqualified">Not Qualified</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setFilters({
                minDR: undefined,
                maxDR: undefined,
                minTraffic: undefined,
                maxTraffic: undefined,
                maxCost: undefined,
                categories: [],
                qualificationStatus: 'unqualified'
              })}
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
              Select all visible
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

      {/* Website Grid */}
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
          <div className="divide-y">
            {websites.map((website) => (
              <div
                key={website.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedIds.has(website.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => toggleSelection(website)}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    {selectedIds.has(website.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{website.domain}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">DR:</span> {website.domainRating || '-'}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {getTrafficDisplay(website.totalTraffic)}
                          </div>
                          {website.guestPostCost && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${website.guestPostCost}
                            </div>
                          )}
                        </div>
                      </div>
                      {website.categories.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {website.categories.slice(0, 2).join(', ')}
                            {website.categories.length > 2 && ` +${website.categories.length - 2}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="p-3 text-center border-t">
            <button
              onClick={() => {
                setPage(prev => prev + 1);
                loadWebsites(false);
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Load more websites
            </button>
          </div>
        )}
      </div>
    </div>
  );
}