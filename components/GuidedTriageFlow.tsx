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
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { TargetPage } from '@/types/user';
import { groupKeywordsByTopic } from '@/lib/utils/keywordGroupingV2';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface GuidedTriageFlowProps {
  domains: BulkAnalysisDomain[];
  targetPages: TargetPage[];
  onClose: () => void;
  onUpdateStatus: (domainId: string, status: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified', isManual?: boolean) => Promise<void>;
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
  wasAnalyzedButNoResults?: boolean;
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
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [smartFilters, setSmartFilters] = useState<string[]>([]);
  const [isTargetPagesExpanded, setIsTargetPagesExpanded] = useState(false);
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customRangeMin, setCustomRangeMin] = useState('1');
  const [customRangeMax, setCustomRangeMax] = useState('100');
  
  // Use all domains passed in (already filtered by parent component)
  const reviewDomains = props.domains;
  const currentDomain = reviewDomains[currentIndex];
  const progress = ((currentIndex + 1) / reviewDomains.length) * 100;
  
  // Build Ahrefs URL for checking rankings
  const buildAhrefsUrl = (domain: string, keywords: string[]) => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    if (keywords.length === 0) {
      return `https://app.ahrefs.com/v2-site-explorer/organic-keywords?target=${encodeURIComponent(targetUrl)}`;
    }
    
    // Build keyword rules for up to 50 keywords
    const keywordBatch = keywords.slice(0, 50);
    const cleanKeywords = keywordBatch.join(', ');
    const keywordRules = encodeURIComponent(`[{"rule":"include_if_keywords_contain_any_of","keywords":"${cleanKeywords}"}]`);
    const keywordRulesEncoded = keywordRules.replace(/%/g, '%25');
    
    return `https://app.ahrefs.com/v2-site-explorer/organic-keywords?keywordRules=${keywordRulesEncoded}&target=${encodeURIComponent(targetUrl)}`;
  };

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
      let wasAnalyzedButNoResults = false;
      
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
          } else if (domain.dataForSeoLastAnalyzed) {
            // Keywords were analyzed but no results found
            wasAnalyzedButNoResults = true;
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
          wasAnalyzedButNoResults,
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

  const handleQualify = async (status: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified') => {
    if (!currentDomain) return;
    
    setSaving(true);
    try {
      // Save notes and selected target page
      const updateData: any = { 
        status: currentDomain.qualificationStatus, 
        userId: props.userId
      };
      
      if (notes) {
        updateData.notes = notes;
      }
      
      // Save the first selected target page as the primary one for workflow creation
      if (selectedTargetPages.length > 0) {
        updateData.selectedTargetPageId = selectedTargetPages[0];
      }
      
      if (notes || selectedTargetPages.length > 0) {
        const response = await fetch(`/api/clients/${currentDomain.clientId}/bulk-analysis/${currentDomain.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          console.error('Failed to save domain data');
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
        setSelectedFilters([]);
        setSelectedTargetPages([]);
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
          handleQualify('good_quality');
          break;
        case '3':
          e.preventDefault();
          handleQualify('marginal_quality');
          break;
        case '4':
          e.preventDefault();
          handleQualify('disqualified');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setNotes('');
            setKeywordSearch('');
            setSelectedFilters([]);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < reviewDomains.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setNotes('');
            setKeywordSearch('');
            setSelectedFilters([]);
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
      {/* Combined Header with Domain Info and Actions */}
      <div className="bg-white border-b">
        <div className="px-6 py-3">
          {/* Top Row: Title, Domain, Status, Actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={props.onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">Domain Qualification</h1>
                <span className="text-gray-400">—</span>
                <Globe className="w-5 h-5 text-indigo-600" />
                <span className="text-lg font-medium">{currentDomain?.domain}</span>
              </div>
            </div>
            
            {/* Current Status and Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Current Status */}
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                currentDomain?.qualificationStatus === 'high_quality' ? 'bg-green-100 text-green-800' :
                currentDomain?.qualificationStatus === 'good_quality' ? 'bg-blue-100 text-blue-800' :
                currentDomain?.qualificationStatus === 'marginal_quality' ? 'bg-yellow-100 text-yellow-800' :
                currentDomain?.qualificationStatus === 'disqualified' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentDomain?.qualificationStatus === 'high_quality' ? 'High Quality' :
                 currentDomain?.qualificationStatus === 'good_quality' ? 'Good Quality' :
                 currentDomain?.qualificationStatus === 'marginal_quality' ? 'Marginal Quality' :
                 currentDomain?.qualificationStatus === 'disqualified' ? 'Disqualified' :
                 'Pending'}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQualify('high_quality')}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                  title="Mark as High Quality (1)"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {currentDomain?.qualificationStatus === 'high_quality' ? 'Confirm High' : 'High'}
                </button>
                <button
                  onClick={() => handleQualify('good_quality')}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  title="Mark as Good Quality (2)"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {currentDomain?.qualificationStatus === 'good_quality' ? 'Confirm Good' : 'Good'}
                </button>
                <button
                  onClick={() => handleQualify('marginal_quality')}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  title="Mark as Marginal Quality (3)"
                >
                  <AlertCircle className="w-4 h-4 mr-1.5" />
                  {currentDomain?.qualificationStatus === 'marginal_quality' ? 'Confirm Marginal' : 'Marginal'}
                </button>
                <button
                  onClick={() => handleQualify('disqualified')}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 disabled:opacity-50"
                  title="Mark as Disqualified (4)"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {currentDomain?.qualificationStatus === 'disqualified' ? 'Confirm Disqualified' : 'Disqualify'}
                </button>
              </div>
              
              <a
                href={`https://${currentDomain?.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Visit
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          
          {/* Bottom Row: Progress, Metadata, Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">
                {currentIndex + 1} of {reviewDomains.length} domains
              </span>
              <div className="flex items-center gap-4 text-gray-500">
                {data && (
                  <>
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {data.keywords.length} keywords
                    </span>
                    {currentDomain?.aiQualificationReasoning && (
                      <span className="flex items-center gap-1">
                        <Brain className="w-4 h-4" />
                        AI Analyzed
                      </span>
                    )}
                    {currentDomain?.wasManuallyQualified && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Human Modified
                      </span>
                    )}
                    {currentDomain?.wasHumanVerified && (
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-48 bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                      setNotes('');
                      setKeywordSearch('');
                      setSelectedFilters([]);
                    }
                  }}
                  disabled={currentIndex === 0}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (currentIndex < reviewDomains.length - 1) {
                      setCurrentIndex(currentIndex + 1);
                      setNotes('');
                      setKeywordSearch('');
                      setSelectedFilters([]);
                    }
                  }}
                  disabled={currentIndex === reviewDomains.length - 1}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  title="Next (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
          <div className="h-full flex gap-4 p-4">
            {/* Left Sidebar - Filters */}
            <div className="w-64 bg-white rounded-lg shadow-sm flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-sm font-medium text-gray-900">Filters</h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col">
              
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {(keywordSearch || selectedFilters.length > 0) && (
                    <button
                      onClick={() => {
                        setKeywordSearch('');
                        setSelectedFilters([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      title="Clear all filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Common Terms Filter */}
              {smartFilters.length > 0 && (
                <div className="mb-4">
                  {(() => {
                    // Check if any smart filters have rankings
                    const visibleFilters = smartFilters.filter(filter => {
                      const matchCount = data.dataForSeoResults?.allKeywords.filter(kw => {
                        if (!kw.keyword.toLowerCase().includes(filter.toLowerCase())) return false;
                        if (positionFilter) {
                          const [min, max] = positionFilter.split('-').map(Number);
                          if (kw.position < min || kw.position > max) return false;
                        }
                        return true;
                      }).length || 0;
                      return matchCount > 0;
                    });
                    
                    if (visibleFilters.length === 0) return null;
                    
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-gray-700 uppercase">Common Terms</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedFilters(visibleFilters)}
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              Select All
                            </button>
                            {selectedFilters.length > 0 && (
                              <button
                                onClick={() => setSelectedFilters([])}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {smartFilters.map((filter, idx) => {
                            const matchCount = data.dataForSeoResults?.allKeywords.filter(kw => {
                              if (!kw.keyword.toLowerCase().includes(filter.toLowerCase())) return false;
                              if (positionFilter) {
                                const [min, max] = positionFilter.split('-').map(Number);
                                if (kw.position < min || kw.position > max) return false;
                              }
                              return true;
                            }).length || 0;
                            
                            if (matchCount === 0) return null;
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (selectedFilters.includes(filter)) {
                                    setSelectedFilters(selectedFilters.filter(f => f !== filter));
                                  } else {
                                    setSelectedFilters([...selectedFilters, filter]);
                                  }
                                }}
                                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                  selectedFilters.includes(filter)
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                                title={`${matchCount} matches`}
                              >
                                {filter} ({matchCount})
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Keywords Filter */}
              {data.keywords.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-gray-700 uppercase">Keywords</h4>
                    <span className="text-xs text-gray-400">({data.keywords.length})</span>
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto pr-2">
                    {data.keywords.map((keyword, idx) => {
                      const matchCount = data.dataForSeoResults?.allKeywords.filter(kw => {
                        if (!kw.keyword.toLowerCase().includes(keyword.toLowerCase())) return false;
                        if (positionFilter) {
                          const [min, max] = positionFilter.split('-').map(Number);
                          if (kw.position < min || kw.position > max) return false;
                        }
                        return true;
                      }).length || 0;
                      
                      if (matchCount === 0) return null;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (selectedFilters.includes(keyword)) {
                              setSelectedFilters(selectedFilters.filter(f => f !== keyword));
                            } else {
                              setSelectedFilters([...selectedFilters, keyword]);
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between ${
                            selectedFilters.includes(keyword) 
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                          }`}
                          title={`${matchCount} matches`}
                        >
                          <span className="truncate">{keyword}</span>
                          <span className={`ml-1 text-xs ${
                            selectedFilters.includes(keyword) ? 'text-indigo-200' : 'text-gray-500'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Position Range Filter */}
              {data.dataForSeoResults && (
                <div className="relative pt-4 mt-auto border-t">
                  <div className="flex items-center gap-2">
                    {/* Quick action buttons */}
                    <button
                      onClick={() => setPositionFilter(positionFilter === '1-20' ? null : '1-20')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all border whitespace-nowrap ${
                        positionFilter === '1-20'
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                      }`}
                    >
                      Top 20
                    </button>
                    <button
                      onClick={() => setPositionFilter(positionFilter === '1-50' ? null : '1-50')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all border whitespace-nowrap ${
                        positionFilter === '1-50'
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                      }`}
                    >
                      Top 50
                    </button>
                    
                    {/* More options button */}
                    <button
                      onClick={() => setShowCustomRange(!showCustomRange)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all border whitespace-nowrap ${
                        ['1-10', '1-30', '1-40', '1-100'].includes(positionFilter || '') || 
                        (positionFilter && !['1-20', '1-50'].includes(positionFilter))
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      More
                      <ChevronUp className={`w-3 h-3 ml-1 transition-transform ${showCustomRange ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Drop-up menu */}
                  {showCustomRange && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-md shadow-lg p-1 min-w-[160px] z-10">
                      <button
                        onClick={() => {
                          setPositionFilter(positionFilter === '1-10' ? null : '1-10');
                          setShowCustomRange(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 ${
                          positionFilter === '1-10' ? 'bg-indigo-50 text-indigo-700' : ''
                        }`}
                      >
                        Top 10
                      </button>
                      <button
                        onClick={() => {
                          setPositionFilter(positionFilter === '1-30' ? null : '1-30');
                          setShowCustomRange(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 ${
                          positionFilter === '1-30' ? 'bg-indigo-50 text-indigo-700' : ''
                        }`}
                      >
                        Top 30
                      </button>
                      <button
                        onClick={() => {
                          setPositionFilter(positionFilter === '1-40' ? null : '1-40');
                          setShowCustomRange(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 ${
                          positionFilter === '1-40' ? 'bg-indigo-50 text-indigo-700' : ''
                        }`}
                      >
                        Top 40
                      </button>
                      <button
                        onClick={() => {
                          setPositionFilter(positionFilter === '1-100' ? null : '1-100');
                          setShowCustomRange(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 ${
                          positionFilter === '1-100' ? 'bg-indigo-50 text-indigo-700' : ''
                        }`}
                      >
                        1-100
                      </button>
                      <div className="border-t border-gray-100 my-0.5"></div>
                      <div className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="1"
                            value={customRangeMin}
                            onChange={(e) => setCustomRangeMin(e.target.value)}
                            className="w-12 px-1 py-0.5 text-xs border border-gray-200 rounded"
                            min="1"
                          />
                          <span className="text-xs text-gray-500">-</span>
                          <input
                            type="number"
                            placeholder="100"
                            value={customRangeMax}
                            onChange={(e) => setCustomRangeMax(e.target.value)}
                            className="w-12 px-1 py-0.5 text-xs border border-gray-200 rounded"
                            min="1"
                          />
                          <button
                            onClick={() => {
                              const min = parseInt(customRangeMin) || 1;
                              const max = parseInt(customRangeMax) || 100;
                              setPositionFilter(`${min}-${max}`);
                              setShowCustomRange(false);
                            }}
                            className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Go
                          </button>
                        </div>
                      </div>
                      {positionFilter && !['1-10', '1-20', '1-30', '1-40', '1-50', '1-100'].includes(positionFilter) && (
                        <>
                          <div className="border-t border-gray-100 my-0.5"></div>
                          <button
                            onClick={() => {
                              setPositionFilter(null);
                              setShowCustomRange(false);
                            }}
                            className="w-full text-left px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            Clear Filter
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
            
            {/* Center Column - Keywords Data */}
            <div className="flex-1 overflow-hidden">
              {data.dataForSeoResults ? (
                <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        DataForSEO Keyword Rankings
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-600">
                            <span className="font-semibold text-indigo-600">
                              {(() => {
                                const filtered = data.dataForSeoResults.allKeywords.filter(kw => {
                                  if (positionFilter) {
                                    const [min, max] = positionFilter.split('-').map(Number);
                                    if (kw.position < min || kw.position > max) return false;
                                  }
                                  return true;
                                });
                                return filtered.length;
                              })()}
                            </span> keywords
                            {positionFilter && (
                              <span className="text-xs text-indigo-600">
                                (of {data.dataForSeoResults.totalRankings})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-600">
                            Avg: <span className="font-semibold text-green-600">
                              {(() => {
                                const filtered = data.dataForSeoResults.allKeywords.filter(kw => {
                                  if (positionFilter) {
                                    const [min, max] = positionFilter.split('-').map(Number);
                                    if (kw.position < min || kw.position > max) return false;
                                  }
                                  return true;
                                });
                                return filtered.length > 0 
                                  ? (filtered.reduce((acc, r) => acc + r.position, 0) / filtered.length).toFixed(1)
                                  : '0.0';
                              })()}
                            </span>
                          </span>
                        </div>
                        {/* Ahrefs buttons */}
                        <div className="flex gap-1">
                          {data.keywordGroups.map((group, idx) => (
                            <a
                              key={idx}
                              href={buildAhrefsUrl(currentDomain.domain, group.keywords)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                              title={`Check ${group.name} rankings in Ahrefs`}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {group.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Keywords Table */}
                    <div className="flex-1 overflow-x-auto overflow-y-auto">
                      <table className="w-full min-w-[800px]">
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
                            .filter(kw => {
                              // Filter by position range
                              if (positionFilter) {
                                const [min, max] = positionFilter.split('-').map(Number);
                                if (kw.position < min || kw.position > max) return false;
                              }
                              // Filter by search input
                              if (keywordSearch && !kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase())) {
                                return false;
                              }
                              // Filter by selected filters (ANY match)
                              if (selectedFilters.length > 0) {
                                return selectedFilters.some(filter => 
                                  kw.keyword.toLowerCase().includes(filter.toLowerCase())
                                );
                              }
                              return true;
                            })
                            .map((kw, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <span>{kw.keyword}</span>
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(kw.keyword)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                    title="Search on Google"
                                  >
                                    <Search className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </td>
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
                              <td className="px-3 py-2 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate max-w-xs" title={kw.url}>
                                    {kw.url.replace(/^https?:\/\/[^\/]+/, '')}
                                  </span>
                                  {kw.url && (
                                    <a
                                      href={kw.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                                      title="Open URL"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
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
                        {data.wasAnalyzedButNoResults ? (
                          <>
                            <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium mb-2">No rankings found</p>
                            <p className="text-sm text-gray-500 mb-2">
                              Analyzed {data.keywords.length} keywords
                            </p>
                            <p className="text-xs text-gray-400 max-w-md mx-auto">
                              This domain doesn't rank in Google's top 100 results for any of the analyzed keywords.
                              {data.domain.dataForSeoLastAnalyzed && (
                                <span className="block mt-1">
                                  Last checked: {new Date(data.domain.dataForSeoLastAnalyzed).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                            <div className="flex flex-col items-center gap-3 mt-4">
                              {/* Prominent Ahrefs buttons when no results found */}
                              <div className="flex flex-wrap justify-center gap-2">
                                {data.keywordGroups.map((group, idx) => (
                                  <a
                                    key={idx}
                                    href={buildAhrefsUrl(currentDomain.domain, group.keywords)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                                    title={`Check ${group.name} keywords in Ahrefs (no API credits used)`}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    {group.name} in Ahrefs
                                  </a>
                                ))}
                              </div>
                              {/* Optional re-analyze button for edge cases */}
                              {props.onAnalyzeWithDataForSeo && (
                                <button
                                  onClick={runDataForSeoAnalysis}
                                  disabled={loadingDataForSeo}
                                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                >
                                  {loadingDataForSeo ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Re-analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Re-analyze
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </>
                        ) : data.wasAnalyzedButNoResults ? (
                          <>
                            <XCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                            <p className="text-amber-900 font-medium mb-2">No Rankings Found</p>
                            <p className="text-sm text-amber-700 mb-6">
                              Analyzed {data.keywords.length} keywords but this domain doesn't rank in top 100 for any of them
                            </p>
                            <div className="flex flex-col items-center gap-3">
                              {/* Show multiple Ahrefs buttons - one per keyword group */}
                              <div className="flex flex-wrap justify-center gap-2">
                                {data.keywordGroups.map((group, idx) => (
                                  <a
                                    key={idx}
                                    href={buildAhrefsUrl(currentDomain.domain, group.keywords)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                                    title={`Check ${group.name} keywords in Ahrefs`}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    {group.name} in Ahrefs
                                  </a>
                                ))}
                              </div>
                              {/* Optional re-analyze button for edge cases */}
                              {props.onAnalyzeWithDataForSeo && (
                                <button
                                  onClick={runDataForSeoAnalysis}
                                  disabled={loadingDataForSeo}
                                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                >
                                  {loadingDataForSeo ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Re-analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Re-analyze
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">No keyword data available</p>
                            <p className="text-sm text-gray-400 mb-6">
                              {data.keywords.length > 0 
                                ? `Analyze ${data.keywords.length} keywords to see rankings`
                                : 'No keywords selected for analysis'
                              }
                            </p>
                            <div className="flex flex-col items-center gap-3">
                              {data.keywords.length > 0 ? (
                                <>
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
                                          Analyze Keywords
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {/* Prominent Ahrefs buttons when no DataForSEO data */}
                                  <div className="flex flex-wrap justify-center gap-2">
                                    {data.keywordGroups.map((group, idx) => (
                                      <a
                                        key={idx}
                                        href={buildAhrefsUrl(currentDomain.domain, group.keywords)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-5 py-2.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                                        title={`Check ${group.name} keywords in Ahrefs (no API credits used)`}
                                      >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {group.name} in Ahrefs
                                      </a>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Ahrefs doesn't use your API credits
                                  </p>
                                </>
                              ) : (
                                <>
                                  {/* Ahrefs button for domain-level analysis when no keywords selected */}
                                  <a
                                    href={buildAhrefsUrl(currentDomain.domain, [])}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                    title="Check all rankings for this domain in Ahrefs"
                                  >
                                    <ExternalLink className="w-5 h-5 mr-2" />
                                    Check Domain Rankings in Ahrefs
                                  </a>
                                  <p className="text-xs text-gray-500">
                                    Analyze all keywords this domain ranks for
                                  </p>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </div>
            
            {/* Right Column - Metadata */}
            <div className="w-96 space-y-4">
                {/* AI Analysis - Enhanced */}
                {data.aiQualification && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Qualification Analysis
                    </h3>
                    
                    {/* Quick Stats Section */}
                    {currentDomain?.overlapStatus && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-3">
                        {/* Top Row - Status Badges */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            currentDomain.qualificationStatus === 'high_quality' ? 'bg-green-100 text-green-800' :
                            currentDomain.qualificationStatus === 'good_quality' ? 'bg-blue-100 text-blue-800' :
                            currentDomain.qualificationStatus === 'marginal_quality' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {currentDomain.qualificationStatus === 'high_quality' ? 'High Quality' :
                             currentDomain.qualificationStatus === 'good_quality' ? 'Good Quality' :
                             currentDomain.qualificationStatus === 'marginal_quality' ? 'Marginal' :
                             'Disqualified'}
                          </span>
                          
                          <InfoTooltip content={
                            currentDomain.overlapStatus === 'direct' ? 'The site already ranks for your exact core keywords' :
                            currentDomain.overlapStatus === 'related' ? 'The site ranks for relevant sibling topics but not your exact keywords' :
                            currentDomain.overlapStatus === 'both' ? 'The site ranks for both your core keywords and related topics' :
                            'No meaningful keyword overlap detected'
                          }>
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              currentDomain.overlapStatus === 'direct' ? 'bg-green-100 text-green-800' :
                              currentDomain.overlapStatus === 'related' ? 'bg-blue-100 text-blue-800' :
                              currentDomain.overlapStatus === 'both' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {currentDomain.overlapStatus === 'direct' ? '✓ Direct Match' :
                               currentDomain.overlapStatus === 'related' ? '~ Related Match' :
                               currentDomain.overlapStatus === 'both' ? '✓~ Both' :
                               '✗ No Match'}
                            </span>
                          </InfoTooltip>
                          
                          {currentDomain.overlapStatus !== 'none' && (
                            <InfoTooltip content={
                              (currentDomain.authorityDirect === 'strong' || currentDomain.authorityRelated === 'strong') 
                                ? 'Rankings in top 30 positions (pages 1-3 of Google)' 
                                : (currentDomain.authorityDirect === 'moderate' || currentDomain.authorityRelated === 'moderate')
                                ? 'Rankings in positions 31-60 (pages 4-6 of Google)'
                                : 'Rankings in positions 61-100 (pages 7-10 of Google)'
                            }>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                (currentDomain.authorityDirect === 'strong' || currentDomain.authorityRelated === 'strong') 
                                  ? 'bg-green-100 text-green-800' 
                                  : (currentDomain.authorityDirect === 'moderate' || currentDomain.authorityRelated === 'moderate')
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {(currentDomain.authorityDirect === 'strong' || currentDomain.authorityRelated === 'strong') 
                                  ? '🟢 Strong' 
                                  : (currentDomain.authorityDirect === 'moderate' || currentDomain.authorityRelated === 'moderate')
                                  ? '🟡 Moderate'
                                  : '🔴 Weak'}
                              </span>
                            </InfoTooltip>
                          )}
                        </div>
                        
                        {/* Authority Bar Visualization */}
                        {currentDomain.overlapStatus && currentDomain.overlapStatus !== 'none' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Authority Range:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    (currentDomain.authorityDirect === 'strong' || currentDomain.authorityRelated === 'strong') 
                                      ? 'bg-green-500 w-full' 
                                      : (currentDomain.authorityDirect === 'moderate' || currentDomain.authorityRelated === 'moderate')
                                      ? 'bg-yellow-500 w-2/3'
                                      : 'bg-red-500 w-1/3'
                                  }`}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {(currentDomain.authorityDirect === 'strong' || currentDomain.authorityRelated === 'strong') 
                                  ? 'Strong' 
                                  : (currentDomain.authorityDirect === 'moderate' || currentDomain.authorityRelated === 'moderate')
                                  ? 'Moderate'
                                  : 'Weak'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Quick Stats Row */}
                        <div className="text-xs text-gray-700 space-y-1">
                          {currentDomain.evidence && (currentDomain.evidence.direct_count > 0 || currentDomain.evidence.related_count > 0) && (
                            <>
                              {currentDomain.evidence.direct_count > 0 && (
                                <div>• {currentDomain.evidence.direct_count} direct keywords (pos {currentDomain.evidence.direct_median_position || '1-100'})</div>
                              )}
                              {currentDomain.evidence.related_count > 0 && (
                                <div>• {currentDomain.evidence.related_count} related keywords (pos {currentDomain.evidence.related_median_position || '1-100'})</div>
                              )}
                            </>
                          )}
                          
                          {currentDomain.topicScope && (
                            <div className="flex items-center gap-2">
                              <span>• Topic Scope:</span>
                              <span className="font-medium">
                                {currentDomain.topicScope === 'short_tail' ? '🎯 Short Tail' :
                                 currentDomain.topicScope === 'long_tail' ? '🏹 Long Tail' :
                                 '🔬 Ultra Long Tail'}
                              </span>
                            </div>
                          )}
                          
                          {/* Extract strategy from reasoning */}
                          {(() => {
                            const reasoning = data.aiQualification.reasoning.toLowerCase();
                            let strategy = '';
                            
                            if (reasoning.includes('geo modifier')) {
                              strategy = 'Add geo modifiers';
                            } else if (reasoning.includes('buyer')) {
                              strategy = 'Add buyer-type qualifiers';
                            } else if (reasoning.includes('no modifier')) {
                              strategy = 'Target broad terms';
                            } else if (reasoning.includes('specific')) {
                              strategy = 'Use specific niche angle';
                            }
                            
                            return strategy && (
                              <div className="font-medium text-indigo-700">• Strategy: "{strategy}"</div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* AI Reasoning Text - Expanded */}
                    <div className="bg-blue-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {data.aiQualification.reasoning}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Target Pages Selection */}
                {data.targetPages.length > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Target Pages
                      {selectedTargetPages.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-xs normal-case">
                          {selectedTargetPages.length} selected
                        </span>
                      )}
                    </h3>
                    <div className="flex-1 flex flex-col">
                      {/* Calculate how many items to show based on whether AI reasoning exists */}
                      {(() => {
                        // Roughly estimate how many items fit in available space
                        const hasAIReasoning = !!data.aiQualification;
                        const baseItemsToShow = hasAIReasoning ? 4 : 8; // Show fewer if AI reasoning takes space
                        const itemsToShow = isTargetPagesExpanded ? data.targetPages.length : Math.min(baseItemsToShow, data.targetPages.length);
                        
                        return (
                          <>
                            <div className={`space-y-2 ${isTargetPagesExpanded ? 'overflow-y-auto max-h-96' : ''}`}>
                              {data.targetPages.slice(0, itemsToShow).map(page => (
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
                                  <span className="text-sm text-gray-700 line-clamp-1">{page.url}</span>
                                </label>
                              ))}
                            </div>
                            
                            {/* Show expand button if there are more items */}
                            {data.targetPages.length > baseItemsToShow && (
                              <button
                                onClick={() => setIsTargetPagesExpanded(!isTargetPagesExpanded)}
                                className="mt-2 w-full text-left px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 border-t pt-2"
                              >
                                {isTargetPagesExpanded ? (
                                  <>Show less</>
                                ) : (
                                  <>Show {data.targetPages.length - baseItemsToShow} more</>
                                )}
                                <ChevronDown className={`w-4 h-4 transition-transform ${isTargetPagesExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </>
                        );
                      })()}
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
        )}
      </div>

      {/* Minimal Footer with Keyboard Shortcuts */}
      <div className="bg-white border-t px-6 py-2">
        <div className="flex items-center justify-center text-xs text-gray-400">
          <span className="font-mono bg-gray-100 px-1 rounded">1</span> High
          <span className="mx-1">•</span>
          <span className="font-mono bg-gray-100 px-1 rounded">2</span> Good
          <span className="mx-1">•</span>
          <span className="font-mono bg-gray-100 px-1 rounded">3</span> Marginal
          <span className="mx-1">•</span>
          <span className="font-mono bg-gray-100 px-1 rounded">4</span> Disqualify
          <span className="mx-1">•</span>
          <span className="font-mono bg-gray-100 px-1 rounded">←→</span> Navigate
          <span className="mx-1">•</span>
          <span className="font-mono bg-gray-100 px-1 rounded">Esc</span> Close
        </div>
      </div>

    </div>
  );
}