'use client';

import React from 'react';
import { Brain, Search, TrendingUp, AlertCircle, Info, Clock, CheckCircle, HelpCircle } from 'lucide-react';

interface ExpandedDetailsProps {
  submission: {
    domain?: {
      qualificationStatus?: string;
      aiQualificationReasoning?: string;
      topicReasoning?: string;
      overlapStatus?: 'direct' | 'related' | 'both' | 'none';
      authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
      authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
      topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
      evidence?: {
        direct_count?: number;
        direct_median_position?: number | null;
        related_count?: number;
        related_median_position?: number | null;
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

export default function ExpandedDomainDetails({ submission }: ExpandedDetailsProps) {
  const domain = submission.domain;
  const metadata = submission.metadata || {};
  
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* AI Analysis Section */}
        {domain?.aiQualificationReasoning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Brain className="h-4 w-4" />
              AI Analysis
            </div>
            <div className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
              {domain.aiQualificationReasoning}
            </div>
          </div>
        )}

        {/* Tag Analysis Breakdown */}
        {domain && (domain.qualificationStatus || domain.overlapStatus || domain.topicScope) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Info className="h-4 w-4" />
              Analysis Breakdown
            </div>
            <div className="text-sm bg-white p-3 rounded border border-gray-200 space-y-3">
              {/* Quality Level */}
              {domain.qualificationStatus && (
                <div>
                  <div className="font-medium text-gray-900">Quality Level</div>
                  <div className="text-gray-600 text-xs mt-1">
                    {domain.qualificationStatus === 'high_quality' && (
                      <>
                        <span className="font-medium text-green-700">High Quality</span> - Direct keyword overlap with strong rankings (positions 1-60). Premium choice for maximum SEO impact.
                      </>
                    )}
                    {domain.qualificationStatus === 'good_quality' && (
                      <>
                        <span className="font-medium text-blue-700">Good</span> - Either direct overlap with weak rankings OR related topics with strong rankings. Solid choice for link building.
                      </>
                    )}
                    {domain.qualificationStatus === 'marginal_quality' && (
                      <>
                        <span className="font-medium text-yellow-700">Marginal</span> - Some overlap exists but all rankings are weak (61-100). Consider for volume strategies.
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
              
              {/* Overlap Status */}
              {domain.overlapStatus && (
                <div>
                  <div className="font-medium text-gray-900">Keyword Overlap</div>
                  <div className="text-gray-600 text-xs mt-1">
                    {domain.overlapStatus === 'direct' && (
                      <>
                        <span className="font-medium">Direct</span> - Site ranks for your exact niche keywords
                      </>
                    )}
                    {domain.overlapStatus === 'related' && (
                      <>
                        <span className="font-medium">Related</span> - Site ranks for broader industry topics
                      </>
                    )}
                    {domain.overlapStatus === 'both' && (
                      <>
                        <span className="font-medium">Both</span> - Has direct niche keywords AND related industry topics
                      </>
                    )}
                    {domain.overlapStatus === 'none' && (
                      <>
                        <span className="font-medium">None</span> - No topical relevance found
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Authority Scores */}
              {(domain.authorityDirect !== 'n/a' || domain.authorityRelated !== 'n/a') && (
                <div>
                  <div className="font-medium text-gray-900">Ranking Authority</div>
                  <div className="text-gray-600 text-xs mt-1 space-y-1">
                    {domain.authorityDirect && domain.authorityDirect !== 'n/a' && (
                      <div>
                        <span className="font-medium">Direct Keywords:</span>{' '}
                        {domain.authorityDirect === 'strong' && 'Strong (positions 1-30)'}
                        {domain.authorityDirect === 'moderate' && 'Moderate (positions 31-60)'}
                        {domain.authorityDirect === 'weak' && 'Weak (positions 61-100)'}
                      </div>
                    )}
                    {domain.authorityRelated && domain.authorityRelated !== 'n/a' && (
                      <div>
                        <span className="font-medium">Related Keywords:</span>{' '}
                        {domain.authorityRelated === 'strong' && 'Strong (positions 1-30)'}
                        {domain.authorityRelated === 'moderate' && 'Moderate (positions 31-60)'}
                        {domain.authorityRelated === 'weak' && 'Weak (positions 61-100)'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Topic Scope */}
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
                  </div>
                </div>
              )}
              
              {/* Original Topic Reasoning if it exists */}
              {domain.topicReasoning && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {domain.topicReasoning}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evidence Data */}
        {domain?.evidence && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Search className="h-4 w-4" />
              Keyword Evidence
            </div>
            <div className="text-sm bg-white p-3 rounded border border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-green-700">Direct Matches:</span>
                  <div className="text-gray-600">
                    {domain.evidence.direct_count || 0} keywords
                    {domain.evidence.direct_median_position && (
                      <span className="text-xs text-gray-500 ml-1">
                        (median pos: {domain.evidence.direct_median_position.toFixed(1)})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Related Matches:</span>
                  <div className="text-gray-600">
                    {domain.evidence.related_count || 0} keywords
                    {domain.evidence.related_median_position && (
                      <span className="text-xs text-gray-500 ml-1">
                        (median pos: {domain.evidence.related_median_position.toFixed(1)})
                      </span>
                    )}
                  </div>
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