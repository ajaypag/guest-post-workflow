'use client';

import React from 'react';
import { parseKeywordsFromStorage } from '@/lib/services/keywordGenerationService';
import { Tag } from 'lucide-react';

interface KeywordDisplayProps {
  keywords?: string;
  className?: string;
  maxDisplay?: number;
}

export const KeywordDisplay = ({ 
  keywords, 
  className = '',
  maxDisplay = 5
}: KeywordDisplayProps) => {
  if (!keywords || keywords.trim() === '') {
    return (
      <div className={`text-gray-400 text-xs italic ${className}`}>
        No keywords generated
      </div>
    );
  }

  const keywordArray = parseKeywordsFromStorage(keywords);
  
  if (keywordArray.length === 0) {
    return (
      <div className={`text-gray-400 text-xs italic ${className}`}>
        No keywords available
      </div>
    );
  }

  const displayKeywords = keywordArray.slice(0, maxDisplay);
  const hasMore = keywordArray.length > maxDisplay;

  return (
    <div className={`${className}`}>
      <div className="flex items-start space-x-1">
        <Tag className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex flex-wrap gap-1">
          {displayKeywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
            >
              {keyword}
            </span>
          ))}
          {hasMore && (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{keywordArray.length - maxDisplay} more
            </span>
          )}
        </div>
      </div>
      {keywordArray.length > maxDisplay && (
        <div className="mt-1 text-xs text-gray-500">
          Total: {keywordArray.length} keywords
        </div>
      )}
    </div>
  );
};