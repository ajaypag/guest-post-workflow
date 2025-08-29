'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { AgenticOutlineGenerator } from '../ui/AgenticOutlineGenerator';
import { AgenticOutlineGeneratorV2 } from '../ui/AgenticOutlineGeneratorV2';
import { ExternalLink, ChevronDown, ChevronRight, FileText, CheckCircle, AlertCircle, Target, ExternalLinkIcon, Bot, CheckSquare } from 'lucide-react';
import { OutlinePreferences, generateOutlineEnhancement } from '@/types/outlinePreferences';
import { getTargetUrlFromWorkflow, hasTargetPageId } from '@/lib/utils/workflowClientUtils';

interface DeepResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DeepResearchStepClean = ({ step, workflow, onChange }: DeepResearchStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'research': true,
    'results': false,
    'preferences': false
  });
  const [activeTab, setActiveTab] = useState<'manual' | 'agentic'>('manual');
  const [researchPreferences, setResearchPreferences] = useState<OutlinePreferences | null>(null);
  const [applyPreferences, setApplyPreferences] = useState<boolean>(false);
  const [intelligence, setIntelligence] = useState<string>('');
  const [intelligenceType, setIntelligenceType] = useState<'none' | 'brand' | 'target'>('none');

  // Get the deep research prompt from Step 2j
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const baseOutlinePrompt = topicGenerationStep?.outputs?.outlinePrompt || '';

  // Load client research preferences
  useEffect(() => {
    const loadClientPreferences = async () => {
      if (workflow.metadata?.clientId) {
        try {
          const response = await fetch(`/api/clients/${workflow.metadata.clientId}/outline-preferences`);
          if (response.ok) {
            const data = await response.json();
            // Show preferences even if not enabled, let user decide
            if (data.preferences) {
              setResearchPreferences(data.preferences);
              // Auto-check the checkbox if preferences exist
              setApplyPreferences(true);
            }
          }
        } catch (error) {
          console.error('Failed to load research preferences:', error);
        }
      }
    };

    loadClientPreferences();
  }, [workflow.metadata?.clientId]);

  // Load intelligence with proper hierarchy: Target Page > Brand > None
  useEffect(() => {
    const loadIntelligence = async () => {
      let intelligenceContent = '';
      let intelligenceType: 'none' | 'brand' | 'target' = 'none';
      
      // 1. First try to use targetPageId if workflow has it (more reliable)
      if ((workflow as any).targetPageId) {
        try {
          console.log('Using direct targetPageId for intelligence lookup:', (workflow as any).targetPageId);
          const intelligenceResponse = await fetch(`/api/target-pages/${(workflow as any).targetPageId}/intelligence/latest`);
          if (intelligenceResponse.ok) {
            const intelligenceData = await intelligenceResponse.json();
            if (intelligenceData.session?.finalBrief) {
              intelligenceContent = intelligenceData.session.finalBrief;
              intelligenceType = 'target';
            }
          }
        } catch (error) {
          console.error('Failed to load target page intelligence by ID:', error);
        }
      }
      
      // 2. Fallback to URL matching if no targetPageId or no intelligence found
      if (intelligenceType === 'none') {
        // Resolve target URL - use API if we have targetPageId, otherwise use legacy
        let clientTargetUrl: string | null = null;
        
        if (hasTargetPageId(workflow)) {
          // Call API to resolve from database
          try {
            const response = await fetch('/api/workflows/resolve-target-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workflow })
            });
            if (response.ok) {
              const { targetUrl } = await response.json();
              clientTargetUrl = targetUrl;
            }
          } catch (error) {
            console.error('Failed to resolve target URL:', error);
          }
        } else {
          // Use legacy client-side resolution
          clientTargetUrl = getTargetUrlFromWorkflow(workflow);
        }
        
        console.log('[DEEP RESEARCH] Resolved target URL:', clientTargetUrl);
        
        if (clientTargetUrl) {
          try {
            // Find target page by URL match
            const targetPageResponse = await fetch(`/api/target-pages/by-url?url=${encodeURIComponent(clientTargetUrl)}`);
            if (targetPageResponse.ok) {
              const targetPageData = await targetPageResponse.json();
              if (targetPageData.targetPage) {
                // Try to get intelligence for this target page
                const intelligenceResponse = await fetch(`/api/target-pages/${targetPageData.targetPage.id}/intelligence/latest`);
                if (intelligenceResponse.ok) {
                  const intelligenceData = await intelligenceResponse.json();
                  if (intelligenceData.session?.finalBrief) {
                    intelligenceContent = intelligenceData.session.finalBrief;
                    intelligenceType = 'target';
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to load target page intelligence by URL:', error);
          }
        }
      }
      
      // 2. Fall back to brand intelligence if no target URL intelligence
      if (!intelligenceContent && workflow.metadata?.clientId) {
        try {
          const brandResponse = await fetch(`/api/clients/${workflow.metadata.clientId}/brand-intelligence/latest`);
          if (brandResponse.ok) {
            const brandData = await brandResponse.json();
            if (brandData.session?.finalBrief) {
              intelligenceContent = brandData.session.finalBrief;
              intelligenceType = 'brand';
            }
          }
        } catch (error) {
          console.error('Failed to load brand intelligence:', error);
        }
      }
      
      setIntelligence(intelligenceContent);
      setIntelligenceType(intelligenceType);
    };

    loadIntelligence();
  }, [workflow.metadata?.clientId, workflow.metadata?.targetPageId, topicGenerationStep?.outputs?.clientTargetUrl]);

  // Generate enhanced prompt with preferences and intelligence
  const outlinePrompt = researchPreferences && applyPreferences 
    ? baseOutlinePrompt + generateOutlineEnhancement(
        researchPreferences, 
        workflow.metadata?.targetPageUrl,
        intelligence // Will use target URL intelligence if available, brand if not
      )
    : baseOutlinePrompt;
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Status indicators
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'research':
        return outlinePrompt ? 'ready' : 'pending';
      case 'results':
        return step.outputs.outlineContent ? 'completed' : 
               (step.outputs.researchStatus === 'in-progress' ? 'ready' : 'pending');
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

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/0f7db8ced4574c4abfc62d84b16c424c"
        title="Outline Creation Tutorial"
        description="Learn how to create detailed research outlines using GPT-o3 Deep Research"
      />
      
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <span>Manual Research</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('agentic')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'agentic'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>AI Agent (Use ChatGPT first - $$$)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'manual' ? (
        <>
          {/* Research Process */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('research')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('research')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Generate Research Outline</h3>
              <p className="text-sm text-gray-500">Use GPT-o3 Deep Research to create comprehensive outline</p>
            </div>
          </div>
          {expandedSections['research'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['research'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Goal */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🎯 Goal</h4>
                <p className="text-sm text-blue-800">
                  Generate comprehensive research outline using GPT-o3's Deep Research tool to create a detailed, well-researched outline for your guest post.
                </p>
              </div>

              {/* Step-by-step process */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">📝 Step-by-Step Process:</h4>
                <div className="space-y-3">
                  {[
                    { 
                      step: 1, 
                      title: "Open GPT-o3 with Deep Research", 
                      desc: "Click the link below to open ChatGPT with GPT-o3",
                      hasLink: true
                    },
                    { 
                      step: 2, 
                      title: "Activate Deep Research Tool", 
                      desc: "Click the \"Tools\" button and select \"Deep Research\"" 
                    },
                    { 
                      step: 3, 
                      title: "Copy and paste the research prompt from Step 2j", 
                      desc: "Use the prompt below (generated from your topic selection)" 
                    }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start space-x-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {item.step}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                        {item.hasLink && (
                          <a href="https://chatgpt.com/?model=o3" 
                             target="_blank" 
                             className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm mt-2">
                            Open ChatGPT with GPT-o3 <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* No Client Associated Message */}
              {!workflow.metadata?.clientId && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>No Client Associated:</strong> This workflow is not linked to a specific client, so research preferences are not available.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        To use research preferences, create workflows through a client's page or associate this workflow with a client.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Intelligence Integration Indicators */}
              {intelligenceType === 'target' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-900">
                    🎯 Using Target URL Intelligence for this specific page
                  </p>
                </div>
              )}

              {intelligenceType === 'brand' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900">
                    🏢 Using Brand Intelligence (no target URL brief available)
                  </p>
                </div>
              )}

              {intelligenceType === 'none' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700">
                    ℹ️ No intelligence available - using basic outline generation
                  </p>
                </div>
              )}

              {/* Client Research Preferences */}
              {researchPreferences && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="apply-preferences"
                        checked={applyPreferences}
                        onChange={(e) => setApplyPreferences(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="apply-preferences" className="ml-2 text-sm font-medium text-blue-900">
                        ☑️ Apply client research preferences
                      </label>
                    </div>
                    <button
                      onClick={() => toggleSection('preferences')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {expandedSections['preferences'] ? 'Hide' : 'Show'} preferences
                    </button>
                  </div>
                  
                  {expandedSections['preferences'] && (
                    <div className="space-y-3 pt-3 border-t border-blue-200">
                      {researchPreferences.excludeCompetitors?.some(c => c.trim()) && (
                        <div>
                          <p className="text-xs font-medium text-blue-800 mb-1">Will exclude these competitors:</p>
                          <div className="flex flex-wrap gap-2">
                            {researchPreferences.excludeCompetitors
                              .filter(c => c.trim())
                              .map((competitor, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  {competitor}
                                </span>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
                      {researchPreferences.customInstructions?.trim() && (
                        <div>
                          <p className="text-xs font-medium text-blue-800 mb-1">Additional research instructions:</p>
                          <div className="text-sm text-blue-900 bg-white p-2 rounded border">
                            {researchPreferences.customInstructions}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Prompt from Step 2j */}
              {baseOutlinePrompt ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
                  <div className="absolute top-3 right-3">
                    <CopyButton 
                      text={outlinePrompt}
                      label="Copy Prompt"
                    />
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">
                    Deep Research Prompt (from Step 2j{applyPreferences && researchPreferences ? ' + Research Preferences' : ''}):
                  </h4>
                  <div className="p-3 bg-gray-50 border rounded-lg text-sm max-h-32 overflow-y-auto pr-16 font-mono">
                    {outlinePrompt}
                  </div>
                  {applyPreferences && researchPreferences && (
                    <p className="text-xs text-gray-600 mt-2">
                      ✅ This prompt includes your client's research preferences
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Complete Step 2j in Topic Generation first to get your deep research prompt
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Research Results */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('results')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('results')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Capture Research Results</h3>
              <p className="text-sm text-gray-500">Save the complete outline and findings</p>
            </div>
          </div>
          {expandedSections['results'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['results'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">✅ After Research Completes:</h4>
                <ol className="text-sm text-green-700 space-y-1">
                  <li>1. Copy the complete research outline and findings</li>
                  <li>2. Paste it in the "Research Outline Content" field below</li>
                  <li>3. Get the share link for reference</li>
                </ol>
              </div>

              {/* Research Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Research Completion Status</label>
                <select
                  value={step.outputs.researchStatus || ''}
                  onChange={(e) => onChange({ ...step.outputs, researchStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select status...</option>
                  <option value="in-progress">Research in progress</option>
                  <option value="completed">Research completed</option>
                  <option value="issues">Had issues - needed retry</option>
                </select>
              </div>

              {/* Main content */}
              <SavedField
                label="Research Outline Content"
                value={step.outputs.outlineContent || ''}
                placeholder="Paste the complete research outline and findings from GPT-o3 Deep Research here. This content will be automatically used in later steps (Article Draft and SEO Optimization)."
                onChange={(value) => onChange({ ...step.outputs, outlineContent: value })}
                isTextarea={true}
                height="h-64"
              />

              {/* Share link */}
              <SavedField
                label="Research Outline Share Link (Optional)"
                value={step.outputs.outlineShareLink || ''}
                placeholder="https://chatgpt.com/share/... (for reference)"
                onChange={(value) => onChange({ ...step.outputs, outlineShareLink: value })}
              />

              {/* Additional notes */}
              <SavedField
                label="Research Notes (Optional)"
                value={step.outputs.researchNotes || ''}
                placeholder="Any additional notes, issues encountered, or key findings from the research"
                onChange={(value) => onChange({ ...step.outputs, researchNotes: value })}
                isTextarea={true}
                height="h-24"
              />

              {/* Completion indicator */}
              {step.outputs.outlineContent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">
                      Research outline captured! This content will be automatically used in the Article Draft step.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        </>
      ) : (
        /* AI Research Tab */
        <div className="space-y-6">
          <AgenticOutlineGeneratorV2 
            workflowId={workflow.id}
            onComplete={(outline) => {
              // Update the step outputs with the generated outline
              onChange({
                ...step.outputs,
                outlineContent: outline,
                researchStatus: 'completed',
                agenticGeneration: true
              });
            }}
          />
        </div>
      )}
    </div>
  );
};