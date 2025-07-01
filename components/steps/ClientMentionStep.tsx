'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { ExternalLink } from 'lucide-react';

interface ClientMentionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ClientMentionStep = ({ step, workflow, onChange }: ClientMentionStepProps) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-md">
      <h3 className="font-semibold mb-2">Step 10: Client Mention for AI Overviews</h3>
      <p className="text-sm mb-2">
        Find a place to mention client close to a keyword that's relevant, with no backlink.
      </p>
      <a href="https://chatgpt.com/g/g-685c405ec2b88191862102965a706619-vanta-inclusion-in-gp" 
         target="_blank" 
         className="text-blue-600 hover:underline inline-flex items-center font-medium">
        Vanta Inclusion in GP GPT <ExternalLink className="w-3 h-3 ml-1" />
      </a>
      <p className="text-sm mt-2 italic">
        This GPT will tell you how to mention client in a way that's beneficial for AI overviews.
      </p>
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

    <SavedField
      label="Client Mention Suggestion"
      value={step.outputs.clientMentionSuggestion || ''}
      placeholder="Paste GPT's suggestion for how to mention the client"
      onChange={(value) => onChange({ ...step.outputs, clientMentionSuggestion: value })}
      isTextarea={true}
      height="h-32"
    />

    <div>
      <label className="block text-sm font-medium mb-1">Client Mention Added?</label>
      <select
        value={step.outputs.clientMentionAdded || ''}
        onChange={(e) => onChange({ ...step.outputs, clientMentionAdded: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">Client mention added to article</option>
        <option value="no">No suitable placement found</option>
        <option value="modified">Modified GPT suggestion before adding</option>
      </select>
    </div>
  </div>
);