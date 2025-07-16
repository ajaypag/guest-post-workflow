'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, ChevronDown, ChevronRight, Target, Search, FileText, CheckCircle, AlertCircle, Copy, Eye, EyeOff, X, Brain, Sparkles, Loader2 } from 'lucide-react';
import { clientStorage } from '@/lib/userStorage';

interface KeywordResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const KeywordResearchStepClean = ({ step, workflow, onChange }: KeywordResearchStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'select-urls': true,
    'validate-site': false
  });
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [showAllTargetUrls, setShowAllTargetUrls] = useState(false);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  
  // Keyword management
  const KEYWORD_LIMIT = 50; // Conservative limit to prevent Ahrefs URL issues
  const [keywordCount, setKeywordCount] = useState(0);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grouping functionality
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [groupBy, setGroupBy] = useState<'path' | 'keywords'>('path');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // AI Analysis
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || '';
  const keywords = step.outputs.keywords || '';
  
  // Load client data with target pages
  const clientId = workflow.metadata?.clientId;
  const allActiveTargetPages = client?.targetPages?.filter((page: any) => page.status === 'active') || [];
  
  // Filter pages based on search query
  const activeTargetPages = allActiveTargetPages.filter((page: any) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const urlMatch = page.url.toLowerCase().includes(query);
    const keywordMatch = page.keywords && page.keywords.toLowerCase().includes(query);
    const descriptionMatch = page.description && page.description.toLowerCase().includes(query);
    const notesMatch = page.notes && page.notes.toLowerCase().includes(query);
    
    return urlMatch || keywordMatch || descriptionMatch || notesMatch;
  });
  
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId || loadingClient) return;
      
      setLoadingClient(true);
      try {
        const clientData = await clientStorage.getClient(clientId);
        setClient(clientData);
      } catch (error) {
        console.error('Error loading client:', error);
      } finally {
        setLoadingClient(false);
      }
    };

    loadClient();
  }, [clientId, loadingClient]);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate keywords from selected pages
  const calculateSelectedKeywords = useCallback(() => {
    const selectedPages = allActiveTargetPages.filter((page: any) => 
      selectedTargetPages.includes(page.id)
    );
    
    const existingKeywords = keywords ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [];
    const newKeywords: string[] = [];
    
    selectedPages.forEach((page: any) => {
      if (page.keywords && page.keywords.trim() !== '') {
        const pageKeywords = page.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
        newKeywords.push(...pageKeywords);
      }
    });
    
    // Deduplicate keywords (case-insensitive)
    const allKeywords = [...existingKeywords, ...newKeywords];
    const uniqueKeywords = allKeywords.filter((keyword, index) => {
      const lowerKeyword = keyword.toLowerCase();
      return allKeywords.findIndex((k: string) => k.toLowerCase() === lowerKeyword) === index;
    });
    
    return uniqueKeywords;
  }, [selectedTargetPages, keywords, allActiveTargetPages]);

  // Group pages by URL path
  const groupPagesByPath = (pages: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    pages.forEach(page => {
      try {
        const url = new URL(page.url);
        const pathSegments = url.pathname.split('/').filter(segment => segment);
        
        // Get the first meaningful path segment
        let groupKey = '/';
        if (pathSegments.length > 0) {
          groupKey = `/${pathSegments[0]}/`;
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(page);
      } catch (error) {
        // If URL parsing fails, put in "Other" group
        if (!groups['Other']) {
          groups['Other'] = [];
        }
        groups['Other'].push(page);
      }
    });
    
    return groups;
  };

  // Group pages by keyword themes (simple implementation)
  const groupPagesByKeywords = (pages: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    pages.forEach(page => {
      if (!page.keywords || page.keywords.trim() === '') {
        // Pages without keywords
        if (!groups['No Keywords']) {
          groups['No Keywords'] = [];
        }
        groups['No Keywords'].push(page);
        return;
      }
      
      const keywords = page.keywords.split(',').map((k: string) => k.trim().toLowerCase());
      
      // Simple keyword theme detection
      let groupKey = 'Other';
      
      if (keywords.some((k: string) => k.includes('seo') || k.includes('search') || k.includes('ranking'))) {
        groupKey = 'SEO & Search';
      } else if (keywords.some((k: string) => k.includes('content') || k.includes('blog') || k.includes('article'))) {
        groupKey = 'Content Marketing';
      } else if (keywords.some((k: string) => k.includes('tool') || k.includes('software') || k.includes('platform'))) {
        groupKey = 'Tools & Software';
      } else if (keywords.some((k: string) => k.includes('service') || k.includes('consulting') || k.includes('agency'))) {
        groupKey = 'Services';
      } else if (keywords.some((k: string) => k.includes('product') || k.includes('feature') || k.includes('solution'))) {
        groupKey = 'Products';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(page);
    });
    
    return groups;
  };

  // Get grouped pages
  const groupedPages = showGroupedView 
    ? (groupBy === 'path' ? groupPagesByPath(activeTargetPages) : groupPagesByKeywords(activeTargetPages))
    : null;

  // Update keyword count when selection changes
  useEffect(() => {
    const currentKeywords = calculateSelectedKeywords();
    setSelectedKeywords(currentKeywords);
    setKeywordCount(currentKeywords.length);
  }, [selectedTargetPages, keywords, allActiveTargetPages, calculateSelectedKeywords]);

  // Distribute keywords evenly across selected pages
  const distributeKeywords = (keywords: string[], limit: number) => {
    if (keywords.length <= limit) return keywords;
    
    // Get selected pages for better distribution
    const selectedPages = allActiveTargetPages.filter((page: any) => 
      selectedTargetPages.includes(page.id)
    );
    
    if (selectedPages.length === 0) return keywords.slice(0, limit);
    
    const distributedKeywords: string[] = [];
    const keywordsPerPage = Math.ceil(limit / selectedPages.length);
    
    // Take keywords from each page evenly
    selectedPages.forEach((page: any, pageIndex: number) => {
      if (distributedKeywords.length >= limit) return;
      
      const pageKeywords = page.keywords ? page.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [];
      const keywordsToTake = Math.min(keywordsPerPage, limit - distributedKeywords.length);
      
      pageKeywords.slice(0, keywordsToTake).forEach((keyword: string) => {
        if (distributedKeywords.length < limit && !distributedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
          distributedKeywords.push(keyword);
        }
      });
    });
    
    // If still under limit, fill with remaining keywords
    if (distributedKeywords.length < limit) {
      keywords.forEach(keyword => {
        if (distributedKeywords.length < limit && !distributedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
          distributedKeywords.push(keyword);
        }
      });
    }
    
    return distributedKeywords;
  };

  // Build multiple Ahrefs URLs for batches of keywords
  const buildAhrefsUrls = () => {
    if (!guestPostSite) {
      return [{ url: "https://app.ahrefs.com/v2-site-explorer/organic-keywords", batch: 1, keywords: [] }];
    }
    
    let cleanDomain = guestPostSite.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    // Distribute keywords across pages
    const allKeywords = selectedKeywords.length > 0 ? selectedKeywords : 
                       (keywords.trim() ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : []);
    
    if (allKeywords.length === 0) {
      const baseUrl = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=&keywordRules=&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc&target=${encodeURIComponent(targetUrl)}&urlRules=&volume_type=average`;
      return [{ url: baseUrl, batch: 1, keywords: [] }];
    }
    
    // Create batches of keywords
    const batches: { url: string, batch: number, keywords: string[] }[] = [];
    const distributedKeywords = distributeKeywords(allKeywords, allKeywords.length);
    
    for (let i = 0; i < distributedKeywords.length; i += KEYWORD_LIMIT) {
      const batchKeywords = distributedKeywords.slice(i, i + KEYWORD_LIMIT);
      const cleanKeywords = batchKeywords.join(', ');
      const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
      const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
      
      let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
      url += `&keywordRules=${keywordRulesEncoded}`;
      url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
      url += `&target=${encodeURIComponent(targetUrl)}`;
      url += `&urlRules=&volume_type=average`;
      
      batches.push({ 
        url, 
        batch: Math.floor(i / KEYWORD_LIMIT) + 1, 
        keywords: batchKeywords 
      });
    }
    
    return batches;
  };

  // Build dynamic Ahrefs URL (with keyword limit protection) - for backward compatibility
  const buildAhrefsUrl = () => {
    const urls = buildAhrefsUrls();
    return urls[0]?.url || "https://app.ahrefs.com/v2-site-explorer/organic-keywords";
  };

  const dynamicAhrefsUrl = buildAhrefsUrl();

  // Status indicators
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'select-urls':
        return (step.outputs.keywords || step.outputs.urlSummaries) ? 'completed' : 'pending';
      case 'validate-site':
        return step.outputs.csvExported ? 'completed' : 
               (step.outputs.keywords || step.outputs.urlSummaries) ? 'ready' : 'pending';
      default:
        return 'pending';
    }
  };

  // AI Analysis function
  const runAiAnalysis = async (topCount: number = 20) => {
    if (!guestPostSite || activeTargetPages.length === 0) {
      setAiError('Please ensure you have a guest post site selected and target URLs available.');
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);
    setShowAiAnalysis(true);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/analyze-target-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestPostSite,
          targetPageIds: activeTargetPages.map((page: any) => page.id),
          clientId,
          topCount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze URLs');
      }

      setAiResults(data);
      
      // Auto-select the top recommended URLs
      if (data.rankedPageIds && data.rankedPageIds.length > 0) {
        setSelectedTargetPages(data.rankedPageIds);
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiError(error instanceof Error ? error.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ready':
        return <Target className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/31c7f383913d4dc5bae49935b31f88b5?t=19&sid=0e73abf0-8aa1-42f7-9a6e-b4edb52ef113"
        title="Site Qualification and Preparation Tutorial"
        description="Learn how to research and qualify your guest post site before creating content"
        timestamp="0:19"
      />

      {/* Section 1: Select Target URLs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('select-urls')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('select-urls')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Section 1: Select Target URLs</h3>
              <p className="text-sm text-gray-500">Choose which client URLs to target in this guest post</p>
            </div>
          </div>
          {expandedSections['select-urls'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['select-urls'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Overview */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">📌 Your Client URLs with Keywords & Descriptions</h4>
                <p className="text-sm text-purple-800">
                  Below are your client's target URLs with AI-generated keywords and descriptions. Select the ones you want to target in this guest post.
                </p>
              </div>

              {/* Tools & Controls Panel */}
              {allActiveTargetPages.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">🔧 Tools & Controls</h5>
                    {selectedTargetPages.length > 0 && (
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        {selectedTargetPages.length} page{selectedTargetPages.length === 1 ? '' : 's'} selected
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Search & Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search & Filter</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Filter URLs, keywords, or descriptions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {searchQuery && (
                        <p className="text-xs text-gray-600 mt-1">
                          Showing {activeTargetPages.length} of {allActiveTargetPages.length} URLs
                        </p>
                      )}
                    </div>

                    {/* AI Analysis Tool */}
                    {guestPostSite && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">AI Analysis Tool</label>
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center mb-2">
                            <Brain className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-900">Smart Selection</span>
                            <Sparkles className="w-3 h-3 text-purple-500 ml-2" />
                          </div>
                          <p className="text-xs text-purple-700 mb-3">
                            Analyzes {guestPostSite} content to recommend most relevant URLs
                          </p>
                          {!showAiAnalysis && !isAnalyzing && (
                            <button
                              onClick={() => runAiAnalysis(20)}
                              className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                            >
                              <Brain className="w-4 h-4" />
                              <span>Analyze & Select Top 20</span>
                            </button>
                          )}
                          {isAnalyzing && (
                            <div className="bg-white border border-purple-200 rounded-lg p-3">
                              <div className="flex items-center space-x-3 mb-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">Analyzing {guestPostSite}...</span>
                              </div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <p>🔍 Searching web for site content...</p>
                                <p>🧠 Analyzing {allActiveTargetPages.length} target URLs...</p>
                                <p>⏱️ This may take 30-60 seconds...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grouping Controls */}
                  {allActiveTargetPages.length > 5 && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={showGroupedView}
                              onChange={(e) => setShowGroupedView(e.target.checked)}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Group View</span>
                          </label>
                          
                          {showGroupedView && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Group by:</span>
                              <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as 'path' | 'keywords')}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              >
                                <option value="path">URL Path</option>
                                <option value="keywords">Keyword Themes</option>
                              </select>
                            </div>
                          )}
                        </div>
                        
                        {showGroupedView && groupedPages && (
                          <div className="text-sm text-gray-600">
                            {Object.keys(groupedPages).length} groups
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis Results */}
              {showAiAnalysis && aiResults && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Brain className="w-5 h-5 text-purple-600 mr-2" />
                      <h4 className="font-medium text-purple-900">AI Analysis Results</h4>
                      <Sparkles className="w-4 h-4 text-purple-500 ml-2" />
                    </div>
                    <button
                      onClick={() => {
                        setShowAiAnalysis(false);
                        setAiResults(null);
                      }}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Hide Results
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white border border-purple-200 rounded-lg p-3">
                      <h5 className="font-medium text-purple-900 mb-2">Site Analysis</h5>
                      <p className="text-sm text-gray-700">{aiResults.siteAnalysis}</p>
                    </div>

                    <div className="bg-white border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-purple-900">Recommended URLs ({aiResults.rankedUrls?.length || 0})</h5>
                        <span className="text-xs text-purple-600">Auto-selected below</span>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {aiResults.rankedUrls?.map((result: any, index: number) => (
                          <div key={index} className="border-l-4 border-purple-400 pl-3 py-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {index + 1}. {result.url}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">{result.reasoning}</p>
                                {result.topicalOverlap?.length > 0 && (
                                  <div className="mt-1">
                                    <span className="text-xs text-purple-600">
                                      Topics: {result.topicalOverlap.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                result.confidenceLevel === 'high' ? 'bg-green-100 text-green-800' :
                                result.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {result.confidenceLevel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <p className="text-purple-700">
                        Analysis completed in {(aiResults.processingTime / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {allActiveTargetPages.length > 0 && activeTargetPages.length === 0 && searchQuery && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">No URLs found</p>
                  <p className="text-sm text-gray-500">Try adjusting your search terms</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* Client Target URLs - Grouped View */}
              {showGroupedView && groupedPages && Object.keys(groupedPages).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(groupedPages)
                    .sort(([a], [b]) => b.localeCompare(a)) // Sort groups
                    .map(([groupName, pages]) => (
                    <div key={groupName} className="bg-purple-50 border border-purple-200 rounded-lg">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedGroups);
                          if (newExpanded.has(groupName)) {
                            newExpanded.delete(groupName);
                          } else {
                            newExpanded.add(groupName);
                          }
                          setExpandedGroups(newExpanded);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {expandedGroups.has(groupName) ? (
                            <ChevronDown className="w-4 h-4 text-purple-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-purple-600" />
                          )}
                          <span className="font-medium text-purple-900">{groupName}</span>
                          <span className="text-sm text-purple-700">({pages.length})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Group-level keyword counter */}
                          <div className="text-xs text-purple-600">
                            {pages.filter((page: any) => selectedTargetPages.includes(page.id)).length} selected
                          </div>
                          
                          {/* Select All in Group button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const pagesWithData = pages.filter((page: any) => 
                                (page.keywords && page.keywords.trim() !== '') || (page.description && page.description.trim() !== '')
                              );
                              
                              if (pagesWithData.length > 0) {
                                const allGroupPagesSelected = pagesWithData.every((page: any) => selectedTargetPages.includes(page.id));
                                
                                if (allGroupPagesSelected) {
                                  // Deselect all pages in this group
                                  const groupPageIds = pagesWithData.map((page: any) => page.id);
                                  setSelectedTargetPages(prev => prev.filter(id => !groupPageIds.includes(id)));
                                } else {
                                  // Select all pages in this group
                                  const groupPageIds = pagesWithData.map((page: any) => page.id);
                                  setSelectedTargetPages(prev => {
                                    const newSelection = [...prev];
                                    groupPageIds.forEach(id => {
                                      if (!newSelection.includes(id)) {
                                        newSelection.push(id);
                                      }
                                    });
                                    return newSelection;
                                  });
                                }
                              }
                            }}
                            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            {(() => {
                              const pagesWithData = pages.filter((page: any) => 
                                (page.keywords && page.keywords.trim() !== '') || (page.description && page.description.trim() !== '')
                              );
                              const allGroupPagesSelected = pagesWithData.every((page: any) => selectedTargetPages.includes(page.id));
                              return allGroupPagesSelected ? 'Deselect All' : `Select All (${pagesWithData.length})`;
                            })()}
                          </button>
                        </div>
                      </button>
                      
                      {expandedGroups.has(groupName) && (
                        <div className="px-4 pb-4 border-t border-purple-200">
                          <div className="grid grid-cols-1 gap-2 mt-3">
                            {pages.map((page: any) => (
                              <div 
                                key={page.id}
                                className="bg-white border border-purple-200 rounded-lg p-2 flex items-center group hover:bg-purple-50 transition-colors"
                              >
                                {/* Checkbox for pages with keywords or descriptions */}
                                {(page.keywords && page.keywords.trim() !== '') || (page.description && page.description.trim() !== '') ? (
                                  <div className="mr-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedTargetPages.includes(page.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.target.checked) {
                                          setSelectedTargetPages(prev => [...prev, page.id]);
                                        } else {
                                          setSelectedTargetPages(prev => prev.filter(id => id !== page.id));
                                        }
                                      }}
                                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                    />
                                  </div>
                                ) : null}
                                
                                <div 
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => {
                                    navigator.clipboard.writeText(page.url);
                                    setCopiedUrl(page.url);
                                    setTimeout(() => setCopiedUrl(null), 2000);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-900 truncate">
                                        {page.url}
                                      </p>
                                      {page.keywords && page.keywords.trim() !== '' && (
                                        <p className="text-xs text-purple-600 truncate">
                                          {page.keywords.split(',').length} keywords available
                                        </p>
                                      )}
                                      {page.description && page.description.trim() !== '' && (
                                        <p className="text-xs text-green-600 truncate">
                                          Description available ({page.description.length} chars)
                                        </p>
                                      )}
                                      {page.notes && (
                                        <p className="text-xs text-gray-500 truncate">{page.notes}</p>
                                      )}
                                    </div>
                                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {copiedUrl === page.url ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-purple-600" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Selected URLs Button - Always visible when pages are selected */}
              {selectedTargetPages.length > 0 && (
                <div className={`p-3 rounded-lg transition-all ${
                  showGroupedView 
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg' 
                    : 'bg-purple-50 border border-purple-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        showGroupedView ? 'text-white' : 'text-purple-900'
                      }`}>
                        {selectedTargetPages.length} page{selectedTargetPages.length !== 1 ? 's' : ''} selected
                      </p>
                      <p className={`text-xs ${
                        showGroupedView ? 'text-purple-100' : 'text-purple-700'
                      }`}>
                        {showGroupedView ? 'Click to add all selected pages to your workflow' : 'Will add keywords and descriptions to your workflow'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Get data from selected pages (from all pages, not just filtered)
                        const selectedPages = allActiveTargetPages.filter((page: any) => 
                          selectedTargetPages.includes(page.id)
                        );
                        
                        // Collect keywords from pages that have them
                        const existingKeywords = keywords ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [];
                        const newKeywords: string[] = [];
                        
                        selectedPages.forEach((page: any) => {
                          if (page.keywords && page.keywords.trim() !== '') {
                            const pageKeywords = page.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
                            newKeywords.push(...pageKeywords);
                          }
                        });
                        
                        // Deduplicate keywords (case-insensitive)
                        const allKeywords = [...existingKeywords, ...newKeywords];
                        const uniqueKeywords = allKeywords.filter((keyword, index) => {
                          const lowerKeyword = keyword.toLowerCase();
                          return allKeywords.findIndex((k: string) => k.toLowerCase() === lowerKeyword) === index;
                        });

                        // Collect URLs and descriptions
                        const pagesWithDescriptions = selectedPages.filter((page: any) => 
                          page.description && page.description.trim() !== ''
                        );
                        const urls = pagesWithDescriptions.map((page: any) => page.url).join('\n');
                        const descriptions = pagesWithDescriptions.map((page: any) => 
                          `${page.url}\n${page.description}`
                        ).join('\n\n');
                        
                        // Update both keywords and descriptions
                        const updateData: any = {};
                        if (uniqueKeywords.length > 0) {
                          updateData.keywords = uniqueKeywords.join(', ');
                        }
                        if (urls) {
                          updateData.clientUrls = urls;
                          updateData.urlSummaries = descriptions;
                        }
                        
                        onChange(updateData);
                        
                        // Clear selection
                        setSelectedTargetPages([]);
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      Add Selected URLs to Workflow
                    </button>
                  </div>
                </div>
              )}

              {/* Client Target URLs - Regular List View */}
              {!showGroupedView && activeTargetPages.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-purple-800">
                      📌 Your Client's Target URLs ({activeTargetPages.length})
                    </h4>
                    <div className="flex items-center space-x-2">
                      {/* Keyword Counter */}
                      <div className={`text-xs px-3 py-1 rounded-lg font-medium ${
                        keywordCount > KEYWORD_LIMIT 
                          ? 'bg-red-100 text-red-800 border border-red-300' 
                          : keywordCount > KEYWORD_LIMIT * 0.8 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          : 'bg-green-100 text-green-800 border border-green-300'
                      }`}>
                        {keywordCount}/{KEYWORD_LIMIT} keywords
                      </div>
                      
                      <button
                        onClick={() => window.open(`/clients/${clientId}`, '_blank')}
                        className="text-xs px-3 py-1 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors flex items-center space-x-1"
                      >
                        <Target className="w-3 h-3" />
                        <span>Add More</span>
                      </button>
                      <button
                        onClick={() => {
                          const allUrls = activeTargetPages.map((page: any) => page.url).join('\n');
                          navigator.clipboard.writeText(allUrls);
                          setCopiedUrl('all');
                          setTimeout(() => setCopiedUrl(null), 2000);
                        }}
                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1"
                      >
                        {copiedUrl === 'all' ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>
                      {activeTargetPages.length > 5 && (
                        <button
                          onClick={() => setShowAllTargetUrls(!showAllTargetUrls)}
                          className="text-xs px-3 py-1 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors flex items-center space-x-1"
                        >
                          {showAllTargetUrls ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Show Less</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Show All</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Keyword Limit Warning */}
                  {keywordCount > KEYWORD_LIMIT && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Large keyword set detected</p>
                          <p className="text-xs text-red-700">
                            You have {keywordCount} keywords selected. With more than {KEYWORD_LIMIT} keywords, 
                            we'll create multiple Ahrefs buttons (one for each batch of {KEYWORD_LIMIT} keywords) to ensure all URLs work properly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-purple-700">
                      Click any URL to copy it. Check pages with keywords/descriptions to add them to your workflow.
                    </p>
                    {(() => {
                      const pagesWithData = activeTargetPages.filter((page: any) => 
                        (page.keywords && page.keywords.trim() !== '') || (page.description && page.description.trim() !== '')
                      );
                      
                      if (pagesWithData.length > 1) {
                        const allDataPagesSelected = pagesWithData.every((page: any) => selectedTargetPages.includes(page.id));
                        return (
                          <button
                            onClick={() => {
                              if (allDataPagesSelected) {
                                // Deselect all pages with data
                                const allDataIds = pagesWithData.map((page: any) => page.id);
                                setSelectedTargetPages(prev => prev.filter((id: string) => !allDataIds.includes(id)));
                              } else {
                                // Select all pages with data (regardless of visibility)
                                const allDataIds = pagesWithData.map((page: any) => page.id);
                                setSelectedTargetPages(prev => {
                                  const newSelection = [...prev];
                                  allDataIds.forEach((id: string) => {
                                    if (!newSelection.includes(id)) {
                                      newSelection.push(id);
                                    }
                                  });
                                  return newSelection;
                                });
                              }
                            }}
                            className="text-xs px-3 py-1 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors flex items-center space-x-1"
                          >
                            <input
                              type="checkbox"
                              checked={allDataPagesSelected}
                              readOnly
                              className="w-3 h-3 text-purple-600 pointer-events-none"
                            />
                            <span>{allDataPagesSelected ? 'Deselect All' : `Select All (${pagesWithData.length})`}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {(showAllTargetUrls ? activeTargetPages : activeTargetPages.slice(0, 5)).map((page: any, index: number) => (
                      <div 
                        key={page.id}
                        className="bg-white border border-purple-200 rounded-lg p-2 flex items-center group hover:bg-purple-50 transition-colors"
                      >
                        {/* Checkbox for pages with keywords or descriptions */}
                        {(page.keywords && page.keywords.trim() !== '') || (page.description && page.description.trim() !== '') ? (
                          <div className="mr-3">
                            <input
                              type="checkbox"
                              checked={selectedTargetPages.includes(page.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedTargetPages(prev => [...prev, page.id]);
                                } else {
                                  setSelectedTargetPages(prev => prev.filter(id => id !== page.id));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                          </div>
                        ) : null}
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(page.url);
                            setCopiedUrl(page.url);
                            setTimeout(() => setCopiedUrl(null), 2000);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {page.url}
                              </p>
                              {page.keywords && page.keywords.trim() !== '' && (
                                <p className="text-xs text-purple-600 truncate">
                                  {page.keywords.split(',').length} keywords available
                                </p>
                              )}
                              {page.description && page.description.trim() !== '' && (
                                <p className="text-xs text-green-600 truncate">
                                  Description available ({page.description.length} chars)
                                </p>
                              )}
                              {page.notes && (
                                <p className="text-xs text-gray-500 truncate">{page.notes}</p>
                              )}
                            </div>
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedUrl === page.url ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Keyword Cloud Preview */}
                  {selectedKeywords.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">
                        Selected Keywords ({selectedKeywords.length}/{KEYWORD_LIMIT})
                      </h5>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {selectedKeywords.slice(0, KEYWORD_LIMIT).map((keyword, index) => (
                          <span
                            key={index}
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              index < KEYWORD_LIMIT * 0.8 
                                ? 'bg-blue-100 text-blue-800' 
                                : index < KEYWORD_LIMIT 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {keyword}
                          </span>
                        ))}
                        {selectedKeywords.length > KEYWORD_LIMIT && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            +{selectedKeywords.length - KEYWORD_LIMIT} more (will be limited)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!showAllTargetUrls && activeTargetPages.length > 5 && (
                    <p className="text-xs text-purple-600 mt-2 text-center">
                      ...and {activeTargetPages.length - 5} more URLs
                    </p>
                  )}
                </div>
              )}

              {/* Encourage adding target URLs when none exist */}
              {activeTargetPages.length === 0 && clientId && !loadingClient && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-amber-600" />
                      <h4 className="font-medium text-amber-800">💡 Add Target URLs First</h4>
                    </div>
                    <button
                      onClick={() => window.open(`/clients/${clientId}`, '_blank')}
                      className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>Add Target URLs</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-amber-700">
                    Add target URLs to this client to access pre-generated keywords and descriptions for efficient workflow creation.
                  </p>
                </div>
              )}

              {/* Manual input as fallback */}
              <div className="border-t pt-4">
                <h5 className="font-medium text-gray-700 mb-3">Manual Input (if not using selection above)</h5>
                <div className="space-y-4">
                  <SavedField
                    label="Keywords"
                    value={step.outputs.keywords || ''}
                    placeholder="Enter keywords manually or use selection above"
                    onChange={(value) => onChange({ ...step.outputs, keywords: value })}
                    isTextarea={true}
                    height="h-24"
                  />
                  
                  <SavedField
                    label="Client URLs"
                    value={step.outputs.clientUrls || ''}
                    placeholder="Enter client URLs manually or use selection above"
                    onChange={(value) => onChange({ ...step.outputs, clientUrls: value })}
                    isTextarea={true}
                    height="h-24"
                  />

                  <SavedField
                    label="URL Descriptions"
                    value={step.outputs.urlSummaries || ''}
                    placeholder="Enter URL descriptions manually or use selection above"
                    onChange={(value) => onChange({ ...step.outputs, urlSummaries: value })}
                    isTextarea={true}
                    height="h-32"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Validate Guest Post Site */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('validate-site')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('validate-site')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Section 2: Validate Guest Post Site</h3>
              <p className="text-sm text-gray-500">Check if this site can rank for your client's topics</p>
            </div>
          </div>
          {expandedSections['validate-site'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['validate-site'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Status indicator */}
              {!guestPostSite ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Complete Step 1 (Guest Post Site Selection) first</p>
                  </div>
                </div>
              ) : !keywords.trim() ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Select target URLs above to generate the Ahrefs URL</p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-sm text-green-800">Ready to validate with: <strong>{guestPostSite}</strong></p>
                  </div>
                </div>
              )}

              {/* Validation explanation */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Validation Strategy</h4>
                <p className="text-sm text-blue-800">
                  Use Ahrefs to check if the guest post site has ranking history for topics related to your selected client URLs. This confirms the site has topical authority.
                </p>
              </div>

              {/* Ahrefs links */}
              <div className="space-y-3">
                {(() => {
                  const ahrefsUrls = buildAhrefsUrls();
                  const hasMultipleBatches = ahrefsUrls.length > 1;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {hasMultipleBatches 
                            ? `Open Ahrefs in ${ahrefsUrls.length} batches (${KEYWORD_LIMIT} keywords each):`
                            : 'Open Ahrefs (pre-filled with your keywords):'
                          }
                        </h4>
                        {!hasMultipleBatches && (
                          <CopyButton text={dynamicAhrefsUrl} label="Copy URL" />
                        )}
                      </div>
                      
                      {hasMultipleBatches && selectedKeywords.length > KEYWORD_LIMIT && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-amber-800">
                                Too many keywords for one Ahrefs URL ({selectedKeywords.length} total)
                              </p>
                              <p className="text-xs text-amber-700 mt-1">
                                Keywords have been distributed evenly across {selectedTargetPages.length} selected pages. 
                                Click each batch below to check different sets of keywords.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className={hasMultipleBatches ? "space-y-2" : ""}>
                        {ahrefsUrls.map(({ url, batch, keywords: batchKeywords }, index) => (
                          <div key={index} className={hasMultipleBatches ? "flex items-center space-x-2" : ""}>
                            <a 
                              href={url} 
                              target="_blank" 
                              className={`inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors ${
                                hasMultipleBatches ? 'flex-1' : ''
                              }`}
                            >
                              {hasMultipleBatches 
                                ? `Batch ${batch}: Check ${batchKeywords.length} keywords`
                                : 'Open Ahrefs Site Explorer'
                              }
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                            {hasMultipleBatches && (
                              <CopyButton text={url} label="Copy" />
                            )}
                          </div>
                        ))}
                      </div>

                      {guestPostSite && (selectedKeywords.length > 0 || keywords.trim()) && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <p className="font-medium text-gray-700 mb-1">Pre-configured with:</p>
                          <ul className="text-gray-600 space-y-1">
                            <li>• Site: {guestPostSite}</li>
                            {hasMultipleBatches ? (
                              <>
                                <li>• Total Keywords: {selectedKeywords.length}</li>
                                <li>• Batches: {ahrefsUrls.length} (up to {KEYWORD_LIMIT} keywords each)</li>
                                <li className="text-xs text-gray-500 italic">
                                  Keywords distributed evenly from {selectedTargetPages.length} selected pages
                                </li>
                              </>
                            ) : (
                              <li>
                                • Keywords: {selectedKeywords.length > 0 
                                  ? selectedKeywords.join(', ').substring(0, 100)
                                  : keywords.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim().substring(0, 100)
                                }
                                {(selectedKeywords.join(', ').length > 100 || keywords.length > 100) ? '...' : ''}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Next steps */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">In Ahrefs:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Review the keyword results to see if the site has ranking history</li>
                  <li>2. Export to CSV if there are relevant keywords</li>
                  <li>3. If no relevant results, this site may not be viable for your client</li>
                </ol>
              </div>

              {/* Status selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ahrefs Validation Result</label>
                <select
                  value={step.outputs.csvExported || ''}
                  onChange={(e) => onChange({ ...step.outputs, csvExported: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select result...</option>
                  <option value="exported">✅ CSV Exported - Site has relevant keyword rankings</option>
                  <option value="not-viable">❌ No relevant results - Site not viable for this client</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};