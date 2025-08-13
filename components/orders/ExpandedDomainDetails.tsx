'use client';

import React, { useState } from 'react';
import { Brain, Search, TrendingUp, AlertCircle, Info, Clock, CheckCircle, HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface ExpandedDetailsProps {
  submission: {
    domain?: {
      qualificationStatus?: string;
      aiQualificationReasoning?: string;
      topicReasoning?: string;
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
  const [showDefinitions, setShowDefinitions] = useState(false);
  
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
      {/* Tag Definitions Toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowDefinitions(!showDefinitions)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          <span>What do these tags mean?</span>
          {showDefinitions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        
        {showDefinitions && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Quality Levels */}
              <div className="space-y-2">
                <div className="font-medium text-gray-900 mb-1">Quality Levels:</div>
                <div className="space-y-1">
                  <div><span className="font-medium text-green-700">High Quality:</span> Direct keyword overlap with strong rankings (positions 1-30)</div>
                  <div><span className="font-medium text-blue-700">Good:</span> Direct overlap but weak rankings OR related topics with strong rankings</div>
                  <div><span className="font-medium text-yellow-700">Marginal:</span> Some overlap exists but all rankings are weak (positions 61-100)</div>
                  <div><span className="font-medium text-red-700">Not Qualified:</span> No meaningful topical overlap detected</div>
                </div>
              </div>
              
              {/* Overlap Status */}
              <div className="space-y-2">
                <div className="font-medium text-gray-900 mb-1">Overlap Status:</div>
                <div className="space-y-1">
                  <div><span className="font-medium">DIRECT:</span> Site ranks for your exact niche keywords</div>
                  <div><span className="font-medium">RELATED:</span> Site ranks for broader industry topics</div>
                  <div><span className="font-medium">BOTH:</span> Site has both direct and related keyword rankings</div>
                  <div><span className="font-medium">NONE:</span> No topical relevance found</div>
                </div>
              </div>
              
              {/* Authority Score */}
              <div className="space-y-2">
                <div className="font-medium text-gray-900 mb-1">Authority (Ranking Strength):</div>
                <div className="space-y-1">
                  <div><span className="font-medium text-green-700">STRONG:</span> Rankings in positions 1-30 (pages 1-3)</div>
                  <div><span className="font-medium text-yellow-700">MOD:</span> Rankings in positions 31-60 (pages 4-6)</div>
                  <div><span className="font-medium text-red-700">WEAK:</span> Rankings in positions 61-100 (pages 7-10)</div>
                </div>
              </div>
              
              {/* Topic Scope */}
              <div className="space-y-2">
                <div className="font-medium text-gray-900 mb-1">Topic Scope (Content Strategy):</div>
                <div className="space-y-1">
                  <div><span className="font-medium">🎯 SHORT:</span> Site can rank for broad industry terms</div>
                  <div><span className="font-medium">🎣 LONG:</span> Needs simple modifiers (geo, "best", "how to")</div>
                  <div><span className="font-medium">🦾 ULTRA:</span> Requires very specific niche angles</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
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

        {/* Topic Reasoning */}
        {domain?.topicReasoning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Info className="h-4 w-4" />
              Topic Analysis
            </div>
            <div className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
              {domain.topicReasoning}
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