'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink } from 'lucide-react';

interface ContentAuditStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ContentAuditStep = ({ step, workflow, onChange }: ContentAuditStepProps) => {
  // Get the article from the previous step
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const fullArticle = articleDraftStep?.outputs?.fullArticle || '';
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';
  const researchOutlineStep = workflow.steps.find(s => s.id === 'deep-research');
  const outlineContent = researchOutlineStep?.outputs?.outlineContent || '';
  const outlineShareLink = researchOutlineStep?.outputs?.outlineShareLink || '';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 5: Audit & SEO-Tighten the Draft</h3>
        <p className="text-sm mb-2">
          <strong>Create a NEW CHAT</strong> in the same workspace based on your OpenAI account:
        </p>
        <div className="space-y-2 mt-2">
          <a href="https://chatgpt.com/g/g-p-685ece4776fc8191963c943f9aed9d36-outreachlabs-guest-posts/project?model=o3" 
             target="_blank" 
             className="text-blue-600 hover:underline inline-flex items-center font-medium text-sm">
            <span className="mr-2">→</span> info@onlyoutreach.com <ExternalLink className="w-3 h-3 ml-1" />
          </a>
          <a href="https://chatgpt.com/g/g-p-68658030ad0881919f08923d7958b566-outreach-labs-guest-posting/project?model=o3" 
             target="_blank" 
             className="text-blue-600 hover:underline inline-flex items-center font-medium text-sm">
            <span className="mr-2">→</span> ajay@pitchpanda.com <ExternalLink className="w-3 h-3 ml-1" />
          </a>
          <a href="https://chatgpt.com/g/g-p-6863fd37b78481919da9926011ab939d-outreach-labs-guest-posts/project?model=o3" 
             target="_blank" 
             className="text-blue-600 hover:underline inline-flex items-center font-medium text-sm">
            <span className="mr-2">→</span> ajay@linkio.com <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-md">
        <h4 className="font-semibold mb-2">Audit Prompt #1: First Section</h4>
        <p className="text-sm mb-2">Copy and paste EXACTLY:</p>
        <div className="bg-white p-3 rounded border border-purple-200 text-xs font-mono overflow-x-auto">
          <p>This is an article that you wrote for me:</p>
          <div className="mt-2 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
            {fullArticle ? (
              <div className="text-xs text-gray-700 whitespace-pre-wrap">
                {fullArticle.substring(0, 500)}{fullArticle.length > 500 ? '...' : ''}
              </div>
            ) : (
              <div className="text-red-600 text-xs">⚠️ No article found from Step 4. Please complete the article draft first.</div>
            )}
          </div>
          <p className="mt-2">If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss. For full reference, this was the original deep research data and outline that might be useful as you edit.</p>
          <div className="mt-2 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
            {outlineContent ? (
              <div className="text-xs text-gray-700 whitespace-pre-wrap">{outlineContent}</div>
            ) : (
              <div className="text-gray-500 text-xs">Research outline content will appear here from Step 3</div>
            )}
          </div>
          <p className="mt-2">Now I realize this is a lot, so i want your first output to only be an audit of the first section. the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection.</p>
        </div>
        
        {fullArticle && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-green-800">✅ Ready to Copy Full Prompt:</p>
              <CopyButton 
                text={`This is an article that you wrote for me:

${fullArticle}

If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss. For full reference, this was the original deep research data and outline that might be useful as you edit.

Original research outline and findings:
${outlineContent || '(Complete Step 3: Deep Research first to get outline content)'}

Now I realize this is a lot, so i want your first output to only be an audit of the first section. the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection.`}
                label="Copy Full Prompt"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Google Doc Tab 2 Created?</label>
        <select
          value={step.outputs.tab2Created || ''}
          onChange={(e) => onChange({ ...step.outputs, tab2Created: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="yes">Yes - Tab 2 created for audit results</option>
          <option value="no">Not yet</option>
        </select>
        {googleDocUrl && (
          <p className="text-xs text-blue-600 mt-1">
            <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              → Open Google Doc <ExternalLink className="w-3 h-3 inline ml-1" />
            </a>
          </p>
        )}
      </div>

      <div className="bg-purple-50 p-4 rounded-md">
        <h4 className="font-semibold mb-2">Looping Audit Prompt #2: Subsequent Sections</h4>
        <p className="text-sm mb-2">Use this EXACT text for each subsequent section:</p>
        <div className="bg-white p-3 rounded border border-purple-200 text-xs font-mono overflow-x-auto relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text={'Okay, now I want you to proceed your audit with the next section. As a reminder, the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection. In my paste, the formatting for headers did not translate to add those back in logically. While auditing, keep in mind we are creating a "primarily narrative" article so bull points can appear but only sporadically. Note, we will rarely include citations within the article. Only a max are 3 in total are allowed. you can reference the citation without a link though. keep in mind variability too. if this is your 3rd+ section that your editing, maybe you are repeating your editing pattern too much. for example, if you used bullets in your last output, maybe don\'t in this output'}
              label="Copy"
            />
          </div>
          <p>Okay, now I want you to proceed your audit with the next section. As a reminder, the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection. In my paste, the formatting for headers did not translate to add those back in logically. While auditing, keep in mind we are creating a "primarily narrative" article so bull points can appear but only sporadically. Note, we will rarely include citations within the article. Only a max are 3 in total are allowed. you can reference the citation without a link though. keep in mind variability too. if this is your 3rd+ section that your editing, maybe you are repeating your editing pattern too much. for example, if you used bullets in your last output, maybe don't in this output</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Audit Progress</label>
        <select
          value={step.outputs.auditProgress || ''}
          onChange={(e) => onChange({ ...step.outputs, auditProgress: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select progress...</option>
          <option value="25">25% - First few sections</option>
          <option value="50">50% - Halfway through</option>
          <option value="75">75% - Almost done</option>
          <option value="100">100% - All sections audited</option>
        </select>
      </div>

      <SavedField
        label="SEO Score"
        value={step.outputs.seoScore || ''}
        placeholder="Post-audit SEO score"
        onChange={(value) => onChange({ ...step.outputs, seoScore: value })}
      />

      <SavedField
        label="Audit Notes"
        value={step.outputs.auditNotes || ''}
        placeholder="Key issues found, major changes made"
        onChange={(value) => onChange({ ...step.outputs, auditNotes: value })}
        isTextarea={true}
        height="h-24"
      />

      <div className="bg-green-50 p-3 rounded-md mt-4">
        <h4 className="font-semibold mb-2">📝 SEO-Optimized Article</h4>
        <p className="text-sm text-gray-600 mb-2">
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
    </div>
  );
};