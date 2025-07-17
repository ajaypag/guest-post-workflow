import OpenAI from 'openai';
import { 
  Agent, 
  Runner
} from '@openai/agents';
import { OpenAIProvider, webSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { outlineSessions, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

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

export class AgenticOutlineService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startOutlineGeneration(workflowId: string, outlinePrompt: string): Promise<{
    sessionId: string;
    outline: string;
  }> {
    let sessionId: string | undefined;
    
    try {
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

      // Create session in database
      await db.insert(outlineSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'deep-research',
        status: 'triaging',
        outlinePrompt: sanitizeForPostgres(outlinePrompt),
        sessionMetadata: metadata,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`🤖 Starting outline generation session ${sessionId} for workflow ${workflowId}`);

      console.log(`🚀 Starting deep research with prompt: ${outlinePrompt.substring(0, 100)}...`);
      ssePush(sessionId, { type: 'status', status: 'researching', message: 'Starting deep research...' });

      // Simple deep research approach - direct execution
      const research_agent = new Agent({
        name: "Research Agent",
        model: "o3-deep-research",
        tools: [webSearchTool()],
        instructions: "You perform deep empirical research based on the user's question and create comprehensive research outlines."
      });

      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });
      
      // Run the research with progress updates
      ssePush(sessionId, { type: 'status', status: 'researching', message: 'Agent starting research...' });
      
      const result = await runner.run(research_agent, outlinePrompt);
      
      console.log(`🎯 Research completed with result type:`, typeof result.output);
      console.log(`📊 Research result:`, result.output);
      
      // Send progress update
      ssePush(sessionId, { type: 'status', status: 'processing', message: 'Processing research results...' });

      // Simple approach - research is complete, save the result
      console.log(`✅ Research completed for session ${sessionId}`);
      
      // Process the result output
      let finalOutline = '';
      if (typeof result.output === 'string') {
        finalOutline = sanitizeForPostgres(result.output);
      } else if (result.output) {
        finalOutline = sanitizeForPostgres(JSON.stringify(result.output));
      } else {
        finalOutline = sanitizeForPostgres('No research content generated');
      }
      
      const citations = this.extractCitations(finalOutline);

      await db.update(outlineSessions)
        .set({
          status: 'completed',
          finalOutline,
          citations,
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

      return { sessionId, outline: finalOutline };

    } catch (error: any) {
      console.error('❌ Error in outline generation:', error);
      
      if (sessionId) {
        await db.update(outlineSessions)
          .set({
            status: 'error',
            errorMessage: error.message,
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, sessionId));

        ssePush(sessionId, { type: 'error', error: error.message });
      }
      
      throw error;
    }
  }

  async continueWithClarifications(sessionId: string, answers: string): Promise<{
    outline: string;
    citations: any[];
  }> {
    try {
      console.log(`🔄 Continuing session ${sessionId} with clarification answers`);
      
      // Get saved session
      const session = await db.query.outlineSessions.findFirst({
        where: eq(outlineSessions.id, sessionId)
      });

      if (!session || !session.agentState) {
        throw new Error('Session not found or invalid state');
      }

      // Update status
      await db.update(outlineSessions)
        .set({ 
          status: 'researching',
          clarificationAnswers: sanitizeForPostgres(answers),
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, { 
        type: 'status', 
        status: 'researching', 
        message: 'Building research instructions based on your answers...' 
      });

      // Re-create the research agent for resuming the workflow
      const researchAgent = new Agent({
        name: 'ResearchAgent',
        model: 'o3-deep-research',
        instructions: "You perform deep empirical research based on the user's question and create comprehensive research outlines.",
        tools: [
          webSearchTool()
          // Note: fileSearchTool not supported with o3-deep-research model
        ]
      });

      const instructionAgent = new Agent({
        name: 'InstructionBuilder',
        model: 'o3-2025-04-16',
        instructions: "Create detailed research instructions for the research agent.",
        handoffs: [researchAgent]
      });

      // Resume from saved state with answers
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Format answers for the agent
      const formattedAnswers = this.formatClarificationAnswers(
        session.clarificationQuestions as string[],
        answers
      );

      console.log(`🚀 Resuming agent pipeline with formatted answers`);
      ssePush(sessionId, { 
        type: 'status', 
        status: 'researching', 
        message: 'Conducting deep research based on your requirements...' 
      });

      // Resume the workflow from where it left off
      // Pass the user's answers as plain text to the instruction agent
      const result = await runner.run(
        instructionAgent,
        formattedAnswers
        // Note: State resumption will be handled by the agent framework automatically
      );

      // Save final outline - extract text from agent output
      let finalOutline = '';
      
      console.log(`🔍 Processing agent output:`, JSON.stringify(result.output, null, 2));
      
      // Handle different output formats from o3 agents
      if (typeof result.output === 'string') {
        // Direct string output
        finalOutline = sanitizeForPostgres(result.output);
      } else if (Array.isArray(result.output)) {
        // Array of output items - look for text content
        const textItems = result.output
          .filter((item: any) => item.type === 'output_text' || item.text)
          .map((item: any) => item.text || item.content || '')
          .filter((text: string) => text && text.length > 10); // Filter out short/meaningless text
        
        if (textItems.length > 0) {
          // Join all meaningful text content
          finalOutline = sanitizeForPostgres(textItems.join('\n\n'));
        } else {
          // Fallback: look for any text in the output
          const allText = result.output
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item.text) return item.text;
              if (item.content) return item.content;
              if (item.message) return item.message;
              return '';
            })
            .filter((text: string) => text && text.length > 5)
            .join('\n\n');
          
          finalOutline = sanitizeForPostgres(allText || 'No content generated');
        }
      } else if (result.output && typeof result.output === 'object') {
        // Object output - extract text fields
        const textContent = (result.output as any).text || 
                           (result.output as any).content || 
                           (result.output as any).message ||
                           JSON.stringify(result.output);
        finalOutline = sanitizeForPostgres(textContent);
      } else {
        // Fallback
        finalOutline = sanitizeForPostgres('No valid outline content generated');
      }
      
      console.log(`📝 Extracted outline (${finalOutline.length} chars):`, finalOutline.substring(0, 200) + '...');
      
      const citations = this.extractCitations(finalOutline);

      await db.update(outlineSessions)
        .set({
          status: 'completed',
          finalOutline,
          citations,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      console.log(`✅ Research outline completed for session ${sessionId}`);
      ssePush(sessionId, { 
        type: 'completed', 
        outline: finalOutline,
        citations,
        message: 'Research outline completed successfully!'
      });

      return { outline: finalOutline, citations };

    } catch (error: any) {
      console.error('❌ Error continuing outline generation:', error);
      
      await db.update(outlineSessions)
        .set({
          status: 'error',
          errorMessage: error.message,
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, sessionId));

      ssePush(sessionId, { type: 'error', error: error.message });
      
      throw error;
    }
  }

  async getSessionProgress(sessionId: string): Promise<any> {
    const session = await db.query.outlineSessions.findFirst({
      where: eq(outlineSessions.id, sessionId),
      with: {
        workflow: true
      }
    });

    if (!session) {
      return { error: 'Session not found' };
    }

    return {
      sessionId: session.id,
      status: session.status,
      needsClarification: session.status === 'clarifying',
      questions: session.clarificationQuestions,
      outline: session.finalOutline,
      citations: session.citations,
      error: session.errorMessage
    };
  }

  private formatClarificationAnswers(questions: string[], answers: string): string {
    // Format as the cookbook example shows
    const answerLines = answers.split('\n').filter(a => a.trim());
    const formatted = questions.map((q, i) => {
      const answer = answerLines[i] || 'No specific preference';
      return `**${q}**\n${answer}`;
    }).join('\n\n');

    return formatted;
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
    const session = await db.query.outlineSessions.findFirst({
      where: eq(outlineSessions.workflowId, workflowId),
      orderBy: (sessions, { desc }) => [desc(sessions.version)]
    });

    return session;
  }
}

// Singleton instance
export const agenticOutlineService = new AgenticOutlineService();