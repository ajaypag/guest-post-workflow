/**
 * Publication Verification API Endpoint
 * Verifies published guest posts meet all requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { WorkflowService } from '@/lib/db/workflowService';
import { PublicationVerificationService } from '@/lib/services/publicationVerificationService';
import { WorkflowLineItemSyncService } from '@/lib/services/workflowLineItemSyncService';
import { WebScrapingService } from '@/lib/services/webScrapingService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] Publication verification endpoint called');
    
    // Authentication check - only internal users can verify
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can verify publications' }, { status: 403 });
    }
    
    const { id: workflowId } = await params;
    const body = await request.json();
    const { publishedUrl } = body;
    
    console.log(`[API] Verifying workflow ${workflowId} with URL ${publishedUrl}`);
    
    // Validate input
    if (!publishedUrl) {
      return NextResponse.json({ 
        error: 'Published URL is required' 
      }, { status: 400 });
    }
    
    // Validate URL format
    try {
      new URL(publishedUrl);
    } catch {
      return NextResponse.json({ 
        error: 'Invalid URL format' 
      }, { status: 400 });
    }
    
    // Get workflow
    const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    
    console.log(`[API] Found workflow: ${workflow.clientName} - ${workflow.targetDomain}`);
    
    // Get associated line item (if exists)
    const lineItem = await WorkflowLineItemSyncService.findLineItemByWorkflowId(workflowId);
    
    // Check required fields
    const requiredFields = PublicationVerificationService.checkRequiredFields(lineItem, workflow);
    
    if (requiredFields.missing.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields for verification',
        missingFields: requiredFields.missing,
        requiresInput: true
      }, { status: 400 });
    }
    
    // Run verification
    const verificationResult = await PublicationVerificationService.autoVerify(
      publishedUrl,
      lineItem,
      workflow
    );
    
    // Sync results to line item if it exists
    if (lineItem) {
      const syncResult = await WorkflowLineItemSyncService.syncVerificationToLineItem(
        workflowId,
        verificationResult,
        publishedUrl,
        session.userId
      );
      
      if (!syncResult.success) {
        console.error(`[API] Failed to sync to line item: ${syncResult.error}`);
      }
    }
    
    // Get rate limit status for client
    const rateLimitStatus = WebScrapingService.getRateLimitStatus();
    
    // Return results
    return NextResponse.json({
      success: true,
      workflowId,
      publishedUrl,
      verificationResult,
      lineItemUpdated: !!lineItem,
      rateLimitStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[API] Error in publication verification:', error);
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json({
        error: error.message,
        rateLimitError: true
      }, { status: 429 });
    }
    
    return NextResponse.json({
      error: 'Failed to verify publication',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check verification status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const { id: workflowId } = await params;
    
    // Get workflow
    const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    
    // Check if publication-verification step has results
    const verificationStep = workflow.steps.find(s => s.id === 'publication-verification');
    
    if (!verificationStep) {
      return NextResponse.json({
        workflowId,
        hasVerificationStep: false,
        verificationStatus: 'not-started'
      });
    }
    
    const hasResults = !!verificationStep.outputs?.autoVerification;
    const lastVerified = verificationStep.outputs?.lastVerifiedAt;
    
    // Get rate limit status
    const rateLimitStatus = WebScrapingService.getRateLimitStatus();
    
    return NextResponse.json({
      workflowId,
      hasVerificationStep: true,
      verificationStatus: hasResults ? 'completed' : 'pending',
      lastVerifiedAt: lastVerified,
      verificationResults: verificationStep.outputs?.autoVerification || null,
      manualChecks: verificationStep.outputs?.manualChecks || null,
      publishedUrl: verificationStep.outputs?.verifiedUrl || verificationStep.outputs?.publishedUrl || null,
      rateLimitStatus
    });
    
  } catch (error) {
    console.error('[API] Error getting verification status:', error);
    return NextResponse.json({
      error: 'Failed to get verification status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}