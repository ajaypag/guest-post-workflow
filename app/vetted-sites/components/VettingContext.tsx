'use client';

import React, { useState } from 'react';

interface TargetPage {
  id: string;
  url: string;
  keywords: string | null;
  description: string | null;
}

interface VettingContextProps {
  targetPages: TargetPage[];
}

export default function VettingContext({ targetPages }: VettingContextProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  console.log('🔍 VettingContext received targetPages:', JSON.stringify(targetPages));

  if (!targetPages || targetPages.length === 0) {
    return null;
  }

  // Extract unique domains from target URLs
  const uniqueDomains = Array.from(new Set(
    targetPages.map(page => {
      try {
        return new URL(page.url).hostname.replace('www.', '');
      } catch {
        return page.url.split('/')[0];
      }
    })
  ));

  const displayText = targetPages.length === 1 
    ? `Vetted: ${uniqueDomains[0]}`
    : `Vetted: ${targetPages.length} URLs`;

  return (
    <div className="relative">
      <button
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement filter by these target URLs
          console.log('Filter by target URLs:', targetPages.map(p => p.url));
        }}
      >
        {displayText}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 shadow-xl rounded-lg p-3">
          <div className="font-medium text-gray-900 mb-2">Originally analyzed for:</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {targetPages.slice(0, 5).map((page, idx) => (
              <div key={page.id} className="border-l-2 border-blue-200 pl-2">
                <div className="font-medium text-blue-600 text-xs truncate" title={page.url}>
                  {page.url}
                </div>
                {page.keywords && (
                  <div className="text-gray-600 text-xs mt-0.5">
                    {page.keywords.split(',').slice(0, 2).join(', ')}
                    {page.keywords.split(',').length > 2 && 
                      ` +${page.keywords.split(',').length - 2} more`}
                  </div>
                )}
              </div>
            ))}
            {targetPages.length > 5 && (
              <div className="text-gray-500 text-xs italic">
                +{targetPages.length - 5} more URLs...
              </div>
            )}
          </div>
          <div className="text-gray-500 text-xs mt-2 pt-2 border-t border-gray-200">
            This domain was qualified against these target pages
          </div>
        </div>
      )}
    </div>
  );
}