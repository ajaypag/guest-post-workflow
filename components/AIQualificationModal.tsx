'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface QualificationResult {
  domainId: string;
  domain: string;
  qualification: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified';
  reasoning: string;
  // V2 fields - optional for UI display
  overlapStatus?: 'direct' | 'related' | 'both' | 'none';
  authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
  authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
  topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
  evidence?: {
    direct_count: number;
    direct_median_position: number | null;
    related_count: number;
    related_median_position: number | null;
  };
}

interface AIQualificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  domains: Array<{ id: string; domain: string }>;
  onComplete: (results: QualificationResult[]) => void;
}

export default function AIQualificationModal({
  isOpen,
  onClose,
  clientId,
  domains,
  onComplete
}: AIQualificationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<QualificationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  const startQualification = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/bulk-analysis/ai-qualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds: domains.map(d => d.id)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run AI qualification');
      }

      const data = await response.json();
      setResults(data.qualifications);
      
      // Auto-select all high quality domains
      const highQuality = new Set<string>(
        data.qualifications
          .filter((q: QualificationResult) => q.qualification === 'high_quality')
          .map((q: QualificationResult) => q.domainId)
      );
      setSelectedResults(highQuality);

    } catch (err: any) {
      console.error('AI qualification error:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyResults = () => {
    const selectedQualifications = results.filter(r => selectedResults.has(r.domainId));
    onComplete(selectedQualifications);
    onClose();
  };

  const getQualificationIcon = (qualification: string) => {
    switch (qualification) {
      case 'high_quality':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good_quality':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'marginal_quality':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'disqualified':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getQualificationBadge = (qualification: string) => {
    switch (qualification) {
      case 'high_quality':
        return 'bg-green-100 text-green-800';
      case 'good_quality':
        return 'bg-blue-100 text-blue-800';
      case 'marginal_quality':
        return 'bg-yellow-100 text-yellow-800';
      case 'disqualified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Site Qualification
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Use O3 AI to analyze and qualify {domains.length} domains based on topical relevance
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isProcessing && results.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                The AI will analyze each domain's SEO metrics and qualify them as high quality, 
                average quality, or disqualified for guest posting.
              </p>
              <button
                onClick={startQualification}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Start AI Analysis
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Analyzing Domains...</h3>
              <p className="text-gray-600">
                O3 is evaluating SEO metrics and qualifying {domains.length} domains
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">
                    {results.filter(r => r.qualification === 'high_quality').length}
                  </div>
                  <div className="text-sm text-green-600">High Quality</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-800">
                    {results.filter(r => r.qualification === 'good_quality').length}
                  </div>
                  <div className="text-sm text-blue-600">Good Quality</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-800">
                    {results.filter(r => r.qualification === 'marginal_quality').length}
                  </div>
                  <div className="text-sm text-yellow-600">Marginal Quality</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-800">
                    {results.filter(r => r.qualification === 'disqualified').length}
                  </div>
                  <div className="text-sm text-red-600">Disqualified</div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.domainId}
                    className={`border rounded-lg p-4 ${
                      selectedResults.has(result.domainId) ? 'border-purple-300 bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(result.domainId)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedResults);
                          if (e.target.checked) {
                            newSelected.add(result.domainId);
                          } else {
                            newSelected.delete(result.domainId);
                          }
                          setSelectedResults(newSelected);
                        }}
                        className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getQualificationIcon(result.qualification)}
                          <h4 className="font-medium">{result.domain}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getQualificationBadge(result.qualification)}`}>
                            {result.qualification.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700">{result.reasoning}</p>
                        
                        {/* V2 Fields Display */}
                        {result.overlapStatus && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              Overlap: {result.overlapStatus}
                            </span>
                            {result.authorityDirect !== 'n/a' && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                Direct Auth: {result.authorityDirect}
                              </span>
                            )}
                            {result.authorityRelated !== 'n/a' && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                Related Auth: {result.authorityRelated}
                              </span>
                            )}
                            {result.topicScope && (
                              <span className="px-2 py-1 bg-purple-100 rounded">
                                Topic: {result.topicScope.replace('_', ' ')}
                              </span>
                            )}
                            {result.evidence && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                Evidence: {result.evidence.direct_count + result.evidence.related_count} keywords
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedResults.size} domains selected for qualification update
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={applyResults}
                  disabled={selectedResults.size === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Selected Qualifications
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}