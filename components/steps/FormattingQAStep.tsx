'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { ExternalLink } from 'lucide-react';

interface FormattingQAStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const FormattingQAStep = ({ step, workflow, onChange }: FormattingQAStepProps) => {
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 7: Manual Formatting & Single-Citation QA</h3>
        <p className="text-sm mb-2">
          Give the "Final Draft" {googleDocUrl ? (
            <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
              Google Doc <ExternalLink className="w-3 h-3 inline ml-1" />
            </a>
          ) : (
            <span className="font-semibold">Google Doc</span>
          )} one last sweep for formatting and ensure exactly one citation near the top.
        </p>
      </div>

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
  );
};