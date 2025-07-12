'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { Save } from 'lucide-react';
import { SavedField } from './SavedField';
import {
  DomainSelectionStep,
  KeywordResearchStep,
  DeepResearchStep,
  ArticleDraftStep,
  ContentAuditStep,
  FinalPolishStep,
  FormattingQAStep,
  InternalLinksStep,
  ExternalLinksStep,
  ClientMentionStep,
  ClientLinkStep,
  ImagesStep,
  LinkRequestsStep,
  UrlSuggestionStep,
  EmailTemplateStep
} from './steps';
import { KeywordResearchStepClean } from './steps/KeywordResearchStepClean';
import { DomainSelectionStepClean } from './steps/DomainSelectionStepClean';
import { TopicGenerationStepClean } from './steps/TopicGenerationStepClean';
import { DeepResearchStepClean } from './steps/DeepResearchStepClean';
import { ArticleDraftStepClean } from './steps/ArticleDraftStepClean';
import { ContentAuditStepClean } from './steps/ContentAuditStepClean';
import { FinalPolishStepClean } from './steps/FinalPolishStepClean';

interface StepFormProps {
  step: WorkflowStep;
  stepIndex: number;
  workflow: GuestPostWorkflow;
  onSave: (inputs: Record<string, any>, outputs: Record<string, any>) => void;
  onWorkflowChange?: (workflow: GuestPostWorkflow) => void;
}

const stepForms: Record<string, React.FC<{ step: WorkflowStep; workflow: GuestPostWorkflow; onChange: (data: any) => void; onWorkflowChange?: (workflow: GuestPostWorkflow) => void }>> = {
  'domain-selection': DomainSelectionStepClean,
  'keyword-research': KeywordResearchStepClean,
  'topic-generation': TopicGenerationStepClean,
  'deep-research': DeepResearchStepClean,
  'article-draft': ArticleDraftStepClean,
  'content-audit': ContentAuditStepClean,
  'final-polish': FinalPolishStepClean,
  'formatting-qa': FormattingQAStep,
  'internal-links': InternalLinksStep,
  'external-links': ExternalLinksStep,
  'client-mention': ClientMentionStep,
  'client-link': ClientLinkStep,
  'images': ImagesStep,
  'link-requests': LinkRequestsStep,
  'url-suggestion': UrlSuggestionStep,
  'email-template': EmailTemplateStep,
};

export default function StepForm({ step, stepIndex, workflow, onSave, onWorkflowChange }: StepFormProps) {
  const [localInputs, setLocalInputs] = useState(step.inputs || {});
  const [localOutputs, setLocalOutputs] = useState(step.outputs || {});

  useEffect(() => {
    console.log('Step data changed, updating local state:', { inputs: step.inputs, outputs: step.outputs });
    setLocalInputs(step.inputs || {});
    setLocalOutputs(step.outputs || {});
  }, [step.inputs, step.outputs]);

  const handleSave = () => {
    console.log('🟢 handleSave called:', { localInputs, localOutputs });
    onSave(localInputs, localOutputs);
  };

  const handleInputChange = (field: string, value: any) => {
    setLocalInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOutputChange = (data: any) => {
    console.log('🟡 FormComponent onChange called:', data);
    setLocalOutputs(data);
  };

  const StepComponent = stepForms[step.id];

  if (!StepComponent) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <p>Step configuration not found for: {step.id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{step.title}</h2>
        <p className="text-gray-600 text-sm mt-1">{step.description}</p>
      </div>

      <div className="space-y-6">
        {/* Inputs Section */}
        {step.fields?.inputs && step.fields.inputs.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">Required Information</h3>
            <div className="space-y-4">
              {step.fields.inputs.map((field) => (
                <SavedField
                  key={field.name}
                  label={field.label}
                  value={localInputs[field.name] || ''}
                  placeholder={field.placeholder || ''}
                  onChange={(value) => handleInputChange(field.name, value)}
                  isTextarea={field.type === 'textarea'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step-specific content */}
        <StepComponent 
          step={{ ...step, outputs: localOutputs }}
          workflow={workflow}
          onChange={handleOutputChange}
          onWorkflowChange={onWorkflowChange}
        />

        {/* Outputs Section */}
        {step.fields?.outputs && step.fields.outputs.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">Results & Outputs</h3>
            <div className="space-y-4">
              {step.fields.outputs.map((field) => (
                <SavedField
                  key={field.name}
                  label={field.label}
                  value={localOutputs[field.name] || ''}
                  placeholder={field.placeholder || ''}
                  onChange={(value) => handleOutputChange({ ...localOutputs, [field.name]: value })}
                  isTextarea={field.type === 'textarea'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t">
        <button
          onClick={handleSave}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Save className="w-4 h-4 mr-2" />
          {stepIndex === workflow.steps.length - 1 ? 'Save & Complete' : 'Save & Next Step'}
        </button>
      </div>
    </div>
  );
}