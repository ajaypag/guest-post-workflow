'use client';

import React from 'react';
import { Brain, Search, TrendingUp, AlertCircle, Info, Clock } from 'lucide-react';

interface ExpandedDetailsProps {
  submission: {
    domain?: {
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