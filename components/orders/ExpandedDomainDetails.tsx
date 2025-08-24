'use client';

import React, { useState } from 'react';
import { Brain, Search, TrendingUp, AlertCircle, Info, Clock, CheckCircle, HelpCircle, Globe } from 'lucide-react';

interface ExpandedDetailsProps {
  submission: {
    domain?: {
      qualificationStatus?: string;
      aiQualificationReasoning?: string;
      topicReasoning?: string;
      overlapStatus?: 'direct' | 'related' | 'both' | 'none';
      authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a' | string;
      authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a' | string;
      topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail' | string;
      keywordCount?: number;
      dataForSeoResultsCount?: number;
      evidence?: {
        direct_count?: number;
        direct_median_position?: number | null;
        related_count?: number;
        related_median_position?: number | null;
        da?: number;
        traffic?: string;
        quality?: string;
      };
      notes?: string;
    } | null;
    metadata?: {
      statusHistory?: Array<{
        status: string;
        timestamp: string;
        updatedBy: string;
        notes?: string;
      }>;
      reviewHistory?: Array<{
        action: 'approve' | 'reject';
        timestamp: string;
        reviewedBy: string;
        reviewerType: 'internal' | 'account';
        notes?: string;
      }>;
      internalNotes?: string;
      [key: string]: any;
    };
    clientReviewNotes?: string;
    exclusionReason?: string;
  };
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
    <div className={`p-2 rounded border ${isCurrentTarget ? 'bg-blue-50 border-blue-200' : isSuggestedTarget ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
            <span className="break-all">{analysis.target_url}</span>
            {isCurrentTarget && <span className="text-xs bg-blue-600 text-white px-1 py-0.5 rounded">CURRENT</span>}
            {isSuggestedTarget && <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded">AI SUGGESTED</span>}
            {isBestMatch && <span className="text-xs bg-purple-600 text-white px-1 py-0.5 rounded">BEST ANALYSIS</span>}
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
          
          {/* Full reasoning - no truncation */}
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

export default function ExpandedDomainDetails({ submission }: ExpandedDetailsProps) {
  const domain = submission.domain;
  const metadata = submission.metadata || {};
  
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-stretch">
        
        {/* Domain Justification - Why this domain was selected */}
        {(domain?.qualificationStatus || domain?.aiQualificationReasoning || domain?.overlapStatus || domain?.evidence) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Brain className="h-4 w-4" />
              Domain Justification
            </div>
            <div className="text-sm bg-white p-3 rounded border border-gray-200 space-y-3 min-h-96">
              
              {/* Quality Level with Explanation */}
              {domain.qualificationStatus && (
                <div>
                  <div className="font-medium text-gray-900">Quality Assessment</div>
                  <div className="text-gray-600 text-xs mt-1">
                    {domain.qualificationStatus === 'high_quality' && (
                      <>
                        <span className="font-medium text-green-700">High Quality</span> - Direct keyword overlap with strong rankings (positions 1-60). Premium choice for maximum SEO impact.
                      </>
                    )}
                    {domain.qualificationStatus === 'good_quality' && (
                      <>
                        <span className="font-medium text-blue-700">Good Quality</span> - Either direct overlap with weak rankings OR related topics with strong rankings. Solid choice for link building.
                      </>
                    )}
                    {domain.qualificationStatus === 'marginal_quality' && (
                      <>
                        <span className="font-medium text-yellow-700">Marginal Quality</span> - Some overlap exists but all rankings are weak (61-100). Consider for volume strategies.
                      </>
                    )}
                    {(domain.qualificationStatus === 'disqualified' || domain.qualificationStatus === 'not_qualified') && (
                      <>
                        <span className="font-medium text-red-700">Not Qualified</span> - No meaningful topical overlap detected. Not recommended.
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {domain?.aiQualificationReasoning && (
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
                              if (val === 'strong') return 'Strong (1-30)';
                              if (val === 'moderate') return 'Moderate (31-60)';
                              if (val === 'weak') return 'Weak (61-100)';
                              if (val === 'n/a') return 'N/A';
                              const num = parseInt(val);
                              if (!isNaN(num)) {
                                if (num <= 30) return `Strong (${num})`;
                                if (num <= 60) return `Moderate (${num})`;
                                return `Weak (${num})`;
                              }
                              return val;
                            })()}
                          </div>
                        )}
                        {domain.authorityRelated && (
                          <div>
                            <span className="font-medium">Related Authority:</span>{' '}
                            {(() => {
                              const val = domain.authorityRelated;
                              if (val === 'strong') return 'Strong (1-30)';
                              if (val === 'moderate') return 'Moderate (31-60)';
                              if (val === 'weak') return 'Weak (61-100)';
                              if (val === 'n/a') return 'N/A';
                              const num = parseInt(val);
                              if (!isNaN(num)) {
                                if (num <= 30) return `Strong (${num})`;
                                if (num <= 60) return `Moderate (${num})`;
                                return `Weak (${num})`;
                              }
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
              {domain?.evidence && (
                <div>
                  <div className="font-medium text-gray-900">Supporting Evidence</div>
                  <div className="mt-1 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs">
                        <span className="font-medium text-green-700">Direct Keywords: {domain.evidence?.direct_count || 0}</span>
                        {domain.evidence?.direct_median_position && (
                          <span className="text-gray-500 ml-1">(median: {domain.evidence.direct_median_position.toFixed(1)})</span>
                        )}
                      </div>
                      {/* Sample direct keywords */}
                      {metadata.targetMatchData?.target_analysis && (
                        <div className="mt-1">
                          <div className="max-h-24 overflow-y-auto border border-gray-200 rounded p-1 bg-gray-50">
                            {metadata.targetMatchData.target_analysis
                              .flatMap((analysis: any) => analysis.evidence?.direct_keywords || [])
                              .slice(0, 15)
                              .map((kw: string, i: number) => (
                                <div key={i} className="text-xs text-gray-600">• {kw}</div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs">
                        <span className="font-medium text-blue-700">Related Keywords: {domain.evidence?.related_count || 0}</span>
                        {domain.evidence?.related_median_position && (
                          <span className="text-gray-500 ml-1">(median: {domain.evidence.related_median_position.toFixed(1)})</span>
                        )}
                      </div>
                      {/* Sample related keywords */}
                      {metadata.targetMatchData?.target_analysis && (
                        <div className="mt-1">
                          <div className="max-h-24 overflow-y-auto border border-gray-200 rounded p-1 bg-gray-50">
                            {metadata.targetMatchData.target_analysis
                              .flatMap((analysis: any) => analysis.evidence?.related_keywords || [])
                              .slice(0, 15)
                              .map((kw: string, i: number) => (
                                <div key={i} className="text-xs text-gray-600">• {kw}</div>
                              ))}
                          </div>
                        </div>
                      )}
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
                        <span className="font-medium">Short Tail</span> - Site can rank for broad industry terms without modifiers. Target general topics.
                      </>
                    )}
                    {domain.topicScope === 'long_tail' && (
                      <>
                        <span className="font-medium">Long Tail</span> - Needs simple modifiers (location, "best", "how to"). Focus on specific angles.
                      </>
                    )}
                    {domain.topicScope === 'ultra_long_tail' && (
                      <>
                        <span className="font-medium">Ultra Long Tail</span> - Requires very specific niche angles with multiple modifiers. Hyper-targeted content needed.
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
            </div>
          </div>
        )}

        {/* Target Page Justification - Why this specific page was selected */}
        {(metadata.targetPageUrl || metadata.suggestedTargetUrl || metadata.targetMatchData) && (
          <div className="space-y-2 flex flex-col">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Globe className="h-4 w-4" />
              Target Page Justification
            </div>
            <div className="text-sm bg-white p-3 rounded border border-gray-200 flex-1 flex flex-col">
              
              {/* Current & Suggested Targets - side by side - fixed at top */}
              {(metadata.targetPageUrl || metadata.suggestedTargetUrl) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {/* Current/Assigned Target */}
                  {metadata.targetPageUrl && (
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Current Target</div>
                      <div className="text-blue-600 text-xs break-all">
                        {metadata.targetPageUrl}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Suggested Target */}
                  {metadata.suggestedTargetUrl && (
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {metadata.targetPageUrl && metadata.suggestedTargetUrl !== metadata.targetPageUrl ? 'AI Suggested Alternative' : 'AI Recommended Target'}
                      </div>
                      <div className="text-green-600 text-xs break-all">
                        {metadata.suggestedTargetUrl}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Page Analysis Header - fixed */}
              {metadata.targetMatchData && (
                <div className="font-medium text-gray-900 mb-2">Page Analysis</div>
              )}
              
              {/* Scrollable Target Analysis - fills remaining space */}
              {metadata.targetMatchData && (
                <div className="flex-1 flex flex-col">
                  {(() => {
                    const targetAnalyses = metadata.targetMatchData?.target_analysis || [];
                    if (targetAnalyses.length === 0) return null;
                    
                    // Always show current target first, then AI's top picks
                    const currentTargetAnalysis = targetAnalyses.find((a: any) => a.target_url === metadata.targetPageUrl);
                    const otherAnalyses = targetAnalyses.filter((a: any) => a.target_url !== metadata.targetPageUrl);
                    
                    const sortedAnalyses = currentTargetAnalysis 
                      ? [currentTargetAnalysis, ...otherAnalyses]
                      : targetAnalyses;
                    
                    return (
                      <>
                        {/* Scrollable container - large fixed height */}
                        <div className="h-[28rem] overflow-y-auto border border-gray-200 rounded">
                          <div className="space-y-1 p-1">
                            {sortedAnalyses.map((analysis: any, i: number) => {
                              const isCurrentTarget = analysis.target_url === metadata.targetPageUrl;
                              const isSuggestedTarget = analysis.target_url === metadata.suggestedTargetUrl;
                              const originalIndex = targetAnalyses.findIndex((a: any) => a.target_url === analysis.target_url);
                              const isBestMatch = originalIndex === 0; // First in original analysis array
                              
                              return (
                                <TargetAnalysisCard 
                                  key={analysis.target_url}
                                  analysis={analysis}
                                  isCurrentTarget={isCurrentTarget}
                                  isSuggestedTarget={isSuggestedTarget}
                                  isBestMatch={isBestMatch && !isCurrentTarget && !isSuggestedTarget}
                                />
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Count indicator - fixed at bottom */}
                        <div className="text-xs text-gray-500 text-center mt-2">
                          {targetAnalyses.length} target{targetAnalyses.length === 1 ? '' : 's'} analyzed
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Target URLs analyzed based on keyword overlap and topical relevance to maximize link effectiveness.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        {(domain?.notes || metadata.internalNotes || submission.exclusionReason) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <AlertCircle className="h-4 w-4" />
              Notes & Reasons
            </div>
            <div className="text-sm space-y-2">
              {domain?.notes && (
                <div className="bg-white p-2 rounded border border-gray-200">
                  <span className="font-medium">Analysis Notes:</span> {domain.notes}
                </div>
              )}
              {metadata.internalNotes && (
                <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                  <span className="font-medium">Internal Notes:</span> {metadata.internalNotes}
                </div>
              )}
              {submission.exclusionReason && (
                <div className="bg-red-50 p-2 rounded border border-red-200">
                  <span className="font-medium">Exclusion Reason:</span> {submission.exclusionReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status History */}
        {metadata.statusHistory && metadata.statusHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4" />
              Status History
            </div>
            <div className="text-sm bg-white rounded border border-gray-200 max-h-32 overflow-y-auto">
              {metadata.statusHistory.map((entry, idx) => (
                <div key={idx} className="px-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.status}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {entry.notes && (
                    <div className="text-xs text-gray-600 mt-1">{entry.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Review History */}
        {metadata.reviewHistory && metadata.reviewHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <TrendingUp className="h-4 w-4" />
              Review History
            </div>
            <div className="text-sm bg-white rounded border border-gray-200 max-h-32 overflow-y-auto">
              {metadata.reviewHistory.map((review, idx) => (
                <div key={idx} className="px-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${review.action === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                      {review.action === 'approve' ? '✓ Approved' : '✗ Rejected'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(review.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {review.notes && (
                    <div className="text-xs text-gray-600 mt-1">{review.notes}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    by {review.reviewerType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Review Notes */}
        {submission.clientReviewNotes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Info className="h-4 w-4" />
              Client Review Notes
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
              {submission.clientReviewNotes}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}