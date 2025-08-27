'use client';

import React from 'react';

interface DomainTagsProps {
  dr?: number | string | null;
  traffic?: number | string | null;
  className?: string;
}

export default function DomainTags({ dr, traffic, className = '' }: DomainTagsProps) {
  // Helper to format traffic numbers
  const formatTraffic = (value: number | string | null): string | null => {
    if (!value) return null;
    
    if (typeof value === 'string') {
      // If it's already a formatted string (like "5K"), return as-is
      if (value.includes('K') || value.includes('M') || value.includes('B')) {
        return value;
      }
      // Try to parse as number
      const num = parseInt(value.replace(/,/g, ''));
      if (isNaN(num)) return value; // Return original string if can't parse
      // Parse successful, format as number
      if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    }
    
    if (typeof value === 'number') {
      if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toString();
    }
    
    // This should never be reached given our input types, but handle gracefully
    return String(value);
  };

  const formattedTraffic = formatTraffic(traffic);
  
  return (
    <div className={`inline-flex items-center gap-1 flex-shrink-0 ${className}`}>
      {dr && (
        <span className="inline-flex items-center px-1 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded whitespace-nowrap">
          DR{dr}
        </span>
      )}
      {formattedTraffic && (
        <span className="inline-flex items-center px-1 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 rounded whitespace-nowrap">
          {formattedTraffic}
        </span>
      )}
    </div>
  );
}