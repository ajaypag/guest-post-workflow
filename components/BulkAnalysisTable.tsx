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
  Zap
} from 'lucide-react';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { TargetPage } from '@/types/user';
import { groupKeywordsByTopic } from '@/lib/utils/keywordGroupingV2';

interface BulkAnalysisTableProps {
  domains: BulkAnalysisDomain[];
  targetPages: TargetPage[];
  selectedDomains: Set<string>;
  onToggleSelection: (domainId: string) => void;
  onUpdateStatus: (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified') => void;
  onCreateWorkflow: (domain: BulkAnalysisDomain) => void;
  onDeleteDomain: (domainId: string) => void;
  onAnalyzeWithDataForSeo: (domain: BulkAnalysisDomain) => void;
  onUpdateNotes: (domainId: string, notes: string) => void;
  selectedPositionRange: string;
  hideExperimentalFeatures: boolean;
  loading: boolean;
  keywordInputMode: 'target-pages' | 'manual';
  manualKeywords?: string;
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
    topKeywords: Array<{
      keyword: string;
      position: number;
      searchVolume: number;
      url: string;
    }>;
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
    let dataForSeoResults: {
      totalRankings: number;
      avgPosition: number;
      topKeywords: Array<{
        keyword: string;
        position: number;
        searchVolume: number;
        url: string;
      }>;
    } | undefined;
    if (domain.hasDataForSeoResults) {
      try {
        const response = await fetch(`/api/clients/${domain.clientId}/bulk-analysis/dataforseo/results?domainId=${domainId}`);
        if (response.ok) {
          const data = await response.json();
          dataForSeoResults = {
            totalRankings: data.results.length,
            avgPosition: data.results.reduce((acc: number, r: any) => acc + r.position, 0) / data.results.length,
            topKeywords: data.results.slice(0, 5).map((r: any) => ({
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

  return (
    <div className="w-full">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={props.domains.length > 0 && props.domains.every(d => props.selectedDomains.has(d.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    props.domains.forEach(d => props.onToggleSelection(d.id));
                  } else {
                    props.domains.forEach(d => {
                      if (props.selectedDomains.has(d.id)) {
                        props.onToggleSelection(d.id);
                      }
                    });
                  }
                }}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Domain
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Keywords
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data Sources
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Target Page
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
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
                  } ${props.selectedDomains.has(domain.id) ? 'bg-indigo-50' : ''}`}
                  onClick={() => setFocusedDomainId(domain.id)}
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
                      <div>
                        <div className="text-sm font-medium text-gray-900">{domain.domain}</div>
                        {domain.notes && (
                          <div className="text-xs text-gray-500 mt-1">{domain.notes}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {domain.keywordCount} keywords
                  </td>
                  <td className="px-3 py-4">
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
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(domain.qualificationStatus)}`}>
                      {getStatusIcon(domain.qualificationStatus)}
                      <span className="ml-1">{getStatusLabel(domain.qualificationStatus)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {domain.selectedTargetPageId ? (
                      <span className="text-indigo-600">
                        {props.targetPages.find(p => p.id === domain.selectedTargetPageId)?.url || 'Selected'}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not selected</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      {domain.qualificationStatus === 'pending' ? (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onUpdateStatus(domain.id, 'high_quality');
                            }}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            title="Mark as High Quality (Press 1)"
                          >
                            High
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onUpdateStatus(domain.id, 'average_quality');
                            }}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            title="Mark as Average (Press 2)"
                          >
                            Avg
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onUpdateStatus(domain.id, 'disqualified');
                            }}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                            title="Disqualify (Press 3)"
                          >
                            DQ
                          </button>
                        </div>
                      ) : (
                        <>
                          {(domain.qualificationStatus === 'high_quality' || domain.qualificationStatus === 'average_quality') && !domain.hasWorkflow && (
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
                          {domain.hasWorkflow && (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              <FileText className="w-3 h-3 mr-1" />
                              Has Workflow
                            </span>
                          )}
                        </>
                      )}
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
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row Content */}
                {isExpanded && data && (
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
                                      <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                        group.relevance === 'core' 
                                          ? 'bg-green-100 text-green-800' 
                                          : group.relevance === 'related'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {group.relevance === 'core' ? 'Premium' : 
                                         group.relevance === 'related' ? 'Good' : 'Standard'}
                                      </span>
                                    </div>
                                    <a
                                      href={group.ahrefsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-4 h-4" />
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
                          {data.dataForSeoResults && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Search className="w-4 h-4 mr-2" />
                                DataForSEO Results
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <p className="text-sm text-gray-500">Total Rankings</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                      {data.dataForSeoResults.totalRankings}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Avg Position</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                      {data.dataForSeoResults.avgPosition.toFixed(1)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Topical Authority</p>
                                    <div className="flex items-center mt-1">
                                      <TrendingUp className="w-5 h-5 text-green-600 mr-1" />
                                      <span className="text-lg font-semibold text-green-600">Strong</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Top Rankings</h5>
                                  <div className="space-y-1">
                                    {data.dataForSeoResults.topKeywords.map((kw, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">{kw.keyword}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500">Pos: {kw.position}</span>
                                          <span className="text-gray-500">Vol: {kw.searchVolume}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
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
                              {!props.hideExperimentalFeatures && !data.dataForSeoResults && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    props.onAnalyzeWithDataForSeo(domain);
                                  }}
                                  disabled={props.loading}
                                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  <Search className="w-4 h-4 mr-2" />
                                  Analyze with DataForSEO
                                </button>
                              )}
                              {domain.qualificationStatus !== 'pending' && (
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