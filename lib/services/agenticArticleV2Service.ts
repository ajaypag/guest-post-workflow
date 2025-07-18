import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { orchestratorAgentV2 } from '@/lib/agents/orchestratorV2';
import { db } from '@/lib/db/connection';
import { workflows, v2AgentSessions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { assistantSentPlainText } from '@/lib/utils/agentUtils';

// Helper function to sanitize strings for PostgreSQL
function sanitizeForPostgres(str: string): string {
  if (!str) return str;
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

function sseUpdate(sessionId: string, payload: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('SSE push failed:', error);
    activeStreams.delete(sessionId);
  }
}

export class AgenticArticleV2Service {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startSession(workflowId: string, outline: string): Promise<string> {
    try {
      // Get the next version number for this workflow
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${v2AgentSessions.version}), 0)`.as('maxVersion')
      })
      .from(v2AgentSessions)
      .where(eq(v2AgentSessions.workflowId, workflowId));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      const sessionId = uuidv4();
      const now = new Date();
      
      // Create session in database
      await db.insert(v2AgentSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'article-draft-v2',
        status: 'initializing',
        outline: sanitizeForPostgres(outline),
        totalSections: 0,
        completedSections: 0,
        sessionMetadata: {
          startedAt: now.toISOString(),
          version: nextVersion,
          model: 'o3-2025-04-16'
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      console.log(`🚀 V2 Session ${sessionId} created for workflow ${workflowId}, version ${nextVersion}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to start V2 session:', error);
      throw new Error('Failed to initialize V2 article generation session');
    }
  }

  async performArticleGeneration(sessionId: string): Promise<void> {
    let conversationActive = true;
    let retries = 0;
    const MAX_RETRIES = 3;
    
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      await this.updateSession(sessionId, { status: 'orchestrating' });
      sseUpdate(sessionId, { type: 'status', status: 'orchestrating', message: 'Starting article orchestration...' });

      // Create the initial prompt - same as manual ChatGPT flow
      const initialPrompt = `Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing. After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking 3 citations only and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.

WRITING STYLE: You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use "we" and "you" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like "might" or "could." Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message but try to write in natural, paragraph-based prose that prioritizes clarity, flow, and coherence—like a knowledgeable human explaining the topic conversationally and thoughtfully. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points.

${session.outline}`;

      // Create Runner for orchestrator
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Maintain conversation history
      const messages: any[] = [
        { role: 'user', content: initialPrompt }
      ];

      console.log(`🎯 Starting orchestrator with initial prompt (${initialPrompt.length} chars)`);
      sseUpdate(sessionId, { type: 'prompt_sent', message: 'Initial prompt sent to orchestrator' });

      while (conversationActive) {
        // Run orchestrator with message history
        const result = await runner.run(orchestratorAgentV2, messages, {
          stream: true,
          maxTurns: 50
        });

        // Process streaming result
        for await (const event of result.toStream()) {
          // Check for text-only responses (learning from CLAUDE.md)
          if (assistantSentPlainText(event)) {
            messages.push({ 
              role: 'system', 
              content: '🚨 You MUST use the write_section tool to generate content. Do not output text directly.'
            });
            retries += 1;
            if (retries > MAX_RETRIES) {
              throw new Error('Orchestrator not using tools properly after multiple retries');
            }
            break; // Restart loop
          }

          // Handle different event types
          if (event.type === 'run_item_stream_event') {
            if (event.name === 'tool_called') {
              const toolCall = event.item as any;
              console.log(`🔧 Tool called: ${toolCall.name}`);
              
              messages.push({
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: toolCall.id,
                  type: 'function',
                  function: {
                    name: toolCall.name,
                    arguments: toolCall.args ? JSON.stringify(toolCall.args) : '{}'
                  }
                }]
              });
              
              sseUpdate(sessionId, { 
                type: 'tool_call', 
                name: toolCall.name,
                message: 'Writer agent working on section...' 
              });
            }

            if (event.name === 'tool_output') {
              const toolOutput = event.item as any;
              console.log(`📝 Tool output received:`, toolOutput.output);
              
              messages.push({
                role: 'tool',
                content: JSON.stringify({ output: toolOutput.output }),
                tool_call_id: toolOutput.tool_call_id
              });

              // Parse writer output to track progress
              try {
                const writerOutput = JSON.parse(toolOutput.output);
                if (writerOutput.content) {
                  const sectionCount = (session.completedSections || 0) + 1;
                  await this.updateSession(sessionId, {
                    completedSections: sectionCount,
                    currentWordCount: (session.currentWordCount || 0) + writerOutput.content.split(/\s+/).length
                  });
                  
                  sseUpdate(sessionId, {
                    type: 'section_completed',
                    sectionNumber: sectionCount,
                    content: writerOutput.content,
                    wordCount: writerOutput.content.split(/\s+/).length,
                    done: writerOutput.done
                  });
                }
              } catch (e) {
                console.error('Error parsing writer output:', e);
              }
            }

            if (event.name === 'message_output_created') {
              const messageItem = event.item as any;
              if (messageItem.tool_calls?.length) {
                retries = 0; // Reset retries on successful tool use
              }
            }
          }

          // Stream text deltas for UI
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              sseUpdate(sessionId, { type: 'text', content: event.data.delta });
            }
          }
        }

        // Check if orchestrator returned final output
        const finalOutput = await result.finalOutput;
        if (finalOutput?.fullArticle) {
          console.log(`✅ Orchestrator completed: ${finalOutput.wordCount} words`);
          
          // Save final article
          await this.saveArticleToWorkflow(session.workflowId, finalOutput.fullArticle);
          
          await this.updateSession(sessionId, {
            status: 'completed',
            finalArticle: sanitizeForPostgres(finalOutput.fullArticle),
            totalWordCount: finalOutput.wordCount,
            completedAt: new Date()
          });
          
          sseUpdate(sessionId, {
            type: 'completed',
            finalArticle: finalOutput.fullArticle,
            wordCount: finalOutput.wordCount,
            message: 'Article generation completed successfully!'
          });
          
          conversationActive = false;
        }

        // Safety limit
        if (messages.length > 100) {
          console.log('Safety limit reached');
          conversationActive = false;
        }
      }

    } catch (error: any) {
      console.error('❌ V2 article generation failed:', error);
      await this.updateSession(sessionId, {
        status: 'failed',
        errorMessage: error.message
      });
      sseUpdate(sessionId, { type: 'error', error: error.message });
      throw error;
    }
  }

  private async saveArticleToWorkflow(workflowId: string, article: string): Promise<void> {
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const articleStep = workflowData.steps?.find((step: any) => step.id === 'article-draft');
      
      if (articleStep) {
        articleStep.outputs = {
          ...articleStep.outputs,
          fullArticle: article,
          wordCount: article.split(/\s+/).length,
          agentV2Generated: true,
          generatedAt: new Date().toISOString(),
          draftStatus: 'completed'
        };

        await db.update(workflows)
          .set({
            content: workflowData,
            updatedAt: new Date()
          })
          .where(eq(workflows.id, workflowId));
      }
    }
  }

  private async getSession(sessionId: string) {
    const sessions = await db.select().from(v2AgentSessions).where(eq(v2AgentSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateSession(sessionId: string, updates: Partial<any>) {
    await db.update(v2AgentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(v2AgentSessions.id, sessionId));
  }

  async getSessionProgress(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    return {
      session,
      progress: {
        status: session.status,
        completedSections: session.completedSections || 0,
        currentWordCount: session.currentWordCount || 0,
        totalWordCount: session.totalWordCount || 0,
        errorMessage: session.errorMessage
      }
    };
  }
}

export const agenticArticleV2Service = new AgenticArticleV2Service();