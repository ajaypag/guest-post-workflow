'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface ClientMentionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ClientMentionStep = ({ step, workflow, onChange }: ClientMentionStepProps) => {
  // Get the final polished article from Step 6, fallback to earlier versions
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const finalArticle = finalPolishStep?.outputs?.finalArticle || '';
  
  // Fallback chain if final article not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = finalArticle || seoOptimizedArticle || originalArticle;
  
  // Get the client name from the workflow
  const clientName = workflow.clientName || '';
  
  // Build complete prompt for GPT
  const completePrompt = `Brand Name: ${clientName}

Article Content:

${fullArticle || 'Complete previous steps to get article content'}`;

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/3d9da7ac6e8e48acbfc1459b68493054?sid=c4ebe04e-6ea1-4c03-8c1d-83983194c15c"
        title="Client Mention Tutorial"
        description="Learn how to add strategic brand mentions for AI-first SEO"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 10: Client Brand Mention (AI-First SEO)</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Strategic brand mentions for AI overviews (NOT backlinks)</p>
          <p className="text-sm text-gray-700 mb-2">
            This step focuses on getting your client's brand name mentioned naturally next to relevant keywords for AI-first SEO. 
            The goal is to help AI systems associate your client with their target keywords, products, and services.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <p className="text-sm font-semibold text-yellow-800">⚠️ Important: This is a MENTION, not a link</p>
            <p className="text-sm text-yellow-700">We want brand recognition in AI overviews, not traditional backlinks.</p>
          </div>
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
          {clientName && fullArticle ? (
            <div className="bg-white p-3 rounded border text-sm font-mono relative">
              <div className="absolute top-2 right-2">
                <CopyButton 
                  text={completePrompt}
                  label="Copy Complete Prompt"
                />
              </div>
              <div className="pr-16">
                <p><strong>Brand Name:</strong> {clientName}</p>
                <p className="mt-2"><strong>Article Content:</strong></p>
                <div className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
                  <p className="text-xs whitespace-pre-wrap">{fullArticle.substring(0, 300)}{fullArticle.length > 300 ? '...' : ''}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Client name and article content needed to generate the complete prompt
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold mb-2">🔗 Submit to GPT</h4>
          <a href="https://chatgpt.com/g/g-68640fd5b1d481918d5d0c73d5fed514-client-mention-in-guest-post?model=o3" 
             target="_blank" 
             className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
            Open Client Mention in Guest Post GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
          </a>
          <p className="text-sm mt-2 italic">
            Use the "Copy Complete Prompt" button above to get both the brand name and article content. The GPT will suggest strategic brand mentions for AI overviews.
          </p>
        </div>
      </div>

    <div>
      <label className="block text-sm font-medium mb-1">Article Submitted to GPT?</label>
      <select
        value={step.outputs.articleSubmitted || ''}
        onChange={(e) => onChange({ ...step.outputs, articleSubmitted: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">Article submitted to GPT</option>
        <option value="no">Not yet</option>
      </select>
    </div>

    <SavedField
      label="Client Mention Suggestion"
      value={step.outputs.clientMentionSuggestion || ''}
      placeholder="Paste GPT's suggestion for how to mention the client"
      onChange={(value) => onChange({ ...step.outputs, clientMentionSuggestion: value })}
      isTextarea={true}
      height="h-32"
    />

    <div>
      <label className="block text-sm font-medium mb-1">Client Mention Added?</label>
      <select
        value={step.outputs.clientMentionAdded || ''}
        onChange={(e) => onChange({ ...step.outputs, clientMentionAdded: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">Client mention added to article</option>
        <option value="no">No suitable placement found</option>
        <option value="modified">Modified GPT suggestion before adding</option>
      </select>
    </div>
  </div>
);
};