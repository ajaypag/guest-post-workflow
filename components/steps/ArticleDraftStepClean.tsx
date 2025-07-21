'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ChatInterface } from '../ui/ChatInterface';
import { AgenticArticleGeneratorV2 } from '../ui/AgenticArticleGeneratorV2';
import { SplitPromptButton } from '../ui/SplitPromptButton';
import { MarkdownPreview } from '../ui/MarkdownPreview';
import { ExternalLink, ChevronDown, ChevronRight, FileText, CheckCircle, AlertCircle, Target, RefreshCw, BookOpen } from 'lucide-react';

interface ArticleDraftStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
  onAgentStateChange?: (agentRunning: boolean) => void;
  onUnsavedContentChange?: (hasUnsavedContent: boolean) => void;
}

export const ArticleDraftStepClean = ({ step, workflow, onChange, onAgentStateChange, onUnsavedContentChange }: ArticleDraftStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'planning': true,
    'setup': false,
    'writing': false,
    'final': false
  });

  // Tab system state
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'builtin' | 'agenticV2'>('agenticV2');

  // Chat state management for builtin
  const [conversation, setConversation] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHeight, setChatHeight] = useState(600);
  const [prefilledInput, setPrefilledInput] = useState('');

  // Track if an AI agent is running
  const [agentRunning, setAgentRunning] = useState(false);

  // Get the outline content from the Deep Research step
  const deepResearchStep = workflow.steps.find(s => s.id === 'deep-research');
  const outlineContent = deepResearchStep?.outputs?.outlineContent || '';
  
  // Prompt constants to prevent JSX rendering issues
  const titleIntroPrompt = "Yes, remember we're going to be creating this article section by section. And the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use \"we\" and \"you\" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like \"might\" or \"could.\" Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points. Start with the title and introduction. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Avoid using Em-dashes. the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.";

  const loopingPrompt = "Proceed to the next section. Remember, the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use \"we\" and \"you\" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like \"might\" or \"could.\" Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Also be sure to reference my original prompt that contains the article information that should feed your context. I've already done the research and given it to you there - so that's what you need to reference each time. Avoid using Em-dashes. If it's the section that is the \\\"meat\\\" of the article, you must further break your output down into subsections and only output the first subsection so as not to over simplify each component. Note: defining what a subsection means is important. We're not doing sub-subsections, so if the section of the article is already apparently a subsection, then that entire section should be included in your output even if there are apparently sub-subsections within. Note 2: the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.";

  // Build the complete prompt with outline content
  const planningPrompt = `Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing.After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking a 3 citations only  and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.

${outlineContent || '((((Complete Step 3: Deep Research first to get outline content))))'}`;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle tab switching with warnings
  const handleTabSwitch = (newTab: 'chatgpt' | 'builtin' | 'agenticV2') => {
    // Don't switch if same tab
    if (newTab === activeTab) return;

    // Check if agent is running
    if (agentRunning) {
      const message = `An AI agent is currently generating content in the ${activeTab} tab. Switching tabs will stop the generation. Continue?`;
      if (!window.confirm(message)) {
        return;
      }
    }

    // No need to check for unsaved content - auto-save handles it

    // Clear any running agent state
    setAgentRunning(false);
    
    // Switch tab
    setActiveTab(newTab);
  };

  // Status indicators
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'planning':
        return outlineContent ? 
          (step.outputs.planningStatus === 'completed' ? 'completed' : 'ready') : 'pending';
      case 'setup':
        return step.outputs.googleDocUrl ? 'completed' : 
               (step.outputs.planningStatus === 'completed' ? 'ready' : 'pending');
      case 'writing':
        return step.outputs.draftStatus === 'completed' ? 'completed' :
               (step.outputs.googleDocUrl ? 'ready' : 'pending');
      case 'final':
        return step.outputs.fullArticle ? 'completed' : 
               (step.outputs.draftStatus === 'completed' ? 'ready' : 'pending');
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
            input: message, // Use the exact message (which could be planningPrompt, titleIntroPrompt, etc.)
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
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/0f7db8ced4574c4abfc62d84b16c424c?t=152&sid=774f1471-0f47-4edb-8191-9369cfba89ec"
        title="Article Draft Tutorial"
        description="Learn how to write compelling guest post articles using GPT-o3 Advanced Reasoning"
        timestamp="2:32"
      />

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabSwitch('agenticV2')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'agenticV2'
                ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧠 AI Agent V2
          </button>
          <button
            onClick={() => handleTabSwitch('chatgpt')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'chatgpt'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ChatGPT.com
          </button>
          <button
            onClick={() => handleTabSwitch('builtin')}
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
              {/* Original workflow content will be moved here */}
              
              {/* Planning Phase */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('planning')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <StatusIcon status={getStepStatus('planning')} />
                    <div className="ml-3 text-left">
                      <h3 className="font-medium text-gray-900">Planning Phase</h3>
                      <p className="text-sm text-gray-500">Initialize GPT-o3 with research data and plan the article structure</p>
                    </div>
                  </div>
                  {expandedSections['planning'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                {expandedSections['planning'] && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-4">
                      {/* GPT Project Link */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Open OutreachLabs Guest Posts Project</h4>
                        <p className="text-sm text-blue-800 mb-3">
                          Select the GPT project link based on which OpenAI account you're logged into:
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
                        <p className="text-xs text-blue-700 mt-2 italic">Note: Click the link that matches your current OpenAI login</p>
                      </div>

                      {/* Dependency check */}
                      {outlineContent ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <p className="text-sm text-green-800">Research outline automatically included from Step 3</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                            <p className="text-sm text-yellow-800">Complete Step 3 (Deep Research) first to get outline content</p>
                          </div>
                        </div>
                      )}

                      {/* Planning prompt */}
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Prompt #1: Planning Phase</h4>
                        <p className="text-sm text-gray-600 mb-3">Copy and paste this complete prompt:</p>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
                          <div className="absolute top-3 right-3">
                            <CopyButton 
                              text={planningPrompt}
                              label="Copy"
                            />
                          </div>
                          <div className="font-mono text-sm pr-16">
                            <p className="mb-3">Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing.After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking a 3 citations only  and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.</p>
                            <div className="p-3 bg-gray-50 border rounded-lg max-h-32 overflow-y-auto">
                              {outlineContent ? (
                                <p className="whitespace-pre-wrap text-xs">{outlineContent}</p>
                              ) : (
                                <p className="text-gray-500 italic text-xs">((((Complete Step 3: Deep Research first to get outline content))))</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Planning status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Planning Complete?</label>
                        <select
                          value={step.outputs.planningStatus || ''}
                          onChange={(e) => onChange({ ...step.outputs, planningStatus: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select status...</option>
                          <option value="completed">Planning phase completed</option>
                          <option value="in-progress">Still in planning</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Setup Google Doc */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('setup')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <StatusIcon status={getStepStatus('setup')} />
                    <div className="ml-3 text-left">
                      <h3 className="font-medium text-gray-900">Setup Article Document</h3>
                      <p className="text-sm text-gray-500">Create Google Doc for building the article section by section</p>
                    </div>
                  </div>
                  {expandedSections['setup'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                {expandedSections['setup'] && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-800 mb-2">📄 Create a Google Doc for Your Article</h4>
                        <ol className="text-sm text-yellow-700 space-y-1">
                          <li>1. <a href="https://docs.new" target="_blank" className="text-blue-600 hover:underline font-medium">Click here to create a new Google Doc</a></li>
                          <li>2. Click "Share" → Change to "Anyone with the link can view"</li>
                          <li>3. Copy the URL and paste it below</li>
                        </ol>
                        <p className="text-sm mt-3 text-yellow-800">
                          <strong>Purpose:</strong> As GPT outputs each section of the article, you'll paste them into this Google Doc to build the complete article.
                        </p>
                      </div>

                      <SavedField
                        label="Google Doc URL"
                        value={step.outputs.googleDocUrl || ''}
                        placeholder="https://docs.google.com/document/d/... (make sure it's shareable)"
                        onChange={(value) => onChange({ ...step.outputs, googleDocUrl: value })}
                      />

                      {step.outputs.googleDocUrl && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <p className="text-sm text-green-800">
                              Google Doc ready! You can now proceed to the writing phase.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Writing Process */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('writing')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <StatusIcon status={getStepStatus('writing')} />
                    <div className="ml-3 text-left">
                      <h3 className="font-medium text-gray-900">Section-by-Section Writing</h3>
                      <p className="text-sm text-gray-500">Use structured prompts to generate article content</p>
                    </div>
                  </div>
                  {expandedSections['writing'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                {expandedSections['writing'] && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-4">
                      {/* Title + Introduction prompt */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">Prompt #2: Title + Introduction</h4>
                        <p className="text-sm text-green-700 mb-3">Reply with this EXACT text:</p>
                        <div className="bg-white border border-green-300 rounded-lg p-3 relative">
                          <div className="absolute top-2 right-2">
                            <CopyButton 
                              text={titleIntroPrompt}
                              label="Copy"
                            />
                          </div>
                          <p className="font-mono text-xs pr-16">
                            {titleIntroPrompt}
                          </p>
                        </div>
                      </div>

                      {/* Looping prompt */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">Looping Prompt: For Every Subsequent Section</h4>
                        <p className="text-sm text-blue-700 mb-3">Reply with this UNCHANGED each time:</p>
                        <div className="bg-white border border-blue-300 rounded-lg p-3 relative">
                          <div className="absolute top-2 right-2">
                            <CopyButton 
                              text={loopingPrompt}
                              label="Copy"
                            />
                          </div>
                          <p className="font-mono text-xs pr-16">
                            {loopingPrompt}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-blue-800 mt-3">Repeat until o3 signals the article is complete</p>
                      </div>

                      {/* Draft status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Draft Status</label>
                        <select
                          value={step.outputs.draftStatus || ''}
                          onChange={(e) => onChange({ ...step.outputs, draftStatus: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select status...</option>
                          <option value="in-progress">Still drafting sections</option>
                          <option value="completed">All sections complete</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Article Capture */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('final')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <StatusIcon status={getStepStatus('final')} />
                    <div className="ml-3 text-left">
                      <h3 className="font-medium text-gray-900">Capture Final Article</h3>
                      <p className="text-sm text-gray-500">Save the complete article for subsequent optimization steps</p>
                    </div>
                  </div>
                  {expandedSections['final'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                {expandedSections['final'] && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Article Completion</h4>
                        <p className="text-sm text-blue-800">
                          Copy the complete article from your Google Doc and paste it below. This will be used in subsequent steps for auditing and optimization.
                        </p>
                      </div>

                      <SavedField
                        label="Word Count"
                        value={step.outputs.wordCount || ''}
                        placeholder="Final word count"
                        onChange={(value) => onChange({ ...step.outputs, wordCount: value })}
                      />

                      <SavedField
                        label="Full Article Text"
                        value={step.outputs.fullArticle || ''}
                        placeholder="Paste the complete article text here from your Google Doc. This will be used in subsequent steps for auditing and optimization."
                        onChange={(value) => onChange({ ...step.outputs, fullArticle: value })}
                        isTextarea={true}
                        height="h-64"
                      />

                      <SavedField
                        label="Draft Notes (Optional)"
                        value={step.outputs.draftNotes || ''}
                        placeholder="Any notes about the drafting process"
                        onChange={(value) => onChange({ ...step.outputs, draftNotes: value })}
                        isTextarea={true}
                        height="h-24"
                      />

                      {step.outputs.fullArticle && (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                              <p className="text-sm text-green-800">
                                Article captured! Ready for semantic SEO optimization and further refinement.
                              </p>
                            </div>
                          </div>
                          
                          <MarkdownPreview 
                            content={step.outputs.fullArticle}
                            className="mt-4"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'agenticV2' ? (
            <div className="space-y-6">
              {/* V2 Agentic Article Generator */}
              <AgenticArticleGeneratorV2
                  workflowId={workflow.id}
                  outline={outlineContent}
                  onComplete={(article) => {
                    console.log('🎉 V2 Article generation complete, updating state...');
                    console.log('📝 Article length:', article.length);
                    console.log('🔄 Calling onChange with new article data...');
                    onChange({ 
                      ...step.outputs, 
                      fullArticle: article,
                      agentGenerated: true,
                      agentVersion: 'v2',
                      draftStatus: 'completed'
                    });
                    console.log('✅ onChange called, article should now display');
                  }}
                  onGeneratingStateChange={(isGenerating) => {
                    setAgentRunning(isGenerating);
                    onAgentStateChange?.(isGenerating);
                  }}
                />

              {/* Generated Article Display */}
              {step.outputs.fullArticle && step.outputs.agentGenerated && step.outputs.agentVersion === 'v2' && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Generated Article (V2)</h3>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                      AI V2 Generated
                    </span>
                  </div>
                  
                  <SavedField
                    label="Final Article"
                    value={step.outputs.fullArticle || ''}
                    placeholder="Generated article will appear here"
                    onChange={(value) => onChange({ ...step.outputs, fullArticle: value })}
                    isTextarea
                    height="h-96"
                  />
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                      Word count: {step.outputs.fullArticle.split(/\s+/).filter(Boolean).length}
                    </span>
                    <CopyButton 
                      text={step.outputs.fullArticle} 
                      label="Copy Article"
                    />
                  </div>
                  
                  <MarkdownPreview 
                    content={step.outputs.fullArticle}
                    className="mt-4"
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'builtin' ? (
            <div className="space-y-6">
              {/* Built-in Chat Interface with Workflow */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Interactive Article Writing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use the same prompts and workflow as ChatGPT.com, but with an integrated chat interface. Click buttons to send prompts or edit them first.
                </p>

                {/* Workflow Section 1: Planning */}
                <div className="mb-6 bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <StatusIcon status={getStepStatus('planning')} />
                    <span className="ml-2">Step 1: Planning Phase</span>
                  </h4>
                  
                  {outlineContent ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        <p className="text-sm text-green-800">Research outline automatically included</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                        <p className="text-sm text-yellow-800">Complete Step 3 (Deep Research) first</p>
                      </div>
                    </div>
                  )}

                  <SplitPromptButton
                    onSend={() => {
                      handleSendMessage(planningPrompt);
                      // Automatically mark planning as completed when clicked
                      onChange({ ...step.outputs, planningStatus: 'completed' });
                    }}
                    onEdit={() => setPrefilledInput(planningPrompt)}
                    disabled={!outlineContent}
                    className="w-full"
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm text-gray-800">Planning Prompt</div>
                      <div className="text-xs text-gray-600 mt-1">Initialize with research data and plan structure</div>
                    </div>
                  </SplitPromptButton>
                </div>

                {/* Workflow Section 2: Title & Introduction */}
                <div className="mb-6 bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <StatusIcon status={getStepStatus('writing')} />
                    <span className="ml-2">Step 2: Title & Introduction</span>
                  </h4>
                  
                  <SplitPromptButton
                    onSend={() => {
                      handleSendMessage(titleIntroPrompt);
                      // Mark draft as in-progress after using title/intro prompt
                      onChange({ ...step.outputs, draftStatus: 'in-progress' });
                    }}
                    onEdit={() => setPrefilledInput(titleIntroPrompt)}
                    disabled={step.outputs.planningStatus !== 'completed'}
                    className="w-full"
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm text-gray-800">Title & Introduction Prompt</div>
                      <div className="text-xs text-gray-600 mt-1">Start writing with title and introduction section</div>
                    </div>
                  </SplitPromptButton>
                </div>

                {/* Workflow Section 3: Looping Sections */}
                <div className="mb-6 bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <StatusIcon status={getStepStatus('writing')} />
                    <span className="ml-2">Step 3: Continue Each Section</span>
                  </h4>
                  
                  <SplitPromptButton
                    onSend={() => handleSendMessage(loopingPrompt)}
                    onEdit={() => setPrefilledInput(loopingPrompt)}
                    disabled={step.outputs.draftStatus !== 'in-progress'}
                    className="w-full"
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm text-gray-800">Next Section Prompt</div>
                      <div className="text-xs text-gray-600 mt-1">Use this prompt for each subsequent section</div>
                    </div>
                  </SplitPromptButton>
                  
                  <p className="text-xs text-blue-600 mt-2 italic">
                    💡 Repeat this prompt until the article is complete
                  </p>
                </div>

                {/* Chat Interface */}
                <div className="bg-white rounded-lg border">
                  <div className="border-b p-3">
                    <h4 className="font-medium text-gray-800">Chat Interface</h4>
                    <p className="text-sm text-gray-600">Click buttons above to send prompts, or type your own messages</p>
                  </div>
                  
                  <ChatInterface
                    conversation={conversation}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    height={chatHeight}
                    onHeightChange={setChatHeight}
                    prefilledInput={prefilledInput}
                    onPrefilledInputChange={setPrefilledInput}
                  />
                </div>

                {/* Status Tracking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Planning Status</label>
                    <select
                      value={step.outputs.planningStatus || ''}
                      onChange={(e) => onChange({ ...step.outputs, planningStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Not started</option>
                      <option value="completed">Planning completed</option>
                      <option value="in-progress">In progress</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Draft Status</label>
                    <select
                      value={step.outputs.draftStatus || ''}
                      onChange={(e) => onChange({ ...step.outputs, draftStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Not started</option>
                      <option value="in-progress">Writing sections</option>
                      <option value="completed">Article completed</option>
                    </select>
                  </div>
                </div>

                {/* Article Output */}
                <div className="mt-6">
                  <SavedField
                    label="Full Article Text"
                    value={step.outputs.fullArticle || ''}
                    placeholder="Copy and paste your completed article here from the chat above. This will be used in subsequent workflow steps."
                    onChange={(value) => onChange({ ...step.outputs, fullArticle: value })}
                    isTextarea={true}
                    height="h-64"
                  />
                  
                  {step.outputs.fullArticle && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3 mb-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <p className="text-sm text-green-800">
                            Article saved! Ready for content audit and optimization steps.
                          </p>
                        </div>
                      </div>
                      
                      <MarkdownPreview 
                        content={step.outputs.fullArticle}
                        className="mt-4"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};