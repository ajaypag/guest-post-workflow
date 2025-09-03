'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, Search, Link, Globe, MessageSquare } from 'lucide-react';

interface QADetailsTooltipProps {
  children: React.ReactNode;
  qaResults: {
    score: {
      critical: string;
      additional: string;
      passed: boolean;
    };
    qaStatus: 'passed' | 'failed_needs_fixes';
    googleIndexStatus?: 'indexed' | 'not_indexed' | 'pending' | 'error';
    hasManualOverrides?: boolean;
    manualOverrides?: Record<string, boolean>;
    details?: {
      anchorText?: {
        expected?: string;
        actual?: string;
        correct?: boolean;
      };
      clientLink?: {
        present?: boolean;
        dofollow?: boolean;
      };
      clientMention?: {
        expectedPhrase?: string;
        present?: boolean;
        proximity?: 'same-sentence' | 'same-paragraph' | 'not-found';
      };
      googleIndex?: {
        status?: string;
        indexed?: boolean;
      };
      failedChecks?: string[];
      passedChecks?: string[];
    };
    errors?: string[];
  };
  manualOverride?: boolean;
}

const formatCheckName = (checkKey: string): string => {
  const names = {
    urlIsLive: 'URL is Live',
    clientLinkPresent: 'Client Link Present',
    anchorTextCorrect: 'Anchor Text Correct',
    linkIsDofollow: 'Link is Dofollow',
    correctDomain: 'Correct Domain',
    clientMentionPresent: 'Client Mention Present'
  };
  return names[checkKey as keyof typeof names] || checkKey;
};

const getGoogleIndexIcon = (status?: string) => {
  switch (status) {
    case 'indexed': return <CheckCircle className="w-3 h-3 text-green-600" />;
    case 'not_indexed': return <XCircle className="w-3 h-3 text-red-600" />;
    case 'pending': return <AlertCircle className="w-3 h-3 text-yellow-600" />;
    case 'error': return <XCircle className="w-3 h-3 text-red-600" />;
    default: return <Search className="w-3 h-3 text-gray-400" />;
  }
};

const getGoogleIndexText = (status?: string) => {
  switch (status) {
    case 'indexed': return 'Indexed by Google';
    case 'not_indexed': return 'Not indexed by Google';
    case 'pending': return 'Indexing pending';
    case 'error': return 'Index check failed';
    default: return 'Index status unknown';
  }
};

export const QADetailsTooltip: React.FC<QADetailsTooltipProps> = ({
  children,
  qaResults,
  manualOverride
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Safety check
  if (!qaResults || !qaResults.score) {
    return <div className="cursor-help">{children}</div>;
  }

  const { score, qaStatus, details, errors } = qaResults;

  const handleMouseEnter = () => {
    setIsVisible(true);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 384; // w-96 = 384px
      const tooltipHeight = 400; // Estimated height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10;
      
      // Adjust horizontal position if tooltip would go off-screen
      if (x - tooltipWidth / 2 < 10) {
        // Too far left, position at left edge with margin
        x = tooltipWidth / 2 + 10;
      } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
        // Too far right, position at right edge with margin
        x = viewportWidth - tooltipWidth / 2 - 10;
      }
      
      // Adjust vertical position if tooltip would go off-screen
      let below = false;
      if (y - tooltipHeight < 10) {
        // Not enough space above, position below the trigger
        y = rect.bottom + 10;
        below = true;
      }
      
      setPositionBelow(below);
      setPosition({
        x: x + scrollX,
        y: y + scrollY
      });
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const [positionBelow, setPositionBelow] = useState(false);

  const tooltipContent = (
    <div 
      className={`fixed z-[9999] w-96 bg-white border border-gray-200 rounded-lg shadow-2xl p-5 max-h-[80vh] overflow-y-auto transform -translate-x-1/2 ${
        positionBelow ? '' : '-translate-y-full'
      }`}
      style={{ 
        left: position.x, 
        top: position.y,
        pointerEvents: 'none'
      }}
    >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                <Info className="w-3 h-3 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">QA Verification Details</h4>
            </div>
            <div className={`text-xs px-3 py-1 rounded-full font-medium ${
              qaStatus === 'passed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {qaStatus === 'passed' ? '✓ PASSED' : '✗ FAILED'}
            </div>
          </div>

          {/* Manual Override Notice */}
          {(manualOverride || (qaResults as any).hasManualOverrides) && (
            <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
              <div className="flex items-center text-amber-800">
                <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                <span className="text-xs font-medium">
                  {(qaResults as any).hasManualOverrides ? 'QA Checks Manually Overridden' : 'Manual Override Active'}
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1 ml-6">
                {(qaResults as any).hasManualOverrides 
                  ? `${Object.keys((qaResults as any).manualOverrides || {}).length} check(s) manually approved - QA now passes`
                  : 'Delivered despite QA issues - manual review completed'}
              </p>
              {(qaResults as any).hasManualOverrides && (qaResults as any).manualOverrides && (
                <div className="mt-2 ml-6 text-xs text-amber-600">
                  Overridden: {Object.keys((qaResults as any).manualOverrides).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Score Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Critical Checks</div>
                <div className={`text-lg font-bold ${
                  score?.passed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {score?.critical || 'N/A'}
                </div>
              </div>
              {score?.additional && (
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Additional Checks</div>
                  <div className="text-lg font-bold text-blue-600">
                    {score.additional}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Check Status Grid */}
          {(details?.failedChecks || details?.passedChecks) && (
            <div className="mb-4">
              <div className="text-xs text-gray-600 font-medium mb-3">Check Details:</div>
              <div className="space-y-2">
                {/* Failed Checks */}
                {details?.failedChecks && details.failedChecks.length > 0 && (
                  <div className="space-y-1">
                    {details.failedChecks.map(check => (
                      <div key={check} className="flex items-center justify-between py-1 px-2 bg-red-50 rounded text-xs">
                        <div className="flex items-center text-red-700">
                          <XCircle className="w-3 h-3 mr-2" />
                          {formatCheckName(check)}
                        </div>
                        <span className="text-red-600 font-medium">FAILED</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Passed Checks */}
                {details?.passedChecks && details.passedChecks.length > 0 && (
                  <div className="space-y-1">
                    {details.passedChecks.slice(0, 3).map(check => (
                      <div key={check} className="flex items-center justify-between py-1 px-2 bg-green-50 rounded text-xs">
                        <div className="flex items-center text-green-700">
                          <CheckCircle className="w-3 h-3 mr-2" />
                          {formatCheckName(check)}
                        </div>
                        <span className="text-green-600 font-medium">PASSED</span>
                      </div>
                    ))}
                    {details.passedChecks.length > 3 && (
                      <div className="text-xs text-gray-500 pl-2">+ {details.passedChecks.length - 3} more passed</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anchor Text Details */}
          {details?.anchorText && (details.anchorText.expected || details.anchorText.actual) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                  details.anchorText.correct ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Link className={`w-3 h-3 ${
                    details.anchorText.correct ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-900">Anchor Text Analysis</span>
                <div className={`ml-auto text-xs px-2 py-1 rounded-full ${
                  details.anchorText.correct 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {details.anchorText.correct ? '✓ MATCH' : '✗ MISMATCH'}
                </div>
              </div>
              
              <div className="space-y-2">
                {details.anchorText.expected && (
                  <div className="bg-white p-2 rounded border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">EXPECTED:</div>
                    <div className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      "{details.anchorText.expected}"
                    </div>
                  </div>
                )}
                {details.anchorText.actual && (
                  <div className="bg-white p-2 rounded border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">FOUND:</div>
                    <div className={`text-xs font-mono px-2 py-1 rounded ${
                      details.anchorText.correct 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-red-800 bg-red-100'
                    }`}>
                      "{details.anchorText.actual}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Google Index Status */}
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                  <Globe className="w-3 h-3 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Google Index Status</span>
              </div>
              <div className="flex items-center">
                {getGoogleIndexIcon(details?.googleIndex?.status)}
                <span className="ml-2 text-xs font-medium">{getGoogleIndexText(details?.googleIndex?.status)}</span>
              </div>
            </div>
            {details?.googleIndex?.status === 'pending' && (
              <div className="mt-2 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                💡 New content may take 24-48 hours to be indexed by Google
              </div>
            )}
          </div>

          {/* Client Link Details */}
          {details?.clientLink && (
            <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center mb-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                  details.clientLink.present ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Link className={`w-3 h-3 ${
                    details.clientLink.present ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-900">Client Link Details</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-teal-200">
                  <div className="flex items-center text-xs">
                    {details.clientLink.present ? (
                      <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-600 mr-2" />
                    )}
                    Link Presence
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    details.clientLink.present 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {details.clientLink.present ? 'FOUND' : 'NOT FOUND'}
                  </span>
                </div>
                
                {details.clientLink.present && (
                  <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-teal-200">
                    <div className="flex items-center text-xs">
                      {details.clientLink.dofollow ? (
                        <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-600 mr-2" />
                      )}
                      Link Attribute
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      details.clientLink.dofollow 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {details.clientLink.dofollow ? 'DOFOLLOW' : 'NOFOLLOW'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Mention Details */}
          {details?.clientMention && details.clientMention.expectedPhrase && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center mb-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                  details.clientMention.present ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <MessageSquare className={`w-3 h-3 ${
                    details.clientMention.present ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-900">Client Mention Analysis</span>
                <div className={`ml-auto text-xs px-2 py-1 rounded-full ${
                  details.clientMention.present 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {details.clientMention.present ? '✓ FOUND' : '✗ NOT FOUND'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="bg-white p-2 rounded border border-orange-200">
                  <div className="text-xs text-orange-600 font-medium mb-1">EXPECTED PHRASE:</div>
                  <div className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                    "{details.clientMention.expectedPhrase}"
                  </div>
                </div>
                
                {details.clientMention.present && details.clientMention.proximity && (
                  <div className="flex items-center justify-between py-2 px-3 bg-white rounded border border-orange-200">
                    <div className="flex items-center text-xs">
                      <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
                      Mention Proximity
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      details.clientMention.proximity === 'same-sentence'
                        ? 'bg-green-100 text-green-800'
                        : details.clientMention.proximity === 'same-paragraph'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {details.clientMention.proximity === 'same-sentence' && 'SAME SENTENCE'}
                      {details.clientMention.proximity === 'same-paragraph' && 'SAME PARAGRAPH'}
                      {details.clientMention.proximity === 'not-found' && 'NOT FOUND'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors && errors.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center mb-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mr-2">
                  <XCircle className="w-3 h-3 text-red-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Verification Issues</span>
                <span className="ml-auto text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  {errors.length} {errors.length === 1 ? 'issue' : 'issues'}
                </span>
              </div>
              
              <div className="space-y-2">
                {errors.slice(0, 3).map((error, index) => (
                  <div key={index} className="flex items-start p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <AlertCircle className="w-3 h-3 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700">{error}</span>
                  </div>
                ))}
                {errors.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    + {errors.length - 3} additional {errors.length - 3 === 1 ? 'issue' : 'issues'}
                  </div>
                )}
              </div>
            </div>
          )}
    </div>
  );

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children}
      </div>
      
      {isVisible && typeof window !== 'undefined' && createPortal(
        tooltipContent,
        document.body
      )}
    </div>
  );
};

export default QADetailsTooltip;