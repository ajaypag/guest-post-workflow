'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface ExternalLinksStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ExternalLinksStep = ({ step, workflow, onChange }: ExternalLinksStepProps) => {
  // Get the final polished article from Step 6, fallback to earlier versions
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const finalArticle = finalPolishStep?.outputs?.finalArticle || '';
  
  // Fallback chain if final article not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = finalArticle || seoOptimizedArticle || originalArticle;
  
  // Get the client backlinks from the step output
  const clientBacklinks = step.outputs.clientBacklinks || '';
  
  // Build complete prompt for GPT
  const completePrompt = `Client Backlinks:

${clientBacklinks || 'Paste client backlinks from Airtable above first'}

Article Content:

${fullArticle || 'Complete previous steps to get article content'}`;

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/7f044b17f4fc4d8ea444350245aebc6e"
        title="Tier 2 Links Tutorial"
        description="Learn how to add links to other guest posts for better link building"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 9: Add Tier 2 Links (Other Guest Posts)</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Link to other guest posts you've published for this client</p>
          <p className="text-sm text-gray-700">
            Find previously published guest posts for this client and identify opportunities to link to them from your new article.
          </p>
        </div>

        <div className="bg-gray-100 p-4 rounded mb-3">
          <h4 className="font-semibold mb-3">📋 Step 1: Get Client Backlinks from Airtable</h4>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">1</span>
              <div>
                <p className="text-sm font-semibold">Open the Backlinks Database</p>
                <a href="https://airtable.com/appnZ4GebaC99OEaX/pagybhuN9MG1Apqni" 
                   target="_blank" 
                   className="inline-flex items-center text-blue-600 hover:underline text-sm">
                  Open Airtable Backlinks Database <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">2</span>
              <div>
                <p className="text-sm font-semibold">Filter by Client Name</p>
                <p className="text-sm text-gray-600">Use the "Prospecting Campaign" filter at the top and select your client: <strong>{workflow.clientName}</strong></p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">3</span>
              <div>
                <p className="text-sm font-semibold">Copy the List of URLs</p>
                <p className="text-sm text-gray-600">Select and copy all the guest post URLs from the filtered results</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">4</span>
              <div>
                <p className="text-sm font-semibold">Paste URLs below</p>
                <p className="text-sm text-gray-600">Paste the list in the "Client Backlinks" field below</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SavedField
        label="Client Backlinks from Airtable"
        value={step.outputs.clientBacklinks || ''}
        placeholder="Paste the list of guest post URLs from Airtable here (one per line or comma-separated)"
        onChange={(value) => onChange({ ...step.outputs, clientBacklinks: value })}
        isTextarea={true}
        height="h-32"
      />

      {finalArticle ? (
        <div className="bg-green-100 border border-green-300 rounded p-2">
          <p className="text-sm text-green-800">✅ Using final polished article from Step 6</p>
        </div>
      ) : seoOptimizedArticle ? (
        <div className="bg-yellow-100 border border-yellow-300 rounded p-2">
          <p className="text-sm text-yellow-800">⚠️ Using SEO-optimized article from Step 5 (complete Step 6 for final version)</p>
        </div>
      ) : originalArticle ? (
        <div className="bg-orange-100 border border-orange-300 rounded p-2">
          <p className="text-sm text-orange-800">⚠️ Using original draft from Step 4 (complete Steps 5-6 for final version)</p>
        </div>
      ) : null}

      <div className="bg-gray-100 p-3 rounded">
        <h4 className="font-semibold mb-2">📋 Step 2: Complete Prompt for GPT</h4>
        {clientBacklinks && fullArticle ? (
          <div className="bg-white p-3 rounded border text-sm font-mono relative">
            <div className="absolute top-2 right-2">
              <CopyButton 
                text={completePrompt}
                label="Copy Complete Prompt"
              />
            </div>
            <div className="pr-16">
              <p><strong>Client Backlinks:</strong></p>
              <div className="mt-1 p-2 bg-gray-50 border rounded max-h-20 overflow-y-auto">
                <p className="text-xs whitespace-pre-wrap">{clientBacklinks}</p>
              </div>
              <p className="mt-2"><strong>Article Content:</strong></p>
              <div className="mt-1 p-2 bg-gray-50 border rounded max-h-24 overflow-y-auto">
                <p className="text-xs whitespace-pre-wrap">{fullArticle.substring(0, 300)}{fullArticle.length > 300 ? '...' : ''}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Complete Step 1 (paste backlinks) and ensure article is available to generate the complete prompt
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-3 rounded">
        <h4 className="font-semibold mb-2">🔗 Submit to GPT</h4>
        <a href="https://chatgpt.com/g/g-685c3b6a40548191b3cb4a99e405f0a4-links-to-other-guest-posts-that-we-ve-done?model=o3" 
           target="_blank" 
           className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
          Open Links to Other Guest Posts GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
        </a>
        <p className="text-sm mt-2 italic">
          Use the "Copy Complete Prompt" button above to get both the client backlinks and article content. The GPT will suggest where to add links to other guest posts.
        </p>
      </div>

    <SavedField
      label="External Link Suggestions"
      value={step.outputs.externalLinkSuggestions || ''}
      placeholder="Paste GPT suggestions for linking to other guest posts"
      onChange={(value) => onChange({ ...step.outputs, externalLinkSuggestions: value })}
      isTextarea={true}
      height="h-32"
    />

    <div>
      <label className="block text-sm font-medium mb-1">External Links Added?</label>
      <select
        value={step.outputs.externalLinksAdded || ''}
        onChange={(e) => onChange({ ...step.outputs, externalLinksAdded: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">External links added to article</option>
        <option value="no">No suitable links found</option>
        <option value="partial">Some links added</option>
      </select>
    </div>
  </div>
);
};