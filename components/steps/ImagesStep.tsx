'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { ExternalLink } from 'lucide-react';

interface ImagesStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ImagesStep = ({ step, workflow, onChange }: ImagesStepProps) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-md">
      <h3 className="font-semibold mb-2">Step 12: Create Images</h3>
      <p className="text-sm mb-2">
        Create images for the blog post. Aim for 3 images. Start by pasting in your guest post content.
      </p>
      <a href="https://chatgpt.com/g/g-685c4280a6508191a939e2d05a8d0648-guest-post-image-creator" 
         target="_blank" 
         className="text-blue-600 hover:underline inline-flex items-center font-medium">
        Guest Post Image Creator GPT <ExternalLink className="w-3 h-3 ml-1" />
      </a>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">Guest Post Content Submitted?</label>
      <select
        value={step.outputs.contentSubmitted || ''}
        onChange={(e) => onChange({ ...step.outputs, contentSubmitted: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">Full guest post content submitted</option>
        <option value="no">Not yet</option>
      </select>
    </div>

    <SavedField
      label="Image Concepts Suggested"
      value={step.outputs.imageConcepts || ''}
      placeholder="List the image concepts suggested by GPT"
      onChange={(value) => onChange({ ...step.outputs, imageConcepts: value })}
      isTextarea={true}
      height="h-32"
    />

    <SavedField
      label="Number of Images Created"
      value={step.outputs.imagesCreated || ''}
      placeholder="3"
      onChange={(value) => onChange({ ...step.outputs, imagesCreated: value })}
    />

    <div>
      <label className="block text-sm font-medium mb-1">Image Creation Status</label>
      <select
        value={step.outputs.imageStatus || ''}
        onChange={(e) => onChange({ ...step.outputs, imageStatus: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="completed">All images created and approved</option>
        <option value="in-progress">Still generating images</option>
        <option value="revisions">Need revisions</option>
      </select>
    </div>

    <SavedField
      label="Image Notes"
      value={step.outputs.imageNotes || ''}
      placeholder="Notes about image creation, quality, placement suggestions"
      onChange={(value) => onChange({ ...step.outputs, imageNotes: value })}
      isTextarea={true}
      height="h-24"
    />
  </div>
);