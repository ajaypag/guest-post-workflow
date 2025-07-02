'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink } from 'lucide-react';

interface FinalPolishStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const FinalPolishStep = ({ step, workflow, onChange }: FinalPolishStepProps) => {
  // Get the SEO-optimized article from Step 5, fallback to original draft if not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  // Fallback to original draft if SEO version not available
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = seoOptimizedArticle || originalArticle;
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 6: Polish & Finalize the Draft</h3>
        <p className="text-sm mb-2">
          Open a <strong>FRESH CHAT</strong> in the same workspace based on your OpenAI account:
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

      <div className="bg-orange-50 p-4 rounded-md">
        <h4 className="font-semibold mb-2">Kick-off Prompt: First Section Edit</h4>
        {seoOptimizedArticle ? (
          <div className="bg-green-100 border border-green-300 rounded p-2 mb-2">
            <p className="text-sm text-green-800">✅ Using SEO-optimized article from Step 5</p>
          </div>
        ) : originalArticle ? (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-2">
            <p className="text-sm text-yellow-800">⚠️ Using original draft from Step 4 (complete Step 5 for SEO-optimized version)</p>
          </div>
        ) : null}
        <p className="text-sm mb-2">Paste this UNCHANGED:</p>
        <div className="bg-white p-3 rounded border border-orange-200 text-xs font-mono overflow-x-auto">
          <p>Okay, here's my article.</p>
          <div className="mt-2 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
            {fullArticle ? (
              <div className="text-xs text-gray-700 whitespace-pre-wrap">
                {fullArticle.substring(0, 500)}{fullArticle.length > 500 ? '...' : ''}
              </div>
            ) : (
              <div className="text-red-600 text-xs">⚠️ Complete Step 5 (Semantic SEO) first to get the optimized article</div>
            )}
          </div>
          <p className="mt-2">Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates.</p>
        </div>
        
        {fullArticle && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-green-800">✅ Ready to Copy Full Prompt:</p>
              <CopyButton 
                text={`Okay, here's my article.

${fullArticle}

Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates.`}
                label="Copy Full Prompt"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-red-50 p-4 rounded-md border-2 border-red-300">
        <h4 className="font-semibold mb-2 text-red-800">🔄 CRITICAL: Two-Prompt Loop Pattern</h4>
        <p className="text-sm mb-2 font-semibold text-red-700">
          You MUST alternate between these two prompts for EVERY section:
        </p>
        <div className="bg-white p-3 rounded border border-red-200 mb-3">
          <p className="text-sm font-semibold mb-2">Loop Order:</p>
          <ol className="text-sm space-y-1 ml-4">
            <li>1. <strong>Proceed Prompt</strong> → Get section edit</li>
            <li>2. <strong>Cleanup Prompt</strong> → Refine the edit</li>
            <li>3. Copy cleaned section to Tab 3</li>
            <li>4. Repeat steps 1-3 for next section</li>
          </ol>
        </div>
        <p className="text-sm font-semibold text-red-700">
          ⚠️ Never paste the "Strengths | Weaknesses | Updated" version. Always run Cleanup first!
        </p>
      </div>

      <div className="bg-green-50 p-4 rounded-md">
        <h4 className="font-semibold mb-2">🟢 STEP 1: Proceed Prompt (Get Next Section)</h4>
        <p className="text-sm mb-2">Use this UNCHANGED for each section:</p>
        <div className="bg-white p-3 rounded border border-green-200 text-xs font-mono overflow-x-auto relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text="Okay that is good. Now, proceed to the next section. Re-review my project files for my brand guide and the Semantic SEO writing tips. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates. Be sure to reference the conclusions you made during your thinking process when writing the updating article. Don't use em-dashes. The updated section output should be ready to copy-paste back into my article."
              label="Copy"
            />
          </div>
          <p>Okay that is good. Now, proceed to the next section. Re-review my project files for my brand guide and the Semantic SEO writing tips. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates. Be sure to reference the conclusions you made during your thinking process when writing the updating article. Don't use em-dashes. The updated section output should be ready to copy-paste back into my article.</p>
        </div>
        <p className="text-sm mt-2 italic">→ This gives you: Strengths | Weaknesses | Updated Section</p>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-semibold mb-2">🔵 STEP 2: Cleanup Prompt (Refine Section)</h4>
        <p className="text-sm mb-2">Immediately reply with this after EVERY section edit:</p>
        <div className="bg-white p-3 rounded border border-blue-200 text-xs font-mono overflow-x-auto relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text="Before you proceed to the next section, review your previous output. Compare it to the brand kit and the words to not use document. Based on that, make any potential updates"
              label="Copy"
            />
          </div>
          <p>Before you proceed to the next section, review your previous output. Compare it to the brand kit and the words to not use document. Based on that, make any potential updates</p>
        </div>
        <p className="text-sm mt-2 italic">→ This gives you: Cleaned Section (COPY THIS TO TAB 3)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Google Doc Tab 3 "Final Draft" Created?</label>
        <select
          value={step.outputs.tab3Created || ''}
          onChange={(e) => onChange({ ...step.outputs, tab3Created: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="yes">Yes - Tab 3 created for final draft</option>
          <option value="no">Not yet</option>
        </select>
        {fullArticle && (
          <div className="mt-2">
            {googleDocUrl ? (
              <p className="text-xs text-blue-600">
                <a href={googleDocUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  → Open Google Doc <ExternalLink className="w-3 h-3 inline ml-1" />
                </a>
              </p>
            ) : (
              <p className="text-xs text-orange-600">💡 Tip: Add Google Doc URL in Step 4 for easy access</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Polish Progress</label>
        <select
          value={step.outputs.polishProgress || ''}
          onChange={(e) => onChange({ ...step.outputs, polishProgress: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select progress...</option>
          <option value="25">25% - First few sections polished</option>
          <option value="50">50% - Halfway through</option>
          <option value="75">75% - Almost done</option>
          <option value="100">100% - All sections polished</option>
        </select>
      </div>

      <SavedField
        label="Brand Alignment Notes"
        value={step.outputs.brandNotes || ''}
        placeholder="Key brand adjustments made, voice improvements"
        onChange={(value) => onChange({ ...step.outputs, brandNotes: value })}
        isTextarea={true}
        height="h-24"
      />

      <div className="bg-green-50 p-3 rounded-md mt-4">
        <h4 className="font-semibold mb-2">📝 Final Polished Article</h4>
        <p className="text-sm text-gray-600 mb-2">
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
    </div>
  );
};