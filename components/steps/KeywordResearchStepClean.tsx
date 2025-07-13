'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, ChevronDown, ChevronRight, Target, Search, FileText, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { clientStorage } from '@/lib/userStorage';

interface KeywordResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const KeywordResearchStepClean = ({ step, workflow, onChange }: KeywordResearchStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    '2a': true,
    '2b': false,
    '2c': false
  });
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [showAllTargetUrls, setShowAllTargetUrls] = useState(false);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);

  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || '';
  const keywords = step.outputs.keywords || '';
  
  // Load client data with target pages
  const clientId = workflow.metadata?.clientId;
  const activeTargetPages = client?.targetPages?.filter((page: any) => page.status === 'active') || [];
  
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
  }, [clientId]);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Build dynamic Ahrefs URL (keeping existing logic)
  const buildAhrefsUrl = () => {
    if (!guestPostSite) {
      return "https://app.ahrefs.com/v2-site-explorer/organic-keywords";
    }
    
    let cleanDomain = guestPostSite.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
    
    if (keywords.trim()) {
      const cleanKeywords = keywords.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
      const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
      const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
      url += `&keywordRules=${keywordRulesEncoded}`;
    } else {
      url += `&keywordRules=`;
    }
    
    url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
    url += `&target=${encodeURIComponent(targetUrl)}`;
    url += `&urlRules=&volume_type=average`;
    
    return url;
  };

  const dynamicAhrefsUrl = buildAhrefsUrl();

  // Status indicators
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case '2a':
        return step.outputs.keywords ? 'completed' : 'pending';
      case '2b':
        return step.outputs.csvExported ? 'completed' : 
               step.outputs.keywords ? 'ready' : 'pending';
      case '2c':
        return step.outputs.urlSummaries ? 'completed' : 'pending';
      default:
        return 'pending';
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

      {/* Step 2a: Find Keywords */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2a')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2a')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2a: Find Topically Relevant Keywords</h3>
              <p className="text-sm text-gray-500">Generate keywords using AI analysis</p>
            </div>
          </div>
          {expandedSections['2a'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2a'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Strategy explanation */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Strategy: Find Topic Overlap</h4>
                <p className="text-sm text-blue-800">
                  Identify topics where both the guest post site and your client have authority. 
                  This increases ranking potential because the site has proven topical relevance.
                </p>
              </div>

              {/* Action steps */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">1</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-2">
                      Submit your client URLs to the GPT. <strong>Include specific target pages, not just the homepage:</strong>
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-600 mb-2">Homepage: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{workflow.clientUrl}</code></p>
                      <p className="text-xs text-gray-600">💡 <strong>Recommended:</strong> Add specific target pages you want to link to for broader keyword analysis</p>
                    </div>
                    <a 
                      href="https://chatgpt.com/g/g-685ea890d99c8191bd1550784c329f03-find-topically-relevant-keywords-your-client-page?model=o3" 
                      target="_blank" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open Keywords GPT <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </div>
                </div>

                {/* Client Target URLs */}
                {activeTargetPages.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-purple-800">
                        📌 Your Client's Target URLs ({activeTargetPages.length})
                      </h4>
                      <div className="flex items-center space-x-2">
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
                    <p className="text-sm text-purple-700 mb-3">
                      Click any URL to copy it. Check pages with keywords to add them to your workflow.
                    </p>
                    
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

                    {/* Add Selected Keywords Button */}
                    {selectedTargetPages.length > 0 && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-900">
                              {selectedTargetPages.length} page{selectedTargetPages.length !== 1 ? 's' : ''} selected
                            </p>
                            <p className="text-xs text-purple-700">
                              Will populate both keywords (2A) and descriptions (2C) for selected pages
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // Get data from selected pages
                              const selectedPages = activeTargetPages.filter((page: any) => 
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

                              // Collect URLs and descriptions for Step 2C
                              const pagesWithDescriptions = selectedPages.filter((page: any) => 
                                page.description && page.description.trim() !== ''
                              );
                              const urls = pagesWithDescriptions.map((page: any) => page.url).join('\n');
                              const descriptions = pagesWithDescriptions.map((page: any) => 
                                `${page.url}\n${page.description}`
                              ).join('\n\n');
                              
                              // Update both keywords (2A) and descriptions (2C)
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
                            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                          >
                            Add to Workflow (Keywords + Descriptions)
                          </button>
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
                        <h4 className="font-medium text-amber-800">💡 Enhance Your Keyword Research</h4>
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
                      Add target URLs to this client for more efficient keyword research. This gives you quick access to specific pages for analysis instead of just using the homepage.
                    </p>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">2</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-2">Use this follow-up prompt to expand coverage:</p>
                    <div className="bg-gray-50 rounded-lg p-3 relative">
                      <div className="absolute top-2 right-2">
                        <CopyButton 
                          text="And what about listicles that this site would show up on? What various themes could those listicles be about? Think about one word themes. While it's okay to be specific, keep in mind that oftentimes this is an industry that overlaps with many other industries, or it may serve a different purpose. Maybe it's a good thing to gift. For example, maybe it's a good thing for hobbyists - think wide as well. Merge your output with the output from above."
                          label="Copy"
                        />
                      </div>
                      <p className="text-sm text-gray-600 pr-12">
                        "And what about listicles that this site would show up on? What various themes could those listicles be about? Think about one word themes..."
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input field */}
              <SavedField
                label="Keywords from GPT"
                value={step.outputs.keywords || ''}
                placeholder="Paste the list of keywords generated by the GPT"
                onChange={(value) => onChange({ ...step.outputs, keywords: value })}
                isTextarea={true}
                height="h-32"
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 2b: Validate in Ahrefs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2b')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2b')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2b: Validate Keywords in Ahrefs</h3>
              <p className="text-sm text-gray-500">Check if the guest post site ranks for these topics</p>
            </div>
          </div>
          {expandedSections['2b'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2b'] && (
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
                    <p className="text-sm text-yellow-800">Complete Step 2a above to generate the Ahrefs URL</p>
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

              {/* Ahrefs link */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Open Ahrefs with pre-filled filters:</h4>
                  <CopyButton text={dynamicAhrefsUrl} label="Copy URL" />
                </div>
                
                <a 
                  href={dynamicAhrefsUrl} 
                  target="_blank" 
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Open Ahrefs Site Explorer <ExternalLink className="w-4 h-4 ml-2" />
                </a>

                {guestPostSite && keywords.trim() && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-gray-700 mb-1">Pre-configured with:</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Site: {guestPostSite}</li>
                      <li>• Keywords: {keywords.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim().substring(0, 100)}{keywords.length > 100 ? '...' : ''}</li>
                    </ul>
                  </div>
                )}
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

      {/* Step 2c: Identify Target URLs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2c')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2c')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2c: Identify Target Client URLs</h3>
              <p className="text-sm text-gray-500">Determine which client pages to link to</p>
            </div>
          </div>
          {expandedSections['2c'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2c'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Goal */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Goal: Choose Your Link Targets</h4>
                <p className="text-sm text-blue-800">
                  Decide which specific pages on your client's website you'll link to from the guest post.
                </p>
              </div>

              {/* Scenarios */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Scenario 1: You know the target URL</h4>
                  <p className="text-sm text-green-700">
                    You already know which specific page to link to.
                  </p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">Scenario 2: You need help choosing</h4>
                  <p className="text-sm text-orange-700">
                    You have multiple options and want AI analysis to help decide.
                  </p>
                </div>
              </div>

              {/* Client Target URLs */}
              {activeTargetPages.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-purple-800">
                      📌 Your Client's Target URLs ({activeTargetPages.length})
                    </h4>
                    <div className="flex items-center space-x-2">
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
                          setCopiedUrl('all-2c');
                          setTimeout(() => setCopiedUrl(null), 2000);
                        }}
                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1"
                      >
                        {copiedUrl === 'all-2c' ? (
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
                  <p className="text-sm text-purple-700 mb-3">
                    Click any URL to copy it. Use Step 2A above to select pages for your workflow.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {(showAllTargetUrls ? activeTargetPages : activeTargetPages.slice(0, 5)).map((page: any, index: number) => (
                      <div 
                        key={page.id}
                        className="bg-white border border-purple-200 rounded-lg p-2 flex items-center group hover:bg-purple-50 transition-colors"
                      >
                        {/* Note: Selection is now handled in Step 2A unified action */}
                        {page.description && page.description.trim() !== '' && (
                          <div className="mr-3">
                            <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            </div>
                          </div>
                        )}
                        
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
                              {page.description && page.description.trim() !== '' && (
                                <p className="text-xs text-purple-600 truncate">
                                  Description available ({page.description.length} characters)
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

                  {/* Note: URL and description selection is now handled in Step 2A unified action */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Use the checkbox selection in Step 2A above to add both keywords and descriptions to your workflow in one action.
                    </p>
                  </div>
                  
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
                      <h4 className="font-medium text-amber-800">💡 Configure Target URLs for This Client</h4>
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
                    Pre-configure specific target URLs for this client to make link target selection much easier. This helps you quickly choose which pages to analyze and link to from guest posts.
                  </p>
                </div>
              )}

              {/* Action */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 mb-1">
                      Starting client URL: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{workflow.clientUrl}</code>
                    </p>
                    <p className="text-sm text-gray-500">Submit your URL(s) for analysis and summarization</p>
                  </div>
                </div>
                
                <a 
                  href="https://chatgpt.com/g/g-685eb391880c8191afc2808e42086ade-summarize-the-client-s-articles-or-urls?model=o3" 
                  target="_blank" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open URL Analysis GPT <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>

              {/* Input fields */}
              <div className="space-y-4">
                <SavedField
                  label="Client URL(s) Submitted"
                  value={step.outputs.clientUrls || ''}
                  placeholder="Enter the URL(s) you submitted to the GPT&#10;&#10;Single URL: If you know exactly which page to link to&#10;Multiple URLs: If you want help choosing between options"
                  onChange={(value) => onChange({ ...step.outputs, clientUrls: value })}
                  isTextarea={true}
                  height="h-24"
                />

                <SavedField
                  label="GPT Analysis Output"
                  value={step.outputs.urlSummaries || ''}
                  placeholder="Paste the complete analysis from the GPT&#10;&#10;This should include page summaries that will help determine the best content approach for your guest post."
                  onChange={(value) => onChange({ ...step.outputs, urlSummaries: value })}
                  isTextarea={true}
                  height="h-32"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};