'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface ExternalLinksStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ExternalLinksStep = ({ step, workflow, onChange }: ExternalLinksStepProps) => {
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

      {fullArticle ? (
        <div className="bg-green-100 border border-green-300 rounded p-2">
          <p className="text-sm text-green-800">✅ Article content loaded from {currentSourceLabel}</p>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-300 rounded p-2">
          <p className="text-sm text-yellow-800">⚠️ No article content available. Complete previous steps.</p>
        </div>
      )}

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