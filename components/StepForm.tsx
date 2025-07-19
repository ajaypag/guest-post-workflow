'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { Save } from 'lucide-react';
import { SavedField } from './SavedField';
import { autoSaveMonitor } from '@/lib/utils/autoSaveMonitor';
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
import { TopicGenerationImproved } from './steps/TopicGenerationImproved';
import { DeepResearchStepClean } from './steps/DeepResearchStepClean';
import { ArticleDraftStepClean } from './steps/ArticleDraftStepClean';
import { ContentAuditStepClean } from './steps/ContentAuditStepClean';
import { FinalPolishStepClean } from './steps/FinalPolishStepClean';
import { FormattingQAStepClean } from './steps/FormattingQAStepClean';

interface StepFormProps {
  step: WorkflowStep;
  stepIndex: number;
  workflow: GuestPostWorkflow;
  onSave: (inputs: Record<string, any>, outputs: Record<string, any>, isManualSave?: boolean) => void;
  onWorkflowChange?: (workflow: GuestPostWorkflow) => void;
}

const stepForms: Record<string, React.FC<{ step: WorkflowStep; workflow: GuestPostWorkflow; onChange: (data: any) => void; onWorkflowChange?: (workflow: GuestPostWorkflow) => void }>> = {
  'domain-selection': DomainSelectionStepClean,
  'keyword-research': KeywordResearchStepClean,
  'topic-generation': TopicGenerationImproved, // IMPROVED: Better visual hierarchy. To revert: change to TopicGenerationStepClean
  'deep-research': DeepResearchStepClean,
  'article-draft': ArticleDraftStepClean,
  'content-audit': ContentAuditStepClean,
  'final-polish': FinalPolishStepClean,
  'formatting-qa': FormattingQAStepClean,
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
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    console.log('Step data changed, updating local state:', { inputs: step.inputs, outputs: step.outputs });
    setLocalInputs(step.inputs || {});
    setLocalOutputs(step.outputs || {});
  }, [step.inputs, step.outputs]);

  // Auto-save functionality with debouncing
  const triggerAutoSave = () => {
    // Log debounce start
    autoSaveMonitor.logEvent('debounce-start', {
      workflowId: workflow?.id,
      stepId: step.id,
      stepType: localInputs.stepType || step.id
    });

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveMonitor.logEvent('debounce-reset', {
        workflowId: workflow?.id,
        stepId: step.id,
        stepType: localInputs.stepType || step.id
      });
    }

    // Set new timer for auto-save after 2 seconds of no changes
    const timer = setTimeout(() => {
      console.log('⏱️ Auto-saving after 2 seconds of inactivity');
      autoSaveMonitor.logEvent('save-triggered', {
        workflowId: workflow?.id,
        stepId: step.id,
        stepType: localInputs.stepType || step.id,
        isAutoSave: true
      });
      handleSave(false); // Pass false to indicate auto-save, not manual save
    }, 2000);

    setAutoSaveTimer(timer);
  };

  // Special handling for Polish step completion
  useEffect(() => {
    if (step.id === 'final-polish' && localOutputs.finalArticle && 
        (!step.outputs?.finalArticle || step.outputs.finalArticle !== localOutputs.finalArticle)) {
      console.log('🚀 Polish step completed - triggering immediate auto-save');
      // Clear any pending auto-save timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      // Save immediately (but don't navigate - pass false for auto-save)
      handleSave(false);
    }
  }, [localOutputs.finalArticle, step.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // Listen for force-save events to bypass debounce timer
  useEffect(() => {
    const handler = () => {
      console.log('🚀 Force-save event received, saving immediately');
      autoSaveMonitor.logEvent('force-save', {
        workflowId: workflow?.id,
        stepId: step.id,
        stepType: localInputs.stepType || step.id
      });
      handleSave(false);
    };
    window.addEventListener('force-step-save', handler);
    return () => window.removeEventListener('force-step-save', handler);
  }, []);

  const handleSave = async (isManualSave: boolean = false) => {
    console.log('🟢 handleSave called:', { localInputs, localOutputs, isManualSave });
    setIsSaving(true);
    
    try {
      await onSave(localInputs, localOutputs, isManualSave);
      
      // Log success
      autoSaveMonitor.logEvent('save-success', {
        workflowId: workflow?.id,
        stepId: step.id,
        stepType: localInputs.stepType || step.id,
        isManualSave,
        dataSize: {
          inputs: JSON.stringify(localInputs).length,
          outputs: JSON.stringify(localOutputs).length
        }
      });
      
      setLastSaved(new Date());
    } catch (error: any) {
      // Log error
      autoSaveMonitor.logEvent('save-error', {
        workflowId: workflow?.id,
        stepId: step.id,
        stepType: localInputs.stepType || step.id,
        isManualSave,
        error: error.message || 'Unknown error'
      });
      
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setLocalInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOutputChange = (data: any) => {
    console.log('🟡 FormComponent onChange called:', data);
    console.log('🔍 Previous localOutputs:', localOutputs);
    console.log('🆕 New data has seoOptimizedArticle:', !!data.seoOptimizedArticle);
    console.log('📏 seoOptimizedArticle length:', data.seoOptimizedArticle?.length || 0);
    
    // IMPORTANT: Check for changes BEFORE updating state to avoid closure issues
    const criticalFields = ['finalArticle', 'fullArticle', 'seoOptimizedArticle', 'googleDocUrl'];
    const hasChangedCriticalField = criticalFields.some(field => {
      // For seoOptimizedArticle, do a more thorough check
      if (field === 'seoOptimizedArticle' && data[field]) {
        const oldValue = localOutputs[field] || '';
        const newValue = data[field] || '';
        
        // Check if content actually changed (not just whitespace)
        const hasChanged = oldValue.trim() !== newValue.trim();
        
        console.log(`🔎 Checking ${field}:`);
        console.log(`   Old length: ${oldValue.length}, trimmed: ${oldValue.trim().length}`);
        console.log(`   New length: ${newValue.length}, trimmed: ${newValue.trim().length}`);
        console.log(`   Content changed: ${hasChanged}`);
        
        // Also check if V2 is overwriting V1 content (based on version metadata)
        if (hasChanged && data.auditVersion === 'v2' && oldValue.length > 0) {
          console.log(`🔄 V2 audit replacing existing content`);
        }
        
        return hasChanged;
      }
      
      // For other fields, simple comparison
      const hasChanged = data[field] && data[field] !== localOutputs[field];
      if (hasChanged) {
        console.log(`✅ Critical field "${field}" has changed`);
      }
      return hasChanged;
    });
    
    // Update state
    setLocalOutputs(data);
    
    // Trigger auto-save if critical fields changed
    if (hasChangedCriticalField) {
      console.log('🔄 Critical field changed, triggering auto-save');
      triggerAutoSave();
    } else {
      console.log('⚠️ No critical field changes detected, not triggering auto-save');
    }
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
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {stepIndex === workflow.steps.length - 1 ? 'Save & Complete' : 'Save & Next Step'}
              </>
            )}
          </button>
          
          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="text-sm text-gray-500">
              Auto-saved {new Date(lastSaved).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}