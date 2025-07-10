'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, AlertCircle, X } from 'lucide-react';

interface ClientLinkStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ClientLinkStep = ({ step, workflow, onChange }: ClientLinkStepProps) => {
  // State for managing workflow update alert
  const [showAlert, setShowAlert] = useState(!step.outputs.alertDismissed);
  
  // Get client target URL and anchor text from step 2i (topic generation)
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const plannedClientUrl = topicGenerationStep?.outputs?.clientTargetUrl || '';
  const plannedAnchorText = topicGenerationStep?.outputs?.desiredAnchorText || '';
  
  // Get current values (editable in this step)
  const clientUrl = step.outputs.clientUrl || plannedClientUrl || workflow.clientUrl;
  const anchorText = step.outputs.anchorText || plannedAnchorText || '';
  
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
  const completePrompt = `Client URL to Link: ${clientUrl}
${anchorText ? `\nDesired Anchor Text: ${anchorText}` : ''}

Article Content:

${fullArticle || 'Complete previous steps to get article content'}`;

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/85e456854adc41c1b61e0035fdcb6e04"
        title="Client Link Tutorial"
        description="Learn how to add natural client links to your guest post"
      />
      
      {showAlert && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
          <button
            onClick={() => {
              setShowAlert(false);
              onChange({ ...step.outputs, alertDismissed: true });
            }}
            className="absolute top-3 right-3 text-blue-400 hover:text-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start space-x-3 pr-8">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">🆕 Workflow Update: New Follow-up Prompt Added</h4>
              <p className="text-sm text-blue-700">
                We've added a new follow-up prompt (#3) to help validate that your suggested anchor text and client URL make contextual sense together. This helps ensure better link relevance and quality.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-100 border border-blue-300 rounded p-4">
        <h4 className="font-semibold text-blue-800 mb-2">🔄 Before You Start: Update Your Final Article</h4>
        <p className="text-sm text-gray-700 mb-3">
          You've completed Steps 8-10 (Internal Links, Tier 2 Links, Client Mention) and likely made changes to your article. 
        </p>
        <div className="bg-white p-3 rounded border border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-2">📝 Recommended: Update Step 6 first</p>
          <p className="text-sm text-gray-700 mb-2">
            Go back to <strong>Step 6: Polish & Finalize</strong> and update the "Final Polished Article" field with your current version that includes:
          </p>
          <ul className="text-sm text-gray-700 ml-4 space-y-1">
            <li>• Internal links to the guest post site</li>
            <li>• Tier 2 links to other guest posts</li>
            <li>• Client brand mentions</li>
          </ul>
          <p className="text-sm text-gray-600 mt-2 italic">
            This ensures the GPT prompt below contains your most current article version.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 11: Insert Client Link</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Naturally insert a link to your client's website</p>
          <p className="text-sm text-gray-700">
            Place a strategic link to your client inside the article. The link should feel natural and contextually relevant, not random or forced.
          </p>
        </div>

        {plannedClientUrl ? (
          <div className="bg-green-100 border border-green-300 rounded p-2 mb-3">
            <p className="text-sm text-green-800">✅ Using client URL from Step 2i: {plannedClientUrl}</p>
            {plannedAnchorText && <p className="text-sm text-green-800">✅ Planned anchor text: "{plannedAnchorText}"</p>}
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
            <p className="text-sm text-yellow-800">⚠️ No client URL set in Step 2i. Using default: {workflow.clientUrl}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h4 className="font-semibold mb-3">📝 Edit Link Details (if needed)</h4>
        <div className="space-y-3">
          <SavedField
            label="Client URL to Link"
            value={clientUrl}
            placeholder="The specific client URL to link to"
            onChange={(value) => onChange({ ...step.outputs, clientUrl: value })}
          />

          <SavedField
            label="Desired Anchor Text (Optional)"
            value={anchorText}
            placeholder="Preferred anchor text (leave blank for GPT suggestions)"
            onChange={(value) => onChange({ ...step.outputs, anchorText: value })}
          />
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded p-3">
        <h4 className="font-semibold text-orange-800 mb-2">🤔 Do you need help with natural link placement?</h4>
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <span className="text-green-600 font-bold">✓</span>
            <p className="text-sm"><strong>Skip GPT if:</strong> You already know exactly where and how to place the link naturally</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">→</span>
            <p className="text-sm"><strong>Use GPT if:</strong> You want help finding the most natural placement and anchor text</p>
          </div>
        </div>
      </div>

      {fullArticle && clientUrl ? (
        <div className="bg-gray-100 p-3 rounded">
          <h4 className="font-semibold mb-2">📋 Complete Prompt for GPT</h4>
          <div className="bg-white p-3 rounded border text-sm font-mono relative">
            <div className="absolute top-2 right-2">
              <CopyButton 
                text={completePrompt}
                label="Copy Complete Prompt"
              />
            </div>
            <div className="pr-16">
              <p><strong>Client URL to Link:</strong> {clientUrl}</p>
              {anchorText && <p><strong>Desired Anchor Text:</strong> {anchorText}</p>}
              <p className="mt-2"><strong>Article Content:</strong></p>
              <div className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
                <p className="text-xs whitespace-pre-wrap">{fullArticle.substring(0, 300)}{fullArticle.length > 300 ? '...' : ''}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Client URL and article content needed to generate the complete prompt
          </p>
        </div>
      )}

      <div className="bg-blue-50 p-3 rounded">
        <h4 className="font-semibold mb-2">🔗 Submit to GPT (if needed)</h4>
        <a href="https://chatgpt.com/g/g-685c44e260908191973c469465ed7d4b-insert-client-s-link-into-your-guest-post?model=o3" 
           target="_blank" 
           className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
          Open Insert Client's Link GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
        </a>
        <p className="text-sm mt-2 italic">
          Use the "Copy Complete Prompt" button above if you need help with natural link placement.
        </p>
      </div>

      <div className="bg-green-50 p-4 rounded border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">📋 If Using GPT: Follow-up Prompts</h4>
        <p className="text-sm text-gray-700 mb-3">Use these prompts in sequence to refine the link placement:</p>
        
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
                  text="again, a link insert should not feel random or out of left field or feel like theres no reason why its being linked to. a good link is one that instantly looks like it belongs. as in, the article is saying something, and the way the link is introduced is a natural extension of wahts being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a link to the target url, and b) what lead in can you add to the existing article to make it work."
                  label="Copy"
                />
              </div>
              <p className="pr-16">again, a link insert should not feel random or out of left field or feel like theres no reason why its being linked to. a good link is one that instantly looks like it belongs. as in, the article is saying something, and the way the link is introduced is a natural extension of wahts being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a link to the target url, and b) what lead in can you add to the existing article to make it work.</p>
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
                  text={'what makes more sense to do it is take something from the article that is being linkeded to, reference it in the guest post and then link back to the article as the source using the anchor text. with those constraints, you may actually manage to do something actually useful and natural. note, if the anchor text doesnt match the same intent of the client url page title, its probably not viable. you are also allowed to create a while new paragraph if you aren\'t finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. ANCHOR TEXT AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.'}
                  label="Copy"
                />
              </div>
              <p className="pr-16">what makes more sense to do it is take something from the article that is being linkeded to, reference it in the guest post and then link back to the article as the source using the anchor text. with those constraints, you may actually manage to do something actually useful and natural. note, if the anchor text doesnt match the same intent of the client url page title, its probably not viable. you are also allowed to create a while new paragraph if you aren't finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. ANCHOR TEXT AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.</p>
            </div>
          </div>

          <div>
            <SavedField
              label="Third GPT Response"
              value={step.outputs.thirdResponse || ''}
              placeholder="Paste GPT's response to second follow-up"
              onChange={(value) => onChange({ ...step.outputs, thirdResponse: value })}
              isTextarea={true}
              height="h-20"
            />
          </div>

          <div className="bg-white p-3 rounded border">
            <h5 className="font-semibold mb-2">Follow-up Prompt #3:</h5>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono relative">
              <div className="absolute top-2 right-2">
                <CopyButton 
                  text={`Okay, now:\n\nwhat is this article about? ${clientUrl}.\n\nBased on the anchor text you suggested in the sentence, what would you assume that the link that the anchor text is pointing to would be about?\n\nNext, review what the client url is about: what is this article about? ${clientUrl}.\n\nTell me if that's making sense or not.`}
                  label="Copy"
                />
              </div>
              <div className="pr-16">
                <p>Okay, now:</p>
                <p className="mt-2">what is this article about? {clientUrl}.</p>
                <p className="mt-2">Based on the anchor text you suggested in the sentence, what would you assume that the link that the anchor text is pointing to would be about?</p>
                <p className="mt-2">Next, review what the client url is about: what is this article about? {clientUrl}.</p>
                <p className="mt-2">Tell me if that's making sense or not.</p>
              </div>
            </div>
          </div>

          <div>
            <SavedField
              label="Final GPT Suggestion"
              value={step.outputs.finalSuggestion || ''}
              placeholder="Paste the final, refined suggestion after validation"
              onChange={(value) => onChange({ ...step.outputs, finalSuggestion: value })}
              isTextarea={true}
              height="h-24"
            />
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-2">✅ Final Step: Mark Link Status</h4>
        <p className="text-sm text-gray-700 mb-3">Whether you used the GPT or placed the link manually:</p>
        
        <div>
          <label className="block text-sm font-medium mb-1">Client Link Added?</label>
          <select
            value={step.outputs.clientLinkAdded || ''}
            onChange={(e) => onChange({ ...step.outputs, clientLinkAdded: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select status...</option>
            <option value="yes">Client link added to article</option>
            <option value="modified">Modified GPT suggestion before adding</option>
            <option value="manual">Added link manually (skipped GPT)</option>
            <option value="no">No viable placement found</option>
          </select>
        </div>
      </div>

      <div className="bg-red-50 p-3 rounded-md">
        <p className="text-sm font-semibold text-red-700">
          Important: Remove any other links in the same sentence/paragraph where you place the client link
        </p>
      </div>
    </div>
  );
};