'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Search, ExternalLink, TrendingUp, DollarSign, Users } from 'lucide-react';

interface BulkAnalysisResult {
  domainId: string;
  domain: string;
  keywordsAnalyzed: number;
  rankingsFound: number;
  avgPosition: number;
  totalSearchVolume: number;
  avgCpc: number;
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    cpc: number;
    url: string;
  }>;
}

interface BulkAnalysisResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  domains: Array<{ id: string; domain: string }>;
}

export default function BulkAnalysisResultsModal({
  isOpen,
  onClose,
  jobId,
  domains
}: BulkAnalysisResultsModalProps) {
  const [results, setResults] = useState<BulkAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && jobId) {
      fetchResults();
    }
  }, [isOpen, jobId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bulk-analysis/results/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = async () => {
    try {
      const response = await fetch(`/api/bulk-analysis/results/${jobId}/export`);
      if (!response.ok) throw new Error('Failed to export results');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-analysis-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting results:', error);
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = !searchQuery || 
      result.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.topKeywords.some(k => k.keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDomain = !selectedDomain || result.domainId === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const totalMetrics = filteredResults.reduce((acc, result) => ({
    keywords: acc.keywords + result.keywordsAnalyzed,
    rankings: acc.rankings + result.rankingsFound,
    searchVolume: acc.searchVolume + result.totalSearchVolume,
    avgCpc: acc.avgCpc + result.avgCpc
  }), { keywords: 0, rankings: 0, searchVolume: 0, avgCpc: 0 });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Analysis Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyzed {filteredResults.length} domains
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export All Results
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Search className="w-4 h-4" />
                <span className="text-sm">Total Keywords</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalMetrics.keywords.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Rankings Found</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalMetrics.rankings.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Total Search Volume</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalMetrics.searchVolume.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Avg CPC</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${filteredResults.length > 0 ? (totalMetrics.avgCpc / filteredResults.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search domains or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select
            value={selectedDomain || ''}
            onChange={(e) => setSelectedDomain(e.target.value || null)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Domains</option>
            {domains.map(domain => (
              <option key={domain.id} value={domain.id}>{domain.domain}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No results found matching your criteria
            </div>
          ) : (
            <div className="space-y-6">
              {filteredResults.map((result) => (
                <div key={result.domainId} className="bg-white border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {result.domain}
                        <a
                          href={`https://${result.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </h3>
                      <div className="flex gap-6 mt-2 text-sm text-gray-600">
                        <span>Keywords: {result.keywordsAnalyzed}</span>
                        <span>Rankings: {result.rankingsFound}</span>
                        <span>Avg Position: {result.avgPosition?.toFixed(1) || '0.0'}</span>
                        <span>Total Volume: {result.totalSearchVolume?.toLocaleString() || '0'}</span>
                        <span>Avg CPC: ${result.avgCpc != null ? result.avgCpc.toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {result.topKeywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Top Keywords</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600 border-b">
                              <th className="pb-2 pr-4">Keyword</th>
                              <th className="pb-2 pr-4">Position</th>
                              <th className="pb-2 pr-4">Volume</th>
                              <th className="pb-2 pr-4">CPC</th>
                              <th className="pb-2">URL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.topKeywords.slice(0, 5).map((keyword, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2 pr-4">{keyword.keyword}</td>
                                <td className="py-2 pr-4">{keyword.position}</td>
                                <td className="py-2 pr-4">{keyword.searchVolume?.toLocaleString() || '-'}</td>
                                <td className="py-2 pr-4">${keyword.cpc?.toFixed(2) || '-'}</td>
                                <td className="py-2 text-gray-600 truncate max-w-xs" title={keyword.url}>
                                  {keyword.url}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {result.topKeywords.length > 5 && (
                        <p className="text-sm text-gray-500 mt-2">
                          And {result.topKeywords.length - 5} more keywords...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}