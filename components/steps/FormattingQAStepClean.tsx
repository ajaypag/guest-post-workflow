'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { TutorialVideo } from '../ui/TutorialVideo';
import { AgenticFormattingChecker } from '../ui/AgenticFormattingChecker';
import { ExternalLink, CheckSquare, Bot } from 'lucide-react';

interface FormattingQAStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const FormattingQAStepClean = ({ step, workflow, onChange }: FormattingQAStepProps) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'agentic'>('manual');
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';

  const handleAgenticComplete = (qaReport: any) => {
    // Only update if the session ID has changed to prevent loops
    if (qaReport.sessionId && qaReport.sessionId !== step.outputs?.lastQASessionId) {
      // Save the QA report results
      onChange({
        ...step.outputs,
        agenticQACompleted: true,
        agenticQAReport: qaReport,
        lastQASessionId: qaReport.sessionId
      });
    }
  };

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/90796a8df0d74e36bbd9dfb536121f86?t=175&sid=0fe90d42-f1ca-455f-b97c-bd119f8773fb"
        title="Formatting & QA Tutorial"
        description="Learn how to format and quality-check your guest post before submission"
        timestamp="2:55"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 7: Formatting & Quality Assurance</h3>
        <p className="text-sm mb-2">
          Ensure your article meets all formatting standards and quality requirements. 
          {googleDocUrl && (
            <> Work with the final article in your{' '}
              <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                Google Doc <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </>
          )}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Manual Checklist
        </button>
        <button
          onClick={() => setActiveTab('agentic')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'agentic'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bot className="w-4 h-4 mr-2" />
          AI QA Checker
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'manual' ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-semibold mb-2">Formatting Checklist</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={step.outputs.headerHierarchy || false}
                    onChange={(e) => onChange({ ...step.outputs, headerHierarchy: e.target.checked })}
                    className="mr-2"
                  />
                  Header hierarchy correct (H2s and H3s use Google Docs heading styles, not plain bold)
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={step.outputs.lineBreaks || false}
                    onChange={(e) => onChange({ ...step.outputs, lineBreaks: e.target.checked })}
                    className="mr-2"
                  />
                  No orphan line breaks (exactly one blank line between paragraphs)
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={step.outputs.allHeaders || false}
                    onChange={(e) => onChange({ ...step.outputs, allHeaders: e.target.checked })}
                    className="mr-2"
                  />
                  All expected headers exist (Intro, body sections, FAQ intro, Conclusion)
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={step.outputs.listStyling || false}
                    onChange={(e) => onChange({ ...step.outputs, listStyling: e.target.checked })}
                    className="mr-2"
                  />
                  Consistent list styling (bullets/numbers don't change mid-section)
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={step.outputs.randomBolding || false}
                    onChange={(e) => onChange({ ...step.outputs, randomBolding: e.target.checked })}
                    className="mr-2"
                  />
                  Random bolding removed (only purposeful bold remains)
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={step.outputs.faqFormatting || false}
                    onChange={(e) => onChange({ ...step.outputs, faqFormatting: e.target.checked })}
                    className="mr-2"
                  />
                  FAQ formatting clean (questions bold sentence-case, answers plain text)
                </label>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-md">
              <h4 className="font-semibold mb-2">Citation Requirements</h4>
              <p className="text-sm mb-2">
                <strong>Single citation near the top:</strong> One "[citation]" or "[1]" marker in intro/first section only
              </p>
              <p className="text-sm font-semibold text-red-700">
                REMOVE source UTM parameter of chatgpt from any URLs
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Citation Status</label>
              <select
                value={step.outputs.citationStatus || ''}
                onChange={(e) => onChange({ ...step.outputs, citationStatus: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select status...</option>
                <option value="added">Single citation added near top</option>
                <option value="removed-extras">Extra citations removed</option>
                <option value="utm-cleaned">UTM parameters cleaned</option>
                <option value="completed">All citation work complete</option>
              </select>
            </div>

            <SavedField
              label="QA Issues Found"
              value={step.outputs.qaIssues || ''}
              placeholder="List any formatting issues found and fixed"
              onChange={(value) => onChange({ ...step.outputs, qaIssues: value })}
              isTextarea={true}
              height="h-24"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">AI-Powered QA Check</h4>
              <p className="text-sm text-purple-800">
                Let AI automatically check your article against all formatting standards and quality requirements. 
                The AI will analyze header hierarchy, paragraph spacing, section completeness, citation placement, 
                and more.
              </p>
            </div>

            <AgenticFormattingChecker
              workflowId={workflow.id}
              onComplete={handleAgenticComplete}
            />

            {step.outputs.agenticQACompleted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckSquare className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      AI QA Check Completed
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Results saved. Review any issues found above and make necessary corrections.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};