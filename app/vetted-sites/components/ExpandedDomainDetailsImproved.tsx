'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, Target, TrendingUp, FileText, Info, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// Quality badge component
const QualityBadge = ({ quality }: { quality: string }) => {
  const config = {
    'high_quality': { icon: CheckCircle, color: 'text-green-700 bg-green-100', label: 'Excellent' },
    'good_quality': { icon: CheckCircle, color: 'text-blue-700 bg-blue-100', label: 'Good' },
    'marginal': { icon: AlertCircle, color: 'text-yellow-700 bg-yellow-100', label: 'Marginal' },
    'disqualified': { icon: XCircle, color: 'text-red-700 bg-red-100', label: 'Poor' }
  };
  
  const { icon: Icon, color, label } = config[quality as keyof typeof config] || config.marginal;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
};

// Match quality indicator
const MatchQuality = ({ direct, related }: { direct?: number; related?: number }) => {
  const total = (direct || 0) + (related || 0);
  let qualityLevel = 'fair';
  let color = 'text-yellow-600';
  
  if (total >= 10) { qualityLevel = 'excellent'; color = 'text-green-600'; }
  else if (total >= 5) { qualityLevel = 'good'; color = 'text-blue-600'; }
  
  return (
    <div className={`text-xs font-medium ${color}`}>
      {qualityLevel.charAt(0).toUpperCase() + qualityLevel.slice(1)} Match
      {(direct !== undefined || related !== undefined) && (
        <span className="text-gray-500 ml-1">
          (Direct: {direct || 0}, Related: {related || 0})
        </span>
      )}
    </div>
  );
};

// Collapsible section component
const CollapsibleSection = ({ 
  title, 
  isOpen, 
  onToggle, 
  children, 
  icon: Icon,
  summary 
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: any;
  summary?: string;
}) => {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-600" />}
          <span className="font-medium text-gray-900 text-sm">{title}</span>
          {summary && (
            <span className="text-xs text-gray-500 ml-2">{summary}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

interface ImprovedExpandedDomainDetailsProps {
  domain: any; // Using any for now - would need proper typing
  initialExpandedSection?: string;
}

export default function ExpandedDomainDetailsImproved({ domain, initialExpandedSection }: ImprovedExpandedDomainDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    evidence: false,
    alternatives: initialExpandedSection === 'targetMatch', // Auto-expand alternatives when targetMatch is requested
    context: false,
    targetKeywords: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get primary target recommendation
  const primaryTarget = domain.suggestedTargetUrl;
  const targetAnalyses = domain.targetMatchData?.target_analysis || [];
  const primaryAnalysis = targetAnalyses.find((a: any) => a.target_url === primaryTarget) || targetAnalyses[0];

  return (
    <div className="bg-white p-4 space-y-4">
      
      {/* AI INSIGHTS: Side-by-side or full-width based on available data */}
      <div className={`grid gap-4 ${primaryTarget && domain.aiQualificationReasoning ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* AI Qualification Analysis - always show if data exists, takes full width if no target */}
        {domain.aiQualificationReasoning && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">AI Qualification Analysis</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600 leading-relaxed">
              {domain.aiQualificationReasoning}
            </div>
            
            {/* Keyword evidence indicator */}
            {domain.evidence && (domain.evidence.directCount > 0 || domain.evidence.relatedCount > 0) && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <button 
                  onClick={() => toggleSection('evidence')}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>View keyword evidence ({(domain.evidence.directCount || 0) + (domain.evidence.relatedCount || 0)} keywords found)</span>
                  <ChevronDownIcon className={`h-3 w-3 transition-transform ${expandedSections.evidence ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Recommended Target - only show if data exists */}
        {primaryTarget && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">AI Recommended Target</span>
              </div>
              <QualityBadge quality={domain.qualificationStatus} />
            </div>

            {/* Target URL */}
            <div className="bg-blue-50 rounded-md p-3 mb-3">
              <div className="text-sm font-mono text-blue-700 break-all mb-1">
                {primaryTarget}
              </div>
              <div className="flex items-center justify-between">
                {primaryAnalysis && (
                  <MatchQuality 
                    direct={primaryAnalysis.evidence?.direct_count} 
                    related={primaryAnalysis.evidence?.related_count} 
                  />
                )}
                {primaryAnalysis?.evidence && (primaryAnalysis.evidence.direct_keywords?.length > 0 || primaryAnalysis.evidence.related_keywords?.length > 0) && (
                  <button
                    onClick={() => toggleSection('targetKeywords')}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {expandedSections.targetKeywords ? 'Hide' : 'Show'} keywords
                    <ChevronDownIcon className={`h-3 w-3 transition-transform ${expandedSections.targetKeywords ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              
              {/* Expandable keyword lists for primary target */}
              {expandedSections.targetKeywords && primaryAnalysis?.evidence && (
                <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 gap-3">
                  {primaryAnalysis.evidence.direct_keywords?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1">Direct Keywords ({primaryAnalysis.evidence.direct_count})</div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {primaryAnalysis.evidence.direct_keywords.slice(0, 5).map((kw: string, i: number) => (
                          <div key={i}>• {kw}</div>
                        ))}
                        {primaryAnalysis.evidence.direct_keywords.length > 5 && (
                          <div className="text-gray-400">+{primaryAnalysis.evidence.direct_keywords.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  {primaryAnalysis.evidence.related_keywords?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-blue-700 mb-1">Related Keywords ({primaryAnalysis.evidence.related_count})</div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {primaryAnalysis.evidence.related_keywords.slice(0, 5).map((kw: string, i: number) => (
                          <div key={i}>• {kw}</div>
                        ))}
                        {primaryAnalysis.evidence.related_keywords.length > 5 && (
                          <div className="text-gray-400">+{primaryAnalysis.evidence.related_keywords.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reasoning */}
            {primaryAnalysis?.reasoning && (
              <div className="bg-gray-50 rounded-md p-3">
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium">Why this target:</span> {primaryAnalysis.reasoning}
                </div>
              </div>
            )}
            
            {/* Alternative options indicator */}
            {targetAnalyses.length > 1 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <button 
                  onClick={() => toggleSection('alternatives')}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>{targetAnalyses.length - 1} other target options analyzed</span>
                  <ChevronDownIcon className={`h-3 w-3 transition-transform ${expandedSections.alternatives ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COLLAPSIBLE: Supporting Evidence */}
      {domain.evidence && (
        <CollapsibleSection
          title="Keyword Overlap Analysis"
          isOpen={expandedSections.evidence}
          onToggle={() => toggleSection('evidence')}
          icon={TrendingUp}
          summary={(() => {
            const overlapText = domain.overlapStatus === 'both' ? 'Site ranks for your niche + broader industry' :
                              domain.overlapStatus === 'direct' ? 'Site ranks for your exact keywords' :
                              domain.overlapStatus === 'related' ? 'Site ranks for related industry topics' : 'No keyword overlap found';
            
            const getStrengthLabel = (authority: string, avgPosition?: number) => {
              const positionText = avgPosition ? ` avg #${avgPosition.toFixed(0)}` : '';
              if (authority === 'strong') return `strong authority - ranks top 30${positionText}`;
              if (authority === 'moderate') return `moderate authority - ranks pages 4-6${positionText}`;
              if (authority === 'weak') return `weak authority - ranks pages 7-10${positionText}`;
              return positionText ? `avg ranking #${avgPosition?.toFixed(0)}` : '';
            };
            
            const directStrength = domain.authorityDirect && domain.authorityDirect !== 'n/a' ? 
              ` (${getStrengthLabel(domain.authorityDirect, domain.evidence?.directMedianPosition || undefined)})` : 
              domain.evidence?.directMedianPosition ? ` (avg #${domain.evidence.directMedianPosition.toFixed(0)})` : '';
            const relatedStrength = domain.authorityRelated && domain.authorityRelated !== 'n/a' ? 
              ` (${getStrengthLabel(domain.authorityRelated, domain.evidence?.relatedMedianPosition || undefined)})` : 
              domain.evidence?.relatedMedianPosition ? ` (avg #${domain.evidence.relatedMedianPosition.toFixed(0)})` : '';
            
            const directText = domain.evidence.directCount > 0 ? 
              `Your keywords: ${domain.evidence.directCount}${directStrength}` : '';
            const relatedText = domain.evidence.relatedCount > 0 ? 
              `Industry topics: ${domain.evidence.relatedCount}${relatedStrength}` : '';
            
            const parts = [directText, relatedText].filter(Boolean);
            return parts.length > 0 ? `${overlapText} • ${parts.join(' • ')}` : overlapText;
          })()}
        >
          {!expandedSections.evidence ? (
            /* Collapsed state - summary with authority */
            <div className="space-y-3 pt-2">
              {/* Context Explanation */}
              <div className="bg-gray-50 p-3 rounded-md border-l-4 border-blue-500">
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-800">Why this matters:</span> We compared your target keywords against what this site already ranks for in Google. Sites that already rank for your keywords are more likely to rank your guest post content.
                </div>
              </div>
              
              {/* Keyword Overlap */}
              {domain.overlapStatus && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-xs font-medium text-blue-700 mb-1">Keyword Overlap Found</div>
                  <div className="text-xs text-gray-600">
                    {domain.overlapStatus === 'both' && '✓ Your exact niche keywords + broader industry topics'}
                    {domain.overlapStatus === 'direct' && '✓ Your exact niche keywords (highly targeted match)'}
                    {domain.overlapStatus === 'related' && '✓ Related industry topics (broader relevance)'}
                    {domain.overlapStatus === 'none' && '✗ No keywords relevant to your niche'}
                  </div>
                </div>
              )}
              
              {/* Direct + Related Summary with Authority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-green-800 mb-2">
                    Your Exact Keywords: {domain.evidence.directCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    Keywords that match your target niche
                  </div>
                  {domain.evidence.directMedianPosition && (
                    <div className="text-xs text-green-600 mb-1">
                      Avg. Google ranking: #{domain.evidence.directMedianPosition.toFixed(0)}
                    </div>
                  )}
                  {domain.authorityDirect && (
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Authority:</span> {domain.authorityDirect === 'strong' ? 'Strong (ranks top 30)' : 
                        domain.authorityDirect === 'moderate' ? 'Moderate (ranks 31-60)' : 
                        domain.authorityDirect === 'weak' ? 'Weak (ranks 61-100)' : 'None'}
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    Industry Topics: {domain.evidence.relatedCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    Broader topics relevant to your niche
                  </div>
                  {domain.evidence.relatedMedianPosition && (
                    <div className="text-xs text-blue-600 mb-1">
                      Avg. Google ranking: #{domain.evidence.relatedMedianPosition.toFixed(0)}
                    </div>
                  )}
                  {domain.authorityRelated && (
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Authority:</span> {domain.authorityRelated === 'strong' ? 'Strong (ranks top 30)' : 
                        domain.authorityRelated === 'moderate' ? 'Moderate (ranks 31-60)' : 
                        domain.authorityRelated === 'weak' ? 'Weak (ranks 61-100)' : 'None'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Expanded state - actual keyword lists with summary in titles */
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-green-700 mb-2">
                    Your Exact Keywords Found - {domain.evidence.directCount}
                    {domain.evidence.directMedianPosition && (
                      <span> (avg #{domain.evidence.directMedianPosition.toFixed(0)})</span>
                    )}
                  </div>
                  {(() => {
                    const directKeywords = domain.targetMatchData?.target_analysis
                      ?.flatMap((analysis: any) => analysis.evidence?.direct_keywords || []) ||
                      (domain as any).qualificationData?.evidence?.direct_keywords ||
                      [];
                    
                    return directKeywords.length > 0 ? (
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                        {directKeywords.slice(0, 30).map((kw: string, i: number) => (
                          <div key={i} className="text-xs text-gray-600">• {kw}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">No direct keywords found</div>
                    );
                  })()}
                </div>
                <div>
                  <div className="text-xs font-medium text-blue-700 mb-2">
                    Related Industry Keywords Found - {domain.evidence.relatedCount}
                    {domain.evidence.relatedMedianPosition && (
                      <span> (avg #{domain.evidence.relatedMedianPosition.toFixed(0)})</span>
                    )}
                  </div>
                  {(() => {
                    const relatedKeywords = domain.targetMatchData?.target_analysis
                      ?.flatMap((analysis: any) => analysis.evidence?.related_keywords || []) ||
                      (domain as any).qualificationData?.evidence?.related_keywords ||
                      [];
                    
                    return relatedKeywords.length > 0 ? (
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                        {relatedKeywords.slice(0, 30).map((kw: string, i: number) => (
                          <div key={i} className="text-xs text-gray-600">• {kw}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">No related keywords found</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* COLLAPSIBLE: Supporting Details */}
      {(domain.evidence || targetAnalyses.length > 1) && (
        <div className="space-y-3">
        
        {/* Alternative Targets */}
        {targetAnalyses.length > 1 && (
          <CollapsibleSection
            title="Alternative Target Options"
            isOpen={expandedSections.alternatives}
            onToggle={() => toggleSection('alternatives')}
            icon={Target}
            summary={`${targetAnalyses.length - 1} other options analyzed`}
          >
            <div className="space-y-3 pt-2">
              {targetAnalyses.slice(1, 4).map((analysis: any, i: number) => (
                <div key={i} className="bg-gray-50 p-3 rounded-md">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Left side: URL and analysis */}
                    <div>
                      <div className="text-xs font-mono text-gray-800 break-all mb-1">
                        {analysis.target_url}
                      </div>
                      <MatchQuality 
                        direct={analysis.evidence?.direct_count} 
                        related={analysis.evidence?.related_count} 
                      />
                      {analysis.reasoning && (
                        <div className="text-xs text-gray-600 mt-2">
                          <span className="font-medium">Analysis:</span> {analysis.reasoning}
                        </div>
                      )}
                    </div>
                    
                    {/* Right side: Keyword lists */}
                    {analysis.evidence && (analysis.evidence.direct_keywords?.length > 0 || analysis.evidence.related_keywords?.length > 0) && (
                      <div className="lg:border-l border-gray-200 lg:pl-3">
                        {analysis.evidence.direct_keywords?.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-green-700 mb-1">Direct ({analysis.evidence.direct_count})</div>
                            <div className="text-xs text-gray-600">
                              {analysis.evidence.direct_keywords.slice(0, 3).join(', ')}
                              {analysis.evidence.direct_keywords.length > 3 && (
                                <span className="text-gray-400"> +{analysis.evidence.direct_keywords.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                        {analysis.evidence.related_keywords?.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-blue-700 mb-1">Related ({analysis.evidence.related_count})</div>
                            <div className="text-xs text-gray-600">
                              {analysis.evidence.related_keywords.slice(0, 3).join(', ')}
                              {analysis.evidence.related_keywords.length > 3 && (
                                <span className="text-gray-400"> +{analysis.evidence.related_keywords.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {targetAnalyses.length > 4 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{targetAnalyses.length - 4} more options available
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}


        </div>
      )}

      {/* Simple Context Footer */}
      <div className="pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          <span>Qualified {domain.qualifiedAt ? new Date(domain.qualifiedAt).toLocaleDateString() : 'N/A'}</span>
          {domain.clientName && <span> • Client: {domain.clientName}</span>}
          {domain.projectName && <span> • Project: {domain.projectName}</span>}
        </div>
      </div>
    </div>
  );
}