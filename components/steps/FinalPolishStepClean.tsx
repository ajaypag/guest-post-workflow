'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ChatInterface } from '../ui/ChatInterface';
import { SplitPromptButton } from '../ui/SplitPromptButton';
import { AgenticFinalPolisher } from '../ui/AgenticFinalPolisher';
import { AgenticFinalPolisherV2 } from '../ui/AgenticFinalPolisherV2';
import { MarkdownPreview } from '../ui/MarkdownPreview';
import { ExternalLink, ChevronDown, ChevronRight, Sparkles, CheckCircle, AlertCircle, Target, RefreshCw, FileText } from 'lucide-react';

interface FinalPolishStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const FinalPolishStepClean = ({ step, workflow, onChange }: FinalPolishStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'setup': true,
    'loop': false,
    'results': false
  });

  // Tab system state
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'builtin' | 'agentic' | 'agenticv2'>('agenticv2');

  // Chat state management
  const [conversation, setConversation] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHeight, setChatHeight] = useState(600);
  const [prefilledInput, setPrefilledInput] = useState('');

  // Get the SEO-optimized article from Step 5, fallback to original draft if not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  // Fallback to original draft if SEO version not available
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = seoOptimizedArticle || originalArticle;
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';

  // Prompt constants to prevent JSX rendering issues
  const kickoffPrompt = `Okay, here's my article.

${fullArticle}

Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates.`;

  const proceedPrompt = "Okay that is good. Now, proceed to the next section. Re-review my project files for my brand guide and the Semantic SEO writing tips. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates. Be sure to reference the conclusions you made during your thinking process when writing the updating article. Don't use em-dashes. The updated section output should be ready to copy-paste back into my article.";

  const cleanupPrompt = "Before you proceed to the next section, review your previous output. Compare it to the brand kit and the words to not use document. Based on that, make any potential updates";

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Status indicators
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'setup':
        return fullArticle ? 'ready' : 'pending';
      case 'loop':
        return step.outputs.polishProgress ? 
          (step.outputs.polishProgress === '100' ? 'completed' : 'ready') : 
          (step.outputs.tab3Created === 'yes' ? 'ready' : 'pending');
      case 'results':
        return step.outputs.finalArticle ? 'completed' : 
               (step.outputs.polishProgress === '100' ? 'ready' : 'pending');
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
            input: message, // Use the exact message (kickoffPrompt, proceedPrompt, cleanupPrompt, etc.)
            outline_content: '' // Not needed for polish step
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
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/90796a8df0d74e36bbd9dfb536121f86"
        title="Polish & Finalize Tutorial"
        description="Learn how to finalize and polish your guest post content for publication"
      />

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('agenticv2')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'agenticv2'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Agentic V2</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('agentic')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'agentic'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Agentic V1</span>
            </div>
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
          {activeTab === 'agenticv2' ? (
            <div className="space-y-6">
              {/* Agentic V2 Polish Interface */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Agentic Polish V2 - Two-Prompt Loop</span>
                </h3>
                <p className="text-sm text-purple-800 mb-3">
                  Fully automated polish using the same two-prompt loop pattern as ChatGPT tab:
                </p>
                <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                  <li><strong>Kickoff</strong> - Reviews first section for brand guide compliance</li>
                  <li><strong>Proceed → Cleanup Loop</strong> - For each section: analyze then refine</li>
                  <li><strong>Brand alignment</strong> - Balances engagement with semantic clarity</li>
                  <li><strong>Automatic progression</strong> - No manual copying between prompts</li>
                </ul>
                <div className="mt-3 p-3 bg-purple-100 rounded border border-purple-300">
                  <p className="text-xs text-purple-800 font-medium">
                    🚀 V2 Pattern: LLM-driven orchestration with natural conversation flow
                  </p>
                </div>
              </div>

              {/* Dependency check */}
              {seoOptimizedArticle ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Using SEO-optimized article from Step 5</p>
                  </div>
                </div>
              ) : originalArticle ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Using original draft from Step 4 (complete Step 5 for SEO-optimized version)</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-800">Complete Step 5 (Semantic SEO) first to get the optimized article for polishing</p>
                  </div>
                </div>
              )}

              {/* Article to Polish - Always Visible */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Article to Polish</h4>
                <textarea
                  value={fullArticle || ''}
                  readOnly
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg bg-white text-sm font-mono resize-none"
                  placeholder="The SEO-optimized article from Step 5 will appear here automatically when you click the Action button..."
                />
              </div>

              {/* Agentic Final Polisher V2 Component */}
              {fullArticle && (
                <AgenticFinalPolisherV2 
                  workflowId={workflow.id}
                  onComplete={(polishedArticle) => {
                    onChange({ 
                      ...step.outputs, 
                      finalArticle: polishedArticle,
                      polishProgress: '100',
                      tab3Created: 'yes',
                      agentV2Generated: true
                    });
                  }}
                />
              )}

              {/* Results Section */}
              {step.outputs.finalArticle && step.outputs.agentV2Generated && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ V2 Polish Complete</h4>
                    <p className="text-sm text-green-700">The AI has successfully applied the two-prompt loop pattern to balance brand voice with semantic directness.</p>
                  </div>

                  <SavedField
                    label="Final Polished Article"
                    value={step.outputs.finalArticle || ''}
                    placeholder="The polished article will appear here automatically..."
                    onChange={(value) => onChange({ ...step.outputs, finalArticle: value })}
                    isTextarea={true}
                    height="h-64"
                  />
                  
                  <MarkdownPreview 
                    content={step.outputs.finalArticle}
                    className="mt-4"
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'chatgpt' ? (
            <div className="space-y-6">
              {/* Original ChatGPT.com workflow */}
      
      {/* Setup Fresh Chat */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('setup')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('setup')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Setup Polish Environment</h3>
              <p className="text-sm text-gray-500">Start fresh chat and prepare article for brand alignment</p>
            </div>
          </div>
          {expandedSections['setup'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['setup'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Fresh Chat Setup */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Open FRESH CHAT</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Start a completely new chat in the same workspace for brand alignment review.
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

              {/* Article source indicator */}
              {seoOptimizedArticle ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Using SEO-optimized article from Step 5</p>
                  </div>
                </div>
              ) : originalArticle ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Using original draft from Step 4 (complete Step 5 for SEO-optimized version)</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-800">Complete Step 5 (Semantic SEO) first to get the optimized article</p>
                  </div>
                </div>
              )}

              {/* Kickoff prompt */}
              {fullArticle && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Kick-off Prompt: First Section Edit</h4>
                  <p className="text-sm text-gray-600 mb-3">Paste this UNCHANGED to start the brand alignment review:</p>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
                    <div className="absolute top-3 right-3">
                      <CopyButton 
                        text={kickoffPrompt}
                        label="Copy Full Prompt"
                      />
                    </div>
                    <div className="font-mono text-sm pr-16">
                      <p className="mb-2">Okay, here's my article.</p>
                      <div className="p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto mb-2">
                        <div className="text-xs text-gray-700 whitespace-pre-wrap">
                          {fullArticle.substring(0, 500)}{fullArticle.length > 500 ? '...' : ''}
                        </div>
                      </div>
                      <p className="text-xs">Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3 Setup */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">📄 Create Tab 3 "Final Draft" in Google Doc</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Add a third tab to your existing Google Doc to build the final polished version.
                </p>
                {googleDocUrl && (
                  <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" 
                     className="inline-flex items-center text-blue-600 hover:underline text-sm font-medium">
                    → Open Google Doc <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Google Doc Tab 3 "Final Draft" Created?</label>
                <select
                  value={step.outputs.tab3Created || ''}
                  onChange={(e) => onChange({ ...step.outputs, tab3Created: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select status...</option>
                  <option value="yes">Yes - Tab 3 created for final draft</option>
                  <option value="no">Not yet</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two-Prompt Loop Process */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('loop')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('loop')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Two-Prompt Loop Process</h3>
              <p className="text-sm text-gray-500">CRITICAL: Alternate between Proceed and Cleanup prompts for every section</p>
            </div>
          </div>
          {expandedSections['loop'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['loop'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Critical pattern warning */}
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">🔄 CRITICAL: Two-Prompt Loop Pattern</h4>
                <p className="text-sm font-medium text-red-700 mb-3">
                  You MUST alternate between these two prompts for EVERY section:
                </p>
                <div className="bg-white border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium mb-2">Loop Order:</p>
                  <ol className="text-sm text-red-700 space-y-1 ml-4">
                    <li>1. <strong>Proceed Prompt</strong> → Get section edit</li>
                    <li>2. <strong>Cleanup Prompt</strong> → Refine the edit</li>
                    <li>3. Copy cleaned section to Tab 3</li>
                    <li>4. Repeat steps 1-3 for next section</li>
                  </ol>
                </div>
                <p className="text-sm font-medium text-red-700">
                  ⚠️ Never paste the "Strengths | Weaknesses | Updated" version. Always run Cleanup first!
                </p>
              </div>

              {/* Step 1: Proceed Prompt */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">🟢 STEP 1: Proceed Prompt (Get Next Section)</h4>
                <p className="text-sm text-green-700 mb-3">Use this UNCHANGED for each section:</p>
                <div className="bg-white border border-green-300 rounded-lg p-3 relative">
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text="Okay that is good. Now, proceed to the next section. Re-review my project files for my brand guide and the Semantic SEO writing tips. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates. Be sure to reference the conclusions you made during your thinking process when writing the updating article. Don't use em-dashes. The updated section output should be ready to copy-paste back into my article."
                      label="Copy"
                    />
                  </div>
                  <p className="font-mono text-xs pr-16">
                    Okay that is good. Now, proceed to the next section. Re-review my project files for my brand guide and the Semantic SEO writing tips. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates. Be sure to reference the conclusions you made during your thinking process when writing the updating article. Don't use em-dashes. The updated section output should be ready to copy-paste back into my article.
                  </p>
                </div>
                <p className="text-sm italic text-green-700 mt-2">→ This gives you: Strengths | Weaknesses | Updated Section</p>
              </div>

              {/* Step 2: Cleanup Prompt */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">🔵 STEP 2: Cleanup Prompt (Refine Section)</h4>
                <p className="text-sm text-blue-700 mb-3">Immediately reply with this after EVERY section edit:</p>
                <div className="bg-white border border-blue-300 rounded-lg p-3 relative">
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text="Before you proceed to the next section, review your previous output. Compare it to the brand kit and the words to not use document. Based on that, make any potential updates"
                      label="Copy"
                    />
                  </div>
                  <p className="font-mono text-xs pr-16">
                    Before you proceed to the next section, review your previous output. Compare it to the brand kit and the words to not use document. Based on that, make any potential updates
                  </p>
                </div>
                <p className="text-sm italic text-blue-700 mt-2">→ This gives you: Cleaned Section (COPY THIS TO TAB 3)</p>
              </div>

              {/* Progress tracking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Polish Progress</label>
                <select
                  value={step.outputs.polishProgress || ''}
                  onChange={(e) => onChange({ ...step.outputs, polishProgress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select progress...</option>
                  <option value="25">25% - First few sections polished</option>
                  <option value="50">50% - Halfway through</option>
                  <option value="75">75% - Almost done</option>
                  <option value="100">100% - All sections polished</option>
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
              <h3 className="font-medium text-gray-900">Capture Final Results</h3>
              <p className="text-sm text-gray-500">Save the complete polished article for subsequent steps</p>
            </div>
          </div>
          {expandedSections['results'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['results'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">📝 Final Polished Article</h4>
                <p className="text-sm text-green-700">
                  After completing all sections and cleanup prompts, paste the complete final article here. This will be used in subsequent steps (Internal Links, External Links, etc.).
                </p>
              </div>

              <SavedField
                label="Final Polished Article"
                value={step.outputs.finalArticle || ''}
                placeholder="Paste the complete polished article after all sections have been reviewed and refined"
                onChange={(value) => onChange({ ...step.outputs, finalArticle: value })}
                isTextarea={true}
                height="h-64"
              />

              <SavedField
                label="Brand Alignment Notes (Optional)"
                value={step.outputs.brandNotes || ''}
                placeholder="Key brand adjustments made, voice improvements, patterns observed"
                onChange={(value) => onChange({ ...step.outputs, brandNotes: value })}
                isTextarea={true}
                height="h-24"
              />

              {step.outputs.finalArticle && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <p className="text-sm text-green-800">
                        Polish complete! Article is ready for formatting, QA, and link insertion.
                      </p>
                    </div>
                  </div>
                  
                  <MarkdownPreview 
                    content={step.outputs.finalArticle}
                    className="mt-4"
                  />
                </>
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
                  Same brand alignment workflow as ChatGPT.com tab, but integrated directly in the app:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li><strong>Two-prompt loop pattern</strong> (Proceed → Cleanup) for each section</li>
                  <li><strong>Brand guide alignment</strong> with strengths/weaknesses format</li>
                  <li><strong>Conversation continuity</strong> with o3 reasoning model</li>
                  <li><strong>Automatic content loading</strong> from previous steps</li>
                </ul>
                <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                  <p className="text-xs text-blue-800 font-medium">💡 Follow the critical two-prompt loop: Kickoff → Proceed → Cleanup → Proceed → Cleanup...</p>
                </div>
              </div>

              {/* Dependency check */}
              {seoOptimizedArticle ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Using SEO-optimized article from Step 5</p>
                  </div>
                </div>
              ) : originalArticle ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Using original draft from Step 4 (complete Step 5 for SEO-optimized version)</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-800">Complete Step 5 (Semantic SEO) first to get the optimized article for polishing</p>
                  </div>
                </div>
              )}

              {/* Polish Prompt Buttons */}
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-3">📝 Brand Alignment Prompts</h4>
                  <div className="space-y-3">
                    <SplitPromptButton
                      onSend={() => handleSendMessage(kickoffPrompt)}
                      onEdit={() => setPrefilledInput(kickoffPrompt)}
                      disabled={!fullArticle || isLoading}
                      className="w-full"
                    >
                      1️⃣ Start Brand Review (First Section)
                    </SplitPromptButton>
                    
                    <SplitPromptButton
                      onSend={() => handleSendMessage(proceedPrompt)}
                      onEdit={() => setPrefilledInput(proceedPrompt)}
                      disabled={!conversationId || isLoading}
                      className="w-full"
                    >
                      2️⃣ Proceed to Next Section
                    </SplitPromptButton>
                    
                    <SplitPromptButton
                      onSend={() => handleSendMessage(cleanupPrompt)}
                      onEdit={() => setPrefilledInput(cleanupPrompt)}
                      disabled={!conversationId || isLoading}
                      className="w-full"
                    >
                      3️⃣ Cleanup & Refine Section
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
                
                {/* Polish Progress */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-medium text-purple-800 mb-2">🔄 Polish Progress Tracking</h4>
                    <p className="text-sm text-purple-700">Track your section-by-section brand alignment progress. Use Tab 3 in Google Doc for final polished content.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Google Doc Tab 3 "Final Draft" Created?</label>
                      <select
                        value={step.outputs.tab3Created || ''}
                        onChange={(e) => onChange({ ...step.outputs, tab3Created: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select status...</option>
                        <option value="yes">Yes - Tab 3 created for final draft</option>
                        <option value="no">Not yet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Polish Progress</label>
                      <select
                        value={step.outputs.polishProgress || ''}
                        onChange={(e) => onChange({ ...step.outputs, polishProgress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select progress...</option>
                        <option value="25">25% - Introduction polished</option>
                        <option value="50">50% - Half sections completed</option>
                        <option value="75">75% - Most sections polished</option>
                        <option value="100">100% - All sections completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Final Polished Article */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ Final Polished Article</h4>
                    <p className="text-sm text-green-700">Once all sections are polished, paste the final article here for use in subsequent steps.</p>
                  </div>

                  <SavedField
                    label="Final Polished Article"
                    value={step.outputs.finalArticle || ''}
                    placeholder="Paste the complete brand-aligned article from your Google Doc Tab 3..."
                    onChange={(value) => onChange({ ...step.outputs, finalArticle: value })}
                    isTextarea={true}
                    height="h-64"
                  />
                  
                  {step.outputs.finalArticle && (
                    <MarkdownPreview 
                      content={step.outputs.finalArticle}
                      className="mt-4"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Agentic Final Polish Interface */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Agentic Final Polish</span>
                </h3>
                <p className="text-sm text-purple-800 mb-3">
                  Fully automated final polish using OpenAI Agents SDK. The AI will:
                </p>
                <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                  <li><strong>Gauge guide adherence</strong> - Analyze how well each section follows brand and semantic guides</li>
                  <li><strong>Identify conflicts</strong> - Find areas where brand engagement and semantic directness conflict</li>
                  <li><strong>Thread the needle</strong> - Balance reader engagement with clarity and directness</li>
                  <li><strong>Score improvements</strong> - Rate engagement (1-10) and clarity (1-10) for each section</li>
                </ul>
                <div className="mt-3 p-3 bg-purple-100 rounded border border-purple-300">
                  <p className="text-xs text-purple-800 font-medium">
                    ⚡ Automated workflow that runs unattended - perfect for consistent brand alignment across all sections
                  </p>
                </div>
              </div>

              {/* Dependency check */}
              {seoOptimizedArticle ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Using SEO-optimized article from Step 5</p>
                  </div>
                </div>
              ) : originalArticle ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">Using original draft from Step 4 (complete Step 5 for SEO-optimized version)</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-800">Complete Step 5 (Semantic SEO) first to get the optimized article for polishing</p>
                  </div>
                </div>
              )}

              {/* Agentic Final Polisher Component */}
              {fullArticle && (
                <AgenticFinalPolisher 
                  workflowId={workflow.id}
                  onComplete={(polishedArticle) => {
                    onChange({ ...step.outputs, finalArticle: polishedArticle });
                  }}
                />
              )}

              {/* Results Section */}
              {step.outputs.finalArticle && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ Agentic Polish Complete</h4>
                    <p className="text-sm text-green-700">The AI has successfully balanced brand engagement with semantic directness across all sections.</p>
                  </div>

                  <SavedField
                    label="Final Polished Article"
                    value={step.outputs.finalArticle || ''}
                    placeholder="The polished article will appear here automatically..."
                    onChange={(value) => onChange({ ...step.outputs, finalArticle: value })}
                    isTextarea={true}
                    height="h-64"
                  />
                  
                  <MarkdownPreview 
                    content={step.outputs.finalArticle}
                    className="mt-4"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};