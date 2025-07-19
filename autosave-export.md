# Auto-Save Functionality Export for V2 Semantic Audit Issue

## Problem Description
V2 semantic audit is not auto-saving while V1 does. Both should save to the same `seoOptimizedArticle` field.

## 1. StepForm.tsx (Main auto-save logic)'use client';

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
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer for auto-save after 2 seconds of no changes
    const timer = setTimeout(() => {
      console.log('⏱️ Auto-saving after 2 seconds of inactivity');
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

  const handleSave = async (isManualSave: boolean = false) => {
    console.log('🟢 handleSave called:', { localInputs, localOutputs, isManualSave });
    setIsSaving(true);
    await onSave(localInputs, localOutputs, isManualSave);
    setIsSaving(false);
    setLastSaved(new Date());
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

## 2. ContentAuditStepClean.tsx (V1 and V2 implementations)

'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ChatInterface } from '../ui/ChatInterface';
import { SplitPromptButton } from '../ui/SplitPromptButton';
import { AgenticSemanticAuditor } from '../ui/AgenticSemanticAuditor';
import { AgenticSemanticAuditorV2 } from '../ui/AgenticSemanticAuditorV2';
import { ExternalLink, ChevronDown, ChevronRight, Search, CheckCircle, AlertCircle, Target, FileText, BarChart3 } from 'lucide-react';

interface ContentAuditStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ContentAuditStepClean = ({ step, workflow, onChange }: ContentAuditStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'setup': true,
    'audit': false,
    'results': false
  });

  // Tab system state
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'builtin' | 'agent' | 'agentv2'>('chatgpt');

  // Chat state management
  const [conversation, setConversation] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHeight, setChatHeight] = useState(600);
  const [prefilledInput, setPrefilledInput] = useState('');

  // Get the article from the previous step
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const fullArticle = articleDraftStep?.outputs?.fullArticle || '';
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';
  const researchOutlineStep = workflow.steps.find(s => s.id === 'deep-research');
  const outlineContent = researchOutlineStep?.outputs?.outlineContent || '';

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Prompt constants to prevent JSX rendering issues
  const fullAuditPrompt = `This is an article that you wrote for me:

${fullArticle}

If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss. For full reference, this was the original deep research data and outline that might be useful as you edit.

Original research outline and findings:
${outlineContent || '(Complete Step 3: Deep Research first to get outline content)'}

Now I realize this is a lot, so i want your first output to only be an audit of the first section. the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection.`;

  const loopingAuditPrompt = "Okay, now I want you to proceed your audit with the next section. As a reminder, the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection. In my paste, the formatting for headers did not translate to add those back in logically. While auditing, keep in mind we are creating a 'primarily narrative' article so bull points can appear but only sporadically. Note, we will rarely include citations within the article. Only a max are 3 in total are allowed. you can reference the citation without a link though. keep in mind variability too. if this is your 3rd+ section that your editing, maybe you are repeating your editing pattern too much. for example, if you used bullets in your last output, maybe don't in this output";

  // Status indicators
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'setup':
        return fullArticle ? 'ready' : 'pending';
      case 'audit':
        return step.outputs.auditProgress ? 
          (step.outputs.auditProgress === '100' ? 'completed' : 'ready') : 
          (step.outputs.tab2Created === 'yes' ? 'ready' : 'pending');
      case 'results':
        return step.outputs.seoOptimizedArticle ? 'completed' : 
               (step.outputs.auditProgress === '100' ? 'ready' : 'pending');
      default:
        return 'pending';
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ready':
        return <Target className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Handle chat message sending
  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    
    // Add user message to conversation
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);

    try {
      // Determine which API endpoint to use
      const endpoint = conversationId ? '/api/ai/responses/continue' : '/api/ai/responses/create';
      
      const requestBody = conversationId 
        ? {
            previous_response_id: conversationId,
            input: message
          }
        : {
            input: message, // Use the exact message (which could be fullAuditPrompt, loopingAuditPrompt, etc.)
            outline_content: outlineContent
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      // Add AI response to conversation
      const aiMessage = {
        role: 'assistant' as const,
        content: data.content || data.message || 'No response received',
        timestamp: new Date(),
        tokenUsage: data.tokenUsage
      };

      setConversation(prev => [...prev, aiMessage]);
      
      // Update conversation ID for future messages (using response.id)
      if (data.id) {
        console.log('Setting conversation ID:', data.id);
        setConversationId(data.id);
      } else {
        console.warn('No ID in response:', data);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to conversation
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      };
      
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('agentv2')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'agentv2'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🚀 AI Agent V2
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'agent'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🤖 AI Agent (Auto)
          </button>
          <button
            onClick={() => setActiveTab('chatgpt')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'chatgpt'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ChatGPT.com
          </button>
          <button
            onClick={() => setActiveTab('builtin')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'builtin'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Built-in Chat
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'chatgpt' ? (
            <div className="space-y-6">
              {/* Original ChatGPT.com workflow */}
              
              {/* Setup New Chat */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('setup')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('setup')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Setup Audit Environment</h3>
              <p className="text-sm text-gray-500">Create new chat and prepare article for SEO review</p>
            </div>
          </div>
          {expandedSections['setup'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['setup'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* New Chat Setup */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Create NEW CHAT</h4>
                <p className="text-sm text-blue-800 mb-3">
                  <strong>Important:</strong> Create a fresh chat in the same workspace for the audit process.
                  Select the link based on your OpenAI account:
                </p>
                <div className="space-y-2">
                  <a href="https://chatgpt.com/g/g-p-685ece4776fc8191963c943f9aed9d36-outreachlabs-guest-posts/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>info@onlyoutreach.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-68658030ad0881919f08923d7958b566-outreach-labs-guest-posting/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>ajay@pitchpanda.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-6863fd37b78481919da9926011ab939d-outreach-labs-guest-posts/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>ajay@linkio.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-686fc2a8d248819180607c190de9461a/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>darko@outreachlabs.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-686fc171c7a48191bb19b0828c468af7-outreachlabs-guest-post/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>ezra@outreachlabs.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-686fc3144b648191939582c8a042b3fe/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>leo@outreachlabs.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-686fc3fb7fb4819189fc57ae51f49f76/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>alex@outreachlabs.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-686fc5659e4881918176e7bd4a9f8133/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>viktor@outreachlabs.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a href="https://chatgpt.com/g/g-p-686fca3e73548191a99d322ca89a391f-outreachlabs-guest-post/project?model=o3" 
                     target="_blank" 
                     className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full justify-between">
                    <span>ken@outreachlabs.com</span>
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                </div>
              </div>

              {/* Article dependency */}
              {fullArticle ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Article ready for audit from Step 4</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Complete Step 4 (Article Draft) first to get the article content</p>
                  </div>
                </div>
              )}

              {/* Google Doc Tab Setup */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">📄 Create Tab 2 in Google Doc</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Add a second tab to your existing Google Doc to track audit results and optimized content.
                </p>
                {googleDocUrl && (
                  <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" 
                     className="inline-flex items-center text-blue-600 hover:underline text-sm font-medium">
                    → Open Google Doc <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Google Doc Tab 2 Created?</label>
                <select
                  value={step.outputs.tab2Created || ''}
                  onChange={(e) => onChange({ ...step.outputs, tab2Created: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select status...</option>
                  <option value="yes">Yes - Tab 2 created for audit results</option>
                  <option value="no">Not yet</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section-by-Section Audit */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('audit')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('audit')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Section-by-Section Audit</h3>
              <p className="text-sm text-gray-500">Review article against semantic SEO best practices</p>
            </div>
          </div>
          {expandedSections['audit'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['audit'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* First Section Prompt */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">Audit Prompt #1: First Section</h4>
                <p className="text-sm text-purple-700 mb-3">Copy and paste this complete prompt:</p>
                
                {fullArticle ? (
                  <div className="bg-white border border-purple-300 rounded-lg p-4 relative">
                    <div className="absolute top-3 right-3">
                      <CopyButton 
                        text={fullAuditPrompt}
                        label="Copy Full Prompt"
                      />
                    </div>
                    <div className="font-mono text-sm pr-16">
                      <p className="mb-2">This is an article that you wrote for me:</p>
                      <div className="p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto mb-2">
                        <div className="text-xs text-gray-700 whitespace-pre-wrap">
                          {fullArticle.substring(0, 500)}{fullArticle.length > 500 ? '...' : ''}
                        </div>
                      </div>
                      <p className="mb-2 text-xs">If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss. For full reference, this was the original deep research data and outline that might be useful as you edit.</p>
                      <div className="p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto mb-2">
                        {outlineContent ? (
                          <div className="text-xs text-gray-700 whitespace-pre-wrap">{outlineContent.substring(0, 300)}...</div>
                        ) : (
                          <div className="text-gray-500 text-xs">Research outline content will appear here from Step 3</div>
                        )}
                      </div>
                      <p className="text-xs">Now I realize this is a lot, so i want your first output to only be an audit of the first section. the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">Complete Step 4 first to generate the audit prompt with your article content.</p>
                  </div>
                )}
              </div>

              {/* Looping Prompt */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">Looping Audit Prompt #2: Subsequent Sections</h4>
                <p className="text-sm text-purple-700 mb-3">Use this EXACT text for each subsequent section:</p>
                <div className="bg-white border border-purple-300 rounded-lg p-3 relative">
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text={'Okay, now I want you to proceed your audit with the next section. As a reminder, the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection. In my paste, the formatting for headers did not translate to add those back in logically. While auditing, keep in mind we are creating a "primarily narrative" article so bull points can appear but only sporadically. Note, we will rarely include citations within the article. Only a max are 3 in total are allowed. you can reference the citation without a link though. keep in mind variability too. if this is your 3rd+ section that your editing, maybe you are repeating your editing pattern too much. for example, if you used bullets in your last output, maybe don\'t in this output'}
                      label="Copy"
                    />
                  </div>
                  <p className="font-mono text-xs pr-16">
                    Okay, now I want you to proceed your audit with the next section. As a reminder, the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection. In my paste, the formatting for headers did not translate to add those back in logically. While auditing, keep in mind we are creating a "primarily narrative" article so bull points can appear but only sporadically. Note, we will rarely include citations within the article. Only a max are 3 in total are allowed. you can reference the citation without a link though. keep in mind variability too. if this is your 3rd+ section that your editing, maybe you are repeating your editing pattern too much. for example, if you used bullets in your last output, maybe don't in this output
                  </p>
                </div>
              </div>

              {/* Progress tracking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audit Progress</label>
                <select
                  value={step.outputs.auditProgress || ''}
                  onChange={(e) => onChange({ ...step.outputs, auditProgress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select progress...</option>
                  <option value="25">25% - First few sections</option>
                  <option value="50">50% - Halfway through</option>
                  <option value="75">75% - Almost done</option>
                  <option value="100">100% - All sections audited</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Capture Results */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('results')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('results')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Capture Optimized Results</h3>
              <p className="text-sm text-gray-500">Save final SEO-optimized article and audit insights</p>
            </div>
          </div>
          {expandedSections['results'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['results'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">📝 SEO-Optimized Article</h4>
                <p className="text-sm text-green-700">
                  After completing all sections, paste the final SEO-optimized article here. This will be used in the next step (Polish & Finalize).
                </p>
              </div>

              <SavedField
                label="SEO-Optimized Full Article"
                value={step.outputs.seoOptimizedArticle || ''}
                placeholder="Paste the complete SEO-optimized article after all sections have been audited and improved"
                onChange={(value) => onChange({ ...step.outputs, seoOptimizedArticle: value })}
                isTextarea={true}
                height="h-64"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audit Quality</label>
                <select
                  value={step.outputs.auditQuality || ''}
                  onChange={(e) => onChange({ ...step.outputs, auditQuality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Rate audit quality...</option>
                  <option value="excellent">Excellent - Major improvements made</option>
                  <option value="good">Good - Solid optimizations applied</option>
                  <option value="moderate">Moderate - Some improvements</option>
                  <option value="minimal">Minimal - Few changes needed</option>
                </select>
              </div>

              <SavedField
                label="Audit Notes (Optional)"
                value={step.outputs.auditNotes || ''}
                placeholder="Key issues found, major changes made, patterns observed"
                onChange={(value) => onChange({ ...step.outputs, auditNotes: value })}
                isTextarea={true}
                height="h-24"
              />

              {step.outputs.seoOptimizedArticle && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">
                      SEO optimization complete! Ready for Polish & Finalize step.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

            </div>
          ) : activeTab === 'builtin' ? (
            <div className="space-y-6">
              {/* Built-in Chat Interface */}
              
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">🤖 Built-in AI Chat</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Same semantic SEO audit workflow as ChatGPT.com tab, but integrated directly in the app:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li><strong>Same audit prompts</strong> with full article content</li>
                  <li><strong>Section-by-section review</strong> with strengths/weaknesses format</li>
                  <li><strong>Conversation continuity</strong> with o3 reasoning model</li>
                  <li><strong>Automatic content loading</strong> from previous steps</li>
                </ul>
                <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                  <p className="text-xs text-blue-800 font-medium">💡 Use the prompt buttons below to start the semantic SEO audit process.</p>
                </div>
              </div>

              {/* Dependency check */}
              {fullArticle ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Article ready for audit from Step 4</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Complete Step 4 (Article Draft) first to get the article content for audit</p>
                  </div>
                </div>
              )}

              {/* Audit Prompt Buttons */}
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-3">📝 Audit Prompts</h4>
                  <div className="space-y-3">
                    <SplitPromptButton
                      onSend={() => handleSendMessage(fullAuditPrompt)}
                      onEdit={() => setPrefilledInput(fullAuditPrompt)}
                      disabled={!fullArticle || isLoading}
                      className="w-full"
                    >
                      1️⃣ Start Initial Audit (First Section)
                    </SplitPromptButton>
                    
                    <SplitPromptButton
                      onSend={() => handleSendMessage(loopingAuditPrompt)}
                      onEdit={() => setPrefilledInput(loopingAuditPrompt)}
                      disabled={!conversationId || isLoading}
                      className="w-full"
                    >
                      2️⃣ Continue Audit (Next Section)
                    </SplitPromptButton>
                  </div>
                </div>
              </div>

              {/* Chat Interface */}
              <ChatInterface
                conversation={conversation}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                height={chatHeight}
                onHeightChange={setChatHeight}
                prefilledInput={prefilledInput}
                onPrefilledInputChange={setPrefilledInput}
              />

              {/* Workflow Status & Actions */}
              <div className="space-y-4">
                
                {/* Audit Progress */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-medium text-purple-800 mb-2">📊 Audit Progress Tracking</h4>
                    <p className="text-sm text-purple-700">Track your section-by-section audit progress and paste optimized content to Google Doc Tab 2.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Google Doc Tab 2 Created?</label>
                      <select
                        value={step.outputs.tab2Created || ''}
                        onChange={(e) => onChange({ ...step.outputs, tab2Created: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select status...</option>
                        <option value="yes">Yes - Tab 2 created for audit results</option>
                        <option value="no">Not yet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Audit Progress</label>
                      <select
                        value={step.outputs.auditProgress || ''}
                        onChange={(e) => onChange({ ...step.outputs, auditProgress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select progress...</option>
                        <option value="25">25% - Introduction audited</option>
                        <option value="50">50% - Half sections completed</option>
                        <option value="75">75% - Most sections audited</option>
                        <option value="100">100% - All sections completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Final Optimized Article */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ Final SEO-Optimized Article</h4>
                    <p className="text-sm text-green-700">Once audit is complete, paste the final optimized article here for use in subsequent steps.</p>
                  </div>

                  <SavedField
                    label="SEO-Optimized Article"
                    value={step.outputs.seoOptimizedArticle || ''}
                    placeholder="Paste the complete SEO-optimized article from your Google Doc Tab 2..."
                    onChange={(value) => onChange({ ...step.outputs, seoOptimizedArticle: value })}
                    isTextarea={true}
                    height="h-64"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'agent' ? (
            <div className="space-y-6">
              {/* AI Agent Semantic Audit */}
              <AgenticSemanticAuditor
                workflowId={workflow.id}
                originalArticle={fullArticle}
                researchOutline={outlineContent}
                existingAuditedArticle={step.outputs?.seoOptimizedArticle || ''}
                onComplete={(auditedArticle) => {
                  onChange({ 
                    ...step.outputs, 
                    seoOptimizedArticle: auditedArticle,
                    auditGenerated: true,
                    auditedAt: new Date().toISOString()
                  });
                }}
              />
            </div>
          ) : activeTab === 'agentv2' ? (
            <div className="space-y-6">
              {/* AI Agent V2 Semantic Audit */}
              <AgenticSemanticAuditorV2
                workflowId={workflow.id}
                originalArticle={fullArticle}
                researchOutline={outlineContent}
                existingAuditedArticle={step.outputs?.seoOptimizedArticle || ''}
                onComplete={(auditedArticle) => {
                  console.log('🎯 V2 Audit onComplete called with article length:', auditedArticle.length);
                  console.log('📝 Current outputs before change:', step.outputs);
                  
                  const updatedOutputs = { 
                    ...step.outputs, 
                    seoOptimizedArticle: auditedArticle,
                    auditGenerated: true,
                    auditedAt: new Date().toISOString(),
                    auditVersion: 'v2'
                  };
                  
                  console.log('📤 Calling onChange with updated outputs:', updatedOutputs);
                  onChange(updatedOutputs);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

## 3. AgenticSemanticAuditor.tsx (V1 - working version)

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, Search, Zap, Target } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { CostConfirmationDialog } from './CostConfirmationDialog';

interface AgenticSemanticAuditorProps {
  workflowId: string;
  originalArticle: string;
  researchOutline: string;
  existingAuditedArticle?: string;
  onComplete: (auditedArticle: string) => void;
}

interface AuditSection {
  id: string;
  sectionNumber: number;
  title: string;
  originalContent?: string;
  auditedContent?: string;
  strengths?: string;
  weaknesses?: string;
  editingPattern?: string;
  citationsAdded?: number;
  status: 'pending' | 'auditing' | 'completed' | 'error';
  errorMessage?: string;
  auditMetadata?: {
    headerLevel?: 'h2' | 'h3';
    level?: 'section' | 'subsection';
    parentSection?: string;
  };
}

interface AuditProgress {
  session: {
    id: string;
    status: 'pending' | 'auditing' | 'completed' | 'error';
    totalSections: number;
    completedSections: number;
    totalCitationsUsed: number;
    errorMessage?: string;
  };
  sections: AuditSection[];
  progress: {
    total: number;
    completed: number;
    citationsUsed: number;
    citationsRemaining: number;
  };
}

export const AgenticSemanticAuditor = ({ 
  workflowId, 
  originalArticle, 
  researchOutline, 
  existingAuditedArticle = '',
  onComplete 
}: AgenticSemanticAuditorProps) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [auditResults, setAuditResults] = useState<Array<{
    title: string;
    strengths: string;
    weaknesses: string;
    optimizedContent: string;
    editingPattern: string;
    citationsAdded: number;
  }>>([]);
  const [finalAuditedArticle, setFinalAuditedArticle] = useState<string>(existingAuditedArticle);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Sync with existing audited article changes
  useEffect(() => {
    setFinalAuditedArticle(existingAuditedArticle);
  }, [existingAuditedArticle]);

  const handleStartClick = () => {
    if (!originalArticle.trim()) {
      setError('Original article is required. Please complete Article Draft step first.');
      return;
    }

    if (!researchOutline.trim()) {
      setError('Research outline is required. Please complete Deep Research step first.');
      return;
    }
    
    // Disable button immediately to prevent double-clicks
    setIsButtonDisabled(true);
    
    // Show cost confirmation dialog
    setShowCostDialog(true);
  };

  const startAudit = async () => {
    setShowCostDialog(false);
    setIsAuditing(true);
    setError(null);
    setLogs([]);
    setAuditResults([]);
    setFinalAuditedArticle('');
    addLog('Starting semantic SEO audit...');

    try {
      // Start audit
      const response = await fetch(`/api/workflows/${workflowId}/semantic-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalArticle, 
          researchOutline 
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start semantic audit');
      }

      setSessionId(result.sessionId);
      addLog(`Audit session created: ${result.sessionId}`);
      
      // Start SSE connection for real-time updates
      startEventStream(result.sessionId);

    } catch (err: any) {
      setError(err.message);
      setIsAuditing(false);
      setIsButtonDisabled(false);
      addLog(`Error: ${err.message}`);
    }
  };

  const startEventStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/semantic-audit/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            addLog('Connected to audit stream');
            break;
            
          case 'progress':
            // Ensure data has proper structure before setting
            if (data && data.session) {
              setProgress({
                session: data.session,
                sections: data.sections || [],
                progress: data.progress || { total: 0, completed: 0, citationsUsed: 0, citationsRemaining: 0 }
              });
              
              // Log audit updates
              if (data.session.status === 'auditing' && data.sections && Array.isArray(data.sections)) {
                const currentSection = data.sections.find((s: AuditSection) => s.status === 'auditing');
                if (currentSection) {
                  addLog(`Auditing section ${currentSection.sectionNumber}: "${currentSection.title}"`);
                }
              }
            }
            break;
            
          case 'parsed':
            addLog(`Article parsed into ${data.totalSections} sections`);
            break;
            
          case 'section_completed':
            addLog(`✅ Audited "${data.section_title}" (Pattern: ${data.editing_pattern}, Citations: +${data.citations_added})`);
            
            // Add to audit results for display
            setAuditResults(prev => [...prev, {
              title: data.section_title,
              strengths: data.strengths,
              weaknesses: data.weaknesses,
              optimizedContent: data.optimized_content,
              editingPattern: data.editing_pattern,
              citationsAdded: data.citations_added
            }]);
            break;
            
          case 'completed':
            setIsAuditing(false);
            eventSource.close();
            
            addLog('🎉 Semantic SEO audit completed successfully!');
            
            if (data.finalAuditedArticle) {
              addLog(`Final audit: ${data.totalSections} sections, ${data.totalCitationsUsed} citations, patterns: ${data.editingPatterns?.join(', ')}`);
              setFinalAuditedArticle(data.finalAuditedArticle);
              onComplete(data.finalAuditedArticle);
            } else {
              addLog('Warning: No final audited article received');
              setError('No final audited article received');
            }
            break;
            
          case 'error':
            setError(data.message);
            setIsAuditing(false);
            eventSource.close();
            addLog(`❌ Error: ${data.message}`);
            break;
            
          case 'tool_call':
            if (data.name === 'file_search') {
              addLog(`🔍 Searching semantic SEO knowledge: "${data.query}"`);
            } else {
              addLog(`🔧 Using tool: ${data.name}`);
            }
            break;
        }
      } catch (err) {
        console.error('Error parsing audit SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      addLog('Connection lost, retrying...');
    };
  };

  const stopAudit = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsAuditing(false);
    addLog('Audit stopped by user');
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'auditing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const progressPercentage = progress && progress.progress && progress.progress.total > 0
    ? Math.round((progress.progress.completed / progress.progress.total) * 100) 
    : 0;
  
  // Ensure progress has proper structure
  const safeProgress = progress ? {
    session: progress.session || { status: 'pending', totalSections: 0, completedSections: 0, totalCitationsUsed: 0 },
    sections: progress.sections || [],
    progress: progress.progress || { total: 0, completed: 0, citationsUsed: 0, citationsRemaining: 0 }
  } : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Search className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Semantic SEO Auditor</h3>
            <p className="text-sm text-gray-600">Automated section-by-section semantic SEO optimization</p>
          </div>
        </div>
        
        {!isAuditing ? (
          <button
            onClick={handleStartClick}
            disabled={!originalArticle.trim() || !researchOutline.trim() || isButtonDisabled}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Start Audit</span>
          </button>
        ) : (
          <button
            onClick={stopAudit}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Pause className="w-4 h-4" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {safeProgress && (
        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Audit Progress</span>
              <span className="text-sm text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Status: {safeProgress.session.status}</span>
              <span>
                Citations: {safeProgress.progress.citationsUsed}/3 used, {safeProgress.progress.citationsRemaining} remaining
              </span>
            </div>
          </div>

          {/* Sections List */}
          {safeProgress.sections && Array.isArray(safeProgress.sections) && safeProgress.sections.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Article Sections</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {safeProgress.sections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(section.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {section.auditMetadata?.level === 'subsection' && '   └─ '}
                          {section.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {section.auditMetadata?.level === 'subsection' && (
                            <span className="bg-gray-100 px-1 rounded">H3</span>
                          )}
                          {section.auditMetadata?.level === 'section' && (
                            <span className="bg-blue-100 px-1 rounded">H2</span>
                          )}
                          {section.editingPattern && (
                            <span>Pattern: {section.editingPattern}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 capitalize">{section.status}</span>
                      {section.citationsAdded !== undefined && section.citationsAdded > 0 && (
                        <p className="text-xs text-blue-600">+{section.citationsAdded} citations</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Results Preview */}
      {auditResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Audit Results</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <h5 className="font-medium text-gray-900">{result.title}</h5>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{result.editingPattern}</span>
                  {result.citationsAdded > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      +{result.citationsAdded} citations
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-green-700 mb-1">Strengths:</p>
                    <p className="text-gray-600">{result.strengths}</p>
                  </div>
                  <div>
                    <p className="font-medium text-orange-700 mb-1">Improvements:</p>
                    <p className="text-gray-600">{result.weaknesses}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Audited Article */}
      {finalAuditedArticle && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Final Audited Article</span>
          </h4>
          
          {/* Article Text Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              SEO-Optimized Article (Markdown)
            </label>
            <textarea
              value={finalAuditedArticle}
              readOnly
              className="w-full h-64 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="The final audited article will appear here..."
            />
          </div>

          {/* HTML Preview */}
          <MarkdownPreview 
            content={finalAuditedArticle}
            className="mt-4"
          />
        </div>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Activity Log</h4>
          <div className="bg-gray-50 border border-gray-200 text-gray-800 text-xs p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isAuditing && !progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How the Semantic SEO Audit works:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. AI analyzes your article content and research context</li>
            <li>2. Parses article into sections for systematic review</li>
            <li>3. Audits each section against semantic SEO best practices</li>
            <li>4. Identifies strengths, weaknesses, and optimization opportunities</li>
            <li>5. Provides optimized content with varied editing patterns</li>
            <li>6. Tracks citation usage (max 3 total) and editing variety</li>
          </ol>
        </div>
      )}

      {/* Cost Confirmation Dialog */}
      <CostConfirmationDialog
        isOpen={showCostDialog}
        onClose={() => {
          setShowCostDialog(false);
          setIsButtonDisabled(false);
        }}
        onConfirm={startAudit}
        title="Start Semantic SEO Audit"
        description="This will use OpenAI's advanced agents to analyze and optimize your article for semantic SEO section by section."
        estimatedCost="$0.30 - $1.00"
        warningMessage="The audit will use up to 3 citations maximum and provide detailed analysis for each section."
      />
    </div>
  );
};

## 4. AgenticSemanticAuditorV2.tsx (V2 - not auto-saving)

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, AlertCircle, Clock, FileText, Search } from 'lucide-react';
import { CostConfirmationDialog } from './CostConfirmationDialog';
import ReactMarkdown from 'react-markdown';

interface AgenticSemanticAuditorV2Props {
  workflowId: string;
  originalArticle: string;
  researchOutline: string;
  existingAuditedArticle?: string;
  onComplete: (auditedArticle: string) => void;
}

interface SessionProgress {
  session: {
    id: string;
    status: 'initializing' | 'auditing' | 'completed' | 'failed';
    completedSections: number;
    errorMessage?: string;
  };
  progress: {
    status: string;
    completedSections: number;
  };
}

export const AgenticSemanticAuditorV2 = ({ 
  workflowId, 
  originalArticle, 
  researchOutline,
  existingAuditedArticle,
  onComplete 
}: AgenticSemanticAuditorV2Props) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [intermediaryContent, setIntermediaryContent] = useState(''); // Streaming markdown content
  const [finalArticle, setFinalArticle] = useState(existingAuditedArticle || ''); // Clean parsed article
  const [showRendered, setShowRendered] = useState(false);
  const [showIntermediaryView, setShowIntermediaryView] = useState(false); // Toggle between final and analysis view
  const [hasExistingAudit, setHasExistingAudit] = useState(!!existingAuditedArticle);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleStartClick = () => {
    if (!originalArticle.trim()) {
      setError('Please complete Article Draft step first to get the article.');
      return;
    }
    
    // Disable button immediately to prevent double-clicks
    setIsButtonDisabled(true);
    
    // Show cost confirmation dialog
    setShowCostDialog(true);
  };

  const startAudit = async () => {
    setShowCostDialog(false);
    setIsAuditing(true);
    setError(null);
    setLogs([]);
    setIntermediaryContent(''); // Clear streaming content
    setFinalArticle(''); // Clear final article
    addLog('🚀 Starting V2 semantic SEO audit...');

    try {
      // Start V2 audit
      const response = await fetch(`/api/workflows/${workflowId}/semantic-audit-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalArticle, researchOutline })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start V2 audit');
      }

      setSessionId(result.sessionId);
      addLog(`✨ V2 audit session created: ${result.sessionId}`);
      
      // Start SSE connection for real-time updates
      startEventStream(result.sessionId);

    } catch (err: any) {
      setError(err.message);
      setIsAuditing(false);
      setIsButtonDisabled(false);
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const startEventStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/workflows/${workflowId}/semantic-audit-v2/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            addLog('🔌 Connected to V2 audit real-time updates');
            break;
            
          case 'status':
            addLog(`🔍 ${data.message}`);
            break;
            
          case 'text':
            // Accumulate intermediary content (with markdown headers)
            setIntermediaryContent(prev => prev + data.content);
            break;
            
          case 'section_completed':
            addLog(`✅ Completed section ${data.sectionsCompleted}`);
            break;
            
          case 'progress':
            setProgress(data);
            
            // Log status changes
            if (data.session.status === 'auditing') {
              if (!progress || progress.session.status !== 'auditing') {
                addLog('📝 Auditor reviewing article section by section...');
              }
            }
            break;
            
          case 'complete':
            setIsAuditing(false);
            eventSource.close();
            
            if (data.status === 'completed') {
              addLog('🎉 V2 semantic audit completed successfully!');
              
              // Handle both intermediary and final content
              if (data.intermediaryContent) {
                setIntermediaryContent(data.intermediaryContent);
              }
              
              if (data.finalArticle) {
                const wordCount = data.finalArticle.split(/\s+/).filter((w: string) => w).length;
                addLog(`📊 Final audited article: ${wordCount} words`);
                setFinalArticle(data.finalArticle);
                setHasExistingAudit(true); // Mark as completed
                onComplete(data.finalArticle); // Pass clean article to parent
              } else {
                addLog('⚠️ Warning: No audited article received from server');
                setError('No audited article received from server');
              }
            } else {
              addLog(`❌ Audit failed: ${data.errorMessage || 'Unknown error'}`);
              setError(data.errorMessage || 'Audit failed');
            }
            break;
            
          case 'error':
            setError(data.message);
            setIsAuditing(false);
            eventSource.close();
            addLog(`❌ Error: ${data.message}`);
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      addLog('🔄 Connection lost, attempting to reconnect...');
    };
  };

  const stopAudit = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsAuditing(false);
    addLog('⏹️ Audit stopped by user');
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'auditing':
        return <Search className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'initializing':
        return <FileText className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Agent V2 - Semantic SEO Audit</h3>
            <p className="text-sm text-gray-600">
              {hasExistingAudit ? 'Previously audited - run again to update' : 'Natural audit flow using LLM orchestration'}
            </p>
          </div>
        </div>
        
        {!isAuditing ? (
          <button
            onClick={handleStartClick}
            disabled={!originalArticle.trim() || isButtonDisabled}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <Play className="w-4 h-4" />
            <span>{hasExistingAudit ? 'Re-run V2 Audit' : 'Start V2 Audit'}</span>
          </button>
        ) : (
          <button
            onClick={stopAudit}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md"
          >
            <Pause className="w-4 h-4" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Existing Audit Status */}
      {hasExistingAudit && !isAuditing && !progress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">Previous audit completed</p>
              <p className="text-green-700 text-sm">The article below was audited and optimized. Click "Re-run V2 Audit" to update.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(progress.session.status)}
                <span className="font-medium text-gray-900 capitalize">{progress.session.status}</span>
              </div>
              <span className="text-sm text-gray-600">
                {progress.session.completedSections} sections audited
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Audit Content Display */}
      {(intermediaryContent || finalArticle) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {finalArticle ? 'Final Audited Article' : 'Audit Progress (Live)'}
            </h4>
            <div className="flex items-center space-x-2">
              {finalArticle && intermediaryContent && (
                <button
                  onClick={() => setShowIntermediaryView(!showIntermediaryView)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  {showIntermediaryView ? 'Show Final' : 'Show Analysis'}
                </button>
              )}
              <button
                onClick={() => setShowRendered(!showRendered)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showRendered ? 'Show Raw' : 'Show Rendered'}
              </button>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            {showRendered ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {showIntermediaryView ? intermediaryContent : (finalArticle || intermediaryContent)}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                {showIntermediaryView ? intermediaryContent : (finalArticle || intermediaryContent)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Activity Log</h4>
          <div className="bg-white/60 backdrop-blur border border-blue-200 text-gray-800 text-xs p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isAuditing && !progress && (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-300 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">V2 Semantic SEO Audit Approach:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. <strong>Single Agent</strong> reads article with semantic SEO knowledge</li>
            <li>2. Works through each section systematically</li>
            <li>3. Provides strengths, weaknesses, and optimized content</li>
            <li>4. Uses end marker to know when complete</li>
            <li>5. Creates natural, conversational audit flow</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2 italic">
            This V2 approach matches the ChatGPT.com experience with simple prompting.
          </p>
        </div>
      )}

      {/* Cost Confirmation Dialog */}
      <CostConfirmationDialog
        isOpen={showCostDialog}
        onClose={() => {
          setShowCostDialog(false);
          setIsButtonDisabled(false);
        }}
        onConfirm={startAudit}
        title="Start V2 Semantic SEO Audit"
        description="This will use the new LLM orchestration approach to audit your article section by section for semantic SEO optimization."
        estimatedCost="$0.50 - $1.50"
        warningMessage="V2 uses a natural conversation flow which produces better quality audits. You can stop the audit at any time."
      />
    </div>
  );
};

## 5. workflowSlice.ts (Redux store save functionality)



## 5. WorkflowEditor page.tsx (Handles step save)

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, AlertCircle, FileText } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import StepForm from '@/components/StepForm';

export default function WorkflowDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workflow, setWorkflow] = useState<GuestPostWorkflow | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const data = await storage.getWorkflow(params.id as string);
        if (data) {
          setWorkflow(data);
          
          // Check if there's a step parameter in the URL
          const stepParam = searchParams.get('step');
          if (stepParam) {
            const stepIndex = parseInt(stepParam, 10);
            if (stepIndex >= 0 && stepIndex < data.steps.length) {
              setActiveStep(stepIndex);
            } else {
              setActiveStep(0);
            }
          } else {
            setActiveStep(0);
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        router.push('/');
      }
    };
    
    loadWorkflow();
  }, [params.id, router, searchParams]);

  // Function to update URL when step changes
  const updateStepInUrl = (stepIndex: number) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('step', stepIndex.toString());
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  };

  // Function to change active step and update URL
  const changeActiveStep = (stepIndex: number) => {
    setActiveStep(stepIndex);
    updateStepInUrl(stepIndex);
    
    // Scroll active step into view in sidebar
    setTimeout(() => {
      if (sidebarRef.current) {
        const activeButton = sidebarRef.current.querySelector(`button:nth-child(${stepIndex + 1})`);
        if (activeButton) {
          activeButton.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }, 100);
  };

  const handleStepSave = async (inputs: Record<string, any>, outputs: Record<string, any>, isManualSave: boolean = false) => {
    if (!workflow) return;

    try {
      const updatedWorkflow = {
        ...workflow,
        updatedAt: new Date(),
        steps: workflow.steps.map((step, index) => {
          if (index === activeStep) {
            const updatedStep = {
              ...step,
              inputs: inputs || {},
              outputs: outputs || {},
              completedAt: new Date(),
              status: 'completed' as const
            };
            return updatedStep;
          }
          return step;
        })
      };

      setWorkflow(updatedWorkflow);
      await storage.saveWorkflow(updatedWorkflow);
      
      // Only auto-advance on manual save (user clicking save button), not on auto-save
      if (isManualSave && activeStep < workflow.steps.length - 1) {
        console.log('📍 Auto-advancing to next step after manual save');
        changeActiveStep(activeStep + 1);
      } else if (!isManualSave) {
        console.log('💾 Auto-save completed - staying on current step');
      }
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Failed to save step. Please try again.');
    }
  };

  // Handle workflow changes (for keyword preferences stored in metadata)
  const handleWorkflowChange = async (updatedWorkflow: GuestPostWorkflow) => {
    try {
      setWorkflow(updatedWorkflow);
      await storage.saveWorkflow(updatedWorkflow);
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow changes. Please try again.');
    }
  };

  const getStepIcon = (step: any, index: number) => {
    if (step.status === 'completed') {
      return <Check className="w-5 h-5 text-green-600" />;
    } else if (index === activeStep) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!workflow) {
    return <div>Loading...</div>;
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Link>
            <Link
              href={`/workflow/${workflow.id}/overview`}
              className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Overview
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-semibold text-gray-900">{workflow.clientName}</h1>
                <div className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
                  <span className="text-gray-600 text-sm font-medium">Guest Post Campaign</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Target Site</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-lg truncate">
                    {workflow.steps.find(s => s.id === 'domain-selection')?.outputs?.domain || 
                     workflow.targetDomain || 
                     'Not selected yet'}
                  </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Keyword</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-lg truncate">
                    {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.finalKeyword || 
                     'Not determined yet'}
                  </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Article Title</span>
                  </div>
                  <p className="text-gray-900 font-semibold leading-tight">
                    {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.postTitle || 
                     'Not created yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-3 lg:sticky lg:top-6">
                <h3 className="font-semibold mb-3 text-sm">Workflow Progress</h3>
                <div ref={sidebarRef} className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-1 pr-1">
                  {workflow.steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => changeActiveStep(index)}
                      className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                        index === activeStep
                          ? 'bg-blue-600 text-white'
                          : step.status === 'completed'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-1 py-0.5 rounded ${
                          index === activeStep
                            ? 'bg-blue-800 text-white'
                            : step.status === 'completed'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-400 text-white'
                        }`}>
                          {index}
                        </span>
                        {getStepIcon(step, index)}
                      </div>
                      <span className="text-xs flex-1 leading-tight">{step.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <StepForm
                step={workflow.steps[activeStep]}
                stepIndex={activeStep}
                workflow={workflow}
                onSave={handleStepSave}
                onWorkflowChange={handleWorkflowChange}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

## Summary of Auto-Save Issue

### Problem:
V2 semantic audit is not auto-saving while V1 does. Both should save to the same `seoOptimizedArticle` field.

### Key Files:
1. **StepForm.tsx** - Contains auto-save logic with 2-second debounce timer
2. **ContentAuditStepClean.tsx** - Has both V1 and V2 implementations
3. **AgenticSemanticAuditor.tsx** - V1 implementation (working)
4. **AgenticSemanticAuditorV2.tsx** - V2 implementation (not auto-saving)

### Auto-Save Flow:
1. Component calls `onChange` with updated outputs
2. `handleOutputChange` in StepForm checks for critical field changes
3. If `seoOptimizedArticle` changed, triggers 2-second auto-save timer
4. After 2 seconds, `handleSave` is called with `isManualSave=false`

### V1 vs V2 Comparison:
- V1 calls: `onChange({ ...step.outputs, seoOptimizedArticle: auditedArticle, ... })`
- V2 calls: `onChange({ ...step.outputs, seoOptimizedArticle: auditedArticle, auditVersion: 'v2', ... })`

### Debugging Added:
- Console logs in V2's `onComplete` callback
- Enhanced logging in `handleOutputChange` to track field changes
- Fixed closure issue by checking changes BEFORE state update

### Current Status:
Despite fixes, V2 still doesn't trigger auto-save. The issue may be deeper than the onChange flow.
