'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { ExternalLink } from 'lucide-react';

interface ExternalLinksStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ExternalLinksStep = ({ step, workflow, onChange }: ExternalLinksStepProps) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-md">
      <h3 className="font-semibold mb-2">Step 9: Links to Other Guest Posts</h3>
      <p className="text-sm mb-2">
        Go to Airtable and find previous guest posts published for Vanta. Paste them into the GPT along with the article.
      </p>
      <a href="https://chatgpt.com/g/g-685c3b6a40548191b3cb4a99e405f0a4-links-to-other-guest-posts-that-we-ve-done" 
         target="_blank" 
         className="text-blue-600 hover:underline inline-flex items-center font-medium">
        Links to Other Guest Posts GPT <ExternalLink className="w-3 h-3 ml-1" />
      </a>
      <p className="text-sm mt-2 italic">
        The GPT will tell you where to potentially include a link to one of the guest posts.
      </p>
    </div>

    <SavedField
      label="Previous Guest Posts Found"
      value={step.outputs.previousPosts || ''}
      placeholder="List the previous Vanta guest posts from Airtable"
      onChange={(value) => onChange({ ...step.outputs, previousPosts: value })}
      isTextarea={true}
      height="h-24"
    />

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