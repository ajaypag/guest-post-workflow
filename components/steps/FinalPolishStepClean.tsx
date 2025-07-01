'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
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

  // Get the SEO-optimized article from Step 5, fallback to original draft if not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  // Fallback to original draft if SEO version not available
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = seoOptimizedArticle || originalArticle;
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '';

  // Build the kickoff prompt
  const kickoffPrompt = `Okay, here's my article.

${fullArticle}

Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates.`;

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

  return (
    <div className="space-y-6">
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
                  Start a completely new chat in the same workspace for brand alignment review:
                </p>
                <a href="https://chatgpt.com/g/g-p-685ece4776fc8191963c943f9aed9d36-outreachlabs-guest-posts/project?model=o3" 
                   target="_blank" 
                   className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  OutreachLabs Guest Posts Project (o3) <ExternalLink className="w-4 h-4 ml-2 text-white" />
                </a>
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">
                      Polish complete! Article is ready for formatting, QA, and link insertion.
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