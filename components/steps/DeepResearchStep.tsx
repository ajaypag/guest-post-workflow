'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';

interface DeepResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DeepResearchStep = ({ step, workflow, onChange }: DeepResearchStepProps) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-md">
      <h3 className="font-semibold mb-2">Step 3: Run Deep Research in GPT-o3</h3>
      <p className="text-sm font-semibold mb-2">Follow these steps exactly:</p>
      <ol className="text-sm space-y-2 ml-4">
        <li className="flex">
          <span className="font-semibold mr-2">1.</span>
          <span>Open a new ChatGPT window</span>
        </li>
        <li className="flex">
          <span className="font-semibold mr-2">2.</span>
          <span>Switch to GPT-o3 model</span>
        </li>
        <li className="flex">
          <span className="font-semibold mr-2">3.</span>
          <span>Click the "Tools" button and activate <strong>Deep Research</strong></span>
        </li>
        <li className="flex">
          <span className="font-semibold mr-2">4.</span>
          <span>Paste the prompt from Step 2j and hit Enter</span>
        </li>
        <li className="flex">
          <span className="font-semibold mr-2">5.</span>
          <span>Answer any follow-up questions GPT asks</span>
        </li>
        <li className="flex">
          <span className="font-semibold mr-2">6.</span>
          <span>Let GPT complete the research and generate detailed outline</span>
        </li>
      </ol>
    </div>

    <div className="bg-yellow-50 p-3 rounded-md">
      <p className="text-sm font-semibold">After Research Completes:</p>
      <p className="text-sm">Click the share button and get the share link</p>
    </div>

    <SavedField
      label="Research Outline Share Link"
      value={step.outputs.outlineShareLink || ''}
      placeholder="https://chatgpt.com/share/..."
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
      height="h-32"
    />
  </div>
);