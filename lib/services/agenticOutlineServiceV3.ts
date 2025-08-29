import OpenAI from 'openai';
import { db } from '@/lib/db/connection';
import { outlineSessions, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { resolveTargetUrl } from '@/lib/utils/workflowUtils';

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
  console.log(`🔌 SSE connection added for session ${sessionId}`);
}

export function removeSSEConnection(sessionId: string) {
  activeStreams.delete(sessionId);
  console.log(`🔌 SSE connection removed for session ${sessionId}`);
}

function ssePush(sessionId: string, payload: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) {
    console.log(`⚠️ No SSE connection found for session ${sessionId}`);
    return;
  }
  
  try {
    const data = JSON.stringify(payload);
    stream.write(`data: ${data}\n\n`);
    console.log(`📡 SSE pushed to ${sessionId}:`, payload.type);
  } catch (error) {
    console.error(`❌ SSE push failed for ${sessionId}:`, error);
    activeStreams.delete(sessionId);
  }
}

export class AgenticOutlineServiceV3 {
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
      // Check for existing active session with unique constraint protection
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
      
      // Resolve target URL from the new system
      const targetUrl = await resolveTargetUrl(content);
      
      const metadata = {
        keyword: topicStep?.outputs?.finalKeyword,
        postTitle: topicStep?.outputs?.postTitle,
        clientTargetUrl: targetUrl,
      };

      // Create session in database with active flag and streaming support
      await db.insert(outlineSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'deep-research',
        status: 'queued',
        outlinePrompt: sanitizeForPostgres(outlinePrompt),
        sessionMetadata: metadata,
        isActive: true, // Mark as active
        lastSequenceNumber: 0, // Initialize streaming sequence
        connectionStatus: 'preparing', // Track connection state
        streamStartedAt: null, // Will be set when streaming begins
        partialContent: '', // Store streaming content
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`🚀 Starting streaming outline generation session ${sessionId} for workflow ${workflowId}`);
      ssePush(sessionId, { 
        type: 'status', 
        status: 'queued', 
        message: 'Starting deep research with real-time streaming...',
        sequenceNumber: 0
      });

      // Create the enhanced prompt for deep research
      const enhancedPrompt = `${outlinePrompt}

RESEARCH INSTRUCTIONS:
You must conduct thorough web research before creating the outline. Follow these steps:
1. Search for current information about the topic
2. Analyze competitor content and gaps  
3. Find recent studies, statistics, and expert insights
4. Create a comprehensive research-based outline

Begin your research now.`;

      // Start the streaming response generation
      // Note: o3-deep-research model requires at least one tool to be specified
      const response = await this.getClient().responses.create({
        model: 'o3-deep-research',
        input: enhancedPrompt,
        background: true,
        stream: true, // Enable streaming
        store: true, // Required for background mode
        tools: [
          { type: 'web_search_preview' } // Required for o3-deep-research model
        ]
      });

      console.log(`🌊 Streaming response created`);

      // Update session with streaming response ID and mark streaming as started
      // Note: Streaming responses don't have an ID property, but we track internally
      await db.update(outlineSessions)
        .set({
          backgroundResponseId: `stream-${sessionId}`, // Use session ID for tracking
          status: 'streaming_started',
          connectionStatus: 'connected',
          streamStartedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      // Start processing the stream in background
      this.processStream(sessionId, response);

      ssePush(sessionId, { 
        type: 'status', 
        status: 'streaming_started', 
        message: 'Deep research started with real-time streaming enabled.',
        responseId: `stream-${sessionId}`,
        sequenceNumber: 1
      });

      return { 
        sessionId, 
        status: 'streaming_started',
        message: 'Research started with real-time streaming. Content will appear as it\'s generated.'
      };

    } catch (error: any) {
      console.error('❌ Error starting streaming outline generation:', error);
      
      if (sessionId) {
        // Always mark failed sessions as inactive
        await db.update(outlineSessions)
          .set({
            status: 'error',
            errorMessage: error.message,
            isActive: false, // Important: mark as inactive on error
            connectionStatus: 'failed',
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, sessionId));

        ssePush(sessionId, { 
          type: 'error', 
          error: error.message,
          sequenceNumber: -1 
        });
      }
      
      throw error;
    }
  }

  private async processStream(sessionId: string, response: any) {
    let sequenceNumber = 2;
    let partialContent = '';
    
    try {
      console.log(`🌊 Starting stream processing for session ${sessionId}`);
      
      // Process the stream
      for await (const event of response.toStream()) {
        try {
          if (event.delta?.text) {
            // Accumulate streaming content
            partialContent += event.delta.text;
            
            // Update database with partial content and sequence
            await db.update(outlineSessions)
              .set({
                partialContent: sanitizeForPostgres(partialContent),
                lastSequenceNumber: sequenceNumber,
                updatedAt: new Date()
              })
              .where(eq(outlineSessions.id, sessionId));

            // Stream to connected clients
            ssePush(sessionId, {
              type: 'content_delta',
              delta: event.delta.text,
              partialContent,
              sequenceNumber,
              message: 'Research content streaming...'
            });
            
            sequenceNumber++;
          }
          
          if (event.type === 'response.completed') {
            // Research completed
            const finalContent = partialContent || event.response?.output || '';
            const citations = this.extractCitations(finalContent);

            // Mark as completed and inactive
            await db.update(outlineSessions)
              .set({
                status: 'completed',
                finalOutline: sanitizeForPostgres(finalContent),
                citations,
                connectionStatus: 'completed',
                isActive: false, // Mark as inactive
                completedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(outlineSessions.id, sessionId));

            ssePush(sessionId, {
              type: 'completed',
              outline: finalContent,
              citations,
              sequenceNumber,
              message: 'Research outline completed successfully!'
            });

            console.log(`✅ Stream completed for session ${sessionId}`);
            break;
          }
          
          if (event.type === 'response.failed' || event.type === 'response.cancelled') {
            const errorMsg = `Research ${event.type}: ${event.error?.message || 'Unknown error'}`;
            
            await db.update(outlineSessions)
              .set({
                status: 'error',
                errorMessage: errorMsg,
                connectionStatus: 'failed',
                isActive: false, // Mark as inactive
                updatedAt: new Date()
              })
              .where(eq(outlineSessions.id, sessionId));

            ssePush(sessionId, {
              type: 'error',
              error: errorMsg,
              sequenceNumber
            });

            console.log(`❌ Stream failed for session ${sessionId}: ${errorMsg}`);
            break;
          }
          
        } catch (eventError) {
          console.error(`❌ Error processing stream event for ${sessionId}:`, eventError);
          // Continue processing other events
        }
      }
      
    } catch (streamError: any) {
      console.error(`❌ Stream processing error for ${sessionId}:`, streamError);
      
      // Mark session as failed
      await db.update(outlineSessions)
        .set({
          status: 'error',
          errorMessage: `Stream processing failed: ${streamError.message}`,
          connectionStatus: 'failed',
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, {
        type: 'error',
        error: `Stream processing failed: ${streamError.message}`,
        sequenceNumber
      });
    }
  }

  async getStreamStatus(sessionId: string, clientSequenceNumber?: number): Promise<{
    status: string;
    outline?: string;
    citations?: any[];
    partialContent?: string;
    sequenceNumber?: number;
    connectionStatus?: string;
    error?: string;
    hasNewContent?: boolean;
  }> {
    try {
      // Get session from database
      const session = await db.query.outlineSessions.findFirst({
        where: eq(outlineSessions.id, sessionId)
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Check if client has new content to receive
      const hasNewContent = clientSequenceNumber ? 
        (session.lastSequenceNumber || 0) > clientSequenceNumber : 
        true;

      // If already completed or errored, return final result
      if (session.status === 'completed' || session.status === 'error') {
        return {
          status: session.status,
          outline: session.finalOutline || undefined,
          citations: session.citations as any[] || [],
          connectionStatus: session.connectionStatus || 'unknown',
          sequenceNumber: session.lastSequenceNumber || 0,
          hasNewContent,
          error: session.errorMessage || undefined
        };
      }

      // Return current streaming state
      return {
        status: session.status,
        partialContent: session.partialContent || '',
        connectionStatus: session.connectionStatus || 'unknown',
        sequenceNumber: session.lastSequenceNumber || 0,
        hasNewContent
      };

    } catch (error: any) {
      console.error('❌ Error getting stream status:', error);
      return { 
        status: 'error', 
        error: error.message,
        connectionStatus: 'failed',
        hasNewContent: false
      };
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

      // For streaming sessions, we mark as cancelled rather than calling OpenAI cancel
      // since streaming responses don't have cancellable IDs
      await db.update(outlineSessions)
        .set({
          status: 'cancelled',
          connectionStatus: 'cancelled',
          isActive: false, // Mark as inactive
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, { 
        type: 'cancelled', 
        message: 'Research cancelled by user',
        sequenceNumber: -1
      });

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
export const agenticOutlineServiceV3 = new AgenticOutlineServiceV3();