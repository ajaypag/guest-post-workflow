import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { polisherAgentV2 } from '@/lib/agents/finalPolisherV2';
import { db } from '@/lib/db/connection';
import { workflows, v2AgentSessions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Removed polishParser imports - now using JSON parsing

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

// The three prompts that mirror the ChatGPT tab workflow
const KICKOFF_PROMPT = `Okay, here's my article.

{ARTICLE}

Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips.

Output your analysis as valid JSON with exactly these four fields:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "updatedSection": "Your polished version of the section here - ready to copy-paste",
  "keyImprovements": ["improvement 1", "improvement 2", ...]
}

Important:
- Output ONLY the JSON object, no other text
- Ensure the JSON is valid and properly escaped
- The updatedSection should be a single string with proper line breaks as \n

Start with the first section.

When you reach <!-- END_OF_ARTICLE -->, output: {"status": "complete"}`;

const PROCEED_PROMPT = `Okay that is good. Now, proceed to the next section. Analyze how well it follows the brand guide and content writing and semantic SEO guide, then provide your refined version.

Output your analysis as valid JSON with exactly these four fields:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "updatedSection": "Your polished version of the section here",
  "keyImprovements": ["improvement 1", "improvement 2", ...]
}

Make sure your updated section avoids words from the "words to not use" document. Don't use em-dashes.

When you reach the end of the article or see <!-- END_OF_ARTICLE -->, output: {"status": "complete"}`;

export class AgenticFinalPolishV2Service {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startSession(workflowId: string): Promise<string> {
    try {
      // Get the SEO-optimized article from workflow
      const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
      if (!workflow[0]?.content) throw new Error('Workflow not found');
      
      const workflowData = workflow[0].content as any;
      const contentAuditStep = workflowData.steps?.find((s: any) => s.id === 'content-audit');
      const articleDraftStep = workflowData.steps?.find((s: any) => s.id === 'article-draft');
      
      // Get SEO-optimized article or fall back to original
      const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
      const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
      const fullArticle = seoOptimizedArticle || originalArticle;
      
      if (!fullArticle) {
        throw new Error('No article found to polish. Complete Step 5 (Semantic SEO) first.');
      }

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
        stepId: 'final-polish-v2',
        status: 'initializing',
        outline: sanitizeForPostgres(fullArticle), // Store the article to polish
        totalSections: 0,
        completedSections: 0,
        sessionMetadata: {
          startedAt: now.toISOString(),
          version: nextVersion,
          model: 'o3-2025-04-16',
          usingSeoDraft: !!seoOptimizedArticle
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      console.log(`🎨 V2 Polish Session ${sessionId} created for workflow ${workflowId}, version ${nextVersion}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to start V2 polish session:', error);
      throw new Error('Failed to initialize V2 polish session');
    }
  }

  async performPolish(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      const fullArticle = session.outline; // Article stored in outline field
      if (!fullArticle) throw new Error('No article to polish in session');

      await this.updateSession(sessionId, { status: 'polishing' });
      sseUpdate(sessionId, { type: 'status', status: 'polishing', message: 'Starting brand alignment polish...' });
      
      // Add end marker to article to prevent infinite loops
      const END_MARKER = '<!-- END_OF_ARTICLE -->';
      const articleWithEndMarker = fullArticle + '\n\n' + END_MARKER;

      // Create a SINGLE conversation thread with the polisher
      const polisherRunner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Initialize conversation history
      let conversationHistory: any[] = [
        { 
          role: 'user', 
          content: KICKOFF_PROMPT.replace('{ARTICLE}', articleWithEndMarker)
        }
      ];

      // Collect all polish content as structured data
      let polishedSections: Array<{
        strengths: string[];
        weaknesses: string[];
        updatedSection: string;
        keyImprovements: string[];
      }> = [];
      let sectionCount = 0;
      const maxSections = 40; // Safety limit to prevent infinite loops
      let continuePolishing = true; // Declare here before using in streaming

      // Phase 1: Send kickoff prompt
      console.log(`📝 Sending kickoff prompt for first section...`);
      sseUpdate(sessionId, { type: 'phase', phase: 'first_section', message: 'Analyzing first section for brand alignment...' });

      let kickoffResult = await polisherRunner.run(polisherAgentV2, conversationHistory, {
        stream: true,
        maxTurns: 1
      });

      let kickoffResponse = '';
      
      for await (const event of kickoffResult.toStream()) {
        if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
          kickoffResponse += event.data.delta || '';
          sseUpdate(sessionId, { type: 'text', content: event.data.delta });
          
          // Check for END_MARKER in stream
          if (event.data.delta && event.data.delta.includes(END_MARKER)) {
            console.log('🎯 END_MARKER detected in first section stream');
            continuePolishing = false;
          }
        }
      }

      await kickoffResult.finalOutput;
      conversationHistory = (kickoffResult as any).history;
      
      if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error('No history returned from SDK');
      }

      // Extract and parse the JSON response
      const firstSectionResponse = this.extractAssistantResponse(conversationHistory);
      const firstSectionData = this.parsePolishJSON(firstSectionResponse);
      
      if (firstSectionData.status === 'complete') {
        console.log('✅ Article complete - no sections to polish');
        continuePolishing = false;
      } else if (firstSectionData.parsed) {
        polishedSections.push(firstSectionData.parsed);
        console.log(`✅ First section polished`);
        sectionCount = 1;
      } else {
        throw new Error('Failed to parse first section response');
      }

      if (sectionCount > 0) {
        await this.updateSession(sessionId, { completedSections: sectionCount });
        sseUpdate(sessionId, { 
          type: 'section_completed', 
          sectionNumber: sectionCount, 
          content: firstSectionData.parsed,
          message: 'First section polished'
        });
      }

      // Phase 2: Loop through remaining sections with single prompt pattern
      // continuePolishing already declared above
      
      while (continuePolishing && sectionCount < maxSections) {
        // Check if session has been cancelled
        const currentSession = await this.getSession(sessionId);
        if (currentSession?.status === 'cancelled') {
          console.log('🛑 Session cancelled by user');
          break;
        }
        
        // Deduplicate messages before each run to prevent duplicate ID errors
        // This handles both msg_* and rs_* (reasoning) items
        const seen = new Set<string>();
        const deduplicatedHistory: any[] = [];
        const duplicateIds: string[] = [];
        
        for (const message of conversationHistory) {
          // Skip null/undefined messages
          if (!message) {
            console.log(`⚠️ Skipping null/undefined message`);
            continue;
          }
          
          const id = (message as any).id;
          
          // If no ID, it's safe to include (likely a user message)
          if (!id) {
            deduplicatedHistory.push(message);
            continue;
          }
          
          // Skip if we've already seen this ID
          if (seen.has(id)) {
            duplicateIds.push(id);
            console.log(`⚠️ Filtering duplicate message with id: ${id}, role: ${message.role}`);
            continue;
          }
          
          seen.add(id);
          deduplicatedHistory.push(message);
        }
        
        conversationHistory = deduplicatedHistory;
        console.log(`📊 Deduplicated message count: ${conversationHistory.length}, removed ${duplicateIds.length} duplicates`);
        
        if (duplicateIds.length > 0) {
          console.log(`🔍 Duplicate IDs found: ${duplicateIds.join(', ')}`);
        }
        
        // Step 1: Proceed to next section
        console.log(`📝 Processing section ${sectionCount + 1}...`);
        sseUpdate(sessionId, { 
          type: 'phase', 
          phase: 'processing', 
          message: `Polishing section ${sectionCount + 1}...` 
        });

        conversationHistory.push({ role: 'user', content: PROCEED_PROMPT });

        let proceedResult = await polisherRunner.run(polisherAgentV2, conversationHistory, {
          stream: true,
          maxTurns: 1
        });

        let proceedResponse = '';
        for await (const event of proceedResult.toStream()) {
          if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
            proceedResponse += event.data.delta || '';
            sseUpdate(sessionId, { type: 'text', content: event.data.delta });
            
            // Check for END_MARKER in stream
            if (event.data.delta && event.data.delta.includes(END_MARKER)) {
              console.log('🎯 END_MARKER detected in proceed stream');
              continuePolishing = false;
            }
          }
        }

        await proceedResult.finalOutput;
        conversationHistory = (proceedResult as any).history;

        const sectionResponse = this.extractAssistantResponse(conversationHistory);
        const sectionData = this.parsePolishJSON(sectionResponse);
        
        // Check if we've reached the end
        if (sectionData.status === 'complete') {
          console.log(`✅ Polish complete - AI indicated no more sections after ${sectionCount} sections`);
          continuePolishing = false;
          break;
        } else if (sectionData.parsed) {
          polishedSections.push(sectionData.parsed);
          sectionCount++;
          
          await this.updateSession(sessionId, { completedSections: sectionCount });
          sseUpdate(sessionId, { 
            type: 'section_completed', 
            sectionNumber: sectionCount, 
            content: sectionData.parsed,
            message: `Section ${sectionCount} polished`
          });
        } else {
          console.error('Failed to parse section response:', sectionResponse);
          // Continue anyway to avoid getting stuck
          sectionCount++;
        }

        // Safety check for section limit
        if (sectionCount >= maxSections - 5) {
          console.log(`⚠️ Approaching section limit (${sectionCount}/${maxSections})`);
        }
        
        // Hard stop at max sections
        if (sectionCount >= maxSections) {
          console.log(`🛑 Maximum section limit reached (${sectionCount}/${maxSections})`);
          continuePolishing = false;
        }
      }

      // Assemble the final polished article from JSON data
      console.log('🔍 Assembling polished article from structured data...');
      const finalPolishedArticle = polishedSections
        .map(section => section.updatedSection)
        .join('\n\n');
      
      const wordCount = finalPolishedArticle.split(/\s+/).filter(Boolean).length;
      console.log(`📊 Collected polish data for ${polishedSections.length} sections`);

      console.log(`✅ Polish completed: ${wordCount} words, ${sectionCount} sections`);

      // Save final polished article
      await this.savePolishedArticleToWorkflow(session.workflowId, finalPolishedArticle);
      
      await this.updateSession(sessionId, {
        status: 'completed',
        finalArticle: sanitizeForPostgres(finalPolishedArticle),
        totalWordCount: wordCount,
        totalSections: sectionCount,
        completedAt: new Date(),
        sessionMetadata: {
          ...(session.sessionMetadata as any),
          completedAt: new Date().toISOString(),
          polishedSections: polishedSections, // Store structured polish data
          totalSectionsPolished: polishedSections.length
        }
      });
      
      sseUpdate(sessionId, {
        type: 'completed',
        polishedSections: polishedSections, // Structured polish data
        finalPolishedArticle: finalPolishedArticle, // Clean article only
        wordCount: wordCount,
        totalSections: sectionCount,
        message: 'Polish completed successfully!'
      });

    } catch (error: any) {
      console.error('❌ V2 polish failed:', error);
      await this.updateSession(sessionId, {
        status: 'failed',
        errorMessage: error.message
      });
      sseUpdate(sessionId, { type: 'error', error: error.message });
      throw error;
    }
  }

  private extractAssistantResponse(conversationHistory: any[]): string {
    const assistantMessages = conversationHistory.filter((item: any) => 
      item.role === 'assistant' && item.type === 'message'
    );
    
    if (assistantMessages.length === 0) return '';
    
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    
    if (typeof lastAssistant.content === 'string') {
      return lastAssistant.content;
    } else if (Array.isArray(lastAssistant.content)) {
      return lastAssistant.content
        .filter((item: any) => item.type === 'text' || item.type === 'output_text')
        .map((item: any) => item.text || '')
        .join('');
    }
    
    return '';
  }

  private parsePolishJSON(response: string): {
    status?: 'complete';
    parsed?: {
      strengths: string[];
      weaknesses: string[];
      updatedSection: string;
      keyImprovements: string[];
    };
  } {
    try {
      // Try to extract JSON from the response
      // Sometimes AI might include extra text, so we look for JSON boundaries
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', response);
        return {};
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Check if it's the completion status
      if (parsed.status === 'complete') {
        return { status: 'complete' };
      }
      
      // Validate the structure
      if (parsed.strengths && parsed.weaknesses && parsed.updatedSection) {
        return {
          parsed: {
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [parsed.strengths],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [parsed.weaknesses],
            updatedSection: parsed.updatedSection,
            keyImprovements: Array.isArray(parsed.keyImprovements) ? parsed.keyImprovements : (parsed.keyImprovements ? [parsed.keyImprovements] : [])
          }
        };
      }
      
      console.error('Invalid JSON structure:', parsed);
      return {};
    } catch (error) {
      console.error('Failed to parse JSON:', error, 'Response:', response);
      return {};
    }
  }

  private async savePolishedArticleToWorkflow(workflowId: string, polishedArticle: string): Promise<void> {
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const polishStep = workflowData.steps?.find((step: any) => step.id === 'final-polish');
      
      if (polishStep) {
        polishStep.outputs = {
          ...polishStep.outputs,
          finalArticle: polishedArticle,
          polishProgress: '100',
          tab3Created: 'yes',
          agentV2Generated: true,
          generatedAt: new Date().toISOString()
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
        totalSections: session.totalSections || 0,
        errorMessage: session.errorMessage
      }
    };
  }
  
  async cancelSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'cancelled',
      errorMessage: 'Cancelled by user'
    });
    
    // Send cancellation notice via SSE
    sseUpdate(sessionId, {
      type: 'cancelled',
      message: 'Polish operation cancelled by user'
    });
    
    // Clean up SSE connection
    removeSSEConnection(sessionId);
    
    console.log(`🛑 Polish session ${sessionId} cancelled by user`);
  }
}

export const agenticFinalPolishV2Service = new AgenticFinalPolishV2Service();