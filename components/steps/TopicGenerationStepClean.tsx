'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink, ChevronDown, ChevronRight, Target, FileText, CheckCircle, AlertCircle, Lightbulb, Search, LinkIcon } from 'lucide-react';

interface TopicGenerationStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const TopicGenerationStepClean = ({ step, workflow, onChange }: TopicGenerationStepProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    '2d': true,
    '2f-2g': false,
    '2h': false,
    '2i': false,
    '2j': false
  });

  const keywordResearchStep = workflow.steps.find(s => s.id === 'keyword-research');
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || 'Guest post website from Step 1';
  const urlSummaries = keywordResearchStep?.outputs?.urlSummaries || 'List of your target urls + summary';
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Status indicators for each sub-step
  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case '2d':
        return step.outputs.suggestedTopics ? 'completed' : 'pending';
      case '2f-2g':
        return (step.outputs.primaryKeyword && step.outputs.keywordVariations) ? 'completed' : 
               step.outputs.primaryKeyword ? 'ready' : 'pending';
      case '2h':
        return step.outputs.finalKeyword ? 'completed' : 
               step.outputs.keywordVariations ? 'ready' : 'pending';
      case '2i':
        return step.outputs.postTitle ? 'completed' : 
               step.outputs.finalKeyword ? 'ready' : 'pending';
      case '2j':
        return step.outputs.outlinePrompt ? 'completed' : 'pending';
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

  // Build summary for sharing with supervisors
  const buildTopicSummary = () => {
    const clientName = workflow.clientName || '[Client Name]';
    const clientUrl = workflow.clientUrl || '[Client URL]';
    const summary = `GUEST POST TOPIC SUMMARY

Client: ${clientName}
Client Website: ${clientUrl}
Guest Post Site: ${guestPostSite}

FINAL RESULTS:
- Final Keyword: ${step.outputs.finalKeyword || '[Not selected yet]'}
- Post Title: ${step.outputs.postTitle || '[Not created yet]'}
- Desired Anchor Text: ${step.outputs.desiredAnchorText || '[None specified]'}

RESEARCH PROCESS:
Primary Keyword: ${step.outputs.primaryKeyword || '[Not determined]'}
Keyword Variations: ${step.outputs.keywordVariations || '[Not generated]'}

TOPIC VALIDATION:
${step.outputs.suggestedTopics ? 'Initial topics generated and reviewed' : 'Topics not yet generated'}
${step.outputs.finalKeyword ? 'Keyword validated and confirmed' : 'Keyword validation pending'}
${step.outputs.postTitle ? 'Post title created and approved' : 'Post title creation pending'}

NEXT STEPS:
${step.outputs.outlinePrompt ? 'Ready for deep research phase' : 'Waiting for deep research prompt'}`;

    return summary;
  };

  return (
    <div className="space-y-6">

      {/* Step 2d: Generate Guest Post Topics */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2d')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2d')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2d: Generate Guest Post Topics</h3>
              <p className="text-sm text-gray-500">Use AI to find keywords that meet all three criteria</p>
            </div>
          </div>
          {expandedSections['2d'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2d'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              {/* Strategy explanation */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🎯 GPT Goal: Find keywords that meet 3 criteria</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Relevant to the guest post site</strong> (site has topical authority)</li>
                  <li>• <strong>Relevant to your client URL</strong> (natural linking opportunity)</li>
                  <li>• <strong>Have search volume</strong> (10-50 searches/month target range)</li>
                </ul>
              </div>

              {/* CSV requirement warning */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">⚠️ Important: You MUST attach the CSV file from Step 2b</h4>
                <p className="text-sm text-orange-700 mb-2">
                  This step requires the Ahrefs CSV file you exported in Step 2b. The GPT needs this data to:
                </p>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Understand what topics the guest post site has authority for</li>
                  <li>• Find overlapping topics between the site and your client</li>
                  <li>• Suggest topics with the best chance of ranking</li>
                </ul>
              </div>

              {/* Step-by-step process */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">📝 Step-by-Step Process:</h4>
                <div className="space-y-3">
                  {[
                    { step: 1, title: "Copy the template below", desc: "Use the \"Copy Template\" button to get the formatted prompt" },
                    { step: 2, title: "Open the Guest Post Topic Machine GPT", desc: "Click the link below to open the GPT in a new tab" },
                    { step: 3, title: "Paste the template into the GPT", desc: "Paste the copied template as your message" },
                    { step: 4, title: "CRITICAL: Attach your Ahrefs CSV file", desc: "Use the paperclip icon in ChatGPT to attach the CSV file you downloaded from Step 2b", critical: true },
                    { step: 5, title: "Send and wait for analysis", desc: "The GPT will process your data and suggest optimal topics" }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start space-x-3">
                      <span className={`${item.critical ? 'bg-red-600' : 'bg-blue-600'} text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0`}>
                        {item.step}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${item.critical ? 'text-red-700' : ''}`}>{item.title}</p>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
                <div className="absolute top-3 right-3">
                  <CopyButton 
                    text={`Guest post site: ${guestPostSite}\n\n${urlSummaries}`}
                    label="Copy Template"
                  />
                </div>
                <div className="font-mono text-sm pr-16">
                  <p>Guest post site: <span className="text-blue-700 font-semibold">{guestPostSite}</span></p>
                  <div className="mt-2">
                    {urlSummaries === 'List of your target urls + summary' ? (
                      <p className="text-gray-500 italic">List of your target urls + summary</p>
                    ) : (
                      <div className="p-2 bg-gray-50 border rounded text-xs max-h-24 overflow-y-auto">
                        {urlSummaries}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-red-600 font-semibold">[Attach CSV file from Step 2b]</p>
                </div>
              </div>

              {/* GPT link */}
              <div>
                <a href="https://chatgpt.com/g/g-685eb5acbec48191b817e13ecae859cf-guest-post-topic-machine-for-any-client?model=o3" 
                   target="_blank" 
                   className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Open Guest Post Topic Machine GPT <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>

              {/* Input field */}
              <SavedField
                label="Suggested Topics Output"
                value={step.outputs.suggestedTopics || ''}
                placeholder="Paste all topics suggested by GPT"
                onChange={(value) => onChange({ ...step.outputs, suggestedTopics: value })}
                isTextarea={true}
                height="h-32"
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 2f & 2g: Primary Keyword and Variations */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2f-2g')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2f-2g')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Steps 2f & 2g: Primary Keyword and Variations</h3>
              <p className="text-sm text-gray-500">Record the primary keyword and full list of variations</p>
            </div>
          </div>
          {expandedSections['2f-2g'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2f-2g'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Primary Focus & Variations</h4>
                <p className="text-sm text-blue-800">
                  Record the primary keyword that aligns with both the guest site's authority and your client's page content, plus all variations suggested by GPT.
                </p>
              </div>

              <SavedField
                label="Primary Keyword"
                value={step.outputs.primaryKeyword || ''}
                placeholder="The main keyword GPT suggested"
                onChange={(value) => onChange({ ...step.outputs, primaryKeyword: value })}
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">⏳ Don't update sheet yet</h4>
                <p className="text-sm text-yellow-700">
                  Wait until Step 2h validation before finalizing your keyword strategy.
                </p>
              </div>

              <SavedField
                label="Keyword Variations"
                value={step.outputs.keywordVariations || ''}
                placeholder="Full list of keyword variations from GPT (one per line for best results)"
                onChange={(value) => onChange({ ...step.outputs, keywordVariations: value })}
                isTextarea={true}
                height="h-24"
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 2h: Validate in Ahrefs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2h')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2h')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2h: Validate in Ahrefs</h3>
              <p className="text-sm text-gray-500">Check search volume and difficulty</p>
            </div>
          </div>
          {expandedSections['2h'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2h'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Validation Goal</h4>
                <p className="text-sm text-blue-800">
                  Use Ahrefs Keyword Explorer to check search volume and difficulty for the keywords GPT suggested.
                </p>
              </div>

              {/* Dynamic Ahrefs link */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {step.outputs.keywordVariations ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">📊 Check Your Keywords in Ahrefs:</p>
                      <a href={(() => {
                        // Convert keyword variations to comma-separated format for Ahrefs
                        const keywords = step.outputs.keywordVariations
                          .split('\n')
                          .filter((k: string) => k.trim())
                          .map((k: string) => k.trim())
                          .join(', ');
                        
                        return `https://app.ahrefs.com/keywords-explorer/google/us/overview?keyword=${encodeURIComponent(keywords)}`;
                      })()}
                         target="_blank"
                         className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                        Open Keywords in Ahrefs <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                      <p className="text-xs text-gray-600 mt-1">
                        Keywords from Step 2g automatically pre-filled
                      </p>
                    </div>
                    
                    <div className="text-xs text-gray-500 italic">
                      💡 Tip: Keywords should be entered one per line in Step 2g for best results
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium mb-2">📊 Open Ahrefs Keyword Explorer:</p>
                    <a href="https://app.ahrefs.com/keywords-explorer/google/us/overview"
                       target="_blank"
                       className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Open Ahrefs Keyword Explorer <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                    <p className="text-xs text-gray-600 mt-1">
                      Add keywords from Step 2g first for auto-filled link
                    </p>
                  </div>
                )}
              </div>

              {/* No volume fallback */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">❌ If keywords have no search volume:</h4>
                <p className="text-sm text-red-700 mb-2">Go back to the GPT and use this follow-up prompt:</p>
                
                <div className="bg-white border rounded-lg p-3 relative mt-2">
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text="these dont have any search volume. If you are a keyword research person and you were finding that your suggestions really just aren't having anything that has search volume, but you are tasked with finding something that has search volume, even if it's low (from 10 searches a month to 50 searches a month) based on everything you know about our target URL and everything you know about the niche of this site. What do you think would be some good potential keywords, long-tail keywords to target? Be sure to output your keywords in a list so it's easy to copy-paste into a volume checker."
                      label="Copy Follow-up"
                    />
                  </div>
                  <p className="text-xs text-gray-600 pr-16">
                    "these dont have any search volume. If you are a keyword research person and you were finding that your suggestions really just aren't having anything that has search volume, but you are tasked with finding something that has search volume, even if it's low (from 10 searches a month to 50 searches a month) based on everything you know about our target URL and everything you know about the niche of this site. What do you think would be some good potential keywords, long-tail keywords to target? Be sure to output your keywords in a list so it's easy to copy-paste into a volume checker."
                  </p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <SavedField
                  label="Final Validated Keyword"
                  value={step.outputs.finalKeyword || ''}
                  placeholder="Final keyword after Ahrefs validation"
                  onChange={(value) => onChange({ ...step.outputs, finalKeyword: value })}
                />

                <SavedField
                  label="Keyword Volume"
                  value={step.outputs.keywordVolume || ''}
                  placeholder="Monthly search volume"
                  onChange={(value) => onChange({ ...step.outputs, keywordVolume: value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2i: Return to GPT with Final Keyword */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2i')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2i')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2i: Return to GPT with Final Keyword</h3>
              <p className="text-sm text-gray-500">Get guest post title and angle</p>
            </div>
          </div>
          {expandedSections['2i'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2i'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Next GPT Interaction</h4>
                <p className="text-sm text-blue-800">
                  Go back to the Guest Post Topic Machine GPT and simply enter your final validated keyword. 
                  The GPT will automatically proceed with suggesting a guest post title and angle.
                </p>
              </div>

              <SavedField
                label="Guest Post Title"
                value={step.outputs.postTitle || ''}
                placeholder="Working title suggested by GPT"
                onChange={(value) => onChange({ ...step.outputs, postTitle: value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Client Link Planning */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center mb-2">
          <LinkIcon className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="font-medium text-purple-900">📎 Client Link Planning</h3>
        </div>
        <p className="text-sm text-purple-800 mb-4">
          Now that you have a topic, determine which client URL you want to link to and the desired anchor text. This will be used in the Client Link step later.
        </p>
        
        <div className="space-y-4">
          <SavedField
            label="Client Target URL"
            value={step.outputs.clientTargetUrl || ''}
            placeholder="The specific client URL you want to link to in this guest post"
            onChange={(value) => onChange({ ...step.outputs, clientTargetUrl: value })}
          />

          <SavedField
            label="Desired Anchor Text (Optional)"
            value={step.outputs.desiredAnchorText || ''}
            placeholder="Preferred anchor text for the client link (leave blank if you want help from the GPT later)"
            onChange={(value) => onChange({ ...step.outputs, desiredAnchorText: value })}
          />
        </div>
      </div>

      {/* Step 2j: Get Deep Research Prompt */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('2j')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <StatusIcon status={getStepStatus('2j')} />
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900">Step 2j: Get Deep Research Prompt</h3>
              <p className="text-sm text-gray-500">Obtain the research outline from GPT</p>
            </div>
          </div>
          {expandedSections['2j'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {expandedSections['2j'] && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Final GPT Interaction</h4>
                <p className="text-sm text-blue-800">
                  When GPT asks if you want a deep research outline, respond "Yes"
                </p>
              </div>

              <SavedField
                label="Deep Research Prompt"
                value={step.outputs.outlinePrompt || ''}
                placeholder="Copy the full prompt GPT provides for deep research"
                onChange={(value) => onChange({ ...step.outputs, outlinePrompt: value })}
                isTextarea={true}
                height="h-32"
              />
            </div>
          </div>
        )}
      </div>

      {/* Topic Summary for Sharing */}
      <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="font-medium text-green-900">Topic Summary</h3>
            </div>
            <CopyButton 
              text={buildTopicSummary()}
              label="Copy Summary"
            />
          </div>
          <p className="text-sm text-green-700 mt-1">
            Copy this summary to share your topic selection with supervisors or stakeholders
          </p>
        </div>
        
        <div className="px-6 py-4">
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
              {buildTopicSummary()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};