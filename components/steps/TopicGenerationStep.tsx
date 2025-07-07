'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface TopicGenerationStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const TopicGenerationStep = ({ step, workflow, onChange }: TopicGenerationStepProps) => {
  const keywordResearchStep = workflow.steps.find(s => s.id === 'keyword-research');
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || 'Guest post website from Step 1';
  const urlSummaries = keywordResearchStep?.outputs?.urlSummaries || 'List of your target urls + summary';
  
  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/31c7f383913d4dc5bae49935b31f88b5?t=214&sid=9a86bbe6-9c79-47cf-aa3a-f028e064d2fb"
        title="Topic Generation Tutorial"
        description="Learn how to generate compelling guest post topics using the Topic Machine GPT"
        timestamp="3:34"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-3">Step 2d: Generate Guest Post Topics</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 GPT Goal: Find keywords that meet 3 criteria</p>
          <p className="text-sm text-gray-700 mb-2">
            The GPT will analyze your data to find keywords that are:
          </p>
          <ul className="text-sm text-gray-700 ml-4 space-y-1">
            <li>• <strong>Relevant to the guest post site</strong> (site has topical authority)</li>
            <li>• <strong>Relevant to your client URL</strong> (natural linking opportunity)</li>
            <li>• <strong>Have search volume</strong> (10-50 searches/month target range)</li>
          </ul>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
          <h4 className="font-semibold text-orange-800 mb-2">⚠️ Important: You MUST attach the CSV file from Step 2b</h4>
          <p className="text-sm text-orange-700 mb-2">
            This step requires the Ahrefs CSV file you exported in Step 2b. The GPT needs this data to:
          </p>
          <ul className="text-sm text-orange-700 ml-4 space-y-1">
            <li>• Understand what topics the guest post site has authority for</li>
            <li>• Find overlapping topics between the site and your client</li>
            <li>• Suggest topics with the best chance of ranking</li>
          </ul>
        </div>

        <div className="bg-gray-100 p-4 rounded mb-4">
          <h4 className="font-semibold mb-3">📝 Step-by-Step Process:</h4>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">1</span>
              <div>
                <p className="text-sm font-semibold">Copy the template below</p>
                <p className="text-sm text-gray-600">Use the "Copy Template" button to get the formatted prompt</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">2</span>
              <div>
                <p className="text-sm font-semibold">Open the Guest Post Topic Machine GPT</p>
                <p className="text-sm text-gray-600">Click the link below to open the GPT in a new tab</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">3</span>
              <div>
                <p className="text-sm font-semibold">Paste the template into the GPT</p>
                <p className="text-sm text-gray-600">Paste the copied template as your message</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">4</span>
              <div>
                <p className="text-sm font-semibold text-red-700">CRITICAL: Attach your Ahrefs CSV file</p>
                <p className="text-sm text-gray-600">Use the paperclip icon in ChatGPT to attach the CSV file you downloaded from Step 2b</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">5</span>
              <div>
                <p className="text-sm font-semibold">Send and wait for analysis</p>
                <p className="text-sm text-gray-600">The GPT will process your data and suggest optimal topics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text={`Guest post site: ${guestPostSite}\n\n${urlSummaries}`}
              label="Copy Template"
            />
          </div>
          <p>Guest post site: <span className="text-blue-700 font-semibold">{guestPostSite}</span></p>
          <div className="mt-1">
            {urlSummaries === 'List of your target urls + summary' ? (
              <p className="text-gray-500 italic">List of your target urls + summary</p>
            ) : (
              <div className="p-2 bg-gray-50 border rounded text-xs max-h-24 overflow-y-auto">
                {urlSummaries}
              </div>
            )}
          </div>
          <p className="mt-1 text-red-600 font-semibold">[Attach CSV file from Step 2b]</p>
        </div>

        <div className="mt-4">
          <a href="https://chatgpt.com/g/g-685eb5acbec48191b817e13ecae859cf-guest-post-topic-machine-for-any-client?model=o3" 
             target="_blank" 
             className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
            Open Guest Post Topic Machine GPT <ExternalLink className="w-4 h-4 ml-2 text-white" />
          </a>
        </div>
      </div>

      <SavedField
        label="Your Prompt to GPT"
        value={step.outputs.topicPrompt || ''}
        placeholder="Paste the prompt you submitted to the Topic Machine GPT"
        onChange={(value) => onChange({ ...step.outputs, topicPrompt: value })}
        isTextarea={true}
        height="h-24"
      />

      <SavedField
        label="Suggested Topics Output"
        value={step.outputs.suggestedTopics || ''}
        placeholder="Paste all topics suggested by GPT"
        onChange={(value) => onChange({ ...step.outputs, suggestedTopics: value })}
        isTextarea={true}
        height="h-32"
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2e: Record What You Find</p>
        <p className="text-sm">Log keyword intent, quality judgment, and any red flags</p>
      </div>

      <SavedField
        label="Keyword Analysis Notes (Step 2e)"
        value={step.outputs.keywordAnalysis || ''}
        placeholder="Intent, quality, red flags, etc."
        onChange={(value) => onChange({ ...step.outputs, keywordAnalysis: value })}
        isTextarea={true}
        height="h-20"
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2f: Primary Keyword from GPT</p>
        <p className="text-sm">Record the primary keyword GPT suggests (this aligns with guest site + client page)</p>
      </div>

      <SavedField
        label="Primary Keyword (Step 2f)"
        value={step.outputs.primaryKeyword || ''}
        placeholder="The main keyword GPT suggested"
        onChange={(value) => onChange({ ...step.outputs, primaryKeyword: value })}
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2g: Keyword Variations</p>
        <p className="text-sm">Save the full list for reference (don't update sheet yet - wait until Step 2h validation)</p>
      </div>

      <SavedField
        label="Keyword Variations (Step 2g)"
        value={step.outputs.keywordVariations || ''}
        placeholder="Full list of keyword variations from GPT (one per line for best results)"
        onChange={(value) => onChange({ ...step.outputs, keywordVariations: value })}
        isTextarea={true}
        height="h-24"
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2h: Validate in Ahrefs</p>
        <p className="text-sm mb-3">
          Use Ahrefs Keyword Explorer to check search volume and difficulty for the keywords GPT suggested.
        </p>
        
        <div className="bg-white p-3 rounded border border-yellow-200">
          {step.outputs.keywordVariations ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">📊 Check Your Keywords in Ahrefs:</p>
                <a href={(() => {
                  // Convert keyword variations to comma-separated format for Ahrefs
                  const keywords = step.outputs.keywordVariations
                    .split('\n')
                    .filter((k: string) => k.trim())
                    .map((k: string) => k.trim())
                    .join(', ');
                  
                  return `https://app.ahrefs.com/keywords-explorer/google/us/overview?keyword=${encodeURIComponent(keywords)}`;
                })()}
                   target="_blank"
                   className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium">
                  Open Keywords in Ahrefs <ExternalLink className="w-3 h-3 ml-2 text-white" />
                </a>
                <p className="text-xs text-gray-600 mt-1">
                  Keywords from Step 2g automatically pre-filled
                </p>
              </div>
              
              <div className="text-xs text-gray-500 italic">
                💡 Tip: Keywords should be entered one per line in Step 2g for best results
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">📊 Open Ahrefs Keyword Explorer:</p>
              <a href="https://app.ahrefs.com/keywords-explorer/google/us/overview"
                 target="_blank"
                 className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                Open Ahrefs Keyword Explorer <ExternalLink className="w-3 h-3 ml-2 text-white" />
              </a>
              <p className="text-xs text-gray-600 mt-1">
                Add keywords from Step 2g first for auto-filled link
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
          <p className="text-sm font-semibold text-red-800 mb-2">❌ If keywords have no search volume:</p>
          <p className="text-sm text-red-700 mb-2">Go back to the GPT and use this follow-up prompt:</p>
          
          <div className="bg-white p-3 rounded border text-sm font-mono relative mt-2">
            <CopyButton 
              text="these dont have any search volume. If you are a keyword research person and you were finding that your suggestions really just aren't having anything that has search volume, but you are tasked with finding something that has search volume, even if it's low (from 10 searches a month to 50 searches a month) based on everything you know about our target URL and everything you know about the niche of this site. What do you think would be some good potential keywords, long-tail keywords to target? Be sure to output your keywords in a list so it's easy to copy-paste into a volume checker."
              label="Copy Follow-up"
            />
            <p className="pr-16 text-xs">
              "these dont have any search volume. If you are a keyword research person and you were finding that your suggestions really just aren't having anything that has search volume, but you are tasked with finding something that has search volume, even if it's low (from 10 searches a month to 50 searches a month) based on everything you know about our target URL and everything you know about the niche of this site. What do you think would be some good potential keywords, long-tail keywords to target? Be sure to output your keywords in a list so it's easy to copy-paste into a volume checker."
            </p>
          </div>
        </div>
      </div>

      <SavedField
        label="Final Validated Keyword (Step 2h)"
        value={step.outputs.finalKeyword || ''}
        placeholder="Final keyword after Ahrefs validation"
        onChange={(value) => onChange({ ...step.outputs, finalKeyword: value })}
      />

      <SavedField
        label="Keyword Volume"
        value={step.outputs.keywordVolume || ''}
        placeholder="Monthly search volume"
        onChange={(value) => onChange({ ...step.outputs, keywordVolume: value })}
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2i: Return to GPT with Final Keyword</p>
        <p className="text-sm">
          Go back to the Guest Post Topic Machine GPT and simply enter your final validated keyword. 
          The GPT will automatically proceed with suggesting a guest post title and angle.
        </p>
      </div>

      <SavedField
        label="Guest Post Title (Step 2i)"
        value={step.outputs.postTitle || ''}
        placeholder="Working title suggested by GPT"
        onChange={(value) => onChange({ ...step.outputs, postTitle: value })}
      />

      <div className="bg-purple-50 p-3 rounded-md mt-4">
        <h4 className="font-semibold mb-2">📎 Client Link Planning</h4>
        <p className="text-sm text-gray-600 mb-2">
          Now that you have a topic, determine which client URL you want to link to and the desired anchor text. This will be used in the Client Link step later.
        </p>
      </div>

      <SavedField
        label="Client Target URL"
        value={step.outputs.clientTargetUrl || ''}
        placeholder="The specific client URL you want to link to in this guest post"
        onChange={(value) => onChange({ ...step.outputs, clientTargetUrl: value })}
      />

      <SavedField
        label="Desired Anchor Text (Optional)"
        value={step.outputs.desiredAnchorText || ''}
        placeholder="Preferred anchor text for the client link (leave blank if you want help from the GPT later)"
        onChange={(value) => onChange({ ...step.outputs, desiredAnchorText: value })}
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2j: Get Deep Research Prompt</p>
        <p className="text-sm">When GPT asks if you want a deep research outline, respond "Yes"</p>
      </div>

      <SavedField
        label="Deep Research Prompt (Step 2j)"
        value={step.outputs.outlinePrompt || ''}
        placeholder="Copy the full prompt GPT provides for deep research"
        onChange={(value) => onChange({ ...step.outputs, outlinePrompt: value })}
        isTextarea={true}
        height="h-32"
      />
    </div>
  );
};