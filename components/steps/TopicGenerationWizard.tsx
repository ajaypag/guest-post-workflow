'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { KeywordPreferencesSelector } from '../ui/KeywordPreferencesSelector';
import { generatePromptEnhancement, getWorkflowKeywordPreferences, setWorkflowKeywordPreferences, getClientKeywordPreferences, KeywordPreferences } from '@/types/keywordPreferences';
import { 
  ExternalLink, CheckCircle, Upload, Target, Lightbulb, 
  ArrowRight, ArrowLeft, FileText, Settings, Link, Sparkles 
} from 'lucide-react';
import { clientStorage } from '@/lib/userStorage';

interface TopicGenerationWizardProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
  onWorkflowChange?: (workflow: GuestPostWorkflow) => void;
}

export const TopicGenerationWizard = ({ step, workflow, onChange, onWorkflowChange }: TopicGenerationWizardProps) => {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [client, setClient] = useState<any>(null);
  const clientId = workflow.metadata?.clientId;
  
  // Load client data
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return;
      try {
        const clientData = await clientStorage.getClient(clientId);
        setClient(clientData);
      } catch (error) {
        console.error('Error loading client:', error);
      }
    };
    loadClient();
  }, [clientId]);

  // Get effective keyword preferences
  const getEffectiveKeywordPreferences = () => {
    const workflowPrefs = getWorkflowKeywordPreferences(workflow);
    const clientPrefs = getClientKeywordPreferences(client);
    return workflowPrefs || clientPrefs || null;
  };

  const keywordPreferences = getEffectiveKeywordPreferences();

  // Get data from previous steps
  const keywordResearchStep = workflow.steps.find(s => s.id === 'keyword-research');
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || 'Guest post website from Step 1';
  const urlSummaries = keywordResearchStep?.outputs?.urlSummaries || 'List of your target urls + summary';

  // Phase completion checks
  const isPhase1Complete = () => {
    return step.outputs.csvUploaded && keywordPreferences && step.outputs.clientTargetUrl;
  };

  const isPhase2Complete = () => {
    return step.outputs.finalKeywordList;
  };

  const isPhase3Complete = () => {
    return step.outputs.finalKeyword && step.outputs.postTitle;
  };

  // Handle keyword preference changes
  const handleKeywordPreferencesChange = (preferences: KeywordPreferences) => {
    if (onWorkflowChange) {
      const updatedWorkflow = setWorkflowKeywordPreferences(workflow, preferences);
      onWorkflowChange(updatedWorkflow);
    }
  };

  // Build unified GPT template
  const buildUnifiedGPTTemplate = () => {
    const basePrompt = `Guest post site: ${guestPostSite}

${urlSummaries}

ANALYSIS REQUEST:
1. First, analyze the CSV file I'm attaching (Ahrefs keyword data from this site)
2. Find 10 keywords that meet ALL three criteria:
   • Relevant to the guest post site (site has topical authority)
   • Relevant to my client URL: ${step.outputs.clientTargetUrl || '[Your client URL]'}
   • Have search volume (10-50 searches/month target range)
3. For each keyword, provide justification using data from the CSV
4. Output a final master list (one keyword per line) for easy copy-paste

VOLUME ANALYSIS:
After providing initial suggestions, I'll give you volume data. Then refine your recommendations based on actual search volumes and suggest the best main keyword.

FINAL DELIVERABLES:
• Keyword recommendations with volume justification
• Guest post title suggestion
• Content angle recommendation`;

    // Add keyword preferences enhancement if configured
    if (keywordPreferences) {
      const targetUrl = step.outputs.clientTargetUrl;
      return basePrompt + generatePromptEnhancement(keywordPreferences, targetUrl);
    }
    return basePrompt;
  };

  // Extract keywords from GPT response
  const extractKeywords = (text: string) => {
    if (!text) return [];
    const lines = text.split('\n').filter(line => line.trim());
    return lines.slice(0, 10); // Take first 10 non-empty lines
  };

  const keywords = extractKeywords(step.outputs.finalKeywordList || '');

  const PhaseHeader = ({ phase, title, isActive, isComplete }: any) => (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
      isActive ? 'border-blue-500 bg-blue-50' : 
      isComplete ? 'border-green-500 bg-green-50' : 
      'border-gray-200 bg-gray-50'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        isComplete ? 'bg-green-500 text-white' :
        isActive ? 'bg-blue-500 text-white' :
        'bg-gray-300 text-gray-600'
      }`}>
        {isComplete ? <CheckCircle className="w-5 h-5" /> : phase}
      </div>
      <span className={`font-medium ${
        isActive ? 'text-blue-900' :
        isComplete ? 'text-green-900' :
        'text-gray-600'
      }`}>
        {title}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Topic Generation Wizard</h2>
        <p className="text-gray-600 mb-6">
          Let's find the perfect guest post topic in 3 simple phases. We'll prepare your research, work with AI, then finalize your topic.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <PhaseHeader 
            phase={1} 
            title="Prepare Research" 
            isActive={currentPhase === 1} 
            isComplete={isPhase1Complete()} 
          />
          <PhaseHeader 
            phase={2} 
            title="Work with AI" 
            isActive={currentPhase === 2} 
            isComplete={isPhase2Complete()} 
          />
          <PhaseHeader 
            phase={3} 
            title="Finalize Topic" 
            isActive={currentPhase === 3} 
            isComplete={isPhase3Complete()} 
          />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${
                isPhase3Complete() ? 100 :
                isPhase2Complete() ? 75 :
                isPhase1Complete() ? 50 :
                currentPhase === 2 ? 35 :
                25
              }%` 
            }}
          />
        </div>
      </div>

      {/* Phase 1: Prepare Research */}
      {currentPhase === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Target className="w-6 h-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-semibold">Phase 1: Prepare Your Research</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Ready to find the perfect topic? Let's gather what we need first.
          </p>

          <div className="space-y-6">
            {/* CSV Upload Confirmation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Research Data from Step 2b
                </h4>
                {step.outputs.csvUploaded && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Do you have the Ahrefs CSV file from keyword research? You'll need this for ChatGPT.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onChange({ ...step.outputs, csvUploaded: true })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    step.outputs.csvUploaded 
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {step.outputs.csvUploaded ? '✓ Ready' : 'I have the CSV file'}
                </button>
                {!step.outputs.csvUploaded && (
                  <span className="text-sm text-gray-500">
                    or <a href="/workflow" className="text-blue-600 underline">go back to Step 2b</a>
                  </span>
                )}
              </div>
            </div>

            {/* Topic Preferences */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium flex items-center mb-3">
                <Settings className="w-5 h-5 mr-2" />
                Topic Focus Preferences
              </h4>
              
              {/* Show preference source */}
              {(() => {
                const workflowPrefs = getWorkflowKeywordPreferences(workflow);
                const clientPrefs = getClientKeywordPreferences(client);
                
                if (workflowPrefs) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                      <p className="text-xs text-blue-700">
                        🔧 Using custom preferences for this workflow
                      </p>
                    </div>
                  );
                } else if (clientPrefs) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
                      <p className="text-xs text-green-700">
                        👤 Using {workflow.clientName}'s default preferences
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {onWorkflowChange ? (
                <div className="space-y-3">
                  <KeywordPreferencesSelector
                    preferences={getWorkflowKeywordPreferences(workflow) || undefined}
                    onChange={handleKeywordPreferencesChange}
                    compact={true}
                  />
                  
                  {getWorkflowKeywordPreferences(workflow) && (
                    <button
                      onClick={() => {
                        if (onWorkflowChange) {
                          const clearedWorkflow = { ...workflow };
                          if (clearedWorkflow.metadata) {
                            delete (clearedWorkflow.metadata as any).keywordPreferences;
                          }
                          onWorkflowChange(clearedWorkflow);
                        }
                      }}
                      className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Use Client Default
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">
                  Preferences can be configured when editing this workflow.
                </p>
              )}

              {!keywordPreferences && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
                  <p className="text-sm text-amber-700">
                    💡 No preferences set. Configure in <a href={`/clients/${clientId}`} target="_blank" className="underline">client settings</a> first.
                  </p>
                </div>
              )}
            </div>

            {/* Client Link Planning */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium flex items-center mb-3">
                <Link className="w-5 h-5 mr-2" />
                Client Link Planning
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Which client page do you want to link to in this guest post?
              </p>
              
              <div className="space-y-3">
                <SavedField
                  label="Client URL to link to"
                  value={step.outputs.clientTargetUrl || ''}
                  placeholder="https://client.com/specific-page"
                  onChange={(value) => onChange({ ...step.outputs, clientTargetUrl: value })}
                />
                
                <SavedField
                  label="Desired anchor text (optional)"
                  value={step.outputs.desiredAnchorText || ''}
                  placeholder="Leave blank to get AI suggestions later"
                  onChange={(value) => onChange({ ...step.outputs, desiredAnchorText: value })}
                />
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setCurrentPhase(2)}
              disabled={!isPhase1Complete()}
              className={`flex items-center px-6 py-3 rounded-lg font-medium ${
                isPhase1Complete()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to AI Analysis
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Phase 2: Work with AI */}
      {currentPhase === 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Sparkles className="w-6 h-6 text-purple-500 mr-3" />
            <h3 className="text-lg font-semibold">Phase 2: Work with AI</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Now let's get ChatGPT to analyze your data and suggest perfect keywords.
          </p>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-3">📋 Simple 3-Step Process:</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">1</span>
                  <span>Copy the template below</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">2</span>
                  <span>Open ChatGPT and paste it + attach your CSV file</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">3</span>
                  <span>Come back and paste the final keyword list</span>
                </div>
              </div>
            </div>

            {/* Unified Template */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h4 className="font-medium">🤖 Complete ChatGPT Template</h4>
                <CopyButton 
                  text={buildUnifiedGPTTemplate()}
                  label="Copy Template"
                />
              </div>
              <div className="p-4">
                <div className="font-mono text-sm bg-gray-50 border rounded p-3 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{buildUnifiedGPTTemplate()}</pre>
                </div>
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800">
                    🚨 CRITICAL: You MUST attach your CSV file from Step 2b when sending this to ChatGPT
                  </p>
                </div>
              </div>
            </div>

            {/* ChatGPT Link */}
            <div className="text-center">
              <a 
                href="https://chatgpt.com/g/g-685eb5acbec48191b817e13ecae859cf-guest-post-topic-machine-for-any-client?model=o3" 
                target="_blank" 
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Open ChatGPT Topic Machine
                <ExternalLink className="w-5 h-5 ml-2" />
              </a>
            </div>

            {/* Results Collection */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">📥 Paste ChatGPT's Final Results</h4>
              <p className="text-sm text-gray-600 mb-3">
                After ChatGPT gives you the final keyword recommendations and title suggestion, paste the complete response here:
              </p>
              
              <SavedField
                label="Final keyword recommendations from ChatGPT"
                value={step.outputs.finalKeywordList || ''}
                placeholder="Paste the complete ChatGPT response with keyword recommendations, title suggestion, and analysis..."
                onChange={(value) => onChange({ ...step.outputs, finalKeywordList: value })}
                isTextarea={true}
                height="h-32"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentPhase(1)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Prepare
            </button>
            <button
              onClick={() => setCurrentPhase(3)}
              disabled={!isPhase2Complete()}
              className={`flex items-center px-6 py-3 rounded-lg font-medium ${
                isPhase2Complete()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Finalize Topic
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: Finalize Topic */}
      {currentPhase === 3 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            <h3 className="text-lg font-semibold">Phase 3: Finalize Your Topic</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Perfect! Now let's select your final keyword and confirm your guest post details.
          </p>

          <div className="space-y-6">
            {/* AI Response Preview */}
            {step.outputs.finalKeywordList && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✨ ChatGPT Analysis</h4>
                <div className="bg-white border rounded p-3 max-h-32 overflow-y-auto">
                  <div className="text-sm text-green-800 whitespace-pre-wrap">
                    {step.outputs.finalKeywordList.substring(0, 300)}
                    {step.outputs.finalKeywordList.length > 300 && '...'}
                  </div>
                </div>
              </div>
            )}

            {/* Keyword Selection */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">🎯 Choose Your Final Keyword</h4>
              
              {keywords.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Select the keyword you want to target:</p>
                  {keywords.slice(0, 8).map((keyword, index) => (
                    <label key={index} className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="finalKeyword"
                        value={keyword.trim()}
                        checked={step.outputs.finalKeyword === keyword.trim()}
                        onChange={(e) => onChange({ ...step.outputs, finalKeyword: e.target.value })}
                        className="mr-3"
                      />
                      <span className="text-sm">{keyword.trim()}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <SavedField
                  label="Final target keyword"
                  value={step.outputs.finalKeyword || ''}
                  placeholder="Enter your chosen keyword"
                  onChange={(value) => onChange({ ...step.outputs, finalKeyword: value })}
                />
              )}
            </div>

            {/* Title and Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SavedField
                label="Guest post title"
                value={step.outputs.postTitle || ''}
                placeholder="Title suggested by ChatGPT"
                onChange={(value) => onChange({ ...step.outputs, postTitle: value })}
              />
              
              <SavedField
                label="Search volume (if known)"
                value={step.outputs.keywordVolume || ''}
                placeholder="e.g., 25/month"
                onChange={(value) => onChange({ ...step.outputs, keywordVolume: value })}
              />
            </div>

            {/* Summary Card */}
            {step.outputs.finalKeyword && step.outputs.postTitle && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">📋 Topic Summary</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Client:</strong> {workflow.clientName}</div>
                  <div><strong>Guest Post Site:</strong> {guestPostSite}</div>
                  <div><strong>Target Keyword:</strong> {step.outputs.finalKeyword}</div>
                  <div><strong>Post Title:</strong> {step.outputs.postTitle}</div>
                  <div><strong>Client Link:</strong> {step.outputs.clientTargetUrl}</div>
                  {step.outputs.desiredAnchorText && (
                    <div><strong>Anchor Text:</strong> {step.outputs.desiredAnchorText}</div>
                  )}
                </div>
                
                <div className="mt-4">
                  <CopyButton 
                    text={`GUEST POST TOPIC SUMMARY

Client: ${workflow.clientName}
Guest Post Site: ${guestPostSite}
Target Keyword: ${step.outputs.finalKeyword}
Post Title: ${step.outputs.postTitle}
Client Link: ${step.outputs.clientTargetUrl}
${step.outputs.desiredAnchorText ? `Anchor Text: ${step.outputs.desiredAnchorText}` : ''}

Ready for deep research phase!`}
                    label="Copy Summary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentPhase(2)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to AI Analysis
            </button>
            {isPhase3Complete() && (
              <div className="flex items-center text-green-600 font-medium">
                <CheckCircle className="w-5 h-5 mr-2" />
                Topic Generation Complete!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};