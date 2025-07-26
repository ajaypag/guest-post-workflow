'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  XCircle, 
  AlertCircle,
  Globe,
  Search,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Loader2,
  KeyRound,
  BarChart3,
  Target,
  Brain,
  User,
  Clock
} from 'lucide-react';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { TargetPage } from '@/types/user';
import { groupKeywordsByTopic } from '@/lib/utils/keywordGroupingV2';

interface GuidedTriageFlowProps {
  domains: BulkAnalysisDomain[];
  targetPages: TargetPage[];
  onClose: () => void;
  onUpdateStatus: (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified', isManual?: boolean) => Promise<void>;
  onAnalyzeWithDataForSeo?: (domain: BulkAnalysisDomain) => Promise<void>;
  keywordInputMode: 'target-pages' | 'manual';
  manualKeywords?: string;
  userId: string;
}

interface DomainData {
  domain: BulkAnalysisDomain;
  keywords: string[];
  keywordGroups: Array<{
    name: string;
    keywords: string[];
    relevance: 'core' | 'related' | 'wider';
  }>;
  dataForSeoResults?: {
    totalRankings: number;
    avgPosition: number;
    allKeywords: Array<{
      keyword: string;
      position: number;
      searchVolume: number | null;
      url: string;
      cpc: number | null;
      competition: string | null;
    }>;
    hasMore: boolean;
  };
  aiQualification?: {
    status: string;
    reasoning: string;
  };
  targetPages: TargetPage[];
}

export default function GuidedTriageFlow(props: GuidedTriageFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [domainData, setDomainData] = useState<Record<string, DomainData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [loadingDataForSeo, setLoadingDataForSeo] = useState(false);
  
  // Use all domains passed in (already filtered by parent component)
  const reviewDomains = props.domains;
  const currentDomain = reviewDomains[currentIndex];
  const progress = ((currentIndex + 1) / reviewDomains.length) * 100;

  // Preload data for current and next domains
  useEffect(() => {
    if (!currentDomain) return;
    
    const loadDomainData = async (domain: BulkAnalysisDomain) => {
      if (domainData[domain.id]) return; // Already loaded
      
      setLoading(true);
      
      // Get keywords
      let keywords: string[] = [];
      if (props.keywordInputMode === 'manual' && props.manualKeywords) {
        keywords = props.manualKeywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      } else {
        const keywordSet = new Set<string>();
        props.targetPages
          .filter(p => domain.targetPageIds.includes(p.id))
          .forEach(page => {
            const pageKeywords = (page as any).keywords?.split(',').map((k: string) => k.trim()) || [];
            pageKeywords.forEach((k: string) => keywordSet.add(k));
          });
        keywords = Array.from(keywordSet);
      }
      
      // Group keywords
      const keywordGroups = groupKeywordsByTopic(keywords);
      
      // Load DataForSEO results if available - fetch ALL results
      let dataForSeoResults: DomainData['dataForSeoResults'] | undefined;
      if (domain.hasDataForSeoResults) {
        try {
          // Fetch all results with a larger limit
          const response = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/results?domainId=${domain.id}&limit=1000`);
          if (response.ok) {
            const data = await response.json();
            dataForSeoResults = {
              totalRankings: data.total || data.results.length,
              avgPosition: data.results.length > 0 ? 
                data.results.reduce((acc: number, r: any) => acc + r.position, 0) / data.results.length : 0,
              allKeywords: data.results.map((r: any) => ({
                keyword: r.keyword,
                position: r.position,
                searchVolume: r.searchVolume,
                url: r.url,
                cpc: r.cpc || null,
                competition: r.competition || null
              })),
              hasMore: data.hasMore || false
            };
          }
        } catch (error) {
          console.error('Failed to load DataForSEO results:', error);
        }
      }
      
      // Get AI qualification if available
      let aiQualification: DomainData['aiQualification'] | undefined;
      if (domain.aiQualificationReasoning) {
        aiQualification = {
          status: domain.qualificationStatus,
          reasoning: domain.aiQualificationReasoning
        };
      }
      
      // Get target pages for this domain
      const domainTargetPages = props.targetPages.filter(p => domain.targetPageIds.includes(p.id));
      
      setDomainData(prev => ({
        ...prev,
        [domain.id]: {
          domain,
          keywords,
          keywordGroups,
          dataForSeoResults,
          aiQualification,
          targetPages: domainTargetPages
        }
      }));
      
      setLoading(false);
    };
    
    // Load current domain
    loadDomainData(currentDomain);
    
    // Preload next domain
    if (currentIndex + 1 < reviewDomains.length) {
      loadDomainData(reviewDomains[currentIndex + 1]);
    }
  }, [currentIndex, currentDomain, domainData, reviewDomains, props]);

  const handleQualify = async (status: 'high_quality' | 'average_quality' | 'disqualified') => {
    if (!currentDomain) return;
    
    setSaving(true);
    try {
      // First save notes if any
      if (notes) {
        const noteResponse = await fetch(`/api/clients/${currentDomain.clientId}/bulk-analysis/${currentDomain.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: currentDomain.qualificationStatus, 
            userId: props.userId, 
            notes: notes 
          })
        });
        
        if (!noteResponse.ok) {
          console.error('Failed to save notes');
        }
      }
      
      // Then update status (isManual = true for guided flow)
      await props.onUpdateStatus(currentDomain.id, status, true);
      
      // Clear notes for next domain
      setNotes('');
      
      // Move to next domain
      if (currentIndex < reviewDomains.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All done!
        props.onClose();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSaving(false);
    }
  };

  const runDataForSeoAnalysis = async () => {
    if (!currentDomain) return;
    
    setLoadingDataForSeo(true);
    try {
      // Get manual keywords if in manual mode
      const manualKeywordArray = props.keywordInputMode === 'manual' && props.manualKeywords
        ? props.manualKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : undefined;
      
      const payload = {
        domainId: currentDomain.id,
        locationCode: 2840, // USA
        languageCode: 'en',
        ...(manualKeywordArray && { manualKeywords: manualKeywordArray })
      };
      
      const response = await fetch(`/api/clients/${currentDomain.clientId}/bulk-analysis/analyze-dataforseo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Wait a bit for the data to be saved
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch the updated results
        const resultsResponse = await fetch(
          `/api/clients/${currentDomain.clientId}/bulk-analysis/dataforseo/results?domainId=${currentDomain.id}&limit=1000`
        );
        
        if (resultsResponse.ok) {
          const data = await resultsResponse.json();
          
          // Update the domain data with the new results
          setDomainData(prev => ({
            ...prev,
            [currentDomain.id]: {
              ...prev[currentDomain.id],
              domain: { ...currentDomain, hasDataForSeoResults: true },
              dataForSeoResults: {
                totalRankings: data.total || data.results.length,
                avgPosition: data.results.length > 0 ? 
                  data.results.reduce((acc: number, r: any) => acc + r.position, 0) / data.results.length : 0,
                allKeywords: data.results.map((r: any) => ({
                  keyword: r.keyword,
                  position: r.position,
                  searchVolume: r.searchVolume,
                  url: r.url,
                  cpc: r.cpc || null,
                  competition: r.competition || null
                })),
                hasMore: data.hasMore || false
              }
            }
          }));
        }
      }
    } catch (error) {
      console.error('DataForSEO analysis error:', error);
    } finally {
      setLoadingDataForSeo(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (saving) return;
      
      switch (e.key) {
        case '1':
          e.preventDefault();
          handleQualify('high_quality');
          break;
        case '2':
          e.preventDefault();
          handleQualify('average_quality');
          break;
        case '3':
          e.preventDefault();
          handleQualify('disqualified');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setNotes('');
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < reviewDomains.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setNotes('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          props.onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, reviewDomains.length, saving]);

  if (!currentDomain) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">All Done!</h2>
          <p className="text-gray-600 mb-4">You've reviewed all domains in your current filter.</p>
          <button
            onClick={props.onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const data = domainData[currentDomain.id];

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={props.onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Domain Qualification</h1>
              <p className="text-sm text-gray-500">
                {currentIndex + 1} of {reviewDomains.length} domains
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                    setNotes('');
                  }
                }}
                disabled={currentIndex === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Previous (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (currentIndex < reviewDomains.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setNotes('');
                  }
                }}
                disabled={currentIndex === reviewDomains.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Next (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {loading || !data ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Domain Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-indigo-600" />
                  <div>
                    <h2 className="text-2xl font-bold">{currentDomain.domain}</h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {data.keywords.length} keywords
                      </span>
                      {currentDomain.aiQualificationReasoning && (
                        <span className="flex items-center gap-1">
                          <Brain className="w-4 h-4" />
                          AI Analyzed
                        </span>
                      )}
                      {currentDomain.wasManuallyQualified && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Human Modified
                        </span>
                      )}
                      {currentDomain.wasHumanVerified && (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Human Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Current Status Display */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Current Status</p>
                    <div className={`mt-1 px-4 py-2 rounded-lg text-sm font-medium ${
                      currentDomain.qualificationStatus === 'high_quality' ? 'bg-green-100 text-green-800' :
                      currentDomain.qualificationStatus === 'average_quality' ? 'bg-blue-100 text-blue-800' :
                      currentDomain.qualificationStatus === 'disqualified' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentDomain.qualificationStatus === 'high_quality' ? 'High Quality' :
                       currentDomain.qualificationStatus === 'average_quality' ? 'Average Quality' :
                       currentDomain.qualificationStatus === 'disqualified' ? 'Disqualified' :
                       'Pending Review'}
                    </div>
                  </div>
                  <a
                    href={`https://${currentDomain.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Visit Site
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Content Grid - DataForSEO Primary */}
            <div className="space-y-6">
              {/* DataForSEO Results - Primary Section */}
              {data.dataForSeoResults ? (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <BarChart3 className="w-6 h-6 text-indigo-600" />
                      DataForSEO Keyword Rankings
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Total Keywords:</span>
                        <span className="ml-2 font-semibold text-indigo-600">
                          {data.dataForSeoResults.totalRankings}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Avg Position:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          {data.dataForSeoResults.avgPosition.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Target Pages Info */}
                  {data.targetPages.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Target Pages</h4>
                      <div className="space-y-1">
                        {data.targetPages.map(page => (
                          <div key={page.id} className="text-sm text-blue-700">
                            • {page.url}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* All Keywords Table */}
                  <div className="overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-3 py-2">Keyword</th>
                            <th className="px-3 py-2 text-center">Position</th>
                            <th className="px-3 py-2 text-right">Volume</th>
                            <th className="px-3 py-2 text-right">CPC</th>
                            <th className="px-3 py-2">Competition</th>
                            <th className="px-3 py-2">URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {data.dataForSeoResults.allKeywords.map((kw, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm">{kw.keyword}</td>
                              <td className="px-3 py-2 text-sm text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                                  kw.position <= 3 ? 'bg-green-100 text-green-800' :
                                  kw.position <= 10 ? 'bg-blue-100 text-blue-800' :
                                  kw.position <= 20 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {kw.position}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-right">
                                {kw.searchVolume?.toLocaleString() || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-right">
                                {kw.cpc ? `$${kw.cpc.toFixed(2)}` : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {kw.competition && (
                                  <span className={`inline-flex px-2 py-1 text-xs rounded ${
                                    kw.competition === 'LOW' ? 'bg-green-100 text-green-800' :
                                    kw.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                    kw.competition === 'HIGH' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {kw.competition}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 truncate max-w-xs" title={kw.url}>
                                {kw.url.replace(/^https?:\/\/[^\/]+/, '')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {data.dataForSeoResults.hasMore && (
                      <div className="mt-3 text-center text-sm text-gray-500">
                        Showing {data.dataForSeoResults.allKeywords.length} of {data.dataForSeoResults.totalRankings} keywords
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-gray-400" />
                    DataForSEO Analysis
                  </h3>
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6">No keyword ranking data available yet</p>
                    {props.onAnalyzeWithDataForSeo && (
                      <button
                        onClick={runDataForSeoAnalysis}
                        disabled={loadingDataForSeo}
                        className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {loadingDataForSeo ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Run DataForSEO Analysis
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Secondary Row - Keywords and AI Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Keywords Analysis - Secondary */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Pre-Selected Keywords
                  </h3>
                  <div className="space-y-3">
                    {data.keywordGroups.slice(0, 2).map((group, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-700">{group.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            group.relevance === 'core' ? 'bg-green-100 text-green-700' :
                            group.relevance === 'related' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {group.relevance}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.keywords.slice(0, 5).map((keyword, kidx) => (
                            <span key={kidx} className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {keyword}
                            </span>
                          ))}
                          {group.keywords.length > 5 && (
                            <span className="text-xs text-gray-500">
                              +{group.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* AI Analysis - Secondary */}
                {data.aiQualification && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Reasoning
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                        {data.aiQualification.reasoning}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Add Notes (Optional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about your qualification decision..."
                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <p>Keyboard shortcuts:</p>
            <p>
              <span className="font-mono bg-gray-100 px-1 rounded">1</span> High Quality • 
              <span className="font-mono bg-gray-100 px-1 rounded ml-2">2</span> Average • 
              <span className="font-mono bg-gray-100 px-1 rounded ml-2">3</span> Disqualified • 
              <span className="font-mono bg-gray-100 px-1 rounded ml-2">←/→</span> Navigate
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQualify('disqualified')}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Disqualified
            </button>
            <button
              onClick={() => handleQualify('average_quality')}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              Average Quality
            </button>
            <button
              onClick={() => handleQualify('high_quality')}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-5 h-5 mr-2" />
              High Quality
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}