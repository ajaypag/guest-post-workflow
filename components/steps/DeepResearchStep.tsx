'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink } from 'lucide-react';

interface DeepResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DeepResearchStep = ({ step, workflow, onChange }: DeepResearchStepProps) => {
  // Get the deep research prompt from Step 2j
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const outlinePrompt = topicGenerationStep?.outputs?.outlinePrompt || '';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-3">Step 3: Create Detailed Research Outline</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Generate comprehensive research outline using GPT-o3 Deep Research</p>
          <p className="text-sm text-gray-700">
            Use GPT-o3's Deep Research tool to create a detailed, well-researched outline for your guest post.
          </p>
        </div>

        <div className="bg-gray-100 p-4 rounded mb-4">
          <h4 className="font-semibold mb-3">📝 Step-by-Step Process:</h4>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">1</span>
              <div>
                <p className="text-sm font-semibold">Open GPT-o3 with Deep Research</p>
                <a href="https://chatgpt.com/?model=o3" 
                   target="_blank" 
                   className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  Open ChatGPT with GPT-o3 <ExternalLink className="w-3 h-3 ml-1 text-white" />
                </a>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">2</span>
              <div>
                <p className="text-sm font-semibold">Activate Deep Research Tool</p>
                <p className="text-sm text-gray-600">Click the "Tools" button and select "Deep Research"</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">3</span>
              <div>
                <p className="text-sm font-semibold">Copy and paste the research prompt from Step 2j</p>
                <p className="text-sm text-gray-600">Use the prompt below (generated from your topic selection)</p>
              </div>
            </div>
          </div>
        </div>

        {outlinePrompt ? (
          <div className="bg-white p-3 rounded border border-blue-200 text-sm relative">
            <div className="absolute top-2 right-2">
              <CopyButton 
                text={outlinePrompt}
                label="Copy Prompt"
              />
            </div>
            <p className="font-semibold mb-2">Deep Research Prompt (from Step 2j):</p>
            <div className="p-2 bg-gray-50 border rounded text-xs max-h-32 overflow-y-auto pr-16">
              {outlinePrompt}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Complete Step 2j in Topic Generation first to get your deep research prompt
            </p>
          </div>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded p-3 mt-4">
        <p className="text-sm font-semibold text-green-800 mb-2">✅ After Research Completes:</p>
        <ol className="text-sm text-green-700 space-y-1 ml-4">
          <li>1. Copy the complete research outline and findings</li>
          <li>2. Paste it in the "Research Outline Content" field below</li>
          <li>3. Get the share link for reference</li>
        </ol>
      </div>

      <SavedField
        label="Research Outline Content"
        value={step.outputs.outlineContent || ''}
        placeholder="Paste the complete research outline and findings from GPT-o3 Deep Research here. This content will be automatically used in later steps (Article Draft and SEO Optimization)."
        onChange={(value) => onChange({ ...step.outputs, outlineContent: value })}
        isTextarea={true}
        height="h-64"
      />

      <SavedField
        label="Research Outline Share Link"
        value={step.outputs.outlineShareLink || ''}
        placeholder="https://chatgpt.com/share/... (optional - for reference)"
        onChange={(value) => onChange({ ...step.outputs, outlineShareLink: value })}
      />

      <div>
        <label className="block text-sm font-medium mb-1">Research Completion Status</label>
        <select
          value={step.outputs.researchStatus || ''}
          onChange={(e) => onChange({ ...step.outputs, researchStatus: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="in-progress">Research in progress</option>
          <option value="completed">Research completed</option>
          <option value="issues">Had issues - needed retry</option>
        </select>
      </div>

      <SavedField
        label="Research Notes"
        value={step.outputs.researchNotes || ''}
        placeholder="Any additional notes, issues encountered, or key findings from the research"
        onChange={(value) => onChange({ ...step.outputs, researchNotes: value })}
        isTextarea={true}
        height="h-24"
      />
    </div>
  );
};