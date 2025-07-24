'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface ClientMentionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ClientMentionStep = ({ step, workflow, onChange }: ClientMentionStepProps) => {
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

      <div className="bg-green-50 p-4 rounded border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">📋 If Using GPT: Follow-up Prompts</h4>
        <p className="text-sm text-gray-700 mb-3">Use these prompts in sequence to refine the mention placement:</p>
        
        <div className="space-y-4">
          <div>
            <SavedField
              label="Initial GPT Suggestion"
              value={step.outputs.initialSuggestion || ''}
              placeholder="Paste the initial suggestion from GPT"
              onChange={(value) => onChange({ ...step.outputs, initialSuggestion: value })}
              isTextarea={true}
              height="h-20"
            />
          </div>

          <div className="bg-white p-3 rounded border">
            <h5 className="font-semibold mb-2">Follow-up Prompt #1:</h5>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono relative">
              <div className="absolute top-2 right-2">
                <CopyButton 
                  text="again, a brand mention should not feel random or out of left field or feel like theres no reason why its being mentioned. a good brand mention is one that instantly looks like it belongs. as in, the article is saying something, and the way the brand is introduced is a natural extension of whats being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a mention to the brand, and b) what lead in can you add to the existing article to make it work."
                  label="Copy"
                />
              </div>
              <p className="pr-16">again, a brand mention should not feel random or out of left field or feel like theres no reason why its being mentioned. a good brand mention is one that instantly looks like it belongs. as in, the article is saying something, and the way the brand is introduced is a natural extension of whats being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a mention to the brand, and b) what lead in can you add to the existing article to make it work.</p>
            </div>
          </div>

          <div>
            <SavedField
              label="Second GPT Response"
              value={step.outputs.secondResponse || ''}
              placeholder="Paste GPT's response to first follow-up"
              onChange={(value) => onChange({ ...step.outputs, secondResponse: value })}
              isTextarea={true}
              height="h-20"
            />
          </div>

          <div className="bg-white p-3 rounded border">
            <h5 className="font-semibold mb-2">Follow-up Prompt #2:</h5>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono relative">
              <div className="absolute top-2 right-2">
                <CopyButton 
                  text={`what makes more sense to do it is take something from the brand that is being mentioned, reference it in the guest post and then mention the brand as the source. with those constraints, you may actually manage to do something actually useful and natural. you are also allowed to create a while new paragraph if you aren't finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. MENTIONING THE BRAND AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.`}
                  label="Copy"
                />
              </div>
              <p className="pr-16">what makes more sense to do it is take something from the brand that is being mentioned, reference it in the guest post and then mention the brand as the source. with those constraints, you may actually manage to do something actually useful and natural. you are also allowed to create a while new paragraph if you aren't finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. MENTIONING THE BRAND AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.</p>
            </div>
          </div>

          <div>
            <SavedField
              label="Final GPT Suggestion"
              value={step.outputs.finalSuggestion || ''}
              placeholder="Paste the final, refined suggestion after follow-up prompts"
              onChange={(value) => onChange({ ...step.outputs, finalSuggestion: value })}
              isTextarea={true}
              height="h-24"
            />
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-2">✅ Final Step: Mark Mention Status</h4>
        <p className="text-sm text-gray-700 mb-3">Whether you used the GPT or placed the mention manually:</p>
        
        <div>
          <label className="block text-sm font-medium mb-1">Client Mention Added?</label>
          <select
            value={step.outputs.clientMentionAdded || ''}
            onChange={(e) => onChange({ ...step.outputs, clientMentionAdded: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select status...</option>
            <option value="yes">Client mention added to article</option>
            <option value="modified">Modified GPT suggestion before adding</option>
            <option value="manual">Added mention manually (skipped GPT)</option>
            <option value="no">No suitable placement found</option>
          </select>
        </div>
      </div>
    </div>
  );
};