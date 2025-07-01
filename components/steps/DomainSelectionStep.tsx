'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';

interface DomainSelectionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DomainSelectionStep = ({ step, workflow, onChange }: DomainSelectionStepProps) => (
  <div className="space-y-4">
    <SavedField
      label="Selected Domain"
      value={step.outputs.domain || workflow.targetDomain}
      placeholder={`Default: ${workflow.targetDomain}`}
      onChange={(value) => onChange({ ...step.outputs, domain: value })}
    />
    <p className="text-xs text-gray-500">Pre-filled from workflow setup: {workflow.targetDomain}</p>
    
    <SavedField
      label="Notes"
      value={step.outputs.notes || ''}
      placeholder="Any notes about this domain"
      onChange={(value) => onChange({ ...step.outputs, notes: value })}
      isTextarea={true}
      height="h-24"
    />
  </div>
);