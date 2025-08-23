'use client';

import React from 'react';
import { 
  Brain, 
  Search, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  Clock, 
  CheckCircle, 
  Globe,
  Star,
  Target,
  BarChart3,
  Link
} from 'lucide-react';

interface Domain {
  id: string;
  domain: string;
  qualificationStatus: string;
  qualifiedAt: string | null;
  updatedAt: string;
  
  // User curation
  userBookmarked: boolean;
  userHidden: boolean;
  userBookmarkedAt: string | null;
  userHiddenAt: string | null;
  
  // AI Qualification Intelligence
  overlapStatus: string | null;
  authorityDirect: string | null;
  authorityRelated: string | null;
  topicScope: string | null;
  topicReasoning: string | null;
  evidence: {
    directCount: number;
    directMedianPosition: number | null;
    relatedCount: number;
    relatedMedianPosition: number | null;
  } | null;
  aiQualificationReasoning: string | null;
  keywordCount: number | null;
  notes: string | null;
  hasWorkflow: boolean | null;
  
  // Target URL Matching Intelligence
  suggestedTargetUrl: string | null;
  targetMatchData: any;
  targetMatchedAt: string | null;
  
  // Vetting context
  targetPages?: Array<{
    id: string;
    url: string;
    keywords: string | null;
  }>;
  
  // Additional fields
  clientName: string;
  projectName: string | null;
  domainRating: number | null;
  traffic: number | null;
}

interface ExpandedDomainDetailsProps {
  domain: Domain;
}

// Target Analysis Card Component
function TargetAnalysisCard({ 
  analysis, 
  isCurrentTarget, 
  isSuggestedTarget,
  isBestMatch 
}: { 
  analysis: any; 
  isCurrentTarget: boolean; 
  isSuggestedTarget: boolean;
  isBestMatch: boolean; 
}) {
  const reasoning = analysis.reasoning || '';
  
  return (
    <div className={`p-2 rounded border ${
      isCurrentTarget ? 'bg-blue-50 border-blue-200' : 
      isSuggestedTarget ? 'bg-green-50 border-green-200' : 
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
            <span className="break-all">{analysis.target_url}</span>
            {isSuggestedTarget && (
              <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded">
                AI SUGGESTED
              </span>
            )}
            {isBestMatch && (
              <span className="text-xs bg-purple-600 text-white px-1 py-0.5 rounded">
                BEST MATCH
              </span>
            )}
          </div>
          
          <div className="text-xs mt-1 space-y-0.5">
            <div>
              Match Quality: <span className="font-medium">{analysis.match_quality || 'N/A'}</span>
            </div>
            
            {/* Keyword evidence */}
            {analysis.evidence && (
              <div className="flex gap-4">
                <span>Direct: <strong>{analysis.evidence.direct_count || 0}</strong></span>
                <span>Related: <strong>{analysis.evidence.related_count || 0}</strong></span>
              </div>
            )}
          </div>
          
          {/* Full reasoning */}
          {reasoning && (
            <div className="text-xs mt-1 text-gray-600">
              <div className="font-medium mb-0.5">Analysis:</div>
              <div className="text-gray-700">
                {reasoning}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpandedDomainDetails({ domain }: ExpandedDomainDetailsProps) {
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200" data-testid="expanded-domain-details">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-stretch">
        
        {/* Domain Intelligence - Why this domain was qualified */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Brain className="h-4 w-4" />
            Domain Intelligence
          </div>
          <div className="text-sm bg-white p-3 rounded border border-gray-200 space-y-3 min-h-[24rem]">
            
            {/* Quality Assessment */}
            <div>
              <div className="font-medium text-gray-900">Quality Assessment</div>
              <div className="text-gray-600 text-xs mt-1">
                {domain.qualificationStatus === 'qualified' && (
                  <>
                    <span className="font-medium text-green-700">Qualified</span> - Domain meets quality standards for link building
                  </>
                )}
                {domain.qualificationStatus === 'disqualified' && (
                  <>
                    <span className="font-medium text-red-700">Disqualified</span> - Does not meet quality requirements
                  </>
                )}
                {domain.qualificationStatus === 'pending' && (
                  <>
                    <span className="font-medium text-yellow-700">Pending</span> - Analysis in progress
                  </>
                )}
              </div>
              {domain.qualifiedAt && (
                <div className="text-xs text-gray-500 mt-1">
                  Qualified: {new Date(domain.qualifiedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* AI Reasoning */}
            {domain.aiQualificationReasoning && (
              <div>
                <div className="font-medium text-gray-900">AI Analysis</div>
                <div className="text-gray-600 text-xs mt-1 bg-gray-50 p-2 rounded">
                  {domain.aiQualificationReasoning}
                </div>
              </div>
            )}

            {/* Keyword Overlap & Authority */}
            {(domain.overlapStatus || domain.authorityDirect || domain.authorityRelated) && (
              <div>
                <div className="font-medium text-gray-900">Keyword Analysis</div>
                <div className="text-gray-600 text-xs mt-1 space-y-2">
                  
                  {/* Overlap Type */}
                  {domain.overlapStatus && (
                    <div>
                      <span className="font-medium">Overlap Type:</span>{' '}
                      {domain.overlapStatus === 'direct' && 'Direct - Site ranks for your exact niche keywords'}
                      {domain.overlapStatus === 'related' && 'Related - Site ranks for broader industry topics'}
                      {domain.overlapStatus === 'both' && 'Both - Has direct niche keywords AND related industry topics'}
                      {domain.overlapStatus === 'none' && 'None - No topical relevance found'}
                    </div>
                  )}
                  
                  {/* Authority Breakdown */}
                  {(domain.authorityDirect || domain.authorityRelated) && (
                    <div className="grid grid-cols-2 gap-2">
                      {domain.authorityDirect && (
                        <div>
                          <span className="font-medium">Direct Authority:</span>{' '}
                          {(() => {
                            const val = domain.authorityDirect;
                            if (val === 'strong') return 'Strong';
                            if (val === 'moderate') return 'Moderate';
                            if (val === 'weak') return 'Weak';
                            return val;
                          })()}
                        </div>
                      )}
                      {domain.authorityRelated && (
                        <div>
                          <span className="font-medium">Related Authority:</span>{' '}
                          {(() => {
                            const val = domain.authorityRelated;
                            if (val === 'strong') return 'Strong';
                            if (val === 'moderate') return 'Moderate';
                            if (val === 'weak') return 'Weak';
                            return val;
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Keyword Evidence */}
            {domain.evidence && (
              <div>
                <div className="font-medium text-gray-900">Supporting Evidence</div>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs">
                      <span className="font-medium text-green-700">
                        Direct Keywords: {domain.evidence.directCount}
                      </span>
                      {domain.evidence.directMedianPosition && (
                        <span className="text-gray-500 ml-1">
                          (median: {domain.evidence.directMedianPosition.toFixed(1)})
                        </span>
                      )}
                    </div>
                    {/* Sample direct keywords */}
                    {(() => {
                      const directKeywords = domain.targetMatchData?.target_analysis
                        ?.flatMap((analysis: any) => analysis.evidence?.direct_keywords || []) ||
                        (domain as any).qualificationData?.evidence?.direct_keywords ||
                        [];
                      
                      // Debug logging
                      if (domain.targetMatchData) {
                        console.log('Domain:', domain.domain);
                        console.log('Has targetMatchData:', !!domain.targetMatchData);
                        console.log('target_analysis:', domain.targetMatchData.target_analysis);
                        console.log('Direct keywords found:', directKeywords.length);
                        console.log('Sample:', directKeywords.slice(0, 3));
                      }
                      
                      return directKeywords.length > 0 ? (
                        <div className="mt-1">
                          <div className="max-h-24 overflow-y-auto border border-gray-200 rounded p-1 bg-gray-50">
                            {directKeywords
                              .slice(0, 30)
                              .map((kw: string, i: number) => (
                                <div key={i} className="text-xs text-gray-600">• {kw}</div>
                              ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <div className="text-xs">
                      <span className="font-medium text-blue-700">
                        Related Keywords: {domain.evidence.relatedCount}
                      </span>
                      {domain.evidence.relatedMedianPosition && (
                        <span className="text-gray-500 ml-1">
                          (median: {domain.evidence.relatedMedianPosition.toFixed(1)})
                        </span>
                      )}
                    </div>
                    {/* Sample related keywords */}
                    {(() => {
                      const relatedKeywords = domain.targetMatchData?.target_analysis
                        ?.flatMap((analysis: any) => analysis.evidence?.related_keywords || []) ||
                        (domain as any).qualificationData?.evidence?.related_keywords ||
                        [];
                      
                      return relatedKeywords.length > 0 ? (
                        <div className="mt-1">
                          <div className="max-h-24 overflow-y-auto border border-gray-200 rounded p-1 bg-gray-50">
                            {relatedKeywords
                              .slice(0, 30)
                              .map((kw: string, i: number) => (
                                <div key={i} className="text-xs text-gray-600">• {kw}</div>
                              ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Content Strategy */}
            {domain.topicScope && (
              <div>
                <div className="font-medium text-gray-900">Content Strategy</div>
                <div className="text-gray-600 text-xs mt-1">
                  {domain.topicScope === 'short_tail' && (
                    <>
                      <span className="font-medium">Short Tail</span> - Site can rank for broad industry terms
                    </>
                  )}
                  {domain.topicScope === 'long_tail' && (
                    <>
                      <span className="font-medium">Long Tail</span> - Focus on specific angles with modifiers
                    </>
                  )}
                  {domain.topicScope === 'ultra_long_tail' && (
                    <>
                      <span className="font-medium">Ultra Long Tail</span> - Hyper-targeted content needed
                    </>
                  )}
                  {!['short_tail', 'long_tail', 'ultra_long_tail'].includes(domain.topicScope) && (
                    <>
                      <span className="font-medium">Strategy:</span> {domain.topicScope}
                    </>
                  )}
                </div>
                {domain.topicReasoning && (
                  <div className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                    {domain.topicReasoning}
                  </div>
                )}
              </div>
            )}

            {/* Domain Metrics */}
            <div>
              <div className="font-medium text-gray-900">Domain Metrics</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Domain Rating:</span>
                  <div className="font-medium">{domain.domainRating || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Traffic:</span>
                  <div className="font-medium">{domain.traffic || 'N/A'}</div>
                </div>
                {domain.keywordCount && (
                  <div>
                    <span className="text-gray-500">Keywords:</span>
                    <div className="font-medium">{domain.keywordCount.toLocaleString()}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Workflow:</span>
                  <div className="font-medium">{domain.hasWorkflow ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target Page Analysis - What specific page to target */}
        <div className="space-y-2 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Target className="h-4 w-4" />
            Target Page Analysis
          </div>
          <div className="text-sm bg-white p-3 rounded border border-gray-200 flex-1 flex flex-col">
            
            {/* Current Suggested Target */}
            {domain.suggestedTargetUrl && (
              <div className="mb-3">
                <div className="font-medium text-gray-900 text-sm">AI Recommended Target</div>
                <div className="text-green-600 text-xs break-all">
                  {domain.suggestedTargetUrl}
                </div>
              </div>
            )}
            
            {/* Page Analysis Header */}
            {domain.targetMatchData && (
              <div className="font-medium text-gray-900 mb-2">Page Analysis</div>
            )}
            
            {/* Scrollable Target Analysis */}
            {domain.targetMatchData && (
              <div className="flex-1 flex flex-col">
                {(() => {
                  const targetAnalyses = domain.targetMatchData?.target_analysis || [];
                  if (targetAnalyses.length === 0) {
                    return (
                      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                        No target page analysis available
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {/* Scrollable container */}
                      <div className="h-[20rem] overflow-y-auto border border-gray-200 rounded">
                        <div className="space-y-1 p-1">
                          {targetAnalyses.map((analysis: any, i: number) => {
                            const isSuggestedTarget = analysis.target_url === domain.suggestedTargetUrl;
                            const isBestMatch = i === 0; // First in analysis array
                            
                            return (
                              <TargetAnalysisCard 
                                key={analysis.target_url}
                                analysis={analysis}
                                isCurrentTarget={false}
                                isSuggestedTarget={isSuggestedTarget}
                                isBestMatch={isBestMatch && !isSuggestedTarget}
                              />
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Count indicator */}
                      <div className="text-xs text-gray-500 text-center mt-2">
                        {targetAnalyses.length} target{targetAnalyses.length === 1 ? '' : 's'} analyzed
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* No target analysis available */}
            {!domain.targetMatchData && !domain.suggestedTargetUrl && (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                <div className="text-center">
                  <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  No target page analysis available
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                Target URLs analyzed based on keyword overlap and topical relevance to maximize link effectiveness.
              </div>
            </div>
          </div>
        </div>

        {/* Context & Notes */}
        {(domain.notes || domain.clientName || domain.projectName) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Info className="h-4 w-4" />
              Context & Notes
            </div>
            <div className="text-sm space-y-2">
              {(domain.clientName || domain.projectName) && (
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="font-medium">Project Context</div>
                  {domain.clientName && (
                    <div className="text-xs">Client: {domain.clientName}</div>
                  )}
                  {domain.projectName && (
                    <div className="text-xs">Project: {domain.projectName}</div>
                  )}
                  
                  {/* Vetted Against - Original searches */}
                  {domain.targetPages && domain.targetPages.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-blue-300">
                      <div className="text-xs font-medium text-blue-700 mb-2">Vetted Against</div>
                      <div className="space-y-2">
                        {domain.targetPages.map((targetPage, idx) => (
                          <div key={targetPage.id} className="border-l-2 border-blue-300 pl-2">
                            <div className="text-xs font-medium text-gray-700">
                              Target {idx + 1}
                            </div>
                            <div className="text-xs text-gray-600 break-all">
                              {targetPage.url}
                            </div>
                            {targetPage.keywords && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-500">Original keywords: </span>
                                <span className="text-xs text-gray-700">
                                  {targetPage.keywords.split(',').slice(0, 3).join(', ')}
                                  {targetPage.keywords.split(',').length > 3 && 
                                    ` +${targetPage.keywords.split(',').length - 3} more`}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {domain.notes && (
                <div className="bg-white p-2 rounded border border-gray-200">
                  <span className="font-medium">Analysis Notes:</span> {domain.notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Actions & Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Clock className="h-4 w-4" />
            Status & Actions
          </div>
          <div className="text-sm space-y-2">
            {domain.userBookmarked && (
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Bookmarked</span>
                {domain.userBookmarkedAt && (
                  <span className="text-xs text-gray-500">
                    on {new Date(domain.userBookmarkedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {domain.userHidden && (
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <span className="font-medium">Hidden</span>
                {domain.userHiddenAt && (
                  <span className="text-xs text-gray-500 ml-1">
                    on {new Date(domain.userHiddenAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            <div className="bg-white p-2 rounded border border-gray-200">
              <div className="text-xs text-gray-500">
                Last updated: {new Date(domain.updatedAt).toLocaleDateString()}
              </div>
              {domain.targetMatchedAt && (
                <div className="text-xs text-gray-500">
                  Target matched: {new Date(domain.targetMatchedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}