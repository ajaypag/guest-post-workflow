'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { TutorialVideo } from '../ui/TutorialVideo';
import { WebsiteSelector } from '../ui/WebsiteSelector';
import { Globe, CheckCircle, AlertCircle, Info, Target, Loader2 } from 'lucide-react';

interface DomainSelectionStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const DomainSelectionStepClean = ({ step, workflow, onChange }: DomainSelectionStepProps) => {
  const [websites, setWebsites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract values from step outputs OR workflow metadata (for order-based workflows)
  const websiteId = step.outputs.websiteId || workflow.websiteId || '';
  const domain = step.outputs.domain || workflow.targetDomain || '';
  const notes = step.outputs.notes || '';
  const websiteData = step.outputs.websiteData || workflow.website || null;

  // Load websites on mount and prepopulate if from order
  useEffect(() => {
    fetchWebsites();
    
    // If this workflow comes from an order and has websiteId but no outputs yet, prepopulate
    if (workflow.websiteId && !step.outputs.websiteId) {
      onChange({
        ...step.outputs,
        websiteId: workflow.websiteId,
        domain: workflow.targetDomain || workflow.website?.domain || '',
        websiteData: workflow.website || null
      });
    }
  }, []);

  const fetchWebsites = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/websites/workflow-selector');
      const data = await response.json();
      if (data.websites) {
        setWebsites(data.websites);
      }
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle website selection
  const handleWebsiteSelect = (website: any) => {
    onChange({
      ...step.outputs,
      websiteId: website.id,        // NEW: Store website ID
      domain: website.domain,        // LEGACY: Keep domain for backward compatibility
      websiteData: website          // Cache website data for display
    });
  };

  // Validation logic
  const isDomainValid = websiteId || domain.trim().length > 0; // Accept either new or legacy
  const isComplete = isDomainValid;

  const StatusIcon = () => {
    if (isComplete) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/31c7f383913d4dc5bae49935b31f88b5?sid=0e73abf0-8aa1-42f7-9a6e-b4edb52ef113"
        title="Guest Post Site Selection Tutorial"
        description="Learn how to select the right guest post publication site for your client"
      />

      {/* Main Selection */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            <StatusIcon />
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">Select Guest Post Website</h3>
              <p className="text-sm text-gray-500">Choose the target publication for your guest post</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Important distinction */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Important Distinction</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  Enter the <strong>guest post website</strong> (where you'll publish), not your client's website.
                </p>
                <div className="text-sm text-yellow-700">
                  <p className="mb-1">✅ <strong>Correct:</strong> techcrunch.com, industry-magazine.com</p>
                  <p>❌ <strong>Incorrect:</strong> {workflow.clientUrl ? new URL(workflow.clientUrl).hostname : 'your-client.com'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Website Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Post Website <span className="text-red-500">*</span>
            </label>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading websites...</span>
              </div>
            ) : (
              <WebsiteSelector
                websites={websites}
                value={websiteId}
                onChange={handleWebsiteSelect}
                required={true}
                placeholder="Select a website from the list"
              />
            )}
            
            {websiteData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <p className="text-sm text-green-800">
                    Target publication: <strong>{websiteData.domain}</strong>
                    {websiteData.domainRating && (
                      <span className="ml-2 text-green-600">
                        (DA {websiteData.domainRating})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Strategy context */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start">
              <Target className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Why This Matters</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• We'll analyze this site's keyword rankings and topical authority</p>
                  <p>• Find content gaps where your client's expertise aligns</p>
                  <p>• Ensure your guest post has the best chance of ranking</p>
                </div>
              </div>
            </div>
          </div>

          {/* Optional notes */}
          <div className="space-y-2">
            <SavedField
              label="Research Notes (Optional)"
              value={notes}
              placeholder="Any initial research about this publication:&#10;• Editorial guidelines or content preferences&#10;• Key topics they cover&#10;• Audience insights&#10;• Contact information or submission process"
              onChange={(value) => onChange({ ...step.outputs, notes: value })}
              isTextarea={true}
              height="h-32"
            />
            
            <p className="text-xs text-gray-500">
              Use this space to capture any preliminary research about the target publication
            </p>
          </div>
        </div>
      </div>

      {/* Next steps preview */}
      {isComplete && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-900">Ready for Next Step</h3>
          </div>
          <p className="text-sm text-green-800 mb-2">
            Great! With <strong>{domain}</strong> selected, you can now proceed to:
          </p>
          <div className="text-sm text-green-700 space-y-1 ml-4">
            <p>• Analyze their keyword rankings in Ahrefs</p>
            <p>• Identify topic overlap with your client</p>
            <p>• Find content opportunities that align with their editorial focus</p>
          </div>
        </div>
      )}
    </div>
  );
};