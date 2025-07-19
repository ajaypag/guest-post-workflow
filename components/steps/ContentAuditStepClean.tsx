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
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'builtin' | 'agent' | 'agentv2'>('agentv2');

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
                onComplete={(auditedArticle) => {
                  onChange({ 
                    ...step.outputs, 
                    seoOptimizedArticle: auditedArticle,
                    auditGenerated: true,
                    auditedAt: new Date().toISOString(),
                    auditVersion: 'v2'
                  });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};