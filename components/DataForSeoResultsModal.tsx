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
} from 'lucide-react';

interface KeywordResult {
  keyword: string;
  position: number;
  searchVolume: number | null;
  url: string;
  cpc: number | null;
  competition: string | null;
}

interface DataForSeoResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  domainId: string;
  clientId: string;
  initialResults?: KeywordResult[];
  totalFound: number;
}

export default function DataForSeoResultsModal({
  isOpen,
  onClose,
  domain,
  domainId,
  clientId,
  initialResults = [],
  totalFound,
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
        } else {
          setResults(prev => [...prev, ...data.results]);
          setAllResults(prev => [...prev, ...data.results]);
        }
        setHasMore(data.results.length === pageSize);
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
          r.cpc || '',
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
              {domain} • {totalFound} keywords found
            </p>
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
            <div className="flex items-center justify-center h-64 text-gray-500">
              No results found
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
                          <span className="text-sm text-gray-900">${result.cpc}</span>
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
              Showing {filteredResults.length} of {results.length} loaded ({totalFound} total)
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