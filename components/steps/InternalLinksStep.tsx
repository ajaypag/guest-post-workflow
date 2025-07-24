'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface InternalLinksStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const InternalLinksStep = ({ step, workflow, onChange }: InternalLinksStepProps) => {
  // Get the target domain from domain selection step
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const targetDomain = domainSelectionStep?.outputs?.domain || workflow.targetDomain || '';
  
  // Get articles from different steps
  const formattingQAStep = workflow.steps.find(s => s.id === 'formatting-qa');
  const cleanedArticle = formattingQAStep?.outputs?.cleanedArticle || '';
  
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const finalArticle = finalPolishStep?.outputs?.finalArticle || '';
  
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  // Determine available article sources
  const availableSources = [];
  if (cleanedArticle) availableSources.push({ value: 'step7', label: 'Step 7: Cleaned Article (Formatting & QA)', article: cleanedArticle });
  if (finalArticle) availableSources.push({ value: 'step6', label: 'Step 6: Final Article (Polish)', article: finalArticle });
  if (seoOptimizedArticle) availableSources.push({ value: 'step5', label: 'Step 5: SEO Optimized Article', article: seoOptimizedArticle });
  if (originalArticle) availableSources.push({ value: 'step4', label: 'Step 4: Original Article Draft', article: originalArticle });
  
  // Get the saved article source preference or use default
  const [articleSource, setArticleSource] = useState(step.outputs.articleSource || 'auto');
  
  // Determine which article to use based on selection
  let fullArticle = '';
  let currentSourceLabel = '';
  
  if (articleSource === 'auto') {
    // Use the default fallback chain
    fullArticle = cleanedArticle || finalArticle || seoOptimizedArticle || originalArticle;
    if (cleanedArticle) currentSourceLabel = 'Step 7: Cleaned Article';
    else if (finalArticle) currentSourceLabel = 'Step 6: Final Article';
    else if (seoOptimizedArticle) currentSourceLabel = 'Step 5: SEO Optimized Article';
    else if (originalArticle) currentSourceLabel = 'Step 4: Original Article Draft';
  } else {
    // Use the manually selected source
    const selectedSource = availableSources.find(s => s.value === articleSource);
    if (selectedSource) {
      fullArticle = selectedSource.article;
      currentSourceLabel = selectedSource.label;
    }
  }
  
  // Update the workflow when article source changes
  useEffect(() => {
    onChange({ ...step.outputs, articleSource });
  }, [articleSource]);
  
  // Build complete prompt for GPT
  const completePrompt = `Target Domain: ${targetDomain}

Article Content:

${fullArticle || 'Complete previous steps to get article content'}`;

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/86d453c1486b4ad4be5622610a4fdf86?sid=3e6ddea6-0088-47bc-9959-42e45b360722"
        title="Internal Links Tutorial"
        description="Learn how to add internal links to the guest post site for better SEO"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 8: Internal Links to Guest Post Site</h3>
        
        {/* Article Source Selector */}
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 mb-2">Article Source Selection</p>
              <div className="space-y-2">
                <select
                  value={articleSource}
                  onChange={(e) => setArticleSource(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="auto">Automatic (Latest Available)</option>
                  {availableSources.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
                {articleSource === 'auto' && currentSourceLabel && (
                  <p className="text-xs text-gray-600 italic">
                    Currently using: {currentSourceLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {fullArticle ? (
          <div className="bg-green-100 border border-green-300 rounded p-2 mb-3">
            <p className="text-sm text-green-800">✅ Article content loaded from {currentSourceLabel}</p>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
            <p className="text-sm text-yellow-800">⚠️ No article content available. Complete previous steps.</p>
          </div>
        )}

        <div className="bg-gray-100 p-3 rounded mb-3">
          <h4 className="font-semibold mb-2">📋 Complete Prompt for GPT:</h4>
          <div className="bg-white p-3 rounded border text-sm font-mono relative">
            <div className="absolute top-2 right-2">
              <CopyButton 
                text={completePrompt}
                label="Copy Complete Prompt"
              />
            </div>
            <div className="pr-16">
              <p><strong>Target Domain:</strong> {targetDomain}</p>
              <p className="mt-2"><strong>Article Content:</strong></p>
              <div className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
                {fullArticle ? (
                  <p className="text-xs whitespace-pre-wrap">{fullArticle.substring(0, 300)}{fullArticle.length > 300 ? '...' : ''}</p>
                ) : (
                  <p className="text-gray-500 text-xs italic">Complete previous steps to get article content</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <a href="https://chatgpt.com/g/g-685c386ba4848191ac01d0bcea6e8db7-guest-post-internal-links?model=o3" 
           target="_blank" 
           className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
          Open Guest Post Internal Links GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
        </a>
        <p className="text-sm mt-2 italic">
          Use the "Copy Complete Prompt" button above to get both the target domain and article content in one click. Paste into the GPT for internal link suggestions.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Article Submitted?</label>
        <select
          value={step.outputs.articleSubmitted || ''}
          onChange={(e) => onChange({ ...step.outputs, articleSubmitted: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="yes">Article and site submitted to GPT</option>
          <option value="no">Not yet</option>
        </select>
      </div>

      <SavedField
        label="Internal Links Suggested"
        value={step.outputs.internalLinksSuggested || ''}
        placeholder="Paste the internal links suggested by the GPT"
        onChange={(value) => onChange({ ...step.outputs, internalLinksSuggested: value })}
        isTextarea={true}
        height="h-32"
      />

      <div>
        <label className="block text-sm font-medium mb-1">Links Added to Article?</label>
        <select
          value={step.outputs.linksAdded || ''}
          onChange={(e) => onChange({ ...step.outputs, linksAdded: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="yes">Internal links added to Google Doc</option>
          <option value="partial">Some links added</option>
          <option value="no">Not yet added</option>
        </select>
        {(() => {
          const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
          const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';
          return googleDocUrl ? (
            <p className="text-xs text-blue-600 mt-1">
              <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                → Open Google Doc <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </p>
          ) : null;
        })()}
      </div>
    </div>
  );
};