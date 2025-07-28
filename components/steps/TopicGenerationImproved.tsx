'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { KeywordPreferencesSelector } from '../ui/KeywordPreferencesSelector';
import { generatePromptEnhancement, getWorkflowKeywordPreferences, setWorkflowKeywordPreferences, getClientKeywordPreferences, KeywordPreferences } from '@/types/keywordPreferences';
import { ExternalLink, ChevronDown, ChevronRight, Target, FileText, CheckCircle, AlertCircle, Lightbulb, Search, LinkIcon, Settings, ArrowRight, RefreshCw, Zap, Brain, BarChart3 } from 'lucide-react';
import { clientStorage } from '@/lib/userStorage';

interface TopicGenerationImprovedProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
  onWorkflowChange?: (workflow: GuestPostWorkflow) => void;
}

export const TopicGenerationImproved = ({ step, workflow, onChange, onWorkflowChange }: TopicGenerationImprovedProps) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'setup': true,
    'iteration': false,
    'selection': false,
    'finalization': false
  });
  
  // Branch selection for volume analysis
  const [volumeBranch, setVolumeBranch] = useState<'has-volume' | 'no-volume' | 'want-other' | null>(
    step.outputs.volumeBranch || null
  );
  
  // Load client data for client-level preferences
  const [client, setClient] = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const clientId = workflow.metadata?.clientId;
  
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId || loadingClient) return;
      
      setLoadingClient(true);
      try {
        const clientData = await clientStorage.getClient(clientId);
        setClient(clientData);
      } catch (error) {
        console.error('Error loading client:', error);
      } finally {
        setLoadingClient(false);
      }
    };

    loadClient();
  }, [clientId]);

  const keywordResearchStep = workflow.steps.find(s => s.id === 'keyword-research');
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const guestPostSite = domainSelectionStep?.outputs?.domain || 'Guest post website from Step 1';
  const urlSummaries = keywordResearchStep?.outputs?.urlSummaries || 'List of your target urls + summary';
  
  // Get selected target page URL from keyword research step
  const selectedTargetPageId = keywordResearchStep?.outputs?.selectedTargetPageId;
  const [selectedTargetPageUrl, setSelectedTargetPageUrl] = useState<string>('');
  
  // Load and auto-populate selected target page URL
  useEffect(() => {
    const loadTargetPageUrl = async () => {
      if (!selectedTargetPageId || !client) return;
      
      const targetPage = client.targetPages?.find((page: any) => page.id === selectedTargetPageId);
      if (targetPage && targetPage.url) {
        setSelectedTargetPageUrl(targetPage.url);
        
        // Auto-populate clientTargetUrl if it's empty
        if (!step.outputs.clientTargetUrl) {
          onChange({ ...step.outputs, clientTargetUrl: targetPage.url });
        }
      }
    };
    
    loadTargetPageUrl();
  }, [selectedTargetPageId, client, step.outputs.clientTargetUrl]);

  // Get effective keyword preferences: workflow overrides > client defaults > none
  const getEffectiveKeywordPreferences = () => {
    const workflowPrefs = getWorkflowKeywordPreferences(workflow);
    const clientPrefs = getClientKeywordPreferences(client);
    return workflowPrefs || clientPrefs || null;
  };
  
  const keywordPreferences = getEffectiveKeywordPreferences();
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle keyword preference changes (SAFE - stores in workflow metadata)
  const handleKeywordPreferencesChange = (preferences: KeywordPreferences) => {
    if (onWorkflowChange) {
      const updatedWorkflow = setWorkflowKeywordPreferences(workflow, preferences);
      onWorkflowChange(updatedWorkflow);
    }
  };

  // Workflow phase completion logic
  const getPhaseStatus = () => {
    const hasInitialKeywords = !!step.outputs.keywordVariations;
    const hasVolumeAnalysis = !!step.outputs.volumeAnalysis;
    const hasFinalKeyword = !!step.outputs.finalKeyword;
    const hasTitle = !!step.outputs.postTitle;
    const hasResearchPrompt = !!step.outputs.outlinePrompt;

    return {
      setup: true, // Always true after they see it
      iteration: hasInitialKeywords,
      selection: hasFinalKeyword,
      finalization: hasResearchPrompt
    };
  };

  const phaseStatus = getPhaseStatus();

  // Build enhanced research prompt with client link planning
  const buildEnhancedResearchPrompt = (rawPrompt: string) => {
    return buildEnhancedResearchPromptWithOutputs(rawPrompt, step.outputs);
  };

  const buildEnhancedResearchPromptWithOutputs = (rawPrompt: string, outputs: any) => {
    if (!rawPrompt) return '';
    
    const clientTargetUrl = outputs.clientTargetUrl || '';
    const desiredAnchorText = outputs.desiredAnchorText || '';
    
    let enhancement = '';
    if (clientTargetUrl) {
      enhancement = `\n\nCLIENT LINK REQUIREMENTS:
Although this article should not seem sponsored or like an advertorial in any way, this is content that we're writing on behalf of a client. Therefore, we do need to find a way to naturally mention the client's link within the article one time.

Target URL: ${clientTargetUrl}`;
      
      if (desiredAnchorText) {
        enhancement += `\nDesired Anchor Text: ${desiredAnchorText}`;
      }
      
      enhancement += `\n\nPlease ensure the research outline includes guidance on how to naturally incorporate this client link into the content without making it seem promotional. The link should appear after the introduction but within the first 1/3 of the article's outline.`;
    }
    
    return rawPrompt + enhancement;
  };

  // Phase header component
  const PhaseHeader = ({ phase, title, description, status, icon: Icon, isExpanded, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full px-6 py-4 flex items-center justify-between transition-all rounded-t-xl ${
        isExpanded ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
      } border-2 ${
        status === 'completed' ? 'border-green-200 bg-green-50' :
        status === 'active' ? 'border-blue-200 bg-blue-50' :
        'border-gray-200'
      }`}
    >
      <div className="flex items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
          status === 'completed' ? 'bg-green-500 text-white' :
          status === 'active' ? 'bg-blue-500 text-white' :
          'bg-gray-300 text-gray-600'
        }`}>
          {status === 'completed' ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
        </div>
        <div className="text-left">
          <h3 className={`font-semibold ${
            status === 'completed' ? 'text-green-900' :
            status === 'active' ? 'text-blue-900' :
            'text-gray-700'
          }`}>
            {title}
          </h3>
          <p className={`text-sm ${
            status === 'completed' ? 'text-green-700' :
            status === 'active' ? 'text-blue-700' :
            'text-gray-500'
          }`}>
            {description}
          </p>
        </div>
      </div>
      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>
  );

  // Workflow progress indicator
  const completedPhases = Object.values(phaseStatus).filter(Boolean).length;
  const progressPercentage = (completedPhases / 4) * 100;

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/31c7f383913d4dc5bae49935b31f88b5?t=214&sid=9a86bbe6-9c79-47cf-aa3a-f028e064d2fb"
        title="Topic Generation Tutorial"
        description="Learn how to generate compelling guest post topics using the Topic Machine GPT"
        timestamp="3:34"
      />

      {/* Workflow Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">🎯 AI-Powered Topic Generation</h2>
        <p className="text-gray-600 mb-4">
          This intelligent workflow combines AI analysis, real market data, and strategic planning to find topics that rank well and convert naturally.
        </p>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedPhases}/4 phases complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Quick Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'setup', label: 'Setup & Discovery', icon: Target },
            { key: 'iteration', label: 'AI Analysis', icon: Brain },
            { key: 'selection', label: 'Final Selection', icon: BarChart3 },
            { key: 'finalization', label: 'Research Ready', icon: FileText }
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className={`flex items-center p-3 rounded-lg border ${
              phaseStatus[key as keyof typeof phaseStatus] ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <Icon className={`w-4 h-4 mr-2 ${
                phaseStatus[key as keyof typeof phaseStatus] ? 'text-green-600' : 'text-gray-400'
              }`} />
              <span className={`text-xs font-medium ${
                phaseStatus[key as keyof typeof phaseStatus] ? 'text-green-800' : 'text-gray-600'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase 1: Setup & Discovery */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <PhaseHeader
          phase="1"
          title="Setup & Discovery"
          description="Configure preferences and prepare for AI analysis"
          status={phaseStatus.setup ? 'completed' : 'active'}
          icon={Target}
          isExpanded={expandedSections.setup}
          onClick={() => toggleSection('setup')}
        />

        {expandedSections.setup && (
          <div className="p-6 border-t border-gray-100">
            <div className="space-y-6">
              {/* Strategy Overview */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🎯 Our AI finds keywords that meet 3 criteria:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center text-sm text-blue-800">
                    <Target className="w-4 h-4 mr-2" />
                    <span>Relevant to <strong>{guestPostSite}</strong></span>
                  </div>
                  <div className="flex items-center text-sm text-blue-800">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    <span>Links naturally to your client</span>
                  </div>
                  <div className="flex items-center text-sm text-blue-800">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <span>Has search volume (10-50/month)</span>
                  </div>
                </div>
              </div>

              {/* Topic Preferences */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Settings className="w-5 h-5 text-purple-600 mr-2" />
                    <h4 className="font-medium text-purple-900">Topic Focus Preferences</h4>
                  </div>
                  {keywordPreferences && (
                    <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded">
                      Active: {keywordPreferences.primaryFocus.replace('-', ' ')}
                    </span>
                  )}
                </div>
                
                {/* Show preference source */}
                {(() => {
                  const workflowPrefs = getWorkflowKeywordPreferences(workflow);
                  const clientPrefs = getClientKeywordPreferences(client);
                  
                  if (workflowPrefs) {
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                        <p className="text-xs text-blue-700">
                          🔧 <strong>Workflow Override:</strong> Using custom topic preferences for this workflow
                        </p>
                      </div>
                    );
                  } else if (clientPrefs) {
                    return (
                      <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
                        <p className="text-xs text-green-700">
                          👤 <strong>Client Default:</strong> Using {workflow.clientName}'s default topic preferences
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <p className="text-sm text-purple-800 mb-4">
                  These preferences automatically enhance your AI prompts for better results.
                  {getClientKeywordPreferences(client) && !getWorkflowKeywordPreferences(workflow) && 
                    " (Currently using client defaults - configure below to override for this workflow.)"
                  }
                </p>
                
                {onWorkflowChange ? (
                  <div className="space-y-3">
                    <KeywordPreferencesSelector
                      preferences={keywordPreferences || undefined}
                      onChange={handleKeywordPreferencesChange}
                      compact={true}
                      isPreset={!!keywordPreferences}
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
                        className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Clear Override (Use Client Default)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 italic">
                    Topic preferences can be configured when editing this workflow.
                  </div>
                )}

                {!keywordPreferences && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
                    <p className="text-sm text-amber-700">
                      💡 <strong>No topic preferences set.</strong> Configure client defaults in <a href={`/clients/${clientId}`} target="_blank" className="underline">client settings</a> or set workflow-specific topic preferences above.
                    </p>
                  </div>
                )}
              </div>

              {/* CSV Requirement */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Required: CSV File from Step 2b
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  The AI needs the Ahrefs CSV file you exported in Step 2b to understand what topics {guestPostSite} has authority for.
                </p>
                <div className="bg-white border border-orange-300 rounded p-3">
                  <div className="text-sm font-medium text-orange-800 mb-1">What the AI does with your CSV:</div>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Analyzes {guestPostSite}'s topical authority</li>
                    <li>• Finds overlapping topics with your client</li>
                    <li>• Suggests topics with the best ranking potential</li>
                  </ul>
                </div>
              </div>

              {/* AI Template */}
              <div className="bg-white border border-gray-300 rounded-lg">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h4 className="font-medium flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-blue-600" />
                    AI Analysis Template
                  </h4>
                  <CopyButton 
                    text={(() => {
                      const basePrompt = `Guest post site: ${guestPostSite}\n\n${urlSummaries}\n\nFor each of your keyword suggestions and based on your topical cluster analysis of the target site provide justification each keyword in the sense that it has potential to rank. If the keyword doesn't make sense anymore after further review, that's okay too, remove it.\n\nA critical thing to note about keywords you suggest is you have to include the shortest version of the long tail so the likelihood of your suggestions having volume is higher. For example, best grc software for hr compliance will have no volume but hr grc software will have volume - both have the same meaning but one is the shorter version of the long tail.\n\nProper justification means you must take a keyword or list of keywords from the keywords rankings sheet that I provided you about the target site. And prove clear and direct overlap. Keep going until you find 10 justifiable keyword suggestions.\n\nAfter you generate your 10 justifiable keywords suggestions and their variations, output a final master list that lists everything in a long one per line list so I can copy paste elsewhere.`;
                      
                      if (keywordPreferences) {
                        const targetUrl = step.outputs.clientTargetUrl;
                        return basePrompt + generatePromptEnhancement(keywordPreferences, targetUrl);
                      }
                      return basePrompt;
                    })()}
                    label="Copy Template"
                  />
                </div>
                <div className="p-4">
                  <div className="font-mono text-sm bg-gray-50 border rounded p-3 max-h-64 overflow-y-auto">
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
                    <p className="mt-4 text-gray-700">For each of your keyword suggestions and based on your topical cluster analysis of the target site provide justification each keyword in the sense that it has potential to rank...</p>
                    <p className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <strong>💡 Important:</strong> A critical thing to note about keywords you suggest is you have to include the shortest version of the long tail so the likelihood of your suggestions having volume is higher. For example, "best grc software for hr compliance" will have no volume but "hr grc software" will have volume - both have the same meaning but one is the shorter version of the long tail.
                    </p>
                    
                    {keywordPreferences && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-800 mb-1">✨ Smart Keyword Guidance</p>
                        <p className="text-sm text-green-700">
                          {(() => {
                            const targetUrl = step.outputs.clientTargetUrl;
                            const enhancement = generatePromptEnhancement(keywordPreferences, targetUrl);
                            return enhancement.trim();
                          })()}
                        </p>
                      </div>
                    )}
                    
                    <p className="mt-4 text-red-600 font-semibold">[📎 Attach CSV file from Step 2b]</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <a href="https://chatgpt.com/g/g-685eb5acbec48191b817e13ecae859cf-guest-post-topic-machine-for-any-client?model=o3" 
                   target="_blank" 
                   className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <Brain className="w-5 h-5 mr-2" />
                  Open AI Topic Machine
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phase 2: Iterative AI Analysis */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <PhaseHeader
          phase="2"
          title="Step-by-Step Keyword Refinement"
          description="AI analysis → Volume check → Ranking analysis → Competitive check"
          status={phaseStatus.iteration ? 'completed' : phaseStatus.setup ? 'active' : 'pending'}
          icon={RefreshCw}
          isExpanded={expandedSections.iteration}
          onClick={() => toggleSection('iteration')}
        />

        {expandedSections.iteration && (
          <div className="p-6 border-t border-gray-100">
            <div className="space-y-6">
              {/* Process Overview */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Required Step-by-Step Process
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">1</span>
                    <div>
                      <p className="text-sm text-purple-800 font-medium">Get Initial Keywords</p>
                      <p className="text-xs text-purple-700">AI analyzes & suggests keywords</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">2</span>
                    <div>
                      <p className="text-sm text-purple-800 font-medium">Check Search Volume</p>
                      <p className="text-xs text-purple-700">Verify real search data in Ahrefs</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">3</span>
                    <div>
                      <p className="text-sm text-purple-800 font-medium">Ranking Likelihood</p>
                      <p className="text-xs text-purple-700">AI analyzes which keywords can rank</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">4</span>
                    <div>
                      <p className="text-sm text-purple-800 font-medium">Competition Check</p>
                      <p className="text-xs text-purple-700">Ensure keyword isn't too competitive</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1: Initial Keywords */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
                  Initial Keyword Analysis
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  After running the AI analysis template from Phase 1, paste the complete keyword list here (one keyword per line).
                </p>
                
                <SavedField
                  label="Keyword Variations from GPT"
                  value={step.outputs.keywordVariations || ''}
                  placeholder="Paste the complete list of keyword variations from GPT (one per line for best results)"
                  onChange={(value) => onChange({ ...step.outputs, keywordVariations: value })}
                  isTextarea={true}
                  height="h-32"
                />
              </div>

              {/* Step 2: Volume Analysis - Always Visible */}
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h4 className="font-medium mb-3 flex items-center text-orange-900">
                  <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">2</span>
                  Volume Analysis & AI Refinement
                </h4>
                <p className="text-sm text-orange-800 mb-4">
                  Check real search volumes and let the AI refine its recommendations based on actual market data.
                </p>

                {/* Quick copy of keywords if available */}
                {step.outputs.keywordVariations && (
                  <div className="bg-white border border-orange-300 rounded p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-orange-800">📋 Your Keywords for Volume Check:</p>
                      <CopyButton 
                        text={step.outputs.keywordVariations}
                        label="Copy Keywords"
                      />
                    </div>
                    <div className="bg-gray-50 border rounded p-2 max-h-24 overflow-y-auto">
                      <div className="text-xs text-orange-700 whitespace-pre-wrap font-mono">
                        {step.outputs.keywordVariations}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <a href="https://app.ahrefs.com/keywords-explorer"
                     target="_blank"
                     className="inline-flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Check Volumes in Ahrefs
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>

                  <div className="bg-white border border-orange-300 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-800 mb-1">📥 After volume check:</p>
                    <p className="text-xs text-orange-700">Select the appropriate option below</p>
                  </div>
                </div>

                {/* Branch Selection - Always Visible with Has Volume as Default */}
                <div className="bg-white border border-orange-300 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-orange-800 mb-3">What did you find in your volume check?</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setVolumeBranch('has-volume')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        volumeBranch === 'has-volume' || (!volumeBranch && step.outputs.keywordVariations)
                          ? 'border-orange-600 bg-orange-50 text-orange-800' 
                          : 'border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      <div className="font-medium mb-1">✅ Has Volume</div>
                      <div className="text-xs">Keywords have search volume</div>
                    </button>

                    <button
                      onClick={() => setVolumeBranch('no-volume')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        volumeBranch === 'no-volume' 
                          ? 'border-orange-600 bg-orange-50 text-orange-800' 
                          : 'border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      <div className="font-medium mb-1">❌ No Volume</div>
                      <div className="text-xs">Keywords have no volume</div>
                    </button>

                    <button
                      onClick={() => setVolumeBranch('want-other')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        volumeBranch === 'want-other' 
                          ? 'border-orange-600 bg-orange-50 text-orange-800' 
                          : 'border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      <div className="font-medium mb-1">🔄 Want Other</div>
                      <div className="text-xs">I want different keywords</div>
                    </button>
                  </div>
                </div>

                {/* Branch Content */}
                {volumeBranch === 'has-volume' && (
                    <>
                      {/* GPT refinement prompt - existing flow */}
                      <div className="bg-white border border-orange-300 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-orange-800">🤖 Volume Analysis Prompt for ChatGPT:</p>
                          <CopyButton 
                            text="Here is the volume data of the keywords you suggested. Based on this added data, paired with what you have access to already in terms of the client url target pages, what topics and rankings the target site has, and what keywords have longtail search volume, identify what a good main keyword could be. If none of the keywords have search volume, you are tasked with finding something that has search volume, even if it's low (from 10 searches a month to 50 searches a month) based on everything you know about our client url topics, the topical clusters the target site ranks for, the keywords that it already ranks for. What do you think would be some good potential keywords, long-tail keywords to target? Be sure to output your keywords in a list so it's easy to copy-paste into a volume checker."
                            label="Copy Prompt"
                          />
                        </div>
                        <div className="text-xs text-orange-700 bg-gray-50 border rounded p-2">
                          Upload your volume CSV + paste this prompt in the same ChatGPT conversation
                        </div>
                      </div>

                      <div className="mt-4">
                        <SavedField
                          label="Volume Based Keyword Choices and Analysis from AI"
                          value={step.outputs.volumeAnalysis || ''}
                          placeholder="Paste the AI's refined recommendations after providing volume data"
                          onChange={(value) => onChange({ ...step.outputs, volumeAnalysis: value })}
                          isTextarea={true}
                          height="h-32"
                        />
                      </div>
                    </>
                  )}

                  {volumeBranch === 'no-volume' && (
                    <>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-red-900 mb-3 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          No Search Volume Found
                        </h4>
                        <p className="text-sm text-red-800 mb-4">
                          The keywords don't have search volume. You need to request new keywords that meet all three criteria:
                        </p>
                        <ul className="text-sm text-red-700 space-y-1 ml-5 mb-4">
                          <li>• Have existing topical authority for the target site</li>
                          <li>• Have overlap and relevance to your client's target pages</li>
                          <li>• Have search volume (preferably long-tail keywords)</li>
                        </ul>
                        
                        <div className="bg-white border border-red-300 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-red-800">📝 Copy this prompt for ChatGPT:</p>
                            <CopyButton 
                              text="The keywords you provided have no search volume. Can you please try again? Keep in mind that I need to find keywords for topics that have existing topical authority to the target site, have overlap and relevance to my client's target pages, and have search volume. Preferably long-tail search volume."
                              label="Copy Prompt"
                            />
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono">
                            The keywords you provided have no search volume. Can you please try again? Keep in mind that I need to find keywords for topics that have existing topical authority to the target site, have overlap and relevance to my client's target pages, and have search volume. Preferably long-tail search volume.
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-blue-900 mb-2">🔄 Next Steps:</h4>
                        <ol className="text-sm text-blue-800 space-y-2">
                          <li>1. Copy the prompt above and paste it in your ChatGPT conversation</li>
                          <li>2. Wait for ChatGPT to generate new keyword suggestions</li>
                          <li>3. Copy the new keywords and check their volume in Ahrefs again</li>
                          <li>4. Return here and select the appropriate option:
                            <ul className="ml-4 mt-1 space-y-1 text-xs">
                              <li>• If keywords have volume → Select "Has Volume" tab</li>
                              <li>• If still no volume → Use this prompt again</li>
                              <li>• If you want different keywords → Select "Want Other" tab</li>
                            </ul>
                          </li>
                        </ol>
                      </div>
                      
                      <div className="mt-4">
                        <SavedField
                          label="New Keywords from AI (After Using No Volume Prompt)"
                          value={step.outputs.volumeAnalysis || ''}
                          placeholder="Paste the AI's new keyword suggestions here for reference"
                          onChange={(value) => onChange({ ...step.outputs, volumeAnalysis: value })}
                          isTextarea={true}
                          height="h-32"
                        />
                      </div>
                    </>
                  )}

                  {volumeBranch === 'want-other' && (
                    <>
                      <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
                        <p className="text-sm text-purple-800">
                          <strong>Want Other Keywords Flow:</strong> Instructions for this flow will be provided soon.
                        </p>
                        {/* Placeholder for want-other flow */}
                      </div>
                      
                      <div className="mt-4">
                        <SavedField
                          label="Volume Based Keyword Choices and Analysis from AI"
                          value={step.outputs.volumeAnalysis || ''}
                          placeholder="Paste the AI's alternative keyword recommendations"
                          onChange={(value) => onChange({ ...step.outputs, volumeAnalysis: value })}
                          isTextarea={true}
                          height="h-32"
                        />
                      </div>
                    </>
                  )}
                {/* End of branch content */}
              </div>

              {/* Step 3: Ranking Likelihood Analysis (Required) */}
              {(step.outputs.volumeAnalysis || volumeBranch) && (
                <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                  <h4 className="font-medium mb-3 flex items-center text-indigo-900">
                    <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">3</span>
                    Ranking Likelihood Analysis
                  </h4>
                  <p className="text-sm text-indigo-800 mb-4">
                    Evaluate which keywords have the best ranking potential based on the site's existing keyword authority and rankings.
                  </p>

                  <div className="bg-white border border-indigo-300 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-indigo-800">🎯 Ranking Likelihood Analysis Prompt:</p>
                      <CopyButton 
                        text="Okay for each of these finalists, review again the keyword rankings of the target site, identify which overlapping keyword rankings there are that share terms and give the average rankings of those terms and based on that, rank the topic most likely to rank if I were to publish an article about it. as part of your topic ranking, you also need to consider which one of these topics is most relevant or beneficial to the client if it ends up ranking. Clear keyword overlap: High, Clear topic overlap: Medium  . That combination of rankability and beneficiality is where the magic happens."
                        label="Copy Prompt"
                      />
                    </div>
                    <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-2">
                      <strong>Copy this prompt</strong> and send it in the same ChatGPT conversation to get ranking likelihood analysis that balances both rankability and client benefit.
                    </div>
                  </div>

                  <div className="mt-4">
                    <SavedField
                      label="Ranking Likelihood Analysis"
                      value={step.outputs.rankingAnalysis || ''}
                      placeholder="Paste the AI's ranking likelihood analysis here"
                      onChange={(value) => onChange({ ...step.outputs, rankingAnalysis: value })}
                      isTextarea={true}
                      height="h-32"
                    />
                  </div>

                  {step.outputs.rankingAnalysis && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Enhanced Decision Support:</strong> You now have both volume data and ranking likelihood analysis to make the best keyword choice.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Competitive Keyword Clarification */}
              {step.outputs.rankingAnalysis && (
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium mb-3 flex items-center text-purple-900">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">4</span>
                    Competition Check & Keyword Finalization
                  </h4>
                  <p className="text-sm text-purple-800 mb-4">
                    Final step to ensure your chosen keyword isn't too competitive and to finalize your selection.
                  </p>

                  {/* Keyword Selection Field */}
                  <div className="mb-4">
                    <SavedField
                      label="Selected Keyword from Analysis"
                      value={step.outputs.selectedKeyword || ''}
                      placeholder="Enter the keyword you're considering based on the ranking analysis"
                      onChange={(value) => onChange({ ...step.outputs, selectedKeyword: value })}
                    />
                  </div>

                  {step.outputs.selectedKeyword && (
                    <>
                      {/* Dynamic Clarification Prompt */}
                      <div className="bg-white border border-purple-300 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-purple-800">🔍 Competition Check Prompt:</p>
                          <CopyButton 
                            text={`The keyword "${step.outputs.selectedKeyword}" is good, but there's one more step before we can proceed. Can you check the SERP to see how competitive this keyword is? What we are looking for is to gauge if the majority of the rankings are from well-known, high-authority brands. If that's not the case, then this keyword on its own could be a good choice. However, if we're seeing lots of high authority brands, and you can surmise that this guest post site (${guestPostSite}) is not as authoritative in terms of authority, then we should modify the keyword to ensure it's targeting a niche that the guest post site already has authority in. Based on that analysis, just tell me that the keyword as is fine or the competition is high and some niche down keyword could be this. When you're thinking about that niche down keyword, ensure that it's still the shortest tail version of that long tail.`}
                            label="Copy Prompt"
                          />
                        </div>
                        <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
                          <strong>This prompt includes:</strong>
                          <ul className="mt-1 ml-4 space-y-1">
                            <li>• Your selected keyword: <strong>"{step.outputs.selectedKeyword}"</strong></li>
                            <li>• Guest post site: <strong>{guestPostSite}</strong></li>
                            <li>• Instructions for competitive analysis</li>
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4">
                        <SavedField
                          label="Competition Analysis & Final Keyword Decision"
                          value={step.outputs.competitionAnalysis || ''}
                          placeholder="Paste the AI's competition analysis and final keyword recommendation"
                          onChange={(value) => onChange({ ...step.outputs, competitionAnalysis: value })}
                          isTextarea={true}
                          height="h-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phase 3: Final Selection */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <PhaseHeader
          phase="3"
          title="Final Selection & Title"
          description="Choose target keyword and generate compelling title"
          status={phaseStatus.selection ? 'completed' : phaseStatus.iteration ? 'active' : 'pending'}
          icon={BarChart3}
          isExpanded={expandedSections.selection}
          onClick={() => toggleSection('selection')}
        />

        {expandedSections.selection && (
          <div className="p-6 border-t border-gray-100">
            <div className="space-y-6">
              {/* Show volume analysis if available */}
              {step.outputs.volumeAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm font-medium text-green-800 mb-2">📊 AI's Volume-Based Recommendations:</p>
                  <div className="bg-white border rounded p-2 max-h-32 overflow-y-auto">
                    <div className="text-xs text-green-700 whitespace-pre-wrap">
                      {step.outputs.volumeAnalysis}
                    </div>
                  </div>
                </div>
              )}

              {/* Show ranking analysis if available */}
              {step.outputs.rankingAnalysis && (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                  <p className="text-sm font-medium text-indigo-800 mb-2">🎯 AI's Ranking Likelihood Analysis:</p>
                  <div className="bg-white border rounded p-2 max-h-32 overflow-y-auto">
                    <div className="text-xs text-indigo-700 whitespace-pre-wrap">
                      {step.outputs.rankingAnalysis}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-indigo-700">
                    <strong>💡 Pro tip:</strong> This analysis considers the site's existing keyword authority to predict ranking potential.
                  </div>
                </div>
              )}

              {/* Manual check option for edge cases */}
              {!step.outputs.volumeAnalysis && step.outputs.keywordVariations && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">📊 Manual Volume Check Option</h4>
                  <p className="text-sm text-yellow-700 mb-3">If you skipped the volume analysis step, you can manually check volumes:</p>
                  <a href="https://app.ahrefs.com/keywords-explorer"
                     target="_blank"
                     className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                    Open Ahrefs Keyword Explorer <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </div>
              )}

              {/* Keyword Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SavedField
                  label="Final Target Keyword"
                  value={step.outputs.finalKeyword || ''}
                  placeholder="Choose your final keyword based on AI recommendations"
                  onChange={(value) => onChange({ ...step.outputs, finalKeyword: value })}
                />

                <SavedField
                  label="Search Volume (if known)"
                  value={step.outputs.keywordVolume || ''}
                  placeholder="e.g., 25/month"
                  onChange={(value) => onChange({ ...step.outputs, keywordVolume: value })}
                />
              </div>

              {/* Title Generation */}
              {step.outputs.finalKeyword && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Generate Compelling Title
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Return to ChatGPT with your final keyword: <strong>"{step.outputs.finalKeyword}"</strong>
                  </p>
                  <p className="text-sm text-blue-700 mb-4">
                    The AI will automatically suggest a compelling guest post title and angle.
                  </p>

                  <SavedField
                    label="Guest Post Title from AI"
                    value={step.outputs.postTitle || ''}
                    placeholder="Working title suggested by ChatGPT"
                    onChange={(value) => onChange({ ...step.outputs, postTitle: value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phase 4: Finalization & Research Setup */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <PhaseHeader
          phase="4"
          title="Research Setup"
          description="Plan client links and prepare deep research prompt"
          status={phaseStatus.finalization ? 'completed' : phaseStatus.selection ? 'active' : 'pending'}
          icon={FileText}
          isExpanded={expandedSections.finalization}
          onClick={() => toggleSection('finalization')}
        />

        {expandedSections.finalization && (
          <div className="p-6 border-t border-gray-100">
            <div className="space-y-6">
              {/* Client Link Planning */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <LinkIcon className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="font-medium text-purple-900">Strategic Link Planning</h4>
                </div>
                <p className="text-sm text-purple-800 mb-4">
                  Plan which client page to link to and how. This automatically enhances your research prompt for natural link integration.
                </p>
                
                <div className="space-y-4">
                  <SavedField
                    label="Client URL to Link To"
                    value={step.outputs.clientTargetUrl || ''}
                    placeholder="The specific client page that fits this topic naturally"
                    onChange={(value) => {
                      const updatedOutputs: any = { ...step.outputs, clientTargetUrl: value };
                      if (step.outputs.rawOutlinePrompt) {
                        const tempOutputs = { ...step.outputs, clientTargetUrl: value };
                        const enhanced = buildEnhancedResearchPromptWithOutputs(step.outputs.rawOutlinePrompt, tempOutputs);
                        updatedOutputs.outlinePrompt = enhanced;
                      }
                      onChange(updatedOutputs);
                    }}
                  />

                  <SavedField
                    label="Desired Anchor Text (Optional)"
                    value={step.outputs.desiredAnchorText || ''}
                    placeholder="Preferred anchor text, or leave blank for AI suggestions"
                    onChange={(value) => {
                      const updatedOutputs: any = { ...step.outputs, desiredAnchorText: value };
                      if (step.outputs.rawOutlinePrompt) {
                        const tempOutputs = { ...step.outputs, desiredAnchorText: value };
                        const enhanced = buildEnhancedResearchPromptWithOutputs(step.outputs.rawOutlinePrompt, tempOutputs);
                        updatedOutputs.outlinePrompt = enhanced;
                      }
                      onChange(updatedOutputs);
                    }}
                  />
                  
                  {step.outputs.clientTargetUrl && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-blue-800">
                        ✅ This link strategy will automatically be included in your research prompt below.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Research Prompt Generation */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Deep Research Prompt
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  When ChatGPT asks if you want a deep research outline, respond "Yes" and paste the result here.
                </p>

                <SavedField
                  label="Raw Research Prompt from AI"
                  value={step.outputs.rawOutlinePrompt || ''}
                  placeholder="Copy the raw research prompt that ChatGPT provides"
                  onChange={(value) => {
                    const enhanced = buildEnhancedResearchPrompt(value);
                    onChange({ 
                      ...step.outputs, 
                      rawOutlinePrompt: value,
                      outlinePrompt: enhanced 
                    });
                  }}
                  isTextarea={true}
                  height="h-32"
                />

                {step.outputs.rawOutlinePrompt && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Enhanced Research Prompt (Auto-Generated)
                      </h4>
                      <p className="text-sm text-green-700 mb-3">
                        This enhanced version includes your link planning strategy and is ready for Step 3.
                      </p>
                    </div>

                    <SavedField
                      label="Enhanced Research Prompt (For Step 3)"
                      value={step.outputs.outlinePrompt || ''}
                      placeholder="Enhanced prompt with client link requirements"
                      onChange={(value) => onChange({ ...step.outputs, outlinePrompt: value })}
                      isTextarea={true}
                      height="h-40"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Topic Summary */}
      {step.outputs.finalKeyword && step.outputs.postTitle && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="font-semibold text-green-900">Topic Generation Complete!</h3>
            </div>
            <CopyButton 
              text={`GUEST POST TOPIC SUMMARY

Client: ${workflow.clientName || '[Client Name]'}
Guest Post Site: ${guestPostSite}
Target Keyword: ${step.outputs.finalKeyword}
Post Title: ${step.outputs.postTitle}
${step.outputs.clientTargetUrl ? `Client Link: ${step.outputs.clientTargetUrl}` : ''}
${step.outputs.desiredAnchorText ? `Anchor Text: ${step.outputs.desiredAnchorText}` : ''}

${step.outputs.outlinePrompt ? 'Ready for deep research phase!' : 'Waiting for research prompt generation.'}`}
              label="Copy Summary"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div><strong>Target Keyword:</strong> {step.outputs.finalKeyword}</div>
              <div><strong>Post Title:</strong> {step.outputs.postTitle}</div>
              {step.outputs.keywordVolume && (
                <div><strong>Search Volume:</strong> {step.outputs.keywordVolume}</div>
              )}
            </div>
            <div className="space-y-2">
              <div><strong>Guest Post Site:</strong> {guestPostSite}</div>
              {step.outputs.clientTargetUrl && (
                <div><strong>Client Link:</strong> {step.outputs.clientTargetUrl}</div>
              )}
              {step.outputs.desiredAnchorText && (
                <div><strong>Anchor Text:</strong> {step.outputs.desiredAnchorText}</div>
              )}
            </div>
          </div>

          {step.outputs.outlinePrompt && (
            <div className="mt-4 flex items-center justify-center">
              <div className="bg-white border border-green-300 rounded-lg p-3 flex items-center">
                <ArrowRight className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Ready for Step 3: Deep Research</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};