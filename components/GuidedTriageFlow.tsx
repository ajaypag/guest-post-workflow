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
    topKeywords: Array<{
      keyword: string;
      position: number;
      searchVolume: number | null;
      url: string;
    }>;
  };
  aiQualification?: {
    status: string;
    reasoning: string;
  };
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
      
      // Load DataForSEO results if available
      let dataForSeoResults: DomainData['dataForSeoResults'] | undefined;
      if (domain.hasDataForSeoResults) {
        try {
          const response = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/results?domainId=${domain.id}&limit=20`);
          if (response.ok) {
            const data = await response.json();
            dataForSeoResults = {
              totalRankings: data.total || data.results.length,
              avgPosition: data.results.length > 0 ? 
                data.results.reduce((acc: number, r: any) => acc + r.position, 0) / data.results.length : 0,
              topKeywords: data.results.slice(0, 10).map((r: any) => ({
                keyword: r.keyword,
                position: r.position,
                searchVolume: r.searchVolume,
                url: r.url
              }))
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
      
      setDomainData(prev => ({
        ...prev,
        [domain.id]: {
          domain,
          keywords,
          keywordGroups,
          dataForSeoResults,
          aiQualification
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
    if (!currentDomain || !props.onAnalyzeWithDataForSeo) return;
    
    setLoadingDataForSeo(true);
    try {
      await props.onAnalyzeWithDataForSeo(currentDomain);
      
      // Reload the data
      const updatedDomain = { ...currentDomain, hasDataForSeoResults: true };
      setDomainData(prev => {
        const { [currentDomain.id]: removed, ...rest } = prev;
        return rest;
      });
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

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Keywords Section */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-gray-600" />
                  Keywords Analysis
                </h3>
                <div className="space-y-4">
                  {data.keywordGroups.map((group, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-700">{group.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          group.relevance === 'core' ? 'bg-green-100 text-green-700' :
                          group.relevance === 'related' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {group.relevance}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.keywords.slice(0, 10).map((keyword, kidx) => (
                          <span key={kidx} className="text-sm px-2 py-1 bg-gray-100 rounded">
                            {keyword}
                          </span>
                        ))}
                        {group.keywords.length > 10 && (
                          <span className="text-sm text-gray-500">
                            +{group.keywords.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DataForSEO Results or AI Reasoning */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                {data.dataForSeoResults ? (
                  <>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-gray-600" />
                      DataForSEO Results
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">Total Rankings</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {data.dataForSeoResults.totalRankings}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">Avg Position</p>
                          <p className="text-2xl font-bold text-green-600">
                            {data.dataForSeoResults.avgPosition.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Top Keywords */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Top Keywords</h4>
                        <div className="space-y-2">
                          {data.dataForSeoResults.topKeywords.map((kw, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 truncate">{kw.keyword}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-green-600 font-medium">#{kw.position}</span>
                                {kw.searchVolume && (
                                  <span className="text-gray-500">{kw.searchVolume} vol</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : data.aiQualification ? (
                  <>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-gray-600" />
                      AI Analysis
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {data.aiQualification.reasoning}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No analysis data available</p>
                    {props.onAnalyzeWithDataForSeo && (
                      <button
                        onClick={runDataForSeoAnalysis}
                        disabled={loadingDataForSeo}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {loadingDataForSeo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Run DataForSEO Analysis
                          </>
                        )}
                      </button>
                    )}
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