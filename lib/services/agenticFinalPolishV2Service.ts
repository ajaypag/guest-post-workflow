import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { polisherAgentV2 } from '@/lib/agents/finalPolisherV2';
import { db } from '@/lib/db/connection';
import { workflows, v2AgentSessions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates.`;

const PROCEED_PROMPT = `Okay that is good. Now, proceed to the next section. Re-review my project files for my brand guide and the Semantic SEO writing tips. Gauge how well it follows the brand guide and semantic seo tips and give it a strengths and weaknesses and update the section with some updates. Be sure to reference the conclusions you made during your thinking process when writing the updating article. Don't use em-dashes. The updated section output should be ready to copy-paste back into my article.`;

const CLEANUP_PROMPT = `Before you proceed to the next section, review your previous output. Compare it to the brand kit and the words to not use document. Based on that, make any potential updates`;

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
          model: 'gpt-4o-mini',
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

      // Create a SINGLE conversation thread with the polisher
      const polisherRunner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Initialize conversation history
      let conversationHistory: any[] = [
        { 
          role: 'user', 
          content: KICKOFF_PROMPT.replace('{ARTICLE}', fullArticle)
        }
      ];

      // Collect all polished sections
      const polishedSections: string[] = [];
      let sectionCount = 0;
      const maxSections = 40; // Safety limit

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
        }
      }

      await kickoffResult.finalOutput;
      conversationHistory = (kickoffResult as any).history;
      
      if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error('No history returned from SDK');
      }

      // Extract the response (strengths, weaknesses, updated section)
      const firstSectionAnalysis = this.extractAssistantResponse(conversationHistory);
      console.log(`✅ First section analysis complete: ${firstSectionAnalysis.length} chars`);

      // Phase 2: Cleanup the first section
      console.log(`🧹 Sending cleanup prompt for first section...`);
      sseUpdate(sessionId, { type: 'phase', phase: 'cleanup', message: 'Refining first section based on brand kit...' });

      conversationHistory.push({ role: 'user', content: CLEANUP_PROMPT });

      let cleanupResult = await polisherRunner.run(polisherAgentV2, conversationHistory, {
        stream: true,
        maxTurns: 1
      });

      let cleanupResponse = '';
      for await (const event of cleanupResult.toStream()) {
        if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
          cleanupResponse += event.data.delta || '';
          sseUpdate(sessionId, { type: 'text', content: event.data.delta });
        }
      }

      await cleanupResult.finalOutput;
      conversationHistory = (cleanupResult as any).history;

      const firstSectionPolished = this.extractAssistantResponse(conversationHistory);
      polishedSections.push(firstSectionPolished);
      sectionCount = 1;

      await this.updateSession(sessionId, { completedSections: sectionCount });
      sseUpdate(sessionId, { 
        type: 'section_completed', 
        sectionNumber: sectionCount, 
        content: firstSectionPolished,
        message: 'First section polished'
      });

      // Phase 3: Loop through remaining sections with two-prompt pattern
      let continuePolishing = true;
      
      while (continuePolishing && sectionCount < maxSections) {
        // Step 1: Proceed to next section
        console.log(`📝 Sending proceed prompt for section ${sectionCount + 1}...`);
        sseUpdate(sessionId, { 
          type: 'phase', 
          phase: 'analyzing', 
          message: `Analyzing section ${sectionCount + 1} for brand alignment...` 
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
          }
        }

        await proceedResult.finalOutput;
        conversationHistory = (proceedResult as any).history;

        const sectionAnalysis = this.extractAssistantResponse(conversationHistory);
        
        // Check if we've reached the end (AI might indicate no more sections)
        if (this.checkIfComplete(sectionAnalysis)) {
          console.log(`✅ Polish complete - AI indicated no more sections after ${sectionCount} sections`);
          continuePolishing = false;
          break;
        }

        // Step 2: Cleanup this section
        console.log(`🧹 Sending cleanup prompt for section ${sectionCount + 1}...`);
        sseUpdate(sessionId, { 
          type: 'phase', 
          phase: 'cleanup', 
          message: `Refining section ${sectionCount + 1} based on brand kit...` 
        });

        conversationHistory.push({ role: 'user', content: CLEANUP_PROMPT });

        let cleanupResult2 = await polisherRunner.run(polisherAgentV2, conversationHistory, {
          stream: true,
          maxTurns: 1
        });

        let cleanupResponse2 = '';
        for await (const event of cleanupResult2.toStream()) {
          if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
            cleanupResponse2 += event.data.delta || '';
            sseUpdate(sessionId, { type: 'text', content: event.data.delta });
          }
        }

        await cleanupResult2.finalOutput;
        conversationHistory = (cleanupResult2 as any).history;

        const sectionPolished = this.extractAssistantResponse(conversationHistory);
        polishedSections.push(sectionPolished);
        sectionCount++;

        await this.updateSession(sessionId, { completedSections: sectionCount });
        sseUpdate(sessionId, { 
          type: 'section_completed', 
          sectionNumber: sectionCount, 
          content: sectionPolished,
          message: `Section ${sectionCount} polished`
        });

        // Safety check for section limit
        if (sectionCount >= 35) {
          console.log(`⚠️ Approaching section limit (${sectionCount}/${maxSections})`);
        }
      }

      // Assemble final polished article
      const finalPolishedArticle = polishedSections.join('\n\n');
      const wordCount = finalPolishedArticle.split(/\s+/).filter(Boolean).length;

      console.log(`✅ Polish completed: ${wordCount} words, ${sectionCount} sections`);

      // Save final polished article
      await this.savePolishedArticleToWorkflow(session.workflowId, finalPolishedArticle);
      
      await this.updateSession(sessionId, {
        status: 'completed',
        finalArticle: sanitizeForPostgres(finalPolishedArticle),
        totalWordCount: wordCount,
        totalSections: sectionCount,
        completedAt: new Date()
      });
      
      sseUpdate(sessionId, {
        type: 'completed',
        finalPolishedArticle: finalPolishedArticle,
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

  private checkIfComplete(response: string): boolean {
    // Check for common indicators that there are no more sections
    const lowerResponse = response.toLowerCase();
    return (
      lowerResponse.includes('no more sections') ||
      lowerResponse.includes('all sections have been') ||
      lowerResponse.includes('final section') ||
      lowerResponse.includes('last section') ||
      lowerResponse.includes('article is complete') ||
      lowerResponse.includes('polish is complete')
    );
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
}

export const agenticFinalPolishV2Service = new AgenticFinalPolishV2Service();