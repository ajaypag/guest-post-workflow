'use client';

import React, { useState } from 'react';
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

  if (!qaResults) {
    return <>{children}</>;
  }

  const { score, qaStatus, details, errors } = qaResults;

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h4 className="font-medium text-gray-900">QA Verification Results</h4>
            <div className={`text-xs px-2 py-1 rounded-full ${
              qaStatus === 'passed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {qaStatus === 'passed' ? 'PASSED' : 'FAILED'}
            </div>
          </div>

          {/* Manual Override Notice */}
          {manualOverride && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              ⚠️ Manually overridden - delivered despite QA issues
            </div>
          )}

          {/* Score Summary */}
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Critical Checks:</div>
            <div className="text-sm font-medium">{score.critical}</div>
            {score.additional && (
              <>
                <div className="text-xs text-gray-600 mb-1 mt-2">Additional Checks:</div>
                <div className="text-sm">{score.additional}</div>
              </>
            )}
          </div>

          {/* Failed Checks */}
          {details?.failedChecks && details.failedChecks.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-red-600 mb-2 font-medium">Failed Checks:</div>
              <div className="space-y-1">
                {details.failedChecks.map(check => (
                  <div key={check} className="flex items-center text-xs text-red-700">
                    <XCircle className="w-3 h-3 mr-2" />
                    {formatCheckName(check)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anchor Text Details */}
          {details?.anchorText && (details.anchorText.expected || details.anchorText.actual) && (
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600 mb-2 flex items-center">
                <Link className="w-3 h-3 mr-1" />
                Anchor Text Analysis
              </div>
              {details.anchorText.expected && (
                <div className="text-xs mb-1">
                  <span className="text-gray-600">Expected:</span> "{details.anchorText.expected}"
                </div>
              )}
              {details.anchorText.actual && (
                <div className="text-xs mb-1">
                  <span className="text-gray-600">Found:</span> "{details.anchorText.actual}"
                </div>
              )}
              <div className={`text-xs flex items-center ${
                details.anchorText.correct ? 'text-green-600' : 'text-red-600'
              }`}>
                {details.anchorText.correct ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1" />
                )}
                {details.anchorText.correct ? 'Match confirmed' : 'Mismatch detected'}
              </div>
            </div>
          )}

          {/* Google Index Status */}
          <div className="mb-3">
            <div className="flex items-center text-xs">
              {getGoogleIndexIcon(details?.googleIndex?.status)}
              <span className="ml-2">{getGoogleIndexText(details?.googleIndex?.status)}</span>
            </div>
          </div>

          {/* Client Link Details */}
          {details?.clientLink && (
            <div className="mb-3 space-y-1">
              <div className="text-xs text-gray-600">Client Link Status:</div>
              <div className="flex items-center text-xs">
                {details.clientLink.present ? (
                  <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-600 mr-2" />
                )}
                Link {details.clientLink.present ? 'found' : 'not found'}
              </div>
              {details.clientLink.present && (
                <div className="flex items-center text-xs">
                  {details.clientLink.dofollow ? (
                    <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-600 mr-2" />
                  )}
                  {details.clientLink.dofollow ? 'Dofollow' : 'Nofollow'}
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {errors && errors.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-red-600 mb-2">Verification Errors:</div>
              <div className="space-y-1">
                {errors.slice(0, 2).map((error, index) => (
                  <div key={index} className="text-xs text-red-700">• {error}</div>
                ))}
                {errors.length > 2 && (
                  <div className="text-xs text-gray-500">+ {errors.length - 2} more errors</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};