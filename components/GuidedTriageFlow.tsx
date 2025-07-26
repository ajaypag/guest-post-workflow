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
  const [keywordSearch, setKeywordSearch] = useState('');
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [showFullAiReasoning, setShowFullAiReasoning] = useState(false);
  const [smartFilters, setSmartFilters] = useState<string[]>([]);
  
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
      
      // Always check for existing DataForSEO results
      let dataForSeoResults: DomainData['dataForSeoResults'] | undefined;
      try {
        // Always fetch to see if there's existing data
        const response = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/results?domainId=${domain.id}&limit=1000`);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
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
            // Update the domain's hasDataForSeoResults flag if needed
            if (!domain.hasDataForSeoResults) {
              domain.hasDataForSeoResults = true;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load DataForSEO results:', error);
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
      
      // Extract smart filters from keywords
      const extractSmartFilters = (keywords: string[]) => {
        const wordFrequency: Record<string, number> = {};
        const stopWords = ['with', 'from', 'that', 'this', 'what', 'when', 'where', 'which', 'your', 'have', 'will', 'been', 'being', 'does', 'doing', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'the', 'and', 'for', 'are', 'was', 'were', 'has', 'had', 'did'];
        keywords.forEach(keyword => {
          const words = keyword.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 2 && !stopWords.includes(word)) {
              wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
          });
        });
        // Get top 20 most common words
        return Object.entries(wordFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20)
          .map(([word]) => word);
      };
      
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
      
      // Set smart filters for this domain
      if (keywords.length > 0) {
        setSmartFilters(extractSmartFilters(keywords));
      }
      
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
        // Reset states for new domain
        setKeywordSearch('');
        setSelectedTargetPages([]);
        setShowFullAiReasoning(false);
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

      {/* Main Content - Full Width */}
      <div className="flex-1 overflow-hidden">
        {loading || !data ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="px-4 py-4 h-full flex flex-col">
            {/* Domain Header - Compact */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold">{currentDomain.domain}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
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

            {/* Two Column Layout */}
            <div className="flex-1 flex gap-6 overflow-hidden">
              {/* Left Column - Keywords (Primary) */}
              <div className="flex-1 overflow-hidden">
                {data.dataForSeoResults ? (
                  <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-indigo-600" />
                          DataForSEO Keyword Rankings
                        </h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-600">
                            <span className="font-semibold text-indigo-600">{data.dataForSeoResults.totalRankings}</span> keywords
                          </span>
                          <span className="text-gray-600">
                            Avg: <span className="font-semibold text-green-600">{data.dataForSeoResults.avgPosition.toFixed(1)}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Search and Filters */}
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search keywords..."
                            value={keywordSearch}
                            onChange={(e) => setKeywordSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Smart Filters - Clickable Keywords */}
                      {data.keywords.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">Keywords analyzed:</span>
                            <span className="text-xs text-gray-400">({data.keywords.length} total)</span>
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {data.keywords.map((keyword, idx) => (
                              <button
                                key={idx}
                                onClick={() => setKeywordSearch(keyword)}
                                className="px-2 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
                                title="Click to filter DataForSEO results"
                              >
                                {keyword}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Keywords Table */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-3 py-2">Keyword</th>
                            <th className="px-3 py-2 text-center">Pos</th>
                            <th className="px-3 py-2 text-right">Vol</th>
                            <th className="px-3 py-2 text-right">CPC</th>
                            <th className="px-3 py-2">Comp</th>
                            <th className="px-3 py-2">URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {data.dataForSeoResults.allKeywords
                            .filter(kw => !keywordSearch || kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase()))
                            .map((kw, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm">{kw.keyword}</td>
                              <td className="px-3 py-2 text-sm text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
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
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        DataForSEO Keyword Rankings
                      </h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center py-12">
                        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No keyword ranking data found</p>
                        <p className="text-sm text-gray-400 mb-6">
                          {data.keywords.length > 0 
                            ? `Analyze ${data.keywords.length} keywords to see rankings`
                            : 'No keywords selected for analysis'
                          }
                        </p>
                        {props.onAnalyzeWithDataForSeo && data.keywords.length > 0 && (
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
                                Analyze Keywords
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column - Metadata */}
              <div className="w-96 space-y-4 overflow-y-auto">
                {/* Target Pages Selection */}
                {data.targetPages.length > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Target Pages
                    </h3>
                    <div className="space-y-2">
                      {data.targetPages.map(page => (
                        <label key={page.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTargetPages.includes(page.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTargetPages([...selectedTargetPages, page.id]);
                              } else {
                                setSelectedTargetPages(selectedTargetPages.filter(id => id !== page.id));
                              }
                            }}
                            className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{page.url}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Pre-Selected Keywords */}
                {/* Quick Filters */}
                {smartFilters.length > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Common Terms
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {smartFilters.map((filter, idx) => (
                        <button
                          key={idx}
                          onClick={() => setKeywordSearch(filter)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          title={`Filter keywords containing "${filter}"`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* AI Analysis */}
                {data.aiQualification && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Reasoning
                      </span>
                      <button
                        onClick={() => setShowFullAiReasoning(!showFullAiReasoning)}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        {showFullAiReasoning ? 'Show less' : 'Show more'}
                      </button>
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className={`text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ${
                        showFullAiReasoning ? '' : 'line-clamp-6'
                      }`}>
                        {data.aiQualification.reasoning}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Additional Notes
                  </h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about your qualification decision..."
                    className="w-full p-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                  />
                </div>
              </div>
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