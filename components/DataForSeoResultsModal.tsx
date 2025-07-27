'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Search,
  TrendingUp,
  DollarSign,
  Target,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Database,
  RefreshCw,
} from 'lucide-react';

interface KeywordResult {
  keyword: string;
  position: number;
  searchVolume: number | null;
  url: string;
  cpc: number | null;
  competition: string | null;
  isFromCache?: boolean;
}

interface DataForSeoResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  domainId: string;
  clientId: string;
  initialResults?: KeywordResult[];
  totalFound: number;
  taskId?: string;
  cacheInfo?: {
    newKeywords: number;
    cachedKeywords: number;
    apiCallsSaved: number;
    daysSinceLastAnalysis: number | null;
  };
}

export default function DataForSeoResultsModal({
  isOpen,
  onClose,
  domain,
  domainId,
  clientId,
  initialResults = [],
  totalFound,
  taskId,
  cacheInfo,
}: DataForSeoResultsModalProps) {
  const [results, setResults] = useState<KeywordResult[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;

  // Store all fetched results for export
  const [allResults, setAllResults] = useState<KeywordResult[]>(initialResults);
  
  // Track the actual total from database
  const [actualTotal, setActualTotal] = useState(totalFound);

  useEffect(() => {
    if (isOpen && results.length === 0) {
      loadResults(1);
    }
  }, [isOpen]);

  const loadResults = async (page: number) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await fetch(
        `/api/clients/${clientId}/bulk-analysis/dataforseo/results?domainId=${domainId}&limit=${pageSize}&offset=${offset}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setResults(data.results);
          setAllResults(data.results);
          // Update actual total from database
          if (data.total !== undefined) {
            setActualTotal(data.total);
          }
        } else {
          setResults(prev => [...prev, ...data.results]);
          setAllResults(prev => [...prev, ...data.results]);
        }
        setHasMore(data.hasMore);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadResults(currentPage + 1);
    }
  };

  if (!isOpen) return null;

  // Filter only displayed results for performance
  const displayedResults = results.slice(0, currentPage * pageSize);
  const filteredResults = displayedResults.filter((result) => {
    // Search filter
    if (searchTerm && !result.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Position filter
    if (positionFilter !== 'all') {
      if (positionFilter === '1-10' && result.position > 10) return false;
      if (positionFilter === '11-20' && (result.position < 11 || result.position > 20)) return false;
      if (positionFilter === '21-50' && (result.position < 21 || result.position > 50)) return false;
      if (positionFilter === '50+' && result.position <= 50) return false;
    }

    return true;
  });

  const exportResults = async () => {
    // Export only filtered results from what's been loaded
    const exportData = allResults.filter((result) => {
      if (searchTerm && !result.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (positionFilter !== 'all') {
        if (positionFilter === '1-10' && result.position > 10) return false;
        if (positionFilter === '11-20' && (result.position < 11 || result.position > 20)) return false;
        if (positionFilter === '21-50' && (result.position < 21 || result.position > 50)) return false;
        if (positionFilter === '50+' && result.position <= 50) return false;
      }
      return true;
    });

    const csv = [
      ['Keyword', 'Position', 'Search Volume', 'URL', 'CPC', 'Competition'].join(','),
      ...exportData.map((r) =>
        [
          `"${r.keyword}"`,
          r.position,
          r.searchVolume || '',
          `"${r.url}"`,
          r.cpc ? r.cpc.toFixed(2) : '',
          r.competition || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}_keywords_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCompetitionBadge = (competition: string | null) => {
    if (!competition) return null;
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800',
      UNKNOWN: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[competition as keyof typeof colors]}`}>
        {competition}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">DataForSEO Analysis Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              {domain} • {actualTotal} ranking{actualTotal !== 1 ? 's' : ''} found
            </p>
            {taskId && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Task ID: {taskId}
              </p>
            )}
            {cacheInfo && (
              <div className="mt-2">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {(cacheInfo.newKeywords + cacheInfo.cachedKeywords)} keywords analyzed:
                  </span>
                  {cacheInfo.cachedKeywords > 0 && (
                    <span className="flex items-center">
                      <Database className="w-3 h-3 mr-1" />
                      {cacheInfo.cachedKeywords} from cache
                    </span>
                  )}
                  {cacheInfo.newKeywords > 0 && (
                    <span className="flex items-center">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {cacheInfo.newKeywords} new
                    </span>
                  )}
                  {cacheInfo.apiCallsSaved > 0 && (
                    <span className="text-green-600">
                      • {cacheInfo.apiCallsSaved} API call{cacheInfo.apiCallsSaved > 1 ? 's' : ''} saved
                    </span>
                  )}
                </div>
                {actualTotal === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ This domain doesn't rank in top 100 for any of the {cacheInfo.newKeywords + cacheInfo.cachedKeywords} keywords analyzed
                  </p>
                )}
                {actualTotal > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Found rankings for {actualTotal} out of {cacheInfo.newKeywords + cacheInfo.cachedKeywords} keywords analyzed
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Positions</option>
              <option value="1-10">Position 1-10</option>
              <option value="11-20">Position 11-20</option>
              <option value="21-50">Position 21-50</option>
              <option value="50+">Position 50+</option>
            </select>

            <button
              onClick={exportResults}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto">
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              {actualTotal === 0 ? (
                <div className="text-center max-w-md">
                  <div className="text-lg mb-2">No Rankings Found</div>
                  {cacheInfo && (
                    <div className="text-sm">
                      <p className="mb-2">
                        Analyzed {cacheInfo.newKeywords + cacheInfo.cachedKeywords} keywords
                      </p>
                      <p className="text-xs text-gray-400">
                        This domain doesn't rank in Google's top 100 results for any of these keywords
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-lg mb-2">No matches found</div>
                  <p className="text-sm text-gray-400">
                    Try adjusting your filters
                  </p>
                </div>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{result.keyword}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Target className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-900">{result.position}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {result.searchVolume !== null ? (
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {result.searchVolume.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {result.cpc ? (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-900">${result.cpc.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getCompetitionBadge(result.competition)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center truncate max-w-xs"
                      >
                        {result.url}
                        <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {result.isFromCache ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          <Database className="w-3 h-3 mr-1" />
                          Cached
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Fresh
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="p-4 text-center border-t">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Load More Results
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="p-4 text-center border-t">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
          </div>
        )}

        {/* Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Showing {filteredResults.length} of {actualTotal} ranking{actualTotal !== 1 ? 's' : ''}
              {results.length < actualTotal && (
                <span className="ml-1 text-xs">
                  ({results.length} loaded)
                </span>
              )}
            </span>
            <div className="flex gap-4 text-gray-600">
              <span>Avg Position: {
                filteredResults.length > 0 
                  ? (filteredResults.reduce((sum, r) => sum + r.position, 0) / filteredResults.length).toFixed(1)
                  : '-'
              }</span>
              <span>Total Volume: {
                filteredResults
                  .filter(r => r.searchVolume !== null)
                  .reduce((sum, r) => sum + (r.searchVolume || 0), 0)
                  .toLocaleString()
              }</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}