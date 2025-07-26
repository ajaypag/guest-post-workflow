'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Search, 
  Plus, 
  FileText,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Sparkles,
  Target,
  TrendingUp,
  Globe,
  Zap,
  Loader2,
  Database,
  RefreshCw
} from 'lucide-react';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { TargetPage } from '@/types/user';
import { groupKeywordsByTopic } from '@/lib/utils/keywordGroupingV2';

interface BulkAnalysisTableProps {
  domains: BulkAnalysisDomain[];
  targetPages: TargetPage[];
  selectedDomains: Set<string>;
  recentlyAnalyzedDomains?: Set<string>;
  onToggleSelection: (domainId: string) => void;
  onSelectAll: (domainIds: string[]) => void;
  onClearSelection: () => void;
  onUpdateStatus: (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified', isManual?: boolean) => void;
  onCreateWorkflow: (domain: BulkAnalysisDomain) => void;
  onDeleteDomain: (domainId: string) => void;
  onAnalyzeWithDataForSeo: (domain: BulkAnalysisDomain) => void;
  onUpdateNotes: (domainId: string, notes: string) => void;
  selectedPositionRange: string;
  hideExperimentalFeatures: boolean;
  loading: boolean;
  keywordInputMode: 'target-pages' | 'manual';
  manualKeywords?: string;
  triageMode?: boolean;
  onToggleTriageMode?: () => void;
  onBulkCreateWorkflows?: (domainIds: string[]) => void;
  bulkWorkflowCreating?: boolean;
  onAIQualifySingle?: (domainId: string) => void;
}

interface ExpandedRowData {
  keywords: {
    groups: Array<{
      name: string;
      keywords: string[];
      relevance: 'core' | 'related' | 'wider';
      ahrefsUrl: string;
    }>;
    total: number;
  };
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
      isFromCache?: boolean;
    }>;
    cacheInfo?: {
      newKeywords: number;
      cachedKeywords: number;
      apiCallsSaved: number;
      daysSinceLastAnalysis: number | null;
    };
    analyzedKeywords: number;
    lastAnalyzed: string;
    wasAnalyzedWithNoResults?: boolean;
  };
  aiQualification?: {
    status: 'high_quality' | 'average_quality' | 'disqualified';
    reasoning: string;
    qualifiedAt: string;
  };
  targetPages: Array<{
    id: string;
    url: string;
    selected: boolean;
  }>;
}

export default function BulkAnalysisTable(props: BulkAnalysisTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowData, setRowData] = useState<Record<string, ExpandedRowData>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [focusedDomainId, setFocusedDomainId] = useState<string | null>(null);
  const [loadingDataForSeo, setLoadingDataForSeo] = useState<Record<string, boolean>>({});
  
  // DataForSEO search and filter states
  const [dataForSeoSearchTerms, setDataForSeoSearchTerms] = useState<Record<string, string>>({});
  const [dataForSeoPositionFilters, setDataForSeoPositionFilters] = useState<Record<string, string>>({});

  // Initialize local notes from domain data
  useEffect(() => {
    const notes: Record<string, string> = {};
    props.domains.forEach(domain => {
      notes[domain.id] = domain.notes || '';
    });
    setLocalNotes(notes);
  }, [props.domains]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!focusedDomainId) return;
      
      const currentIndex = props.domains.findIndex(d => d.id === focusedDomainId);
      if (currentIndex === -1) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedDomainId(props.domains[currentIndex - 1].id);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < props.domains.length - 1) {
            setFocusedDomainId(props.domains[currentIndex + 1].id);
          }
          break;
        case 'Enter':
          e.preventDefault();
          toggleExpanded(focusedDomainId);
          break;
        case ' ':
          e.preventDefault();
          props.onToggleSelection(focusedDomainId);
          break;
        case '1':
          e.preventDefault();
          const domain1 = props.domains[currentIndex];
          if (domain1.qualificationStatus === 'pending') {
            props.onUpdateStatus(focusedDomainId, 'high_quality');
          }
          break;
        case '2':
          e.preventDefault();
          const domain2 = props.domains[currentIndex];
          if (domain2.qualificationStatus === 'pending') {
            props.onUpdateStatus(focusedDomainId, 'average_quality');
          }
          break;
        case '3':
          e.preventDefault();
          const domain3 = props.domains[currentIndex];
          if (domain3.qualificationStatus === 'pending') {
            props.onUpdateStatus(focusedDomainId, 'disqualified');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [focusedDomainId, props.domains]);

  const toggleExpanded = async (domainId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId);
    } else {
      newExpanded.add(domainId);
      
      // Load row data if not already loaded
      if (!rowData[domainId]) {
        await loadRowData(domainId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const loadRowData = async (domainId: string) => {
    const domain = props.domains.find(d => d.id === domainId);
    if (!domain) return;

    // Get keywords based on mode
    let keywords: string[] = [];
    if (props.keywordInputMode === 'manual' && props.manualKeywords) {
      keywords = props.manualKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    } else {
      // Get keywords from target pages
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
    const groups = groupKeywordsByTopic(keywords);
    const keywordGroups = groups.map(group => ({
      ...group,
      ahrefsUrl: buildAhrefsUrl(domain.domain, group.keywords)
    }));

    // Load DataForSEO results if available
    let dataForSeoResults: ExpandedRowData['dataForSeoResults'] | undefined;
    let wasAnalyzedWithNoResults = false;
    
    if (domain.hasDataForSeoResults && rowData[domainId]?.dataForSeoResults) {
      // Use existing data if already loaded
      dataForSeoResults = rowData[domainId].dataForSeoResults;
    } else {
      // Check if domain was analyzed (even if no results)
      try {
        const analysisCheckResponse = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/check-analyzed?domainId=${domainId}`);
        if (analysisCheckResponse.ok) {
          const analysisCheck = await analysisCheckResponse.json();
          
          if (analysisCheck.wasAnalyzed) {
            // Keywords were analyzed
            if (analysisCheck.keywordsWithResults > 0) {
              // Load actual results
              const response = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/results?domainId=${domainId}&limit=1000`);
              if (response.ok) {
                const data = await response.json();
                dataForSeoResults = {
                  totalRankings: data.total || data.results.length,
                  avgPosition: data.results.length > 0 ? data.results.reduce((acc: number, r: any) => acc + r.position, 0) / data.results.length : 0,
                  allKeywords: data.results.map((r: any) => ({
                    keyword: r.keyword,
                    position: r.position,
                    searchVolume: r.searchVolume,
                    url: r.url,
                    cpc: r.cpc,
                    competition: r.competition,
                    isFromCache: r.isFromCache
                  })),
                  cacheInfo: undefined,
                  analyzedKeywords: analysisCheck.keywordsAnalyzed,
                  lastAnalyzed: analysisCheck.lastAnalyzed || new Date().toISOString(),
                  wasAnalyzedWithNoResults: false
                };
              }
            } else {
              // Analyzed but no results found
              wasAnalyzedWithNoResults = true;
              dataForSeoResults = {
                totalRankings: 0,
                avgPosition: 0,
                allKeywords: [],
                cacheInfo: undefined,
                analyzedKeywords: analysisCheck.keywordsAnalyzed,
                lastAnalyzed: analysisCheck.lastAnalyzed || new Date().toISOString(),
                wasAnalyzedWithNoResults: true
              };
            }
          }
        }
      } catch (error) {
        console.error('Failed to check/load DataForSEO results:', error);
      }
    }

    // Get AI qualification if available
    let aiQualification: {
      status: 'high_quality' | 'average_quality' | 'disqualified';
      reasoning: string;
      qualifiedAt: string;
    } | undefined;
    if (domain.aiQualificationReasoning) {
      aiQualification = {
        status: domain.qualificationStatus as any,
        reasoning: domain.aiQualificationReasoning,
        qualifiedAt: domain.aiQualifiedAt || ''
      };
    }

    // Get target pages info
    const targetPagesInfo = props.targetPages.map(page => ({
      id: page.id,
      url: page.url,
      selected: domain.targetPageIds.includes(page.id)
    }));

    setRowData(prev => ({
      ...prev,
      [domainId]: {
        keywords: {
          groups: keywordGroups,
          total: keywords.length
        },
        dataForSeoResults,
        aiQualification,
        targetPages: targetPagesInfo
      }
    }));
  };

  const buildAhrefsUrl = (domain: string, keywords: string[]) => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    if (keywords.length === 0) {
      const positionsParam = props.selectedPositionRange !== '1-100' ? `&positions=${props.selectedPositionRange}` : '';
      return `https://app.ahrefs.com/v2-site-explorer/organic-keywords?target=${encodeURIComponent(targetUrl)}${positionsParam}`;
    }
    
    // Build keyword rules
    const keywordBatch = keywords.slice(0, 50);
    const cleanKeywords = keywordBatch.join(', ');
    const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
    const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
    
    const positionsParam = props.selectedPositionRange !== '1-100' ? `&positions=${props.selectedPositionRange}` : '';
    return `https://app.ahrefs.com/v2-site-explorer/organic-keywords?keywordRules=${keywordRulesEncoded}&target=${encodeURIComponent(targetUrl)}${positionsParam}`;
  };

  const runDataForSeoAnalysisInline = async (domain: BulkAnalysisDomain) => {
    const domainId = domain.id;
    setLoadingDataForSeo(prev => ({ ...prev, [domainId]: true }));
    
    try {
      // Get keywords for analysis
      const keywords = props.keywordInputMode === 'manual' && props.manualKeywords
        ? props.manualKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : props.targetPages
            .filter(p => domain.targetPageIds.includes(p.id))
            .flatMap(page => (page as any).keywords?.split(',').map((k: string) => k.trim()) || []);
      
      // Call the analyze API with caching enabled
      const response = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/analyze-dataforseo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          domain: domain.domain,
          keywords,
          useCache: true // Enable caching to use existing data
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to run DataForSEO analysis');
      }
      
      const analysisResult = await response.json();
      
      // Wait a moment for the analysis to complete if new keywords were analyzed
      if (analysisResult.result?.cacheInfo?.newKeywords > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Fetch all results (not just first page)
      const resultsResponse = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/results?domainId=${domainId}&limit=1000`);
      
      if (resultsResponse.ok) {
        const data = await resultsResponse.json();
        
        // Store full results with cache info
        const dataForSeoResults = {
          totalRankings: data.total || data.results.length,
          avgPosition: data.results.length > 0 ? data.results.reduce((acc: number, r: any) => acc + r.position, 0) / data.results.length : 0,
          allKeywords: data.results, // Store all results
          cacheInfo: analysisResult.result?.cacheInfo,
          analyzedKeywords: keywords.length,
          lastAnalyzed: new Date().toISOString()
        };
        
        setRowData(prev => ({
          ...prev,
          [domainId]: {
            ...prev[domainId],
            dataForSeoResults
          }
        }));
        
        // Update domain to mark as having results
        props.domains.forEach(d => {
          if (d.id === domainId) {
            d.hasDataForSeoResults = true;
          }
        });
      }
    } catch (error) {
      console.error('Failed to run DataForSEO analysis:', error);
    } finally {
      setLoadingDataForSeo(prev => ({ ...prev, [domainId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high_quality':
        return 'bg-green-100 text-green-800';
      case 'average_quality':
        return 'bg-blue-100 text-blue-800';
      case 'disqualified':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'high_quality':
        return <CheckCircle className="w-4 h-4" />;
      case 'average_quality':
        return <AlertCircle className="w-4 h-4" />;
      case 'disqualified':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'high_quality':
        return 'High Quality';
      case 'average_quality':
        return 'Average';
      case 'disqualified':
        return 'Disqualified';
      default:
        return 'Pending';
    }
  };

  // Get qualified domains for bulk operations
  const qualifiedDomains = props.domains.filter(d => 
    props.selectedDomains.has(d.id) && 
    (d.qualificationStatus === 'high_quality' || d.qualificationStatus === 'average_quality') &&
    !d.hasWorkflow
  );

  return (
    <div className="w-full">
      {/* Guided Triage Mode */}
      {props.onToggleTriageMode && (
        <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Guided Qualification Flow</h3>
              <p className="text-xs text-gray-500">
                Review filtered domains one-by-one with all data pre-loaded for fast decisions
              </p>
            </div>
          </div>
          <button
            onClick={props.onToggleTriageMode}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Guided Review
          </button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {props.selectedDomains.size > 0 && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">
                  {props.selectedDomains.size} domain{props.selectedDomains.size > 1 ? 's' : ''} selected
                </span>
              </div>
              {qualifiedDomains.length > 0 && (
                <span className="text-xs text-indigo-700">
                  {qualifiedDomains.length} qualified without workflows
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {qualifiedDomains.length > 0 && props.onBulkCreateWorkflows && (
                <button
                  onClick={() => props.onBulkCreateWorkflows!(qualifiedDomains.map(d => d.id))}
                  disabled={props.bulkWorkflowCreating}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {props.bulkWorkflowCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Workflows...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create {qualifiedDomains.length} Workflow{qualifiedDomains.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  props.selectedDomains.forEach(id => props.onToggleSelection(id));
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={props.domains.length > 0 && props.domains.every(d => props.selectedDomains.has(d.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    props.onSelectAll(props.domains.map(d => d.id));
                  } else {
                    props.onClearSelection();
                  }
                }}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Domain
            </th>
            {!props.triageMode && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keywords
              </th>
            )}
            {props.triageMode ? (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quick Stats
              </th>
            ) : (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Sources
              </th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {!props.triageMode && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Page
              </th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {props.triageMode ? 'Quick Actions' : 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {props.domains.map((domain) => {
            const isExpanded = expandedRows.has(domain.id);
            const data = rowData[domain.id];
            const isFocused = focusedDomainId === domain.id;
            
            return (
              <React.Fragment key={domain.id}>
                <tr 
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    isFocused ? 'ring-2 ring-inset ring-indigo-500' : ''
                  } ${props.selectedDomains.has(domain.id) ? 'bg-indigo-50' : ''} ${
                    props.recentlyAnalyzedDomains?.has(domain.id) ? 'bg-green-50 animate-pulse' : ''
                  }`}
                  onClick={(e) => {
                    setFocusedDomainId(domain.id);
                    // Expand row if not clicking on a button/link/input
                    if (!props.triageMode && 
                        !(e.target as HTMLElement).closest('button, a, input, select')) {
                      toggleExpanded(domain.id);
                    }
                  }}
                >
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={props.selectedDomains.has(domain.id)}
                      onChange={() => props.onToggleSelection(domain.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center">
                      {!props.triageMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(domain.id);
                          }}
                          className="mr-2 p-1 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? 
                            <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          }
                        </button>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{domain.domain}</div>
                        {domain.notes && !props.triageMode && (
                          <div className="text-xs text-gray-500 mt-1">{domain.notes}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  {!props.triageMode && (
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {domain.keywordCount} keywords
                    </td>
                  )}
                  <td className="px-3 py-4">
                    {props.triageMode ? (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">{domain.keywordCount}</span>
                        </div>
                        {domain.hasDataForSeoResults && (
                          <div className="flex items-center gap-1">
                            <Search className="w-3 h-3 text-indigo-600" />
                            <span className="text-indigo-600 text-xs">SEO Data</span>
                          </div>
                        )}
                        {domain.aiQualificationReasoning && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-600 text-xs">AI Scored</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {domain.hasDataForSeoResults && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                            <Search className="w-3 h-3 mr-1" />
                            DataForSEO
                          </span>
                        )}
                        {domain.aiQualificationReasoning && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Qualified
                          </span>
                        )}
                        {domain.wasHumanVerified && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Human Verified
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(domain.qualificationStatus)}`}>
                      {getStatusIcon(domain.qualificationStatus)}
                      <span className="ml-1">{getStatusLabel(domain.qualificationStatus)}</span>
                    </span>
                  </td>
                  {!props.triageMode && (
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {domain.selectedTargetPageId ? (
                        <span className="text-indigo-600">
                          {props.targetPages.find(p => p.id === domain.selectedTargetPageId)?.url || 'Selected'}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not selected</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-4">
                    <div className={`flex items-center ${props.triageMode ? 'gap-1' : 'gap-2'}`}>
                      {domain.qualificationStatus === 'pending' ? (
                        <div className={`flex ${props.triageMode ? 'gap-1' : 'gap-1'}`}>
                          {!domain.aiQualificationReasoning && props.onAIQualifySingle && !props.hideExperimentalFeatures && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                props.onAIQualifySingle?.(domain.id);
                              }}
                              className={`${props.triageMode ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-purple-600 text-white rounded hover:bg-purple-700 inline-flex items-center`}
                              title="AI Qualify this domain"
                            >
                              <Sparkles className="w-3 h-3 mr-0.5" />
                              {!props.triageMode && 'AI'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onUpdateStatus(domain.id, 'high_quality');
                            }}
                            className={`${props.triageMode ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-green-600 text-white rounded hover:bg-green-700`}
                            title="Mark as High Quality (Press 1)"
                          >
                            {props.triageMode ? '1' : 'High'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onUpdateStatus(domain.id, 'average_quality');
                            }}
                            className={`${props.triageMode ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-blue-600 text-white rounded hover:bg-blue-700`}
                            title="Mark as Average (Press 2)"
                          >
                            {props.triageMode ? '2' : 'Avg'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onUpdateStatus(domain.id, 'disqualified');
                            }}
                            className={`${props.triageMode ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-gray-600 text-white rounded hover:bg-gray-700`}
                            title="Disqualify (Press 3)"
                          >
                            {props.triageMode ? '3' : 'DQ'}
                          </button>
                        </div>
                      ) : (
                        <>
                          {!props.triageMode && (domain.qualificationStatus === 'high_quality' || domain.qualificationStatus === 'average_quality') && !domain.hasWorkflow && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                props.onCreateWorkflow(domain);
                              }}
                              className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Workflow
                            </button>
                          )}
                          {!props.triageMode && domain.hasWorkflow && (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              <FileText className="w-3 h-3 mr-1" />
                              Has Workflow
                            </span>
                          )}
                        </>
                      )}
                      {!props.triageMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onDeleteDomain(domain.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row Content */}
                {!props.triageMode && isExpanded && data && (
                  <tr>
                    <td colSpan={7} className="px-0 py-0">
                      <div className="bg-gray-50 border-t border-b border-gray-200">
                        <div className="p-6 space-y-6">
                          {/* Keywords Section */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Target className="w-4 h-4 mr-2" />
                              Keyword Analysis ({data.keywords.total} keywords)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {data.keywords.groups.map((group, idx) => (
                                <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-medium text-sm">{group.name}</h5>
                                    </div>
                                    <a
                                      href={group.ahrefsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-2 py-1 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Open in Ahrefs Keyword Explorer to check rankings for these keywords"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ahrefs
                                    </a>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-2">
                                    {group.keywords.slice(0, 3).join(', ')}
                                    {group.keywords.length > 3 && ` +${group.keywords.length - 3} more`}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* DataForSEO Results */}
                          {data.dataForSeoResults ? (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                                <div className="flex items-center">
                                  <Search className="w-4 h-4 mr-2" />
                                  DataForSEO Results
                                </div>
                                {data.dataForSeoResults.lastAnalyzed && (
                                  <span className="text-xs text-gray-500">
                                    Last updated: {new Date(data.dataForSeoResults.lastAnalyzed).toLocaleTimeString()}
                                  </span>
                                )}
                              </h4>
                              {data.dataForSeoResults.wasAnalyzedWithNoResults ? (
                                <div className="bg-amber-50 rounded-lg border border-amber-200 p-6 text-center">
                                  <p className="text-amber-900 font-medium mb-2">No Rankings Found</p>
                                  <p className="text-amber-700 text-sm mb-4">
                                    Analyzed {data.dataForSeoResults.analyzedKeywords || 0} keywords but this domain doesn't rank in top 100 for any of them
                                  </p>
                                  <div className="flex justify-center gap-3">
                                    {data.keywords.groups.map((group, idx) => (
                                      <a
                                        key={idx}
                                        href={group.ahrefsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-2 text-sm bg-orange-600 text-white hover:bg-orange-700 rounded-md transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Check ${group.name} keywords in Ahrefs`}
                                      >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {group.name} in Ahrefs
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                {/* Cache Info */}
                                {data.dataForSeoResults.cacheInfo && (
                                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-4">
                                        <span className="font-medium text-blue-900">
                                          {data.dataForSeoResults.analyzedKeywords} keywords analyzed
                                        </span>
                                        {data.dataForSeoResults.cacheInfo.cachedKeywords > 0 && (
                                          <span className="flex items-center text-blue-700">
                                            <Database className="w-3 h-3 mr-1" />
                                            {data.dataForSeoResults.cacheInfo.cachedKeywords} from cache
                                          </span>
                                        )}
                                        {data.dataForSeoResults.cacheInfo.newKeywords > 0 && (
                                          <span className="flex items-center text-blue-700">
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            {data.dataForSeoResults.cacheInfo.newKeywords} new
                                          </span>
                                        )}
                                      </div>
                                      {data.dataForSeoResults.cacheInfo.apiCallsSaved > 0 && (
                                        <span className="text-green-600 text-xs">
                                          ✨ {data.dataForSeoResults.cacheInfo.apiCallsSaved} API call{data.dataForSeoResults.cacheInfo.apiCallsSaved > 1 ? 's' : ''} saved
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <p className="text-sm text-gray-500">Total Rankings</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                      {data.dataForSeoResults.totalRankings}
                                    </p>
                                    {data.dataForSeoResults.totalRankings === 0 && data.dataForSeoResults.analyzedKeywords > 0 && (
                                      <p className="text-xs text-amber-600 mt-1">
                                        Not ranking for analyzed keywords
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Avg Position</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                      {data.dataForSeoResults.totalRankings > 0 ? data.dataForSeoResults.avgPosition.toFixed(1) : '-'}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Keyword Results with Search */}
                                {data.dataForSeoResults.totalRankings > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-sm font-medium text-gray-700">All Keyword Rankings</h5>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          placeholder="Search keywords..."
                                          value={dataForSeoSearchTerms[domain.id] || ''}
                                          onChange={(e) => setDataForSeoSearchTerms(prev => ({ ...prev, [domain.id]: e.target.value }))}
                                          className="text-xs px-2 py-1 border rounded focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <select
                                          value={dataForSeoPositionFilters[domain.id] || 'all'}
                                          onChange={(e) => setDataForSeoPositionFilters(prev => ({ ...prev, [domain.id]: e.target.value }))}
                                          className="text-xs px-2 py-1 border rounded focus:ring-1 focus:ring-indigo-500"
                                        >
                                          <option value="all">All Positions</option>
                                          <option value="1-10">Top 10</option>
                                          <option value="11-20">11-20</option>
                                          <option value="21-50">21-50</option>
                                          <option value="50+">50+</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Pos</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Volume</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">CPC</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Source</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {(() => {
                                            const searchTerm = dataForSeoSearchTerms[domain.id] || '';
                                            const positionFilter = dataForSeoPositionFilters[domain.id] || 'all';
                                            
                                            const filteredKeywords = (data.dataForSeoResults.allKeywords || []).filter(kw => {
                                              // Search filter
                                              if (searchTerm && !kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
                                                return false;
                                              }
                                              
                                              // Position filter
                                              if (positionFilter !== 'all') {
                                                if (positionFilter === '1-10' && kw.position > 10) return false;
                                                if (positionFilter === '11-20' && (kw.position < 11 || kw.position > 20)) return false;
                                                if (positionFilter === '21-50' && (kw.position < 21 || kw.position > 50)) return false;
                                                if (positionFilter === '50+' && kw.position <= 50) return false;
                                              }
                                              
                                              return true;
                                            });
                                            
                                            return filteredKeywords.map((kw, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm text-gray-900">{kw.keyword}</td>
                                                <td className="px-3 py-2 text-sm text-center">
                                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                    kw.position <= 3 ? 'bg-green-100 text-green-800' :
                                                    kw.position <= 10 ? 'bg-blue-100 text-blue-800' :
                                                    kw.position <= 20 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                  }`}>
                                                    {kw.position}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center text-gray-500">
                                                  {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center text-gray-500">
                                                  {kw.cpc ? `$${kw.cpc.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-xs" title={kw.url}>
                                                  {kw.url}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center">
                                                  {kw.isFromCache ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                                      <Database className="w-3 h-3" />
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                                      <RefreshCw className="w-3 h-3" />
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            ));
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Search className="w-4 h-4 mr-2" />
                                DataForSEO Analysis
                              </h4>
                              {loadingDataForSeo[domain.id] ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-8">
                                  <div className="flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                                    <p className="text-gray-600">Running DataForSEO analysis...</p>
                                    <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                                  <p className="text-gray-600 mb-4">
                                    No keyword data available. Click below to analyze keywords.
                                  </p>
                                  <div className="flex justify-center gap-3">
                                    {!props.hideExperimentalFeatures && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          runDataForSeoAnalysisInline(domain);
                                        }}
                                        disabled={props.loading}
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                      >
                                        <Search className="w-4 h-4 mr-2" />
                                        Analyze Keywords
                                      </button>
                                    )}
                                    {data.keywords.groups.map((group, idx) => (
                                      <a
                                        key={idx}
                                        href={group.ahrefsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-2 text-sm bg-orange-600 text-white hover:bg-orange-700 rounded-md transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Check ${group.name} keywords in Ahrefs`}
                                      >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {group.name} in Ahrefs
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* AI Qualification */}
                          {data.aiQualification && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" />
                                AI Qualification Analysis
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="mb-3">
                                  <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                                    getStatusColor(data.aiQualification.status)
                                  }`}>
                                    {getStatusIcon(data.aiQualification.status)}
                                    <span className="ml-1">{getStatusLabel(data.aiQualification.status)}</span>
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {data.aiQualification.reasoning}
                                </p>
                                {data.aiQualification.qualifiedAt && (
                                  <p className="text-xs text-gray-500 mt-3">
                                    Analyzed: {new Date(data.aiQualification.qualifiedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Target Page Selection */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Globe className="w-4 h-4 mr-2" />
                              Target Page Selection
                            </h4>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <div className="space-y-2">
                                {data.targetPages.map((page) => (
                                  <label key={page.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`target-page-${domain.id}`}
                                      checked={page.selected}
                                      onChange={() => {
                                        // TODO: Update target page selection
                                      }}
                                      className="text-indigo-600"
                                    />
                                    <span className="text-sm text-gray-700">{page.url}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Notes Section */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                            <textarea
                              value={localNotes[domain.id] || ''}
                              onChange={(e) => setLocalNotes({ ...localNotes, [domain.id]: e.target.value })}
                              onBlur={() => {
                                if (localNotes[domain.id] !== domain.notes) {
                                  props.onUpdateNotes(domain.id, localNotes[domain.id]);
                                }
                              }}
                              placeholder="Add notes about this domain..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              rows={3}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2">
                              {domain.qualificationStatus !== 'pending' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      props.onUpdateStatus(domain.id, 'pending' as any);
                                    }}
                                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset to Pending
                                  </button>
                                  {domain.aiQualificationReasoning && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {domain.wasManuallyQualified ? '👤 Human Modified' : 
                                         domain.wasHumanVerified ? '✅ Human Verified' : 
                                         '🤖 AI Qualified'}
                                      </span>
                                      <select
                                        value={domain.qualificationStatus}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          props.onUpdateStatus(domain.id, e.target.value as any, true);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                      >
                                        <option value="high_quality">High Quality</option>
                                        <option value="average_quality">Average Quality</option>
                                        <option value="disqualified">Disqualified</option>
                                      </select>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Press Enter to expand/collapse • Space to select • 1/2/3 to qualify
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}