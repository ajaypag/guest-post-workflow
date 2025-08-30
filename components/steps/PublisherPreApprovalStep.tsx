'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { Send, CheckCircle, AlertCircle, Clock, Mail, SkipForward, DollarSign, Info } from 'lucide-react';

interface PublisherPreApprovalStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const PublisherPreApprovalStep = ({ step, workflow, onChange }: PublisherPreApprovalStepProps) => {
  const [copied, setCopied] = useState(false);
  const [guestPostCost, setGuestPostCost] = useState<string | null>(null);
  const [isLoadingCost, setIsLoadingCost] = useState(false);

  // Gather data from previous steps
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');

  // Extract key information
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
  }
  const articleTitle = topicGenerationStep?.outputs?.postTitle || '[Article Title]';
  const articleSummary = topicGenerationStep?.outputs?.postSummary || '[Article Summary]';
  const keywordTarget = topicGenerationStep?.outputs?.keyword || '[Target Keyword]';

  // Fetch guest post cost from database
  useEffect(() => {
    const fetchGuestPostCost = async () => {
      if (!guestPostSite || guestPostSite === '[Guest Post Site]') return;
      
      setIsLoadingCost(true);
      try {
        const response = await fetch(`/api/websites/cost?domain=${encodeURIComponent(guestPostSite)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.guestPostCost) {
            setGuestPostCost(`$${data.guestPostCost}`);
            // Auto-populate the agreed price if not already set
            if (!step.outputs.agreedPrice) {
              onChange({ ...step.outputs, agreedPrice: `$${data.guestPostCost}` });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching guest post cost:', error);
      } finally {
        setIsLoadingCost(false);
      }
    };

    fetchGuestPostCost();
  }, [guestPostSite]);

  // Pre-approval email template
  const subject = `Guest Post Topic Approval: "${articleTitle}"`;
  const body = `Hi there,

I'm preparing a guest post for ${guestPostSite} and wanted to run the topic by you first before I start writing.

**Proposed Article:**
Title: ${articleTitle}
Target Keyword: ${keywordTarget}

**Brief Summary:**
${articleSummary}

This article will be:
• 100% original content, never published elsewhere
• Professionally written and thoroughly researched
• SEO-optimized while maintaining natural readability
• Include relevant internal links to your existing content

Please let me know if this topic works for you, or if you'd prefer any adjustments. Once approved, I'll begin writing and have the full article ready within [X] days.

Looking forward to your feedback!

Best regards`;

  const fullEmailTemplate = `Subject: ${subject}\n\n${body}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullEmailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = (status: string) => {
    onChange({ 
      ...step.outputs, 
      approvalStatus: status,
      approvalStatusUpdatedAt: new Date().toISOString()
    });
  };

  const handleSendEmail = () => {
    onChange({ 
      ...step.outputs, 
      emailSentAt: new Date().toISOString(),
      approvalStatus: 'pending',
      isSkipped: false
    });
  };

  const handleSkipStep = () => {
    onChange({ 
      ...step.outputs, 
      isSkipped: true,
      approvalStatus: 'skipped',
      skipReason: step.outputs.skipReason || 'Pre-approval not required for this publisher'
    });
  };

  const handleUnskipStep = () => {
    onChange({ 
      ...step.outputs, 
      isSkipped: false,
      approvalStatus: undefined,
      skipReason: undefined
    });
  };

  // If step is skipped, show minimal UI
  if (step.outputs.isSkipped) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SkipForward className="w-6 h-6 text-yellow-600 mr-3" />
              <div>
                <h3 className="font-medium text-yellow-900">Step Skipped</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {step.outputs.skipReason || 'Pre-approval not required for this publisher'}
                </p>
              </div>
            </div>
            <button
              onClick={handleUnskipStep}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Enable Step
            </button>
          </div>
        </div>

        {/* Still show pricing info even when skipped */}
        {guestPostSite && guestPostSite !== '[Guest Post Site]' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700">Guest Post Cost for {guestPostSite}:</span>
              </div>
              <span className="font-medium text-lg">
                {isLoadingCost ? 'Loading...' : (guestPostCost || 'No pricing data available')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Skip Option Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Publisher Pre-Approval</p>
              <p className="text-sm text-blue-700">
                Use this step when you need to confirm topic and pricing with the publisher before writing.
              </p>
            </div>
          </div>
          <button
            onClick={handleSkipStep}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <SkipForward className="w-4 h-4 mr-1.5" />
            Skip This Step
          </button>
        </div>
      </div>

      {/* Database Pricing Information */}
      {guestPostSite && guestPostSite !== '[Guest Post Site]' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Pricing Information</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Guest Post Site</p>
                <p className="font-medium">{guestPostSite}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Database Price</p>
                <p className="font-medium text-lg">
                  {isLoadingCost ? (
                    <span className="text-gray-500">Loading...</span>
                  ) : (
                    <span className={guestPostCost ? 'text-green-600' : 'text-gray-500'}>
                      {guestPostCost || 'No pricing data available'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {guestPostCost && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ℹ️ This price is from our database records for this website. Confirm current pricing with the publisher.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Tracker */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Pre-Approval Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handleStatusChange('pending')}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.approvalStatus === 'pending'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Pending</div>
              <div className="text-xs text-gray-500">Awaiting response</div>
            </button>

            <button
              onClick={() => handleStatusChange('approved')}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.approvalStatus === 'approved'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Approved</div>
              <div className="text-xs text-gray-500">Ready to write</div>
            </button>

            <button
              onClick={() => handleStatusChange('rejected')}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.approvalStatus === 'rejected'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Needs Revision</div>
              <div className="text-xs text-gray-500">Topic adjustment needed</div>
            </button>
          </div>

          {step.outputs.emailSentAt && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
              <span className="text-blue-700">
                Email sent at: {new Date(step.outputs.emailSentAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Publisher Information */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Publisher Details</h3>
        </div>
        <div className="p-6 space-y-4">
          <SavedField
            label="Publisher Email"
            value={step.outputs.publisherEmail || ''}
            placeholder="publisher@example.com"
            onChange={(value) => onChange({ ...step.outputs, publisherEmail: value })}
          />

          <SavedField
            label="Publisher Name"
            value={step.outputs.publisherName || ''}
            placeholder="John Doe"
            onChange={(value) => onChange({ ...step.outputs, publisherName: value })}
          />

          <SavedField
            label="Agreed Price"
            value={step.outputs.agreedPrice || ''}
            placeholder="$250"
            onChange={(value) => onChange({ ...step.outputs, agreedPrice: value })}
          />

          <SavedField
            label="Payment Terms"
            value={step.outputs.paymentTerms || ''}
            placeholder="e.g., PayPal upon publication"
            onChange={(value) => onChange({ ...step.outputs, paymentTerms: value })}
          />
        </div>
      </div>

      {/* Pre-Approval Email Template */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Pre-Approval Email Template</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Mark as Sent
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Copy Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Subject Line:</label>
              <CopyButton text={subject} label="Copy Subject" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-sm">
              {subject}
            </div>
          </div>
          
          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Email Body:</label>
              <CopyButton text={body} label="Copy Body" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
              {body}
            </div>
          </div>
        </div>
      </div>

      {/* Communication Log */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Communication Log</h3>
        </div>
        <div className="p-6">
          <SavedField
            label="Publisher Response"
            value={step.outputs.publisherResponse || ''}
            placeholder="Record the publisher's response and any requested changes..."
            onChange={(value) => onChange({ ...step.outputs, publisherResponse: value })}
            isTextarea={true}
            height="h-32"
          />

          <SavedField
            label="Additional Notes"
            value={step.outputs.notes || ''}
            placeholder="Any special requirements, preferred style, or important details..."
            onChange={(value) => onChange({ ...step.outputs, notes: value })}
            isTextarea={true}
            height="h-24"
          />
        </div>
      </div>

      {/* Next Steps Guide */}
      {step.outputs.approvalStatus === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-900">Topic Approved - Ready to Proceed</h3>
          </div>
          <div className="text-sm text-green-800 space-y-1">
            <p>✓ Topic has been approved by the publisher</p>
            <p>✓ You can now proceed to content creation steps</p>
            <p>✓ Remember to follow any specific guidelines provided</p>
          </div>
        </div>
      )}

      {step.outputs.approvalStatus === 'rejected' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="font-medium text-yellow-900">Topic Needs Adjustment</h3>
          </div>
          <div className="text-sm text-yellow-800 space-y-1">
            <p>• Review the publisher's feedback</p>
            <p>• Return to Topic Generation step to adjust the topic</p>
            <p>• Resubmit for approval once revised</p>
          </div>
        </div>
      )}
    </div>
  );
};