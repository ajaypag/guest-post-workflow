'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { ExternalLink } from 'lucide-react';

interface LinkRequestsStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const LinkRequestsStep = ({ step, workflow, onChange }: LinkRequestsStepProps) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-md">
      <h3 className="font-semibold mb-2">Step 13: Internal Link Requests</h3>
      <p className="text-sm mb-2">
        Find 3 relevant articles on their current blog that we could ask them to add an internal link from their page to this new post.
      </p>
      <a href="https://chatgpt.com/g/g-685d7ed61d448191b4e1033a0e0b4201-get-internal-links-to-your-new-guest-post" 
         target="_blank" 
         className="text-blue-600 hover:underline inline-flex items-center font-medium">
        Get Internal Links to Your New Guest Post GPT <ExternalLink className="w-3 h-3 ml-1" />
      </a>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">Analysis Submitted?</label>
      <select
        value={step.outputs.analysisSubmitted || ''}
        onChange={(e) => onChange({ ...step.outputs, analysisSubmitted: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">Guest post and target site submitted</option>
        <option value="no">Not yet</option>
      </select>
    </div>

    <SavedField
      label="Article 1 for Internal Link"
      value={step.outputs.linkArticle1 || ''}
      placeholder="URL of first relevant article"
      onChange={(value) => onChange({ ...step.outputs, linkArticle1: value })}
    />

    <SavedField
      label="Article 2 for Internal Link"
      value={step.outputs.linkArticle2 || ''}
      placeholder="URL of second relevant article"
      onChange={(value) => onChange({ ...step.outputs, linkArticle2: value })}
    />

    <SavedField
      label="Article 3 for Internal Link"
      value={step.outputs.linkArticle3 || ''}
      placeholder="URL of third relevant article"
      onChange={(value) => onChange({ ...step.outputs, linkArticle3: value })}
    />

    <SavedField
      label="Link Placement Suggestions"
      value={step.outputs.linkPlacementSuggestions || ''}
      placeholder="Where and how to request internal links from each article"
      onChange={(value) => onChange({ ...step.outputs, linkPlacementSuggestions: value })}
      isTextarea={true}
      height="h-32"
    />

    <div>
      <label className="block text-sm font-medium mb-1">Link Request Status</label>
      <select
        value={step.outputs.linkRequestStatus || ''}
        onChange={(e) => onChange({ ...step.outputs, linkRequestStatus: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="ready">Ready to request links</option>
        <option value="requested">Link requests sent</option>
        <option value="approved">Links approved and added</option>
      </select>
    </div>
  </div>
);