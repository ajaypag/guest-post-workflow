'use client';

import React from 'react';
import { Globe, TrendingUp, Search, Brain, AlertCircle, CheckCircle } from 'lucide-react';

interface DomainAnalysisData {
  domain: string;
  domainRating?: number;
  traffic?: number;
  qualificationStatus?: string;
  overlapStatus?: 'direct' | 'related' | 'both' | 'none';
  authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
  authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
  topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
  keywordCount?: number;
  hasDataForSeoResults?: boolean;
  dataForSeoResultsCount?: number;
  aiQualificationReasoning?: string;
}

interface DomainCellProps {
  domain: DomainAnalysisData | null;
  domainId: string;
}

// Helper function to get overlap badge color and text
const getOverlapBadge = (status?: string) => {
  switch (status) {
    case 'direct':
      return { color: 'bg-green-100 text-green-800', text: 'DIRECT' };
    case 'related':
      return { color: 'bg-blue-100 text-blue-800', text: 'RELATED' };
    case 'both':
      return { color: 'bg-purple-100 text-purple-800', text: 'BOTH' };
    case 'none':
      return { color: 'bg-gray-100 text-gray-600', text: 'NONE' };
    default:
      return null;
  }
};

// Helper function to get authority badge
const getAuthorityBadge = (direct?: string, related?: string) => {
  const primary = direct !== 'n/a' ? direct : related;
  if (!primary || primary === 'n/a') return null;
  
  switch (primary) {
    case 'strong':
      return { color: 'bg-green-100 text-green-800', text: 'STRONG' };
    case 'moderate':
      return { color: 'bg-yellow-100 text-yellow-800', text: 'MOD' };
    case 'weak':
      return { color: 'bg-red-100 text-red-800', text: 'WEAK' };
    default:
      return null;
  }
};

// Helper function to get topic scope badge
const getTopicScopeBadge = (scope?: string) => {
  switch (scope) {
    case 'short_tail':
      return { color: 'bg-purple-100 text-purple-800', text: 'SHORT', icon: '🎯' };
    case 'long_tail':
      return { color: 'bg-blue-100 text-blue-800', text: 'LONG', icon: '🎣' };
    case 'ultra_long_tail':
      return { color: 'bg-indigo-100 text-indigo-800', text: 'ULTRA', icon: '🦾' };
    default:
      return null;
  }
};

export default function DomainCell({ domain, domainId }: DomainCellProps) {
  if (!domain) {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500">{domainId.slice(0, 8)}...</span>
      </div>
    );
  }

  const overlapBadge = getOverlapBadge(domain.overlapStatus);
  const authorityBadge = getAuthorityBadge(domain.authorityDirect, domain.authorityRelated);
  const topicScopeBadge = getTopicScopeBadge(domain.topicScope);
  // Helper function to get quality badge
  const getQualityBadge = () => {
    switch (domain.qualificationStatus) {
      case 'high_quality':
        return { 
          color: 'bg-green-100 text-green-800', 
          text: 'High Quality',
          icon: CheckCircle
        };
      case 'good_quality':
        return { 
          color: 'bg-blue-100 text-blue-800', 
          text: 'Good',
          icon: CheckCircle
        };
      case 'marginal_quality':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          text: 'Marginal',
          icon: AlertCircle
        };
      case 'weak':
      case 'not_qualified':
        return { 
          color: 'bg-red-100 text-red-800', 
          text: 'Weak',
          icon: AlertCircle
        };
      default:
        return null;
    }
  };

  const qualityBadge = getQualityBadge();

  return (
    <div className="space-y-2">
      {/* Domain name only - DR and traffic are in separate columns */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-400" />
        <span className="font-medium">{domain.domain}</span>
      </div>

      {/* Analysis badges */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Qualification status */}
        {qualityBadge && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${qualityBadge.color}`}>
            <qualityBadge.icon className="h-3 w-3" />
            {qualityBadge.text}
          </span>
        )}

        {/* Overlap status */}
        {overlapBadge && (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${overlapBadge.color}`}>
            {overlapBadge.text}
          </span>
        )}

        {/* Authority score */}
        {authorityBadge && (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${authorityBadge.color}`}>
            {authorityBadge.text}
          </span>
        )}

        {/* Topic scope */}
        {topicScopeBadge && (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${topicScopeBadge.color}`}>
            {topicScopeBadge.icon} {topicScopeBadge.text}
          </span>
        )}

        {/* Keyword count */}
        {domain.keywordCount && domain.keywordCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
            <Search className="h-3 w-3" />
            {domain.keywordCount}
          </span>
        )}

        {/* DataForSEO indicator */}
        {domain.hasDataForSeoResults && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-800">
            📊 {domain.dataForSeoResultsCount || 'Data'}
          </span>
        )}
      </div>
    </div>
  );
}