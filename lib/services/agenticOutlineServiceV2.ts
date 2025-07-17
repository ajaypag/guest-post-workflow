import OpenAI from 'openai';
import { db } from '@/lib/db/connection';
import { outlineSessions, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper function to sanitize any input by converting to string and removing control characters
function sanitizeForPostgres(input: any): string {
  if (input === null || input === undefined) return '';
  
  // Convert any type to string safely
  let str: string;
  if (typeof input === 'string') {
    str = input;
  } else if (typeof input === 'object') {
    str = JSON.stringify(input);
  } else {
    str = String(input);
  }
  
  // Remove null bytes and other control characters (0x00-0x1F except tab, newline, carriage return)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// Store active SSE connections for real-time updates
const activeStreams = new Map<string, any>();

export function addSSEConnection(sessionId: string, res: any) {
  activeStreams.set(sessionId, res);
}

export function removeSSEConnection(sessionId: string) {
  activeStreams.delete(sessionId);
}

function ssePush(sessionId: string, payload: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('SSE push failed:', error);
    activeStreams.delete(sessionId);
  }
}

export class AgenticOutlineServiceV2 {
  private client: OpenAI | null = null;
  
  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.client;
  }

  async startOutlineGeneration(workflowId: string, outlinePrompt: string): Promise<{
    sessionId: string;
    status: string;
    message: string;
    existingSessionId?: string;
  }> {
    let sessionId: string | undefined;
    
    try {
      // Check for existing active session
      const activeSession = await db.query.outlineSessions.findFirst({
        where: and(
          eq(outlineSessions.workflowId, workflowId),
          eq(outlineSessions.isActive, true)
        )
      });

      if (activeSession) {
        // Check if it's a failed or stuck session
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const isStuck = activeSession.startedAt < thirtyMinutesAgo && 
                       (activeSession.status === 'queued' || activeSession.status === 'in_progress');
        const isFailed = activeSession.status === 'error' || activeSession.status === 'failed';

        if (isFailed || isStuck) {
          // Auto-cleanup failed or stuck session
          console.log(`🧹 Auto-cleaning ${isFailed ? 'failed' : 'stuck'} session ${activeSession.id}`);
          await db.update(outlineSessions)
            .set({
              isActive: false,
              status: isFailed ? activeSession.status : 'error',
              errorMessage: isStuck ? 'Session timed out after 30 minutes' : activeSession.errorMessage,
              updatedAt: new Date()
            })
            .where(eq(outlineSessions.id, activeSession.id));
          
          // Continue to create new session
          console.log('✅ Cleaned up old session, creating new one...');
        } else {
          // Return existing active session if it's still valid
          console.log(`⚠️ Active session already exists for workflow ${workflowId}: ${activeSession.id}`);
          return {
            sessionId: activeSession.id,
            status: 'already_active',
            message: 'An outline generation is already in progress for this workflow.',
            existingSessionId: activeSession.id
          };
        }
      }

      // Get the next version number for this workflow
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${outlineSessions.version}), 0)`.as('maxVersion')
      })
      .from(outlineSessions)
      .where(eq(outlineSessions.workflowId, workflowId));

      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      sessionId = uuidv4();

      // Get workflow metadata for context
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId)
      });

      const content = workflow?.content as any;
      const topicStep = content?.steps?.find((s: any) => s.id === 'topic-generation');
      
      const metadata = {
        keyword: topicStep?.outputs?.finalKeyword,
        postTitle: topicStep?.outputs?.postTitle,
        clientTargetUrl: topicStep?.outputs?.clientTargetUrl,
      };

      // Create session in database with active flag
      await db.insert(outlineSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'deep-research',
        status: 'queued',
        outlinePrompt: sanitizeForPostgres(outlinePrompt),
        sessionMetadata: metadata,
        isActive: true, // Mark as active
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`🤖 Starting outline generation session ${sessionId} for workflow ${workflowId}`);
      ssePush(sessionId, { type: 'status', status: 'queued', message: 'Starting deep research in background mode...' });

      // Create the enhanced prompt for deep research
      const enhancedPrompt = `${outlinePrompt}

RESEARCH INSTRUCTIONS:
You must conduct thorough web research before creating the outline. Follow these steps:
1. Search for current information about the topic
2. Analyze competitor content and gaps  
3. Find recent studies, statistics, and expert insights
4. Create a comprehensive research-based outline

Begin your research now.`;

      // Start the background response generation
      // Note: o3-deep-research model requires at least one tool to be specified
      const response = await this.getClient().responses.create({
        model: 'o3-deep-research',
        input: enhancedPrompt,
        background: true,
        store: true, // Required for background mode
        tools: [
          { type: 'web_search_preview' } // Required for o3-deep-research model
        ]
      });

      console.log(`🚀 Background response created with ID: ${response.id}`);

      // Update session with background response ID
      await db.update(outlineSessions)
        .set({
          backgroundResponseId: response.id,
          status: response.status,
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, { 
        type: 'status', 
        status: 'background_started', 
        message: 'Deep research started in background. This may take 10-15 minutes.',
        responseId: response.id 
      });

      return { 
        sessionId, 
        status: 'background_started',
        message: 'Research started in background mode. Poll for updates.'
      };

    } catch (error: any) {
      console.error('❌ Error starting outline generation:', error);
      
      if (sessionId) {
        // Always mark failed sessions as inactive
        await db.update(outlineSessions)
          .set({
            status: 'error',
            errorMessage: error.message,
            isActive: false, // Important: mark as inactive on error
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, sessionId));

        ssePush(sessionId, { type: 'error', error: error.message });
      }
      
      throw error;
    }
  }

  async checkOutlineStatus(sessionId: string): Promise<{
    status: string;
    outline?: string;
    citations?: any[];
    progress?: string;
    error?: string;
  }> {
    try {
      // Get session from database
      const session = await db.query.outlineSessions.findFirst({
        where: eq(outlineSessions.id, sessionId)
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // If already completed or errored, return cached result
      if (session.status === 'completed' || session.status === 'error') {
        return {
          status: session.status,
          outline: session.finalOutline || undefined,
          citations: session.citations as any[] || [],
          error: session.errorMessage || undefined
        };
      }

      // If no background response ID, something went wrong
      if (!session.backgroundResponseId) {
        throw new Error('No background response ID found');
      }

      // Poll the OpenAI API for status
      const response = await this.getClient().responses.retrieve(session.backgroundResponseId);
      
      console.log(`📊 Polling response ${response.id}: status=${response.status}`);

      // Update polling info
      await db.update(outlineSessions)
        .set({
          status: response.status,
          pollingAttempts: sql`${outlineSessions.pollingAttempts} + 1`,
          lastPolledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      // Handle different statuses
      switch (response.status) {
        case 'queued':
          ssePush(sessionId, { 
            type: 'status', 
            status: 'queued', 
            message: 'Research is queued and will start soon...' 
          });
          return { status: 'queued', progress: 'Waiting in queue...' };

        case 'in_progress':
          ssePush(sessionId, { 
            type: 'status', 
            status: 'in_progress', 
            message: 'Deep research is in progress. This typically takes 10-15 minutes...' 
          });
          return { status: 'in_progress', progress: 'Conducting deep research...' };

        case 'completed':
          // Extract the output
          const output = response.output;
          let finalOutline = '';
          
          if (typeof output === 'string') {
            finalOutline = sanitizeForPostgres(output);
          } else if (output && typeof output === 'object') {
            // Handle structured output
            const textContent = (output as any).text || 
                               (output as any).content || 
                               (output as any).output_text ||
                               JSON.stringify(output);
            finalOutline = sanitizeForPostgres(textContent);
          }

          const citations = this.extractCitations(finalOutline);

          // Save to database and mark as inactive
          await db.update(outlineSessions)
            .set({
              status: 'completed',
              finalOutline,
              citations,
              isActive: false, // Mark as inactive
              completedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(outlineSessions.id, sessionId));

          ssePush(sessionId, { 
            type: 'completed', 
            outline: finalOutline,
            citations,
            message: 'Research outline completed successfully!'
          });

          return { 
            status: 'completed', 
            outline: finalOutline, 
            citations 
          };

        case 'failed':
        case 'cancelled':
          const errorMsg = `Research ${response.status}: ${(response as any).error?.message || 'Unknown error'}`;
          
          await db.update(outlineSessions)
            .set({
              status: 'error',
              errorMessage: errorMsg,
              isActive: false, // Mark as inactive
              updatedAt: new Date()
            })
            .where(eq(outlineSessions.id, sessionId));

          ssePush(sessionId, { type: 'error', error: errorMsg });

          return { 
            status: 'error', 
            error: errorMsg 
          };

        default:
          return { 
            status: response.status || 'unknown', 
            progress: `Status: ${response.status || 'unknown'}` 
          };
      }

    } catch (error: any) {
      console.error('❌ Error checking outline status:', error);
      
      await db.update(outlineSessions)
        .set({
          status: 'error',
          errorMessage: error.message,
          isActive: false, // Mark as inactive on error
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, { type: 'error', error: error.message });
      
      return { status: 'error', error: error.message };
    }
  }

  async cancelOutlineGeneration(sessionId: string): Promise<{ success: boolean }> {
    try {
      const session = await db.query.outlineSessions.findFirst({
        where: eq(outlineSessions.id, sessionId)
      });

      if (!session || !session.backgroundResponseId) {
        throw new Error('Session not found or no background response');
      }

      // Cancel the OpenAI background response
      await this.getClient().responses.cancel(session.backgroundResponseId);

      // Update database and mark as inactive
      await db.update(outlineSessions)
        .set({
          status: 'cancelled',
          isActive: false, // Mark as inactive
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, { type: 'cancelled', message: 'Research cancelled by user' });

      return { success: true };

    } catch (error: any) {
      console.error('Error cancelling outline generation:', error);
      throw error;
    }
  }

  private extractCitations(outline: string): any[] {
    // Extract URLs and sources from the outline
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = outline.match(urlRegex) || [];
    
    // Extract source references (common patterns)
    const sourceRegex = /(?:Source:|Reference:|According to:?)\s*([^\n]+)/gi;
    const sources: string[] = [];
    let match;
    
    while ((match = sourceRegex.exec(outline)) !== null) {
      sources.push(match[1].trim());
    }

    // Combine and deduplicate
    const citations = [
      ...new Set([
        ...urls.map(url => ({ type: 'url', value: url.replace(/[.,;:]$/, '') })),
        ...sources.map(source => ({ type: 'source', value: source }))
      ])
    ];

    return citations;
  }

  async getLatestSession(workflowId: string): Promise<any> {
    // First try to find an active session
    const activeSession = await db.query.outlineSessions.findFirst({
      where: and(
        eq(outlineSessions.workflowId, workflowId),
        eq(outlineSessions.isActive, true)
      )
    });

    if (activeSession) {
      return activeSession;
    }

    // If no active session, get the latest one
    const session = await db.query.outlineSessions.findFirst({
      where: eq(outlineSessions.workflowId, workflowId),
      orderBy: (sessions, { desc }) => [desc(sessions.version)]
    });

    return session;
  }
}

// Singleton instance
export const agenticOutlineServiceV2 = new AgenticOutlineServiceV2();