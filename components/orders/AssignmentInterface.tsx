'use client';

import React, { useState } from 'react';
import { 
  Globe, Target, ChevronDown, ChevronUp, ArrowRight, 
  User, DollarSign, Eye, RotateCcw, AlertTriangle,
  CheckCircle, XCircle, Info
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BulkAnalysisDomain {
  id: string;
  domain: string;
  qualificationStatus: string;
  suggestedTargetUrl?: string;
  targetMatchData?: any;
  targetMatchedAt?: string;
}

interface LineItem {
  id: string;
  orderId: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    website?: string;
  };
  targetPageUrl?: string;
  assignedDomainId?: string;
  assignedDomain?: string;
  estimatedPrice?: number;
  status: string;
}

interface AssignmentSuggestion {
  lineItemId: string;
  domainId: string;
  confidence: 'perfect' | 'good' | 'fair' | 'fallback';
  reasoning: string;
  matchQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  evidencePreview?: string;
  score: number;
}

interface AssignmentInterfaceProps {
  selectedOrder: any;
  selectedDomains: BulkAnalysisDomain[];
  assignments: AssignmentSuggestion[];
  onAssignmentChange: (assignments: AssignmentSuggestion[]) => void;
  onGenerateAssignments: () => void;
}

export default function AssignmentInterface({
  selectedOrder,
  selectedDomains,
  assignments,
  onAssignmentChange,
  onGenerateAssignments
}: AssignmentInterfaceProps) {
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [domainSelectorOpen, setDomainSelectorOpen] = useState<string | null>(null);

  // Get unassigned line items for display
  const unassignedLineItems = selectedOrder?.lineItems?.filter((item: LineItem) => 
    !item.assignedDomainId &&
    !['cancelled', 'refunded'].includes(item.status)
  ) || [];

  // Get assignment statistics
  const assignmentStats = {
    total: unassignedLineItems.length,
    assigned: assignments.length,
    unassigned: unassignedLineItems.length - assignments.length,
    perfect: assignments.filter(a => a.confidence === 'perfect').length,
    good: assignments.filter(a => a.confidence === 'good').length,
    fair: assignments.filter(a => a.confidence === 'fair').length,
    fallback: assignments.filter(a => a.confidence === 'fallback').length
  };

  const handleAssignmentChange = (lineItemId: string, newDomainId: string) => {
    const lineItem = unassignedLineItems.find((item: LineItem) => item.id === lineItemId);
    const domain = selectedDomains.find(d => d.id === newDomainId);
    
    if (!lineItem || !domain) return;

    // Remove existing assignment for this line item
    const filteredAssignments = assignments.filter(a => a.lineItemId !== lineItemId);
    
    // Remove assignments for the new domain (prevent double assignment)
    const finalAssignments = filteredAssignments.filter(a => a.domainId !== newDomainId);

    // Calculate new assignment details
    const newAssignment = calculateAssignmentDetails(lineItem, domain);
    
    onAssignmentChange([...finalAssignments, newAssignment]);
    setDomainSelectorOpen(null);
  };

  const calculateAssignmentDetails = (lineItem: LineItem, domain: BulkAnalysisDomain): AssignmentSuggestion => {
    // Check for perfect match
    if (domain.suggestedTargetUrl === lineItem.targetPageUrl) {
      return {
        lineItemId: lineItem.id,
        domainId: domain.id,
        confidence: 'perfect',
        reasoning: `AI recommended ${domain.domain} specifically for ${lineItem.targetPageUrl}`,
        matchQuality: 'excellent',
        evidencePreview: 'Perfect target URL match',
        score: 100
      };
    }

    // Check target match data
    if (domain.targetMatchData?.target_analysis && lineItem.targetPageUrl) {
      const matchForTarget = domain.targetMatchData.target_analysis.find(
        (analysis: any) => analysis.target_url === lineItem.targetPageUrl
      );

      if (matchForTarget) {
        const score = getQualityScore(matchForTarget.match_quality);
        const confidence = score >= 80 ? 'good' : score >= 50 ? 'fair' : 'fallback';
        
        return {
          lineItemId: lineItem.id,
          domainId: domain.id,
          confidence,
          reasoning: `${matchForTarget.match_quality} match found for ${lineItem.targetPageUrl}`,
          matchQuality: matchForTarget.match_quality,
          evidencePreview: getEvidencePreview(domain, lineItem.targetPageUrl),
          score
        };
      }
    }

    // Fallback assignment
    return {
      lineItemId: lineItem.id,
      domainId: domain.id,
      confidence: 'fallback',
      reasoning: `Best available domain (${domain.qualificationStatus} quality)`,
      matchQuality: 'fair',
      evidencePreview: 'No specific target match found',
      score: 30
    };
  };

  const getQualityScore = (quality: string): number => {
    switch (quality) {
      case 'excellent': return 90;
      case 'good': return 70;
      case 'fair': return 50;
      case 'poor': return 20;
      default: return 0;
    }
  };

  const getEvidencePreview = (domain: BulkAnalysisDomain, targetUrl: string): string => {
    if (!domain.targetMatchData?.target_analysis) return 'No evidence available';

    const matchData = domain.targetMatchData.target_analysis.find(
      (analysis: any) => analysis.target_url === targetUrl
    );

    if (!matchData?.evidence) return 'No evidence available';

    const { direct_count, related_count } = matchData.evidence;
    return `${direct_count} direct + ${related_count} related keywords`;
  };

  const getConfidenceBadge = (confidence: string) => {
    const badges = {
      perfect: { icon: '🎯', class: 'bg-green-100 text-green-700 border-green-200', label: 'Perfect' },
      good: { icon: '✅', class: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Good' },
      fair: { icon: '⚠️', class: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Fair' },
      fallback: { icon: '🔄', class: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Fallback' }
    };
    
    const badge = badges[confidence as keyof typeof badges] || badges.fallback;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${badge.class}`}>
        <span>{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const getAssignedDomain = (lineItemId: string) => {
    const assignment = assignments.find(a => a.lineItemId === lineItemId);
    return assignment ? selectedDomains.find(d => d.id === assignment.domainId) : null;
  };

  const getAvailableDomains = () => {
    const assignedDomainIds = assignments.map(a => a.domainId);
    return selectedDomains.filter(d => !assignedDomainIds.includes(d.id));
  };

  if (unassignedLineItems.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Line Items Available</h3>
        <p className="text-gray-600">
          This order doesn't have any unassigned line items for this client.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Assignment Overview</h3>
          <button
            onClick={onGenerateAssignments}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Regenerate Smart Assignments
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{assignmentStats.perfect}</div>
            <div className="text-xs text-gray-600">Perfect Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{assignmentStats.good}</div>
            <div className="text-xs text-gray-600">Good Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{assignmentStats.fair}</div>
            <div className="text-xs text-gray-600">Fair Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{assignmentStats.unassigned}</div>
            <div className="text-xs text-gray-600">Unassigned</div>
          </div>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Domain Assignments ({assignmentStats.assigned}/{assignmentStats.total})
        </h3>
        
        {unassignedLineItems.map((lineItem: LineItem) => {
          const assignment = assignments.find(a => a.lineItemId === lineItem.id);
          const assignedDomain = assignment ? selectedDomains.find(d => d.id === assignment.domainId) : null;
          const isExpanded = expandedAssignment === lineItem.id;
          const isSelectorOpen = domainSelectorOpen === lineItem.id;
          
          return (
            <div
              key={lineItem.id}
              className={`border rounded-lg p-4 transition-all ${
                assignment 
                  ? assignment.confidence === 'perfect' ? 'border-green-300 bg-green-50' :
                    assignment.confidence === 'good' ? 'border-blue-300 bg-blue-50' :
                    assignment.confidence === 'fair' ? 'border-yellow-300 bg-yellow-50' :
                    'border-orange-300 bg-orange-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              {/* Main Assignment Row */}
              <div className="flex items-center justify-between">
                {/* Line Item Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {lineItem.targetPageUrl || 'No target URL specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {lineItem.client?.name || 'Unknown client'}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(lineItem.estimatedPrice || 0)}
                    </div>
                  </div>
                </div>

                {/* Assignment Arrow */}
                <div className="mx-4">
                  {assignment ? (
                    <div className="flex items-center">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                      {getConfidenceBadge(assignment.confidence)}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-400" />
                      <span className="text-xs text-red-600 ml-1">Unassigned</span>
                    </div>
                  )}
                </div>

                {/* Domain Assignment */}
                <div className="flex-1">
                  {assignedDomain ? (
                    <DomainCard 
                      domain={assignedDomain}
                      assignment={assignment!}
                      onReassign={() => setDomainSelectorOpen(isSelectorOpen ? null : lineItem.id)}
                    />
                  ) : (
                    <div className="text-center">
                      <button
                        onClick={() => setDomainSelectorOpen(isSelectorOpen ? null : lineItem.id)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Assign Domain
                      </button>
                    </div>
                  )}
                </div>

                {/* Expand Button */}
                <div className="ml-4">
                  <button
                    onClick={() => setExpandedAssignment(isExpanded ? null : lineItem.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Domain Selector Dropdown */}
              {isSelectorOpen && (
                <DomainSelector
                  lineItem={lineItem}
                  assignedDomain={assignedDomain || null}
                  availableDomains={getAvailableDomains()}
                  allDomains={selectedDomains}
                  onSelect={(domainId) => handleAssignmentChange(lineItem.id, domainId)}
                  onClose={() => setDomainSelectorOpen(null)}
                />
              )}

              {/* Expanded Evidence */}
              {isExpanded && assignment && assignedDomain && (
                <MatchEvidence
                  domain={assignedDomain}
                  targetUrl={lineItem.targetPageUrl}
                  assignment={assignment}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned Domains */}
      {getAvailableDomains().length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Available Domains ({getAvailableDomains().length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getAvailableDomains().map(domain => (
              <div key={domain.id} className="p-3 border rounded-lg bg-gray-50">
                <div className="font-medium text-sm">{domain.domain}</div>
                <div className="text-xs text-gray-600 mt-1">
                  Quality: {domain.qualificationStatus.replace('_', ' ')}
                </div>
                {domain.suggestedTargetUrl && (
                  <div className="text-xs text-blue-600 mt-1">
                    Suggested: {domain.suggestedTargetUrl}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Domain Card Component
function DomainCard({ 
  domain, 
  assignment, 
  onReassign 
}: { 
  domain: BulkAnalysisDomain; 
  assignment: AssignmentSuggestion; 
  onReassign: () => void;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-900">{domain.domain}</span>
      </div>
      <div className="text-xs text-gray-600">
        Quality: {domain.qualificationStatus.replace('_', ' ')}
      </div>
      {assignment.evidencePreview && (
        <div className="text-xs text-blue-600 mt-1">
          {assignment.evidencePreview}
        </div>
      )}
      <button
        onClick={onReassign}
        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
      >
        Change assignment
      </button>
    </div>
  );
}

// Domain Selector Component
function DomainSelector({ 
  lineItem, 
  assignedDomain, 
  availableDomains, 
  allDomains, 
  onSelect, 
  onClose 
}: {
  lineItem: LineItem;
  assignedDomain: BulkAnalysisDomain | null;
  availableDomains: BulkAnalysisDomain[];
  allDomains: BulkAnalysisDomain[];
  onSelect: (domainId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 border-t pt-4 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-gray-900">Select Domain for {lineItem.targetPageUrl}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* Currently assigned domain */}
        {assignedDomain && (
          <div className="p-3 border-2 border-blue-500 rounded-lg bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-blue-900">{assignedDomain.domain}</div>
                <div className="text-sm text-blue-700">Currently assigned</div>
              </div>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}
        
        {/* Available domains */}
        {availableDomains.map((domain: BulkAnalysisDomain) => (
          <button
            key={domain.id}
            onClick={() => onSelect(domain.id)}
            className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-900">{domain.domain}</div>
                <div className="text-sm text-gray-600">
                  Quality: {domain.qualificationStatus.replace('_', ' ')}
                </div>
                {domain.suggestedTargetUrl === lineItem.targetPageUrl && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ AI recommended for this target
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </button>
        ))}
        
        {/* Already assigned domains (reassignment option) */}
        {allDomains.filter((d: BulkAnalysisDomain) => 
          !availableDomains.includes(d) && d.id !== assignedDomain?.id
        ).map((domain: BulkAnalysisDomain) => (
          <button
            key={domain.id}
            onClick={() => onSelect(domain.id)}
            className="w-full text-left p-3 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-900">{domain.domain}</div>
                <div className="text-sm text-orange-600">
                  ⚠️ Already assigned (will reassign)
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-orange-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Match Evidence Component
function MatchEvidence({ 
  domain, 
  targetUrl, 
  assignment 
}: { 
  domain: BulkAnalysisDomain; 
  targetUrl?: string; 
  assignment: AssignmentSuggestion;
}) {
  if (!domain.targetMatchData?.target_analysis || !targetUrl) {
    return (
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <div className="text-sm text-gray-600">
          No detailed match evidence available
        </div>
      </div>
    );
  }

  const matchData = domain.targetMatchData.target_analysis.find(
    (analysis: any) => analysis.target_url === targetUrl
  );

  if (!matchData) {
    return (
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <div className="text-sm text-gray-600">
          No match data found for {targetUrl}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white border rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-blue-500" />
        <h4 className="font-medium text-gray-900">Match Evidence</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          matchData.match_quality === 'excellent' ? 'bg-green-100 text-green-700' :
          matchData.match_quality === 'good' ? 'bg-blue-100 text-blue-700' :
          matchData.match_quality === 'fair' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {matchData.match_quality}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Keywords */}
        <div>
          <div className="font-medium text-gray-700 mb-2">
            Direct Keywords ({matchData.evidence?.direct_count || 0})
          </div>
          {matchData.evidence?.direct_keywords?.length > 0 ? (
            <div className="space-y-1">
              {matchData.evidence.direct_keywords.slice(0, 5).map((keyword: string, index: number) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  {keyword}
                </div>
              ))}
              {matchData.evidence.direct_keywords.length > 5 && (
                <div className="text-xs text-gray-500">
                  +{matchData.evidence.direct_keywords.length - 5} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No direct keywords found</div>
          )}
        </div>

        {/* Related Keywords */}
        <div>
          <div className="font-medium text-gray-700 mb-2">
            Related Keywords ({matchData.evidence?.related_count || 0})
          </div>
          {matchData.evidence?.related_keywords?.length > 0 ? (
            <div className="space-y-1">
              {matchData.evidence.related_keywords.slice(0, 5).map((keyword: string, index: number) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  {keyword}
                </div>
              ))}
              {matchData.evidence.related_keywords.length > 5 && (
                <div className="text-xs text-gray-500">
                  +{matchData.evidence.related_keywords.length - 5} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No related keywords found</div>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      {matchData.reasoning && (
        <div className="mt-4 pt-3 border-t">
          <div className="font-medium text-gray-700 mb-1">AI Analysis</div>
          <div className="text-sm text-gray-600">{matchData.reasoning}</div>
        </div>
      )}

      {/* Assignment Reasoning */}
      <div className="mt-3 pt-3 border-t">
        <div className="font-medium text-gray-700 mb-1">Assignment Reasoning</div>
        <div className="text-sm text-gray-600">{assignment.reasoning}</div>
      </div>
    </div>
  );
}