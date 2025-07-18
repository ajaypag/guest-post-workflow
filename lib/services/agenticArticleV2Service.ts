import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { writerAgentV2 } from '@/lib/agents/articleWriterV2';
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

// The three prompts from the UI
const PLANNING_PROMPT = `Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing.After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking a 3 citations only  and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.`;

const TITLE_INTRO_PROMPT = `Yes, remember we're going to be creating this article section by section. And the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use "we" and "you" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like "might" or "could." Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points. Start with the title and introduction. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Avoid using Em-dashes. the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.`;

const LOOPING_PROMPT = `Proceed to the next section. Remember, the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use "we" and "you" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like "might" or "could." Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Also be sure to reference my original prompt that contains the article information that should feed your context. I've already done the research and given it to you there - so that's what you need to reference each time. Avoid using Em-dashes. If it's the section that is the "meat" of the article, you must further break your output down into subsections and only output the first subsection so as not to over simplify each component. Note: defining what a subsection means is important. We're not doing sub-subsections, so if the section of the article is already apparently a subsection, then that entire section should be included in your output even if there are apparently sub-subsections within. Note 2: the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section. When you have written the final section, append the marker <<END_OF_ARTICLE>> and stop.`;

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
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      await this.updateSession(sessionId, { status: 'orchestrating' });
      sseUpdate(sessionId, { type: 'status', status: 'orchestrating', message: 'Starting article orchestration...' });

      // Create a SINGLE conversation thread with the writer
      const writerRunner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Initialize conversation history - will be replaced by SDK history
      let conversationHistory: any[] = [
        { 
          role: 'user', 
          content: `${PLANNING_PROMPT}\n\n${session.outline}` 
        }
      ];

      // Collect all writer outputs for our use
      const writerOutputs: string[] = [];
      
      // Track article completion status
      let articleComplete = false;

      // Phase 1: Send planning prompt to writer
      console.log(`📝 Sending planning prompt to writer...`);
      console.log(`📊 Initial message count: ${conversationHistory.length}`);
      sseUpdate(sessionId, { type: 'phase', phase: 'planning', message: 'Writer analyzing research and planning article...' });

      let planningResult = await writerRunner.run(writerAgentV2, conversationHistory, {
        stream: true,
        maxTurns: 1
      });

      let planningResponse = '';
      
      for await (const event of planningResult.toStream()) {
        // Handle text streaming
        if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
          planningResponse += event.data.delta || '';
          sseUpdate(sessionId, { type: 'text', content: event.data.delta });
        }
      }

      // CRITICAL: Wait for run to complete before copying history
      await planningResult.finalOutput;

      // NOW copy the complete history from SDK (includes reasoning items)
      conversationHistory = (planningResult as any).history;
      
      if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error('No history returned from SDK');
      }
      
      console.log(`📊 SDK history length: ${conversationHistory.length} items (includes reasoning)`);
      
      // Extract the assistant's response for our tracking
      const assistantMessages = conversationHistory.filter((item: any) => 
        item.role === 'assistant' && item.type === 'message'
      );
      
      if (assistantMessages.length > 0) {
        const lastAssistant = assistantMessages[assistantMessages.length - 1];
        
        // Extract text content
        if (typeof lastAssistant.content === 'string') {
          planningResponse = lastAssistant.content;
        } else if (Array.isArray(lastAssistant.content)) {
          planningResponse = lastAssistant.content
            .filter((item: any) => 
              // Accept both shapes the SDK emits
              item.type === 'text' || item.type === 'output_text'
            )
            .map((item: any) => item.text || '')
            .join('');
        }
      }
      
      if (!planningResponse) {
        throw new Error('No planning response extracted');
      }
      
      writerOutputs.push(planningResponse);
      console.log(`✅ Planning response extracted: ${planningResponse.length} chars`);

      // Phase 2: Send title/intro prompt
      console.log(`📝 Sending title/intro prompt to writer...`);
      sseUpdate(sessionId, { type: 'phase', phase: 'title_intro', message: 'Writer creating title and introduction...' });

      // Add the title/intro prompt to history
      conversationHistory.push({ role: 'user', content: TITLE_INTRO_PROMPT });

      console.log(`📊 History before title/intro run: ${conversationHistory.length} items`);
      let titleIntroResult = await writerRunner.run(writerAgentV2, conversationHistory, {
        stream: true,
        maxTurns: 1
      });

      let titleIntroResponse = '';
      for await (const event of titleIntroResult.toStream()) {
        if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
          titleIntroResponse += event.data.delta || '';
          sseUpdate(sessionId, { type: 'text', content: event.data.delta });
        }
      }

      // CRITICAL: Wait for run to complete before copying history
      await titleIntroResult.finalOutput;

      // NOW copy the complete history from SDK (includes reasoning items)
      conversationHistory = (titleIntroResult as any).history;
      
      if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error('No history returned from SDK for title/intro');
      }
      
      console.log(`📊 SDK history after title/intro: ${conversationHistory.length} items`);
      
      // Extract the assistant's response
      const titleAssistantMessages = conversationHistory.filter((item: any) => 
        item.role === 'assistant' && item.type === 'message'
      );
      
      if (titleAssistantMessages.length > 0) {
        const lastAssistant = titleAssistantMessages[titleAssistantMessages.length - 1];
        
        // Extract text content
        if (typeof lastAssistant.content === 'string') {
          titleIntroResponse = lastAssistant.content;
        } else if (Array.isArray(lastAssistant.content)) {
          titleIntroResponse = lastAssistant.content
            .filter((item: any) => 
              // Accept both shapes the SDK emits
              item.type === 'text' || item.type === 'output_text'
            )
            .map((item: any) => item.text || '')
            .join('');
        }
      }

      // Check for end marker and clean it
      if (titleIntroResponse.includes('<<END_OF_ARTICLE>>')) {
        titleIntroResponse = titleIntroResponse.replace('<<END_OF_ARTICLE>>', '').trim();
        articleComplete = true;
      }
      
      writerOutputs.push(titleIntroResponse);
      console.log(`✅ Title/intro response extracted: ${titleIntroResponse.length} chars`);

      await this.updateSession(sessionId, { completedSections: 1 });
      sseUpdate(sessionId, { 
        type: 'section_completed', 
        sectionNumber: 1, 
        content: titleIntroResponse,
        message: 'Title and introduction completed'
      });

      // Phase 3: Loop with the looping prompt until article is complete
      let sectionCount = 1;
      const maxSections = 20; // Safety limit raised to 20 sections

      while (!articleComplete && sectionCount < maxSections) {
        console.log(`📝 Sending looping prompt for section ${sectionCount + 1}...`);
        sseUpdate(sessionId, { 
          type: 'phase', 
          phase: 'writing', 
          message: `Writer working on section ${sectionCount + 1}...` 
        });

        // Add the looping prompt to history
        conversationHistory.push({ role: 'user', content: LOOPING_PROMPT });

        console.log(`📊 History before section ${sectionCount + 1} run: ${conversationHistory.length} items`);
        let sectionResult = await writerRunner.run(writerAgentV2, conversationHistory, {
          stream: true,
          maxTurns: 1
        });

        let sectionResponse = '';
        for await (const event of sectionResult.toStream()) {
          if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
            sectionResponse += event.data.delta || '';
            sseUpdate(sessionId, { type: 'text', content: event.data.delta });
          }
        }

        // CRITICAL: Wait for run to complete before copying history
        await sectionResult.finalOutput;

        // NOW copy the complete history from SDK (includes reasoning items)
        conversationHistory = (sectionResult as any).history;
        
        if (!conversationHistory || conversationHistory.length === 0) {
          throw new Error('No history returned from SDK for section');
        }
        
        console.log(`📊 SDK history after section ${sectionCount + 1}: ${conversationHistory.length} items`);
        
        // Extract the assistant's response
        const sectionAssistantMessages = conversationHistory.filter((item: any) => 
          item.role === 'assistant' && item.type === 'message'
        );
        
        if (sectionAssistantMessages.length > 0) {
          const lastAssistant = sectionAssistantMessages[sectionAssistantMessages.length - 1];
          
          // Extract text content
          if (typeof lastAssistant.content === 'string') {
            sectionResponse = lastAssistant.content;
          } else if (Array.isArray(lastAssistant.content)) {
            sectionResponse = lastAssistant.content
              .filter((item: any) => 
                // Accept both shapes the SDK emits
                item.type === 'text' || item.type === 'output_text'
              )
              .map((item: any) => item.text || '')
              .join('');
          }
        }

        // Check for end marker and clean it
        if (sectionResponse.includes('<<END_OF_ARTICLE>>')) {
          sectionResponse = sectionResponse.replace('<<END_OF_ARTICLE>>', '').trim();
          articleComplete = true;
          console.log(`✅ Article complete - writer signaled END_OF_ARTICLE after ${sectionCount + 1} sections`);
        }
        
        writerOutputs.push(sectionResponse);
        sectionCount++;
        console.log(`✅ Section ${sectionCount} response extracted: ${sectionResponse.length} chars`);

        await this.updateSession(sessionId, { completedSections: sectionCount });
        sseUpdate(sessionId, { 
          type: 'section_completed', 
          sectionNumber: sectionCount, 
          content: sectionResponse,
          message: `Section ${sectionCount} completed`
        });
        
        // Warn if approaching the hard limit
        if (sectionCount >= 18 && !articleComplete) {
          console.log(`⚠️ Approaching section limit (${sectionCount}/${maxSections})`);
        }
      }

      // Assemble final article (skip planning response, include all writing)
      const finalArticle = writerOutputs.slice(1).join('\n\n');
      const wordCount = finalArticle.split(/\s+/).filter(Boolean).length;

      console.log(`✅ Article completed: ${wordCount} words, ${sectionCount} sections`);

      // Save final article
      await this.saveArticleToWorkflow(session.workflowId, finalArticle);
      
      await this.updateSession(sessionId, {
        status: 'completed',
        finalArticle: sanitizeForPostgres(finalArticle),
        totalWordCount: wordCount,
        totalSections: sectionCount,
        completedAt: new Date()
      });
      
      sseUpdate(sessionId, {
        type: 'completed',
        finalArticle: finalArticle,
        wordCount: wordCount,
        totalSections: sectionCount,
        message: 'Article generation completed successfully!'
      });

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