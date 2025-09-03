'use client';

import React, { useState } from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CheckCircle, AlertCircle, ExternalLink, Shield, DollarSign, FileCheck, RefreshCw, Play } from 'lucide-react';
import { CheckRow } from '../ui/CheckRow';
import { MissingFieldsModal } from '../modals/MissingFieldsModal';
import { toast } from 'sonner';

interface PublicationVerificationStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const PublicationVerificationStep = ({ step, workflow, onChange }: PublicationVerificationStepProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [showMissingFields, setShowMissingFields] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  // Gather data from previous steps
  const publicationOutreachStep = workflow.steps.find(s => s.id === 'publication-outreach');
  const publisherPreApprovalStep = workflow.steps.find(s => s.id === 'publisher-pre-approval');
  const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');

  const publishedUrl = step.outputs.publishedUrl || publicationOutreachStep?.outputs?.publishedUrl || '';
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
  }
  const agreedPrice = publisherPreApprovalStep?.outputs?.agreedPrice || '';

  // Get verification results
  const autoVerification = step.outputs.autoVerification;
  
  // Track manual overrides
  const overrides = step.outputs.manualOverrides || {};
  
  // Override handlers
  const createOverrideHandler = (checkKey: string) => () => {
    const newOverrides = { ...overrides, [checkKey]: true };
    onChange({ 
      ...step.outputs, 
      manualOverrides: newOverrides,
      [`${checkKey}Overridden`]: true
    });
  };
  const lastVerifiedAt = step.outputs.lastVerifiedAt;

  const runAutoVerification = async () => {
    if (!publishedUrl.trim()) {
      alert('Please enter the published URL first');
      return;
    }

    setIsVerifying(true);
    setRateLimitMessage('');

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/verify-publication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedUrl })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.requiresInput) {
          setMissingFields(result.missingFields || []);
          setShowMissingFields(true);
          return;
        }

        if (result.rateLimitError) {
          setRateLimitMessage(result.error);
          return;
        }

        throw new Error(result.error || 'Verification failed');
      }

      // Update step outputs with verification results
      onChange({
        ...step.outputs,
        publishedUrl,
        autoVerification: result.verificationResult,
        lastVerifiedAt: new Date().toISOString(),
        rateLimitStatus: result.rateLimitStatus
      });

    } catch (error) {
      console.error('Verification error:', error);
      alert(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };


  const handlePaymentAuthorization = () => {
    onChange({ 
      ...step.outputs, 
      paymentAuthorized: true,
      paymentAuthorizedAt: new Date().toISOString()
    });
  };

  const handleWorkflowCompletion = () => {
    onChange({ 
      ...step.outputs, 
      workflowCompleted: true,
      completedAt: new Date().toISOString()
    });
  };

  const handleForceDeliver = async () => {
    if (!confirm('⚠️ WARNING: QA checks have failed but you are forcing delivery.\n\nThis will:\n• Mark the workflow as complete despite failing checks\n• Apply a manual override flag\n• Deliver the order line item with QA failures noted\n\nAre you sure you want to proceed?')) {
      return;
    }

    try {
      setSaving(true);
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();
      const userId = session?.user?.id;

      // Update workflow with manual override flag
      const updatedOutputs = {
        ...step.outputs,
        manualOverride: {
          applied: true,
          reason: 'User forced delivery despite QA failures',
          appliedBy: userId,
          appliedAt: new Date().toISOString()
        },
        paymentAuthorized: true, // Auto-authorize payment on force deliver
        paymentAuthorizedAt: new Date().toISOString(),
        paymentAuthorizedBy: userId,
        workflowCompleted: true,
        completedAt: new Date().toISOString()
      };

      // Update local state
      onChange(updatedOutputs);

      // Trigger workflow-to-line-item sync with override flag
      if (workflow.id) {
        const syncResponse = await fetch(`/api/workflows/${workflow.id}/sync-to-line-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            stepOutputs: updatedOutputs, 
            userId,
            forceDeliver: true 
          })
        });

        if (!syncResponse.ok) {
          throw new Error('Failed to sync to line item');
        }
      }

      toast.success('Workflow force-delivered with manual override');
    } catch (error) {
      console.error('Force deliver failed:', error);
      toast.error('Failed to force deliver workflow');
    } finally {
      setSaving(false);
    }
  };

  // Check if all verification requirements are met
  const criticalChecksPassed = autoVerification?.score?.overallPassed || false;
  const allVerificationComplete = criticalChecksPassed;
  
  // Check for manual override
  const hasManualOverride = step.outputs.manualOverride?.applied || false;
  const canForceDeliver = autoVerification && !criticalChecksPassed && publishedUrl;

  // Convert verification status to CheckRow format
  const getCheckStatus = (value: boolean | null, checkKey?: string) => {
    // Check if this specific check was manually overridden
    if (checkKey && overrides[checkKey]) return 'passed';
    if (value === null) return 'pending';
    return value ? 'passed' : 'failed';
  };

  return (
    <div className="space-y-6">
      {/* Publication Status */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-900">Publication Verification</h3>
        </div>
        <div className="p-6">
          {publishedUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Published Article URL:</p>
                  <p className="font-medium">{publishedUrl}</p>
                </div>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Verify Live Article
                </a>
              </div>
              
              <SavedField
                label="Published Article URL"
                value={publishedUrl}
                placeholder="Enter the live article URL..."
                onChange={(value) => onChange({ ...step.outputs, publishedUrl: value })}
              />
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                <p className="text-sm text-yellow-700">
                  Article not yet published. Complete the Publication & Outreach step first.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Verification */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Automated Verification</h3>
            {publishedUrl && (
              <button
                onClick={runAutoVerification}
                disabled={isVerifying || !publishedUrl}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isVerifying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isVerifying ? 'Verifying...' : autoVerification ? 'Re-verify' : 'Start Verification'}
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {rateLimitMessage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">{rateLimitMessage}</p>
            </div>
          )}

          {!autoVerification && !isVerifying && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-800 text-sm mb-2">Ready to verify your published article</p>
              <p className="text-blue-600 text-xs">This will check all critical requirements automatically</p>
            </div>
          )}

          {autoVerification && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Verification Score</p>
                  <p className={`font-semibold ${
                    autoVerification.score.overallPassed ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {autoVerification.score.criticalPassed}/{autoVerification.score.criticalTotal} Critical Checks
                    {autoVerification.score.overallPassed ? ' ✓ PASSED' : ' ✗ FAILED'}
                  </p>
                </div>
                {lastVerifiedAt && (
                  <p className="text-xs text-gray-500">
                    Last verified: {new Date(lastVerifiedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Critical Checks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Critical Requirements</h4>
                <div className="space-y-2">
                  <CheckRow 
                    label="URL is Live" 
                    status={getCheckStatus(autoVerification.critical.urlIsLive, 'urlIsLive')}
                    isCritical={true}
                    onOverride={createOverrideHandler('urlIsLive')}
                    isOverridden={overrides.urlIsLive}
                  />
                  <CheckRow 
                    label="Client Link Present" 
                    status={getCheckStatus(autoVerification.critical.clientLinkPresent, 'clientLinkPresent')}
                    isCritical={true}
                    onOverride={createOverrideHandler('clientLinkPresent')}
                    isOverridden={overrides.clientLinkPresent}
                  />
                  <CheckRow 
                    label="Anchor Text Correct" 
                    status={getCheckStatus(autoVerification.critical.anchorTextCorrect, 'anchorTextCorrect')}
                    isCritical={true}
                    onOverride={createOverrideHandler('anchorTextCorrect')}
                    isOverridden={overrides.anchorTextCorrect}
                    details={
                      autoVerification.critical.anchorTextCorrect === false 
                        ? `Expected: "${autoVerification.metadata?.anchorTextExpected || 'N/A'}" | Found: "${autoVerification.metadata?.anchorTextActual || 'Not found'}"` 
                        : undefined
                    }
                  />
                  <CheckRow 
                    label="Link is Dofollow" 
                    status={getCheckStatus(autoVerification.critical.linkIsDofollow, 'linkIsDofollow')}
                    isCritical={true}
                    onOverride={createOverrideHandler('linkIsDofollow')}
                    isOverridden={overrides.linkIsDofollow}
                  />
                  <CheckRow 
                    label="Correct Domain" 
                    status={getCheckStatus(autoVerification.critical.correctDomain, 'correctDomain')}
                    isCritical={true}
                    onOverride={createOverrideHandler('correctDomain')}
                    isOverridden={overrides.correctDomain}
                  />
                  <CheckRow 
                    label="Client Mention Present" 
                    status={getCheckStatus(autoVerification.critical.clientMentionPresent, 'clientMentionPresent')}
                    isCritical={true}
                    onOverride={createOverrideHandler('clientMentionPresent')}
                    isOverridden={overrides.clientMentionPresent}
                  />
                </div>
              </div>

              {/* Additional Checks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Quality Checks</h4>
                <div className="space-y-2">
                  <CheckRow 
                    label="Google Indexed" 
                    status={getCheckStatus(autoVerification.additional.googleIndexed)}
                    details={autoVerification.metadata.googleIndexStatus ? 
                      `Status: ${autoVerification.metadata.googleIndexStatus}` : undefined}
                  />
                  <CheckRow 
                    label="Images Present" 
                    status={getCheckStatus(autoVerification.additional.imagesPresent)}
                  />
                  <CheckRow 
                    label="URL Matches Suggestion" 
                    status={getCheckStatus(autoVerification.additional.urlMatchesSuggestion)}
                  />
                </div>
              </div>

              {autoVerification.metadata.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-red-800 mb-2">Verification Errors</h5>
                  <ul className="space-y-1">
                    {autoVerification.metadata.errors.map((error: string, index: number) => (
                      <li key={index} className="text-xs text-red-700">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {/* Payment Authorization */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="font-medium text-gray-900">Payment Authorization</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Publisher Payment</p>
                  <p className="font-medium text-lg">{agreedPrice || 'Not specified'}</p>
                  <p className="text-sm text-gray-500">Site: {guestPostSite}</p>
                </div>
                {!step.outputs.paymentAuthorized ? (
                  <button
                    onClick={handlePaymentAuthorization}
                    disabled={!criticalChecksPassed}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      criticalChecksPassed
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Shield className="w-4 h-4 inline mr-2" />
                    Authorize Payment
                  </button>
                ) : (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Authorized</span>
                  </div>
                )}
              </div>
              
              {!criticalChecksPassed && (
                <p className="text-sm text-yellow-600 mt-2">
                  ⚠️ Complete automated verification (all critical checks must pass) before authorizing payment
                </p>
              )}
              
              {step.outputs.paymentAuthorizedAt && (
                <p className="text-sm text-gray-500 mt-2">
                  Authorized on: {new Date(step.outputs.paymentAuthorizedAt).toLocaleString()}
                </p>
              )}
            </div>

            <SavedField
              label="Payment Notes"
              value={step.outputs.paymentNotes || ''}
              placeholder="Invoice number, payment method, transaction ID..."
              onChange={(value) => onChange({ ...step.outputs, paymentNotes: value })}
              isTextarea={true}
              height="h-20"
            />
          </div>
        </div>
      </div>

      {/* Workflow Completion */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center">
            <FileCheck className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="font-medium text-gray-900">Workflow Completion</h3>
          </div>
        </div>
        <div className="p-6">
          {!step.outputs.workflowCompleted ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Once all verification steps are complete and payment is authorized, mark this workflow as complete.
              </p>
              <button
                onClick={handleWorkflowCompletion}
                disabled={!criticalChecksPassed || !step.outputs.paymentAuthorized}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  criticalChecksPassed && step.outputs.paymentAuthorized
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Mark Workflow Complete
              </button>
              
              {(!criticalChecksPassed || !step.outputs.paymentAuthorized) && (
                <div className="mt-3 space-y-1">
                  {!criticalChecksPassed && (
                    <p className="text-sm text-yellow-600">• Complete automated verification (all critical checks must pass)</p>
                  )}
                  {!step.outputs.paymentAuthorized && (
                    <p className="text-sm text-yellow-600">• Authorize payment to publisher</p>
                  )}
                </div>
              )}

              {/* Force Deliver Option - Only shows when QA failed but article is published */}
              {canForceDeliver && !hasManualOverride && (
                <div className="mt-6 border-t pt-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">⚠️ QA Checks Failed</h4>
                    <p className="text-sm text-red-700 mb-3">
                      The article has been published but failed {6 - (autoVerification?.score?.criticalPassed || 0)} critical QA checks.
                      You can force delivery if the client accepts the article despite these issues.
                    </p>
                    <button
                      onClick={handleForceDeliver}
                      className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      <Shield className="w-4 h-4 inline mr-2" />
                      Force Deliver (Override QA)
                    </button>
                  </div>
                </div>
              )}

              {/* Show if manual override was applied */}
              {hasManualOverride && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ Manual Override Applied
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    This workflow was delivered despite QA failures.
                    {step.outputs.manualOverride?.appliedAt && (
                      <span> Applied on {new Date(step.outputs.manualOverride.appliedAt).toLocaleString()}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Workflow Complete!</h4>
              </div>
              <p className="text-sm text-green-800">
                Completed on: {new Date(step.outputs.completedAt).toLocaleString()}
              </p>
              <div className="mt-3 space-y-1 text-sm text-green-700">
                <p>✓ Article published and verified</p>
                <p>✓ All critical verification checks passed</p>
                <p>✓ Payment authorized to publisher</p>
                <p>✓ Workflow successfully completed</p>
              </div>
            </div>
          )}

          {/* Final Notes */}
          <div className="mt-4">
            <SavedField
              label="Completion Notes"
              value={step.outputs.completionNotes || ''}
              placeholder="Any final notes or observations about this workflow..."
              onChange={(value) => onChange({ ...step.outputs, completionNotes: value })}
              isTextarea={true}
              height="h-20"
            />
          </div>
        </div>
      </div>

      {/* Summary Status */}
      {step.outputs.workflowCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-blue-900">Workflow Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Published URL:</p>
              <p className="font-medium text-blue-900">{step.outputs.verifiedUrl || publishedUrl}</p>
            </div>
            <div>
              <p className="text-blue-700">Payment Status:</p>
              <p className="font-medium text-blue-900">Authorized - {agreedPrice}</p>
            </div>
            <div>
              <p className="text-blue-700">Verification Score:</p>
              <p className="font-medium text-blue-900">
                {autoVerification?.score.criticalPassed || 0}/{autoVerification?.score.criticalTotal || 6} critical checks passed
              </p>
            </div>
            <div>
              <p className="text-blue-700">Completion Date:</p>
              <p className="font-medium text-blue-900">
                {new Date(step.outputs.completedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Missing Fields Modal */}
      <MissingFieldsModal
        isOpen={showMissingFields}
        onClose={() => setShowMissingFields(false)}
        missingFields={missingFields}
        onRetry={runAutoVerification}
      />
    </div>
  );
};