'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface UrlSuggestionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const UrlSuggestionStep = ({ step, workflow, onChange }: UrlSuggestionStepProps) => {
  // Get guest post site from domain selection step
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || '';
  
  // Get the guest post title from topic generation step (Step 2i)
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const postTitle = topicGenerationStep?.outputs?.postTitle || '';
  
  // Get final validated keyword from topic generation step (Step 2h)
  const finalKeyword = topicGenerationStep?.outputs?.finalKeyword || '';
  
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
  const completePrompt = `Guest post website: ${guestPostSite || 'Guest post website from Step 1'}

Pitch topic: ${postTitle || 'Guest post title from Step 2i'}

Keyword: ${finalKeyword || 'Final validated keyword from Step 2h'}

Article content:

${fullArticle || 'Complete previous steps to get article content'}`;

  // Generate copy-paste text for Google Doc
  const suggestedUrlText = step.outputs.suggestedUrl ? 
    `Suggested URL: ${step.outputs.suggestedUrl}` : 
    'Suggested URL: [Add suggested URL here]';

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/60360bf7d90a45bca5a50b760bcf4138"
        title="URL Suggestion Tutorial"
        description="Learn how to suggest SEO-optimized URLs for your guest posts"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 14: URL Suggestion</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Optimize the guest post URL structure</p>
          <p className="text-sm text-gray-700">
            Guest post sites often don't pay attention to URL optimization. Get a strategic URL suggestion 
            that's SEO-friendly and aligns with your keyword strategy.
          </p>
        </div>

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
          <h4 className="font-semibold mb-2">📋 Complete Prompt for GPT</h4>
          {guestPostSite && postTitle && finalKeyword && fullArticle ? (
            <div className="bg-white p-3 rounded border text-sm font-mono relative">
              <div className="absolute top-2 right-2">
                <CopyButton 
                  text={completePrompt}
                  label="Copy Complete Prompt"
                />
              </div>
              <div className="pr-16">
                <p><strong>Guest post website:</strong> {guestPostSite}</p>
                <p><strong>Pitch topic:</strong> {postTitle}</p>
                <p><strong>Keyword:</strong> {finalKeyword}</p>
                <p className="mt-2"><strong>Article content:</strong></p>
                <div className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
                  <p className="text-xs whitespace-pre-wrap">{fullArticle.substring(0, 300)}{fullArticle.length > 300 ? '...' : ''}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ Missing required information for complete prompt:
              </p>
              <ul className="text-sm text-yellow-700 ml-4 space-y-1">
                {!guestPostSite && <li>• Guest post website (Step 1)</li>}
                {!postTitle && <li>• Guest post title (Step 2i)</li>}
                {!finalKeyword && <li>• Final validated keyword (Step 2h)</li>}
                {!fullArticle && <li>• Article content (Steps 4-6)</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold mb-2">🔗 Submit to GPT</h4>
          <a href="https://chatgpt.com/g/g-6864232c2af481918c2a7dfe2427b55c-guest-post-url-suggester?model=o3" 
             target="_blank" 
             className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
            Open Guest Post URL Suggester GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
          </a>
          <p className="text-sm mt-2 italic">
            Use the "Copy Complete Prompt" button above. The GPT will analyze your content and suggest an optimized URL structure.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Prompt Submitted to GPT?</label>
        <select
          value={step.outputs.promptSubmitted || ''}
          onChange={(e) => onChange({ ...step.outputs, promptSubmitted: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="yes">Prompt submitted to GPT</option>
          <option value="no">Not yet</option>
        </select>
      </div>

      <SavedField
        label="Suggested URL"
        value={step.outputs.suggestedUrl || ''}
        placeholder="Paste the URL suggestion from GPT"
        onChange={(value) => onChange({ ...step.outputs, suggestedUrl: value })}
      />

      <div className="bg-green-50 p-4 rounded border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">📝 Add to Google Doc</h4>
        <p className="text-sm text-gray-700 mb-3">
          Copy the text below and add it to your Google Doc right underneath the title:
        </p>
        
        <div className="bg-white p-3 rounded border text-sm font-mono relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text={suggestedUrlText}
              label="Copy for Google Doc"
            />
          </div>
          <p className="pr-16">{suggestedUrlText}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">URL Suggestion Status</label>
        <select
          value={step.outputs.urlStatus || ''}
          onChange={(e) => onChange({ ...step.outputs, urlStatus: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="suggested">URL suggested and ready to share</option>
          <option value="modified">Modified GPT suggestion</option>
          <option value="added-to-doc">Added to Google Doc</option>
          <option value="shared-with-site">Shared with guest post site</option>
        </select>
      </div>
    </div>
  );
};