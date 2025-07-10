'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
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

  // Build the full audit prompt
  const fullAuditPrompt = `This is an article that you wrote for me:

${fullArticle}

If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss. For full reference, this was the original deep research data and outline that might be useful as you edit.

Original research outline and findings:
${outlineContent || '(Complete Step 3: Deep Research first to get outline content)'}

Now I realize this is a lot, so i want your first output to only be an audit of the first section. the format i want is to show the strengths, weaknesses, and the updated section that has your full fixes. start with the first section if cases where a section has many subsections, output just the subsection.`;

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

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/ec2612d683f746b7899048e32bcdd599"
        title="Semantic SEO Optimization Tutorial"
        description="Learn how to audit and optimize your guest post content for better SEO performance"
      />
      
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
  );
};