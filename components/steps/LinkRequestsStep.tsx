'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface LinkRequestsStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const LinkRequestsStep = ({ step, workflow, onChange }: LinkRequestsStepProps) => {
  // Get the cleaned article from Step 7 (formatting QA) as primary source
  const formattingQAStep = workflow.steps.find(s => s.id === 'formatting-qa');
  const cleanedArticle = formattingQAStep?.outputs?.cleanedArticle || '';
  
  // Fallback chain: Step 6 -> Step 5 -> Step 4
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const finalArticle = finalPolishStep?.outputs?.finalArticle || '';
  
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = cleanedArticle || finalArticle || seoOptimizedArticle || originalArticle;
  
  // Get guest post site from domain selection step
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
  }

  
  // Build complete prompt for GPT
  const completePrompt = `Guest post site: ${guestPostSite}

Finalized guest post article:

${fullArticle || 'Complete previous steps to get article content'}`;

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/f368de59ab314a329541a44e0b1c049a"
        title="Internal Link Requests Tutorial"
        description="Learn how to request internal links from the guest post site to boost your article"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 13: Internal Link Requests</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Find 3 relevant articles on their blog for internal links</p>
          <p className="text-sm text-gray-700">
            Ask the guest post site to add internal links from 3 of their existing articles to your new guest post. 
            The GPT will analyze their content and suggest specific articles with metadata for each link request.
          </p>
        </div>

        {cleanedArticle ? (
          <div className="bg-green-100 border border-green-300 rounded p-2 mb-3">
            <p className="text-sm text-green-800">✅ Using cleaned article from Step 7 (Formatting & QA)</p>
          </div>
        ) : finalArticle ? (
          <div className="bg-blue-100 border border-blue-300 rounded p-2 mb-3">
            <p className="text-sm text-blue-800">ℹ️ Using polished article from Step 6 (complete Step 7 for cleaned version)</p>
          </div>
        ) : seoOptimizedArticle ? (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
            <p className="text-sm text-yellow-800">⚠️ Using SEO-optimized article from Step 5 (complete Steps 6-7 for final version)</p>
          </div>
        ) : originalArticle ? (
          <div className="bg-orange-100 border border-orange-300 rounded p-2 mb-3">
            <p className="text-sm text-orange-800">⚠️ Using original draft from Step 4 (complete Steps 5-7 for final version)</p>
          </div>
        ) : null}

        <div className="bg-gray-100 p-3 rounded mb-3">
          <h4 className="font-semibold mb-2">📋 Complete Prompt for GPT</h4>
          {guestPostSite && fullArticle ? (
            <div className="bg-white p-3 rounded border text-sm font-mono relative">
              <div className="absolute top-2 right-2">
                <CopyButton 
                  text={completePrompt}
                  label="Copy Complete Prompt"
                />
              </div>
              <div className="pr-16">
                <p><strong>Guest post site:</strong> {guestPostSite}</p>
                <p className="mt-2"><strong>Finalized guest post article:</strong></p>
                <div className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
                  <p className="text-xs whitespace-pre-wrap">{fullArticle.substring(0, 300)}{fullArticle.length > 300 ? '...' : ''}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Guest post site and article content needed to generate the complete prompt
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold mb-2">🔗 Submit to GPT</h4>
          <a href="https://chatgpt.com/g/g-685d7ed61d448191b4e1033a0e0b4201-get-internal-links-to-your-new-guest-post?model=o3" 
             target="_blank" 
             className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
            Open Get Internal Links GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
          </a>
          <p className="text-sm mt-2 italic">
            Use the "Copy Complete Prompt" button above. The GPT will analyze the guest post site and suggest 3 relevant articles with placement details.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Analysis Submitted?</label>
        <select
          value={step.outputs.analysisSubmitted || ''}
          onChange={(e) => onChange({ ...step.outputs, analysisSubmitted: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="yes">Guest post and target site submitted</option>
          <option value="no">Not yet</option>
        </select>
      </div>

      <SavedField
        label="Complete GPT Output"
        value={step.outputs.completeGptOutput || ''}
        placeholder="Paste the complete analysis from GPT including all article suggestions, anchor text, placement details, and metadata"
        onChange={(value) => onChange({ ...step.outputs, completeGptOutput: value })}
        isTextarea={true}
        height="h-40"
      />

      <div>
        <label className="block text-sm font-medium mb-1">Link Request Status</label>
        <select
          value={step.outputs.linkRequestStatus || ''}
          onChange={(e) => onChange({ ...step.outputs, linkRequestStatus: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="ready">Ready to request links</option>
          <option value="requested">Link requests sent</option>
          <option value="approved">Links approved and added</option>
        </select>
      </div>
    </div>
  );
};