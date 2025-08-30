'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface KeywordResearchStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const KeywordResearchStep = ({ step, workflow, onChange }: KeywordResearchStepProps) => {
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
// Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || 'Guest post website from Step 1';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
  }
  const keywords = step.outputs.keywords || '';
  
  // Build dynamic Ahrefs URL
  const buildAhrefsUrl = () => {
    if (!guestPostSite) {
      return "https://app.ahrefs.com/v2-site-explorer/organic-keywords";
    }
    
    // Clean domain - remove protocol and trailing slash
    let cleanDomain = guestPostSite.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    // Base URL with static parameters (copy exact structure from your working URL)
    let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
    
    // Add keyword rules if keywords exist
    if (keywords.trim()) {
      // Clean keywords: replace newlines with commas, normalize spaces
      const cleanKeywords = keywords.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
      
      // Build exact keywordRules structure from your working URL
      const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
      const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
      url += `&keywordRules=${keywordRulesEncoded}`;
    } else {
      url += `&keywordRules=`;
    }
    
    // Add remaining parameters exactly as in your working URL
    url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
    
    // Add target (URL encode it)
    url += `&target=${encodeURIComponent(targetUrl)}`;
    
    // Final parameters
    url += `&urlRules=&volume_type=average`;
    
    return url;
  };
  
  const dynamicAhrefsUrl = buildAhrefsUrl();
  
  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/31c7f383913d4dc5bae49935b31f88b5?t=19&sid=0e73abf0-8aa1-42f7-9a6e-b4edb52ef113"
        title="Site Qualification and Preparation Tutorial"
        description="Learn how to research and qualify your guest post site before creating content"
        timestamp="0:19"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 2a: Find Topically Relevant Keywords</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Strategy: Find Topic Overlap</p>
          <p className="text-sm text-gray-700">
            We need to find topics the guest post site ranks for that your client has overlap with. 
            If we can identify these overlapping topics, we can write content with a better chance of ranking 
            because the site has a history of ranking for that type of content.
          </p>
        </div>

        <p className="text-sm mb-2 font-semibold">Step 1: Initial Keywords</p>
        <p className="text-sm mb-2">
          Take your client URL <span className="font-semibold text-blue-700">({workflow.clientUrl})</span> and paste it into this GPT:
        </p>
        <a href="https://chatgpt.com/g/g-685ea890d99c8191bd1550784c329f03-find-topically-relevant-keywords-your-client-page?model=o3" 
           target="_blank" 
           className="text-blue-600 hover:underline inline-flex items-center font-medium">
          Find Topically Relevant Keywords GPT <ExternalLink className="w-3 h-3 ml-1" />
        </a>

        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-semibold text-yellow-800 mb-2">Step 2: Follow-up Prompt for Broader Coverage</p>
          <p className="text-sm text-yellow-700 mb-2">After getting the initial output, add this follow-up prompt:</p>
          
          <div className="bg-white p-3 rounded border text-sm font-mono relative">
            <CopyButton 
              text="And what about listicles that this site would show up on? What various themes could those listicles be about? Think about one word themes. While it's okay to be specific, keep in mind that oftentimes this is an industry that overlaps with many other industries, or it may serve a different purpose. Maybe it's a good thing to gift. For example, maybe it's a good thing for hobbyists - think wide as well. Merge your output with the output from above."
              label="Copy Follow-up"
            />
            <p className="pr-16">
              "And what about listicles that this site would show up on? What various themes could those listicles be about? Think about one word themes. While it's okay to be specific, keep in mind that oftentimes this is an industry that overlaps with many other industries, or it may serve a different purpose. Maybe it's a good thing to gift. For example, maybe it's a good thing for hobbyists - think wide as well. Merge your output with the output from above."
            </p>
          </div>
        </div>

        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
          <p className="text-sm font-semibold text-orange-800 mb-1">💡 Use Your Brain Too!</p>
          <p className="text-sm text-orange-700">
            While AI helps generate ideas, <strong>think strategically</strong> about potential keywords yourself. 
            This GPT is not a replacement for your brain - it's a tool to help you think broader about topic overlap 
            between the guest post site and your client.
          </p>
        </div>
      </div>
      
      <SavedField
        label="Keywords from GPT (Step 2a Output)"
        value={step.outputs.keywords || ''}
        placeholder="Paste the list of keywords generated by ChatGPT"
        onChange={(value) => onChange({ ...step.outputs, keywords: value })}
        isTextarea={true}
      />

      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 2b: Validate Keywords in Ahrefs</h3>
        
        {!guestPostSite ? (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Complete Step 1 (Guest Post Site Selection) first to generate the Ahrefs URL
            </p>
          </div>
        ) : !keywords.trim() ? (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Enter keywords in Step 2a above to automatically generate filtered Ahrefs URL
            </p>
          </div>
        ) : (
          <div className="bg-green-100 border border-green-300 rounded p-3 mb-3">
            <p className="text-sm text-green-800">
              ✅ URL automatically generated with guest post site: <strong>{guestPostSite}</strong> and your keywords
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm">
            Click the link below to open Ahrefs with pre-filled filters:
          </p>
          <CopyButton text={dynamicAhrefsUrl} label="Copy URL" />
        </div>
        <a href={dynamicAhrefsUrl} 
           target="_blank" 
           className="text-blue-600 hover:underline inline-flex items-center font-medium break-all">
          Ahrefs Site Explorer - Organic Keywords <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
        </a>
        
        {guestPostSite && keywords.trim() && (
          <div className="mt-3 p-2 bg-white border rounded text-xs">
            <p className="font-semibold mb-1">Pre-filled with:</p>
            <p>• Target site: {guestPostSite}</p>
            <p>• Keywords: {keywords.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim()}</p>
          </div>
        )}
        
        <p className="text-sm mt-3 mb-2 font-semibold">In Ahrefs:</p>
        <ol className="text-sm space-y-1 ml-4">
          <li>1. <strong>Export to CSV</strong> if the site has relevant keyword results</li>
          <li>2. <strong>If no results</strong> → this guest post site is not viable for your client</li>
        </ol>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Ahrefs CSV Export Status</label>
        <select
          value={step.outputs.csvExported || ''}
          onChange={(e) => onChange({ ...step.outputs, csvExported: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select status...</option>
          <option value="exported">CSV Exported - Site has relevant results</option>
          <option value="not-viable">No results - Site not viable</option>
        </select>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-3">Step 2c: Identify Your Target Client URL</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Goal: Determine which client URL to link to in your guest post</p>
          <p className="text-sm text-gray-700">
            You need to decide exactly which page on your client's website you'll be linking to from the guest post. 
            Choose the scenario below that matches your situation:
          </p>
        </div>

        <div className="space-y-4">
          {/* Scenario 1 */}
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-semibold text-green-800 mb-2">✅ Scenario 1: You know exactly which client URL to use</h4>
            <p className="text-sm text-green-700 mb-2">
              You already know which specific page on your client's website you want to link to in the guest post.
            </p>
            <p className="text-sm text-green-700 font-medium">
              Action: Simply enter that URL in the "Client URL(s) Used" field below and paste it into the GPT to get a summary.
            </p>
          </div>

          {/* Scenario 2 */}
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <h4 className="font-semibold text-orange-800 mb-2">🤔 Scenario 2: You have multiple client URLs but aren't sure which to use</h4>
            <p className="text-sm text-orange-700 mb-2">
              You have a list of potential client pages but need help deciding which would work best for the guest post.
            </p>
            <p className="text-sm text-orange-700 font-medium mb-2">
              Action: Paste your entire list of client URLs into the GPT below. It will:
            </p>
            <ul className="text-sm text-orange-700 ml-4 space-y-1">
              <li>• Summarize each page</li>
              <li>• Format the summaries to help the next GPTs choose the best fit</li>
              <li>• Make it easier to decide which URL to ultimately link to</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="text-sm mb-2">
            <strong>Your starting client URL:</strong> <span className="text-blue-700">{workflow.clientUrl}</span>
          </p>
          <a href="https://chatgpt.com/g/g-685eb391880c8191afc2808e42086ade-summarize-the-client-s-articles-or-urls?model=o3" 
             target="_blank" 
             className="text-blue-600 hover:underline inline-flex items-center font-medium">
            Summarize Client URLs GPT <ExternalLink className="w-3 h-3 ml-1" />
          </a>
          <p className="text-sm mt-2 text-gray-600">
            This GPT will crawl and summarize each URL you provide, formatting the output in a way that helps subsequent GPTs do their job effectively.
          </p>
        </div>
      </div>

      <SavedField
        label="Client URL(s) Submitted to GPT"
        value={step.outputs.clientUrls || ''}
        placeholder="Enter the specific URL(s) you submitted to the Summarize Client URLs GPT&#10;&#10;Scenario 1: Single URL you want to link to&#10;Scenario 2: List of URLs you're choosing between"
        onChange={(value) => onChange({ ...step.outputs, clientUrls: value })}
        isTextarea={true}
        height="h-24"
      />

      <SavedField
        label="GPT Output: URL Summaries"
        value={step.outputs.urlSummaries || ''}
        placeholder="Paste the complete output from the Summarize Client URLs GPT&#10;&#10;This should include formatted summaries that will help the next steps determine the best content approach for your guest post."
        onChange={(value) => onChange({ ...step.outputs, urlSummaries: value })}
        isTextarea={true}
        height="h-32"
      />
    </div>
  );
};