'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { ExternalLink } from 'lucide-react';

interface InternalLinksStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const InternalLinksStep = ({ step, workflow, onChange }: InternalLinksStepProps) => {
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const fullArticle = articleDraftStep?.outputs?.fullArticle || '';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 8: Internal Links to Guest Post Site</h3>
        <p className="text-sm mb-2">
          Make sure model o3 is selected. Paste in the article and the site <strong>{workflow.targetDomain}</strong> where you're guest posting.
        </p>
        {fullArticle && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm font-semibold text-green-800">✅ Article ready from Step 4</p>
            <p className="text-xs text-green-700">Article preview: {fullArticle.substring(0, 100)}...</p>
          </div>
        )}
        <a href="https://chatgpt.com/g/g-685c386ba4848191ac01d0bcea6e8db7-guest-post-internal-links" 
           target="_blank" 
           className="text-blue-600 hover:underline inline-flex items-center font-medium">
          Guest Post Internal Links GPT <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <p className="text-sm mt-2 italic">
          The GPT will tell you what internal links to add to the article.
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