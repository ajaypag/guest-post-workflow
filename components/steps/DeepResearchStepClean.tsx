'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink, ChevronDown, ChevronRight, FileText, CheckCircle, AlertCircle, Target, ExternalLinkIcon } from 'lucide-react';

interface DeepResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DeepResearchStepClean = ({ step, workflow, onChange }: DeepResearchStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'research': true,
    'results': false
  });

  // Get the deep research prompt from Step 2j
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const outlinePrompt = topicGenerationStep?.outputs?.outlinePrompt || '';
  
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

              {/* Prompt from Step 2j */}
              {outlinePrompt ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
                  <div className="absolute top-3 right-3">
                    <CopyButton 
                      text={outlinePrompt}
                      label="Copy Prompt"
                    />
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">Deep Research Prompt (from Step 2j):</h4>
                  <div className="p-3 bg-gray-50 border rounded-lg text-sm max-h-32 overflow-y-auto pr-16 font-mono">
                    {outlinePrompt}
                  </div>
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
    </div>
  );
};