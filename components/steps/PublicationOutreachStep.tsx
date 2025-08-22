'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { Send, CheckCircle, AlertCircle, Clock, Mail, FileText, ExternalLink, MessageSquare, Calendar, Bell } from 'lucide-react';

interface PublicationOutreachStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const PublicationOutreachStep = ({ step, workflow, onChange }: PublicationOutreachStepProps) => {
  const [copied, setCopied] = useState(false);

  // Gather data from previous steps
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
  const topicGenerationStep = workflow.steps.find(s => s.id === 'topic-generation');
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const urlSuggestionStep = workflow.steps.find(s => s.id === 'url-suggestion');
  const imagesStep = workflow.steps.find(s => s.id === 'images');
  const linkRequestsStep = workflow.steps.find(s => s.id === 'link-requests');
  const publisherPreApprovalStep = workflow.steps.find(s => s.id === 'publisher-pre-approval');

  // Extract key information
  const guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
  const articleTitle = topicGenerationStep?.outputs?.postTitle || 
                      finalPolishStep?.outputs?.articleTitle || 
                      '[Article Title]';
  const suggestedUrl = urlSuggestionStep?.outputs?.suggestedUrl || '[Suggested URL]';
  const googleDocUrl = articleDraftStep?.outputs?.googleDocUrl || '[Google Doc URL]';
  const hasImages = imagesStep?.outputs?.imagesCreated === 'completed' || imagesStep?.outputs?.imageUrls;
  const publisherEmail = publisherPreApprovalStep?.outputs?.publisherEmail || '';
  const publisherName = publisherPreApprovalStep?.outputs?.publisherName || '';
  const completeGptOutput = linkRequestsStep?.outputs?.completeGptOutput || linkRequestsStep?.outputs?.gptOutput || '';
  const hasInternalLinksContent = completeGptOutput && completeGptOutput.trim().length > 0;

  // Build email templates
  const buildInitialEmailTemplate = () => {
    const internalLinksSection = hasInternalLinksContent ? 
      `I have one request: I looked at some other articles on your site that are relevant to my guest post and I'd appreciate it if you could update those articles with a link to this new guest post. As you might know, these are just good signals overall for a website to publish new content and add internal links. I was also sure to add an internal link from my guest post to one of your other relevant posts.

Here are the specific articles I found that would benefit from linking to this new post:

${completeGptOutput}

` : '';

    const subject = `Guest Post Submission: "${articleTitle}"`;
    const body = `Hi ${publisherName || 'there'},

I have my guest post ready for ${guestPostSite}. Here are all the details:

Article Title: ${articleTitle}
Suggested URL: ${suggestedUrl}
Google Doc: ${googleDocUrl}

${hasImages ? 'Images: I\'ve included custom images that I encourage you to add to enhance the article\'s visual appeal.\n\n' : ''}${internalLinksSection}Please review everything and let me know what you think. I'm happy to take any and all feedback and make revisions as needed.

Looking forward to seeing this published on ${guestPostSite}!

Best regards`;

    return { subject, body };
  };

  const buildFollowUpTemplate = (followUpNumber: number) => {
    const templates = [
      {
        subject: `Re: Guest Post Submission: "${articleTitle}"`,
        body: `Hi ${publisherName || 'there'},

I wanted to follow up on the guest post I sent over last week. I know you're busy, so I just wanted to make sure it didn't get lost in your inbox.

The article is ready to go whenever you have a chance to review it: ${googleDocUrl}

Let me know if you need anything else from me!

Best regards`
      },
      {
        subject: `Quick check-in: "${articleTitle}"`,
        body: `Hi ${publisherName || 'there'},

Just checking in on the guest post submission. I understand things can get busy - is there anything I can do to help move this along?

If you need any revisions or have feedback, I'm happy to make adjustments.

Thanks!
Best regards`
      },
      {
        subject: `Final follow-up: Guest post for ${guestPostSite}`,
        body: `Hi ${publisherName || 'there'},

I've reached out a couple of times about the guest post but haven't heard back. I understand priorities change.

If you're still interested in publishing the article, I'm here and ready to help. If not, no worries - just let me know so I can offer it elsewhere.

Best regards`
      }
    ];

    return templates[Math.min(followUpNumber - 1, templates.length - 1)];
  };

  const { subject, body } = buildInitialEmailTemplate();

  const fullEmailTemplate = `Subject: ${subject}\n\n${body}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullEmailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = (status: string) => {
    onChange({ 
      ...step.outputs, 
      submissionStatus: status,
      statusUpdatedAt: new Date().toISOString()
    });
  };

  const handleMarkSent = () => {
    const communicationLog = step.outputs.communicationLog || [];
    communicationLog.push({
      type: 'initial',
      sentAt: new Date().toISOString(),
      subject: step.outputs.customSubject || subject,
      status: 'sent'
    });
    
    onChange({ 
      ...step.outputs, 
      finalArticleSentAt: new Date().toISOString(),
      submissionStatus: 'sent',
      communicationLog,
      lastContactDate: new Date().toISOString()
    });
  };

  const handleSendFollowUp = (followUpNumber: number) => {
    const followUpTemplate = buildFollowUpTemplate(followUpNumber);
    const communicationLog = step.outputs.communicationLog || [];
    communicationLog.push({
      type: 'followup',
      followUpNumber,
      sentAt: new Date().toISOString(),
      subject: followUpTemplate.subject,
      status: 'sent'
    });
    
    onChange({ 
      ...step.outputs, 
      communicationLog,
      lastFollowUpNumber: followUpNumber,
      lastContactDate: new Date().toISOString()
    });
  };

  const handleMarkPublished = () => {
    onChange({ 
      ...step.outputs, 
      publishedAt: new Date().toISOString(),
      submissionStatus: 'published'
    });
  };

  return (
    <div className="space-y-6">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/0d0b54c7cefa4c8ab7396b5aeb925309?sid=47d9de39-142d-40c5-b3e9-7635ba052387"
        title="Email Outreach & Follow-up Tutorial"
        description="Learn how to effectively manage publisher outreach and follow-ups"
      />

      {/* Submission Status */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Publication Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => handleStatusChange('draft')}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.submissionStatus === 'draft'
                  ? 'border-gray-500 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Draft</div>
              <div className="text-xs text-gray-500">Preparing</div>
            </button>

            <button
              onClick={handleMarkSent}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.submissionStatus === 'sent'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Send className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Sent</div>
              <div className="text-xs text-gray-500">Delivered</div>
            </button>

            <button
              onClick={() => handleStatusChange('pending')}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.submissionStatus === 'pending'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Pending</div>
              <div className="text-xs text-gray-500">In review</div>
            </button>

            <button
              onClick={handleMarkPublished}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.outputs.submissionStatus === 'published'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Published</div>
              <div className="text-xs text-gray-500">Live</div>
            </button>
          </div>

          {/* Timeline */}
          <div className="mt-6 space-y-2">
            {step.outputs.finalArticleSentAt && (
              <div className="flex items-center text-sm text-gray-600">
                <Send className="w-4 h-4 mr-2 text-blue-500" />
                Sent: {new Date(step.outputs.finalArticleSentAt).toLocaleString()}
              </div>
            )}
            {step.outputs.publishedAt && (
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Published: {new Date(step.outputs.publishedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final Submission Email */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Final Article Submission</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMarkSent}
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

          {/* Customization Options */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Customize Template</h4>
            
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

            <div className="flex items-center justify-between mt-3">
              <CopyButton 
                text={`Subject: ${step.outputs.customSubject || subject}\n\n${step.outputs.customBody || body}`}
                label="Copy Custom Template"
              />
              <button
                onClick={() => onChange({ ...step.outputs, customSubject: subject, customBody: body })}
                className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reset to Auto-Generated
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Article Deliverables */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Article Deliverables</h3>
        </div>
        <div className="p-6 space-y-4">
          <SavedField
            label="Final Google Doc URL"
            value={step.outputs.finalGoogleDocUrl || googleDocUrl}
            placeholder="https://docs.google.com/..."
            onChange={(value) => onChange({ ...step.outputs, finalGoogleDocUrl: value })}
          />

          <SavedField
            label="Word Count"
            value={step.outputs.wordCount || ''}
            placeholder="e.g., 2,500 words"
            onChange={(value) => onChange({ ...step.outputs, wordCount: value })}
          />

          <SavedField
            label="Meta Description"
            value={step.outputs.metaDescription || ''}
            placeholder="160-character meta description for SEO..."
            onChange={(value) => onChange({ ...step.outputs, metaDescription: value })}
            isTextarea={true}
            height="h-20"
          />

          <SavedField
            label="Image URLs (if applicable)"
            value={step.outputs.imageUrls || ''}
            placeholder="Links to custom images created for this article..."
            onChange={(value) => onChange({ ...step.outputs, imageUrls: value })}
            isTextarea={true}
            height="h-20"
          />
        </div>
      </div>

      {/* Follow-up Management */}
      {step.outputs.submissionStatus === 'sent' && !step.outputs.publishedAt && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Follow-up Management</h3>
            </div>
          </div>
          <div className="p-6">
            {/* Follow-up Reminder */}
            {step.outputs.lastContactDate && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Last Contact: {new Date(step.outputs.lastContactDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-yellow-700">
                        {Math.floor((new Date().getTime() - new Date(step.outputs.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </p>
                    </div>
                  </div>
                  {Math.floor((new Date().getTime() - new Date(step.outputs.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)) >= 7 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Follow-up recommended
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up Templates */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Send Follow-up</h4>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((num) => {
                  const isAlreadySent = (step.outputs.communicationLog || []).some(
                    (log: any) => log.type === 'followup' && log.followUpNumber === num
                  );
                  const followUpTemplate = buildFollowUpTemplate(num);
                  
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${followUpTemplate.subject}\n\n${followUpTemplate.body}`);
                        handleSendFollowUp(num);
                      }}
                      disabled={isAlreadySent}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isAlreadySent
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                          : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <MessageSquare className={`w-5 h-5 mx-auto mb-1 ${
                        isAlreadySent ? 'text-gray-400' : 'text-blue-500'
                      }`} />
                      <div className="text-xs font-medium">
                        Follow-up #{num}
                      </div>
                      {isAlreadySent && (
                        <div className="text-xs text-gray-500 mt-1">Sent</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Response Notes */}
            <div className="mt-4">
              <SavedField
                label="Publisher Response Notes"
                value={step.outputs.responseNotes || ''}
                placeholder="Record any responses or feedback from the publisher..."
                onChange={(value) => onChange({ ...step.outputs, responseNotes: value })}
                isTextarea={true}
                height="h-24"
              />
            </div>
          </div>
        </div>
      )}

      {/* Communication Log */}
      {step.outputs.communicationLog && step.outputs.communicationLog.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Communication History</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {step.outputs.communicationLog.map((log: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className={`p-2 rounded-full ${
                    log.type === 'initial' ? 'bg-blue-100' : 'bg-yellow-100'
                  }`}>
                    <Mail className={`w-4 h-4 ${
                      log.type === 'initial' ? 'text-blue-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.type === 'initial' ? 'Initial Submission' : `Follow-up #${log.followUpNumber}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.sentAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{log.subject}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    log.status === 'sent' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Publication Details */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Publication Details</h3>
        </div>
        <div className="p-6 space-y-4">
          <SavedField
            label="Published URL"
            value={step.outputs.publishedUrl || ''}
            placeholder="https://example.com/your-published-article"
            onChange={(value) => onChange({ ...step.outputs, publishedUrl: value })}
          />

          {step.outputs.publishedUrl && (
            <a
              href={step.outputs.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Published Article
            </a>
          )}

          <SavedField
            label="Publication Date"
            value={step.outputs.publicationDate || ''}
            placeholder="MM/DD/YYYY"
            onChange={(value) => onChange({ ...step.outputs, publicationDate: value })}
          />

          <SavedField
            label="Publisher Feedback"
            value={step.outputs.publisherFeedback || ''}
            placeholder="Any feedback or comments from the publisher..."
            onChange={(value) => onChange({ ...step.outputs, publisherFeedback: value })}
            isTextarea={true}
            height="h-24"
          />
        </div>
      </div>


      {/* Status Messages */}
      {step.outputs.submissionStatus === 'published' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-900">Article Successfully Published!</h3>
          </div>
          <div className="text-sm text-green-800 space-y-1">
            <p>✓ Article is live at: {step.outputs.publishedUrl || 'URL pending'}</p>
            <p>✓ Remember to complete all follow-up actions</p>
            <p>✓ Track performance metrics over the coming weeks</p>
          </div>
        </div>
      )}
    </div>
  );
};