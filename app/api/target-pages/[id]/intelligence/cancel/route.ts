import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { intelligenceGenerationLogs } from '@/lib/db/intelligenceLogsSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import OpenAI from 'openai';
import { targetPageIntelligenceService } from '@/lib/services/targetPageIntelligenceService';

/**
 * POST /api/target-pages/[id]/intelligence/cancel
 * 
 * Checks and recovers stuck intelligence generation sessions.
 * First attempts to retrieve results from OpenAI.
 * Only marks as failed if OpenAI confirms failure.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetPageId } = await params;
    const body = await request.json();
    const { sessionId } = body;
    
    // Authenticate user
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First get the session to check its status
    const existingSessions = await db
      .select()
      .from(targetPageIntelligence)
      .where(eq(targetPageIntelligence.targetPageId, targetPageId))
      .limit(1);
    
    if (existingSessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }
    
    const existingSession = existingSessions[0];
    
    // Check and recover the OpenAI session if it exists
    if (existingSession.researchSessionId && existingSession.researchStatus === 'in_progress') {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        console.log(`Checking OpenAI session status: ${existingSession.researchSessionId}`);
        
        // Check the actual status from OpenAI
        const response = await openai.responses.retrieve(existingSession.researchSessionId);
        console.log(`OpenAI session status: ${response.status}`);
        
        if (response.status === 'completed') {
          // SUCCESS! The research actually completed - recover the results
          console.log('✅ Research completed! Recovering results...');
          
          // Use the service's built-in recovery method
          const service = targetPageIntelligenceService as any;
          await service.processCompletedResearch(targetPageId, existingSession.researchSessionId, response);
          
          // Log the recovery
          await db.insert(intelligenceGenerationLogs).values({
            targetPageId,
            sessionType: 'research',
            openaiSessionId: existingSession.researchSessionId,
            startedAt: existingSession.researchStartedAt || new Date(),
            completedAt: new Date(),
            durationSeconds: Math.floor((Date.now() - new Date(existingSession.researchStartedAt || new Date()).getTime()) / 1000),
            status: 'auto_recovered',
            metadata: {
              recoveredBy: session.userId,
              recoveryReason: 'Manual check found completed results'
            },
            initiatedBy: session.userId,
            userType: session.userType
          });
          
          return NextResponse.json({
            success: true,
            message: 'Research completed! Results have been recovered and saved.',
            status: 'recovered',
            action: 'refresh_to_see_results'
          });
          
        } else if (response.status === 'in_progress' || response.status === 'queued') {
          // Still running - don't cancel, just inform
          const minutesElapsed = Math.floor((Date.now() - new Date(existingSession.researchStartedAt || new Date()).getTime()) / (1000 * 60));
          
          return NextResponse.json({
            success: true,
            message: `Research is still running (${minutesElapsed} minutes elapsed). Please wait for completion.`,
            status: 'still_running',
            minutesElapsed,
            openaiStatus: response.status
          });
          
        } else if (response.status === 'failed' || response.status === 'cancelled') {
          // Truly failed - now we can mark it as error and allow restart
          console.log('❌ Research confirmed failed by OpenAI');
          
          await db.update(targetPageIntelligence)
            .set({
              researchStatus: 'error',
              briefStatus: 'error',
              metadata: {
                additionalInfo: JSON.stringify({
                  openaiStatus: response.status,
                  checkedBy: session.userId,
                  checkedAt: new Date().toISOString(),
                  openaiSessionId: existingSession.researchSessionId
                })
              },
              updatedAt: new Date()
            })
            .where(eq(targetPageIntelligence.targetPageId, targetPageId));
          
          // Log the failure confirmation
          await db.insert(intelligenceGenerationLogs).values({
            targetPageId,
            sessionType: 'research',
            openaiSessionId: existingSession.researchSessionId,
            startedAt: existingSession.researchStartedAt || new Date(),
            completedAt: new Date(),
            durationSeconds: Math.floor((Date.now() - new Date(existingSession.researchStartedAt || new Date()).getTime()) / 1000),
            status: 'failed',
            errorMessage: `OpenAI confirmed failure: ${response.status}`,
            metadata: {
              openaiStatus: response.status,
              confirmedBy: session.userId
            },
            initiatedBy: session.userId,
            userType: session.userType
          });
          
          return NextResponse.json({
            success: true,
            message: 'Research confirmed failed. You can now restart the research.',
            status: 'confirmed_failed',
            action: 'can_restart'
          });
        }
        
      } catch (error: any) {
        console.error('Error checking OpenAI session:', error);
        
        // If we can't check OpenAI, mark as error to allow restart
        await db.update(targetPageIntelligence)
          .set({
            researchStatus: 'error',
            briefStatus: 'error',
            metadata: {
              additionalInfo: JSON.stringify({
                errorCheckingOpenAI: error.message,
                checkedBy: session.userId,
                checkedAt: new Date().toISOString()
              })
            },
            updatedAt: new Date()
          })
          .where(eq(targetPageIntelligence.targetPageId, targetPageId));
        
        return NextResponse.json({
          success: false,
          message: 'Could not verify OpenAI session status. Session marked as failed.',
          error: error.message,
          action: 'can_restart'
        });
      }
    } else if (existingSession.researchStatus === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Research already completed.',
        status: 'already_completed'
      });
    } else if (existingSession.researchStatus === 'error') {
      return NextResponse.json({
        success: true,
        message: 'Research already marked as failed. You can restart.',
        status: 'already_failed',
        action: 'can_restart'
      });
    } else {
      return NextResponse.json({
        success: true,
        message: `Research status: ${existingSession.researchStatus}`,
        status: existingSession.researchStatus
      });
    }

  } catch (error: any) {
    console.error('Error cancelling research:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel research',
        details: error.message
      },
      { status: 500 }
    );
  }
}