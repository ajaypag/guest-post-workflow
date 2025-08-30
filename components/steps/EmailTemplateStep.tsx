'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { Mail, CheckCircle, AlertCircle, Send, FileText } from 'lucide-react';

interface EmailTemplateStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const EmailTemplateStep = ({ step, workflow, onChange }: EmailTemplateStepProps) => {
  const [copied, setCopied] = useState(false);

  // Gather data from previous steps
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const urlSuggestionStep = workflow.steps.find(s => s.id === 'url-suggestion');
  const imagesStep = workflow.steps.find(s => s.id === 'images');
  const linkRequestsStep = workflow.steps.find(s => s.id === 'link-requests');

  // Extract key information
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
  }
  const articleTitle = topicGenerationStep?.outputs?.postTitle || 
                      finalPolishStep?.outputs?.articleTitle || 
                      '[Article Title]';
  const suggestedUrl = urlSuggestionStep?.outputs?.suggestedUrl || '[Suggested URL]';
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '[Google Doc URL]';
  const hasImages = imagesStep?.outputs?.imagesCreated === 'completed' || imagesStep?.outputs?.imageUrls;
  const internalLinksFound = linkRequestsStep?.outputs?.internalLinks || linkRequestsStep?.outputs?.foundArticles;
  const completeGptOutput = linkRequestsStep?.outputs?.completeGptOutput || linkRequestsStep?.outputs?.gptOutput || '';
  
  // Check if we have meaningful internal links content
  const hasInternalLinksContent = completeGptOutput && completeGptOutput.trim().length > 0;

  // Build the email components
  const buildEmailComponents = () => {
    // Build the internal links section conditionally
    const internalLinksSection = hasInternalLinksContent ? 
      `I have one request: I looked at some other articles on your site that are relevant to my guest post and I'd appreciate it if you could update those articles with a link to this new guest post. As you might know, these are just good signals overall for a website to publish new content and add internal links. I was also sure to add an internal link from my guest post to one of your other relevant posts.

Here are the specific articles I found that would benefit from linking to this new post:

${completeGptOutput}

` : '';

    const subject = `Guest Post Submission: "${articleTitle}"`;
    
    const body = `Hi there,

I have my guest post ready for ${guestPostSite}. Here are all the details:

Article Title: ${articleTitle}
Suggested URL: ${suggestedUrl}
Google Doc: ${googleDocUrl}

${hasImages ? 'Images: I\'ve included custom images that I encourage you to add to enhance the article\'s visual appeal.\n\n' : ''}${internalLinksSection}Please review everything and let me know what you think. I'm happy to take any and all feedback and make revisions as needed.

Looking forward to seeing this published on ${guestPostSite}!

Best regards`;

    return { subject, body };
  };

  const { subject, body } = buildEmailComponents();
  const fullEmailTemplate = `Subject: ${subject}

${body}`;

  // Check completeness of required data
  const requiredFields = [
    { field: articleTitle, name: 'Article Title', step: 'Topic Generation or Polish & Finalize' },
    { field: googleDocUrl, name: 'Google Doc URL', step: 'Article Draft' },
  ];

  const missingFields = requiredFields.filter(item => 
    item.field.startsWith('[') && item.field.endsWith(']')
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(fullEmailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/0d0b54c7cefa4c8ab7396b5aeb925309?sid=47d9de39-142d-40c5-b3e9-7635ba052387"
        title="Email Template Tutorial"
        description="Learn how to craft effective email templates for guest post submissions"
      />
      
      {/* Status Check */}
      {missingFields.length > 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <h3 className="font-medium text-yellow-800">Missing Information</h3>
          </div>
          <p className="text-sm text-yellow-700 mb-2">
            Complete these steps to auto-populate the email template:
          </p>
          <ul className="text-sm text-yellow-700 space-y-1">
            {missingFields.map((item, index) => (
              <li key={index}>• {item.name} (from {item.step})</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-sm text-green-800 font-medium">
              Email template ready! All key information has been populated from your workflow.
            </p>
          </div>
          {hasInternalLinksContent ? (
            <p className="text-sm text-green-700">
              ✅ Internal links section included with specific article recommendations
            </p>
          ) : (
            <p className="text-sm text-yellow-700">
              ℹ️ Internal links section will be hidden (no content found in "Internal Links to New Guest Post" step)
            </p>
          )}
        </div>
      )}

      {/* Email Template Display */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Professional Email Template</h3>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              disabled={missingFields.length > 0}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Copy Email Template
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Subject Line:</label>
              <CopyButton 
                text={subject}
                label="Copy Subject"
              />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-sm">
              {subject}
            </div>
          </div>
          
          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Email Body:</label>
              <CopyButton 
                text={body}
                label="Copy Body"
              />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
              {body}
            </div>
          </div>
        </div>
      </div>

      {/* Customization Options */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Customize Template</h3>
          <p className="text-sm text-gray-500">Make any adjustments before sending</p>
        </div>

        <div className="p-6 space-y-4">
          <SavedField
            label="Custom Subject Line"
            value={step.outputs.customSubject || subject}
            placeholder="Edit the subject line as needed..."
            onChange={(value) => onChange({ ...step.outputs, customSubject: value })}
          />

          <SavedField
            label="Custom Email Body"
            value={step.outputs.customBody || body}
            placeholder="Edit the email body as needed..."
            onChange={(value) => onChange({ ...step.outputs, customBody: value })}
            isTextarea={true}
            height="h-64"
          />

          <div className="flex items-center justify-between">
            <div>
              <CopyButton 
                text={`Subject: ${step.outputs.customSubject || subject}\n\n${step.outputs.customBody || body}`}
                label="Copy Custom Template"
              />
            </div>
            <button
              onClick={() => onChange({ ...step.outputs, customSubject: subject, customBody: body })}
              className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset to Auto-Generated
            </button>
          </div>

          <SavedField
            label="Email Notes (Optional)"
            value={step.outputs.emailNotes || ''}
            placeholder="Any additional notes or reminders for when you send this email..."
            onChange={(value) => onChange({ ...step.outputs, emailNotes: value })}
            isTextarea={true}
            height="h-20"
          />
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <FileText className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="font-medium text-blue-900">Ready to Send</h3>
        </div>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Copy the email template above</p>
          <p>• Paste it into your email client</p>
          <p>• Add the recipient's email address</p>
          <p>• Attach any additional files if needed</p>
          <p>• Send and track the response!</p>
        </div>
      </div>
    </div>
  );
};