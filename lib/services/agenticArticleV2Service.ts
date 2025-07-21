import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { writerAgentV2, createArticleEndCritic } from '@/lib/agents/articleWriterV2';
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

const TITLE_INTRO_PROMPT = `Yes, remember we're going to be creating this article section by section. And the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use "we" and "you" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like "might" or "could." Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points. Start with the title and introduction. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Avoid using Em-dashes. the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.

Output your response with the content between these exact delimiters:
<<<ARTICLE_CONTENT_START>>>
# Your Article Title

Your introduction content here with all markdown formatting...
<<<ARTICLE_CONTENT_END>>>

Important:
- Include ALL content between the delimiters including the title
- Use the exact delimiters shown above
- Preserve all markdown formatting`;

const LOOPING_PROMPT = `Proceed to the next section. Remember, the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. You blend the finesse of a seasoned copywriter with the deep expertise in the topic at hand, leading to clear, persuasive narratives. Your voice simplifies complexity, builds trust, and drives momentum. You intuitively tailor every message to the most likely audience for the topic at hand. Speak like a trusted colleague—warm, approachable, and human. Use "we" and "you" to build rapport, and read copy aloud to ensure it sounds natural and friendly. Make strong, decisive statements backed by facts or customer proof. Lead with benefits, use active voice, and avoid hedging language like "might" or "could." Be insightful and thorough without overwhelming. Organize content logically, connect the dots for the reader, and stick to verifiable details. Sprinkle clever turns of phrase or light puns in headlines or campaign-level copy only. Never sacrifice clarity for a joke. Trim every sentence to its core message. Eliminate filler words, keep sentences short, and focus on one or two key points. Write like you're chatting over coffee—informal but never unprofessional. The article reads more like a well-structured conversation than a slide deck of bullet points. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Also be sure to reference my original prompt that contains the article information that should feed your context. I've already done the research and given it to you there - so that's what you need to reference each time. Avoid using Em-dashes. If it's the section that is the "meat" of the article, you must further break your output down into subsections and only output the first subsection so as not to over simplify each component. Note: defining what a subsection means is important. We're not doing sub-subsections, so if the section of the article is already apparently a subsection, then that entire section should be included in your output even if there are apparently sub-subsections within. Note 2: the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.

Output your response with the content between these exact delimiters:
<<<ARTICLE_CONTENT_START>>>
## Section Heading

Your section content here with all markdown formatting...
<<<ARTICLE_CONTENT_END>>>

Important:
- Use the exact delimiters shown above
- Include all content with proper markdown formatting
- When you reach the end of the article, output only: <<<ARTICLE_COMPLETE>>>`;

export class AgenticArticleV2Service {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Parse delimiter-based response from article generation
  private parseArticleContent(response: string): {
    status?: 'complete';
    content?: string;
  } {
    try {
      // Check for completion marker first
      if (response.includes('<<<ARTICLE_COMPLETE>>>')) {
        console.log('✅ Article completion marker found');
        return { status: 'complete' };
      }
      
      // Extract content between delimiters
      const startDelimiter = '<<<ARTICLE_CONTENT_START>>>';
      const endDelimiter = '<<<ARTICLE_CONTENT_END>>>';
      
      const startIndex = response.indexOf(startDelimiter);
      const endIndex = response.indexOf(endDelimiter);
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const content = response.substring(
          startIndex + startDelimiter.length,
          endIndex
        ).trim();
        
        if (content) {
          console.log(`✅ Extracted content between delimiters: ${content.length} chars`);
          return { content };
        }
      }
      
      // Fallback: if no delimiters found, treat the whole response as content
      // This helps handle cases where AI might not follow the format exactly
      console.warn('No delimiters found, using fallback text extraction');
      const trimmedResponse = response.trim();
      if (trimmedResponse && !trimmedResponse.includes('<<<')) {
        return { content: trimmedResponse };
      }
      
      console.error('No content found in response:', response.substring(0, 200));
      return {};
    } catch (error) {
      console.error('Failed to parse content:', error, 'Response:', response.substring(0, 200));
      return {};
    }
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

      // Collect article sections (just content strings)
      const articleSections: string[] = [];
      
      
      // Track article completion status
      let articleComplete = false;
      
      // We'll create the ArticleEndCritic AFTER we get the planning response
      let articleEndCritic: any = null;
      let CHECK_START = 5; // Default value, will be recalculated after planning

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
      
      console.log(`✅ Planning response extracted: ${planningResponse.length} chars`);
      
      // Log first 1000 chars of planning response to see outline
      console.log(`📋 Planning response preview:\n${planningResponse.slice(0, 1000)}`);
      
      // NOW create ArticleEndCritic with the writer's generated outline
      articleEndCritic = createArticleEndCritic(planningResponse);
      console.log(`🎯 Created ArticleEndCritic with writer's generated outline`);
      
      // Recalculate CHECK_START based on the writer's outline
      const planningLines = planningResponse.split('\n');
      const plannedSections = planningLines.filter(line => /^\d+\./.test(line.trim())).length;
      const expectedSections = Math.max(5, plannedSections);
      CHECK_START = Math.max(5, Math.floor(expectedSections * 0.6));
      console.log(`📊 Writer's outline analysis: ${plannedSections} sections found, CHECK_START set to ${CHECK_START}`);

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

      console.log(`✅ Title/intro response extracted: ${titleIntroResponse.length} chars`);
      
      // Parse title/intro content
      const titleIntroParsed = this.parseArticleContent(titleIntroResponse);
      
      if (titleIntroParsed.status === 'complete') {
        articleComplete = true;
        console.log('✅ Article marked as complete in title/intro');
      } else if (titleIntroParsed.content) {
        // Add content to article sections
        articleSections.push(titleIntroParsed.content);
        console.log(`✅ Title/intro section completed`);
        
        await this.updateSession(sessionId, { completedSections: 1 });
        sseUpdate(sessionId, { 
          type: 'section_completed', 
          sectionNumber: 1, 
          content: titleIntroParsed.content,
          message: 'Title and introduction completed'
        });
      } else {
        // Fallback: treat as plain text if delimiter parsing fails
        console.warn('Failed to parse title/intro content, using text fallback');
        // Strip any delimiters from the raw response before using as fallback
        const cleanedResponse = titleIntroResponse
          .replace(/<<<ARTICLE_CONTENT_START>>>/g, '')
          .replace(/<<<ARTICLE_CONTENT_END>>>/g, '')
          .replace(/<<<ARTICLE_COMPLETE>>>/g, '')
          .trim();
        if (cleanedResponse) {
          articleSections.push(cleanedResponse);
        }
        
        await this.updateSession(sessionId, { completedSections: 1 });
        sseUpdate(sessionId, { 
          type: 'section_completed', 
          sectionNumber: 1, 
          content: titleIntroResponse,
          message: 'Title and introduction completed'
        });
      }

      // Phase 3: Loop with the looping prompt until article is complete
      let sectionCount = 1;
      const maxSections = 40; // Safety limit raised to 40 sections

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

        console.log(`✅ Section response extracted: ${sectionResponse.length} chars`);
        
        // Parse section content
        const sectionParsed = this.parseArticleContent(sectionResponse);
        
        if (sectionParsed.status === 'complete') {
          articleComplete = true;
          console.log(`✅ Article complete - writer signaled completion after ${sectionCount + 1} sections`);
        } else if (sectionParsed.content) {
          // Add content to sections array
          articleSections.push(sectionParsed.content);
          sectionCount++;
          console.log(`✅ Section ${sectionCount} completed`);
          
          await this.updateSession(sessionId, { completedSections: sectionCount });
          sseUpdate(sessionId, { 
            type: 'section_completed', 
            sectionNumber: sectionCount, 
            content: sectionParsed.content,
            message: `Section ${sectionCount} completed`
          });
        } else {
          // Fallback: treat as plain text if delimiter parsing fails
          console.warn('Failed to parse section content, using text fallback');
          // Strip any delimiters from the raw response before using as fallback
          const cleanedResponse = sectionResponse
            .replace(/<<<ARTICLE_CONTENT_START>>>/g, '')
            .replace(/<<<ARTICLE_CONTENT_END>>>/g, '')
            .replace(/<<<ARTICLE_COMPLETE>>>/g, '')
            .trim();
          if (cleanedResponse) {
            articleSections.push(cleanedResponse);
            sectionCount++;
          }
          
          await this.updateSession(sessionId, { completedSections: sectionCount });
          sseUpdate(sessionId, { 
            type: 'section_completed', 
            sectionNumber: sectionCount, 
            content: sectionResponse,
            message: `Section ${sectionCount} completed`
          });
        }
        
        // Use ArticleEndCritic after CHECK_START sections
        if (!articleComplete && sectionCount >= CHECK_START) {
          console.log(`🔍 Checking if article is complete (section ${sectionCount} >= CHECK_START ${CHECK_START})...`);
          sseUpdate(sessionId, { 
            type: 'phase', 
            phase: 'checking_completion', 
            message: `Evaluating if article is complete after ${sectionCount} sections...` 
          });
          
          try {
            // Prepare the draft so far from sections
            const draftSoFar = articleSections.join('\n\n');
            
            const criticRun = await writerRunner.run(articleEndCritic, [
              { role: 'user', content: draftSoFar }
            ]);
            
            const verdictResult = await criticRun.finalOutput;
            // Extract verdict from the structured output object
            const verdict = verdictResult?.verdict || (typeof verdictResult === 'string' ? verdictResult : 'NO');
            console.log(`🎯 ArticleEndCritic verdict: ${verdict}`);
            
            if (verdict === 'YES') {
              articleComplete = true;
              console.log(`✅ Article complete - critic confirmed after ${sectionCount} sections`);
              sseUpdate(sessionId, { 
                type: 'phase', 
                phase: 'completed', 
                message: `Article complete - proper conclusion detected after ${sectionCount} sections` 
              });
            } else {
              console.log(`⏩ Article not complete yet - continuing...`);
            }
          } catch (error) {
            console.error('❌ Critic evaluation failed:', error);
            // Continue writing on critic failure - don't break the flow
            sseUpdate(sessionId, { 
              type: 'warning', 
              message: 'Article completion check failed, continuing to write...' 
            });
          }
        }
        
        // Warn if approaching the hard limit
        if (sectionCount >= 35 && !articleComplete) {
          console.log(`⚠️ Approaching section limit (${sectionCount}/${maxSections})`);
        }
      }

      // Assemble final article from sections
      const finalArticle = articleSections.join('\n\n');
      const wordCount = finalArticle.split(/\s+/).filter(Boolean).length;

      console.log(`✅ Article completed: ${wordCount} words, ${sectionCount} sections`);

      // Save final article
      await this.saveArticleToWorkflow(session.workflowId, finalArticle);
      
      await this.updateSession(sessionId, {
        status: 'completed',
        finalArticle: sanitizeForPostgres(finalArticle),
        totalWordCount: wordCount,
        totalSections: sectionCount,
        completedAt: new Date(),
        sessionMetadata: {
          ...(session.sessionMetadata as any),
          completedAt: new Date().toISOString()
        }
      });
      
      sseUpdate(sessionId, {
        type: 'completed',
        status: 'completed',
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
          agentGenerated: true,
          agentVersion: 'v2',
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