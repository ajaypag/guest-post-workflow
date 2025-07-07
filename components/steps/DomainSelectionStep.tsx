'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { TutorialVideo } from '../ui/TutorialVideo';

interface DomainSelectionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DomainSelectionStep = ({ step, workflow, onChange }: DomainSelectionStepProps) => (
  <div className="space-y-4">
    <TutorialVideo 
      videoUrl="https://www.loom.com/share/90796a8df0d74e36bbd9dfb536121f86"
      title="Guest Post Site Selection Tutorial"
      description="Learn how to select the right guest post publication site for your client"
    />
    
    <SavedField
      label="Guest Post Website"
      value={step.outputs.domain || ''}
      placeholder="e.g., techcrunch.com, industry-magazine.com, blog.example.com"
      onChange={(value) => onChange({ ...step.outputs, domain: value })}
    />
    <p className="text-xs text-gray-500">
      Enter the website where your guest post article will be published (NOT your client's website)
    </p>
    
    <SavedField
      label="Notes"
      value={step.outputs.notes || ''}
      placeholder="Any research notes about this guest post website"
      onChange={(value) => onChange({ ...step.outputs, notes: value })}
      isTextarea={true}
      height="h-24"
    />
  </div>
);