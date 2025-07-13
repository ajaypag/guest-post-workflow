'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface KeywordGenerationButtonProps {
  targetPageId: string;
  targetUrl: string;
  onSuccess?: (keywords: string[]) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const KeywordGenerationButton = ({ 
  targetPageId, 
  targetUrl, 
  onSuccess, 
  onError,
  size = 'sm',
  className = ''
}: KeywordGenerationButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateKeywords = async () => {
    setIsGenerating(true);
    
    try {
      console.log('🟡 Generating keywords for:', { targetPageId, targetUrl });
      
      const response = await fetch(`/api/target-pages/${targetPageId}/keywords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: targetUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate keywords');
      }

      if (data.success) {
        console.log('🟢 Keywords generated:', data.keywords);
        onSuccess?.(data.keywords);
      } else {
        throw new Error(data.error || 'Keyword generation failed');
      }

    } catch (error) {
      console.error('🔴 Keyword generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const buttonSize = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <button
      onClick={generateKeywords}
      disabled={isGenerating}
      className={`inline-flex items-center space-x-1 ${buttonSize} bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title="Generate AI keywords for this URL"
    >
      {isGenerating ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <Sparkles className={iconSize} />
      )}
      <span>{isGenerating ? 'Generating...' : 'AI Keywords'}</span>
    </button>
  );
};