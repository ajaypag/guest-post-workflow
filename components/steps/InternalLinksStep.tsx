'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface InternalLinksStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const InternalLinksStep = ({ step, workflow, onChange }: InternalLinksStepProps) => {
  // Get the target domain from domain selection step
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const targetDomain = domainSelectionStep?.outputs?.domain || workflow.targetDomain || '';
  
  // Get the final polished article from Step 6, fallback to earlier versions
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const finalArticle = finalPolishStep?.outputs?.finalArticle || '';
  
  // Fallback chain if final article not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = finalArticle || seoOptimizedArticle || originalArticle;
  
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
        
        {finalArticle ? (
          <div className="bg-green-100 border border-green-300 rounded p-2 mb-3">
            <p className="text-sm text-green-800">✅ Using final polished article from Step 6</p>
          </div>
        ) : seoOptimizedArticle ? (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
            <p className="text-sm text-yellow-800">⚠️ Using SEO-optimized article from Step 5 (complete Step 6 for final version)</p>
          </div>
        ) : originalArticle ? (
          <div className="bg-orange-100 border border-orange-300 rounded p-2 mb-3">
            <p className="text-sm text-orange-800">⚠️ Using original draft from Step 4 (complete Steps 5-6 for final version)</p>
          </div>
        ) : null}

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