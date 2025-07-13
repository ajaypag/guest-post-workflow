'use client';

import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface DescriptionGenerationButtonProps {
  targetPageId: string;
  targetUrl: string;
  onSuccess?: (description: string) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const DescriptionGenerationButton = ({ 
  targetPageId, 
  targetUrl, 
  onSuccess, 
  onError,
  size = 'sm',
  className = ''
}: DescriptionGenerationButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDescription = async () => {
    setIsGenerating(true);
    
    try {
      console.log('🟡 Generating description for:', { targetPageId, targetUrl });
      
      const response = await fetch(`/api/target-pages/${targetPageId}/description`, {
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
        throw new Error(data.error || 'Failed to generate description');
      }

      if (data.success) {
        console.log('🟢 Description generated:', data.description);
        onSuccess?.(data.description);
      } else {
        throw new Error(data.error || 'Description generation failed');
      }

    } catch (error) {
      console.error('🔴 Description generation error:', error);
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
      onClick={generateDescription}
      disabled={isGenerating}
      className={`inline-flex items-center space-x-1 ${buttonSize} bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title="Generate AI description for this URL"
    >
      {isGenerating ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <FileText className={iconSize} />
      )}
      <span>{isGenerating ? 'Generating...' : 'AI Description'}</span>
    </button>
  );
};