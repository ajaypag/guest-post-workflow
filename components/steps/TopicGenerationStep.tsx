'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink } from 'lucide-react';

interface TopicGenerationStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const TopicGenerationStep = ({ step, workflow, onChange }: TopicGenerationStepProps) => {
  const keywordResearchStep = workflow.steps.find(s => s.id === 'keyword-research');
  const urlSummaries = keywordResearchStep?.outputs?.urlSummaries || 'List of your target urls + summary';
  
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 2d: Generate Guest Post Topics</h3>
        <p className="text-sm mb-2">
          This step combines outputs from the previous three steps. Create a prompt like this:
        </p>
        <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text={`Guest post site: ${workflow.targetDomain}\n\n${urlSummaries}\n\n[Attach CSV file from Step 2b]`}
              label="Copy Template"
            />
          </div>
          <p>Guest post site: <span className="text-blue-700 font-semibold">{workflow.targetDomain}</span></p>
          <div className="mt-1">
            {urlSummaries === 'List of your target urls + summary' ? (
              <p className="text-gray-500 italic">List of your target urls + summary</p>
            ) : (
              <div className="p-2 bg-gray-50 border rounded text-xs max-h-24 overflow-y-auto">
                {urlSummaries}
              </div>
            )}
          </div>
          <p className="mt-1">[Attach CSV file from Step 2b]</p>
        </div>
        <p className="text-sm mt-2 mb-2">
          Submit to this GPT:
        </p>
        <a href="https://chatgpt.com/g/g-685eb5acbec48191b817e13ecae859cf-guest-post-topic-machine-for-any-client?model=o3" 
           target="_blank" 
           className="text-blue-600 hover:underline inline-flex items-center font-medium">
          Guest Post Topic Machine <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <p className="text-sm mt-2 italic">
          The GPT will use your keyword CSV to understand site topical authority and find overlap with client URLs
        </p>
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
        placeholder="Full list of keyword variations from GPT"
        onChange={(value) => onChange({ ...step.outputs, keywordVariations: value })}
        isTextarea={true}
        height="h-24"
      />

      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-sm font-semibold">Step 2h: Validate in Ahrefs</p>
        <p className="text-sm">
          Use Ahrefs Keyword Explorer to check search volume and difficulty. 
          If no volume, re-prompt GPT or generate alternatives manually.
        </p>
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
        <p className="text-sm">GPT will suggest a guest post title/angle</p>
      </div>

      <SavedField
        label="Guest Post Title (Step 2i)"
        value={step.outputs.postTitle || ''}
        placeholder="Working title suggested by GPT"
        onChange={(value) => onChange({ ...step.outputs, postTitle: value })}
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