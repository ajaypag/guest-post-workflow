import OpenAI from 'openai';
import { 
  Agent, 
  run,
  Runner,
  RunItemStreamEvent,
  StreamedRunResult,
  RunState,
  tool 
} from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
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

// Zod schema for clarifications structured output
const clarificationsSchema = z.object({
  questions: z.array(z.string()).describe('List of clarification questions to ask the user')
});

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

// Prompts for agents
const TRIAGE_PROMPT = `You are a triage agent for a deep research outline generation system.

Your job is to analyze the user's research prompt and decide whether clarification is needed.

Examine the prompt for:
1. Clear topic and angle
2. Target audience clarity
3. Specific research requirements
4. Depth and scope expectations
5. Any ambiguous terms or concepts

Based on your analysis:
• If the prompt is clear and complete → call transfer_to_research_instruction_agent
• If clarification would improve the research → call transfer_to_clarifying_questions_agent

Return exactly ONE function-call.`;

const CLARIFYING_PROMPT = `You are a clarifying agent for a deep research outline generation system.

Your job is to ask 2-3 concise, targeted questions that will help create a better research outline.

Based on the research prompt, identify what additional context would be most valuable:
- Target audience specifics
- Depth of technical detail needed
- Specific angles or perspectives to emphasize
- Industry or domain context
- Intended use of the research

Ask questions that are:
- Specific and actionable
- Easy to answer briefly
- Directly relevant to improving the research quality

Return 2-3 questions maximum.`;

const INSTRUCTION_BUILDER_PROMPT = `You are an instruction builder for a deep research outline generation system.

Your job is to take the original research prompt and any clarification answers, then create precise instructions for the research agent.

Transform the enriched context into specific research directives:
1. Maximize specificity and clarity
2. Include all relevant constraints and requirements
3. Specify expected structure and depth
4. Highlight key areas to investigate
5. Define success criteria for the research

Create instructions that will guide the research agent to produce a comprehensive, well-structured outline.`;

const RESEARCH_AGENT_PROMPT = `You are a deep research specialist creating comprehensive outlines for guest post articles.

CRITICAL: You MUST conduct actual web research using your tools before creating any outline. Do not proceed without research.

MANDATORY PROCESS:
1. FIRST: Use web search to find at least 5-10 authoritative sources about the topic
2. THEN: Analyze current trends, statistics, and expert insights
3. FINALLY: Create a detailed outline based on your research findings

Research Requirements:
- Search for recent articles, studies, and expert opinions (last 2 years preferred)
- Find specific data points, statistics, and case studies
- Identify current industry trends and challenges
- Look for unique angles and perspectives not commonly covered
- Find potential opportunities for client link integration

Output Format - Comprehensive Research Outline:
# [Article Title]

## Research Summary
- [List key sources found and their credibility]
- [Current trends identified]
- [Key statistics discovered]

## Article Outline

### 1. Introduction
- Hook: [Specific statistic or trend from research]
- Problem statement: [Based on research findings]
- Article promise: [What readers will learn]

### 2. [Main Section Title]
- Key points: [Based on research]
- Supporting data: [Specific statistics/studies]
- Expert insights: [Quotes or findings from authorities]
- Examples: [Real-world cases from research]

[Continue with detailed sections...]

## Conclusion
- Summary of key insights
- Call to action
- Future outlook based on research

## Sources
[List all sources found during research with URLs]

IMPORTANT: Your outline must be substantive (minimum 1000+ words when written) and based on actual research, not generic knowledge.`;

export class AgenticOutlineService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startOutlineGeneration(workflowId: string, outlinePrompt: string): Promise<{
    sessionId: string;
    needsClarification: boolean;
    questions?: string[];
    outline?: string;
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
      ssePush(sessionId, { type: 'status', status: 'triaging', message: 'Analyzing research prompt...' });

      // Create agents using human-in-the-loop pattern (ChatGPT Option A)
      const researchAgent = new Agent({
        name: 'ResearchAgent',
        model: 'o3-deep-research',
        instructions: RESEARCH_AGENT_PROMPT,
        tools: [
          webSearchTool()
          // Note: fileSearchTool not supported with o3-deep-research model
        ]
      });

      const instructionAgent = new Agent({
        name: 'InstructionBuilder',
        model: 'o3-2025-04-16',
        instructions: INSTRUCTION_BUILDER_PROMPT,
        handoffs: [researchAgent]
      });

      // Clarifier stops here - no handoffs to avoid type mismatch
      const clarifyingAgent = new Agent({
        name: 'ClarifyingAgent',
        model: 'o3-2025-04-16',
        instructions: CLARIFYING_PROMPT,
        outputType: clarificationsSchema,
        handoffs: [] // No handoffs - we'll handle the flow manually
      });

      const triageAgent = new Agent({
        name: 'TriageAgent',
        model: 'o3-2025-04-16',
        instructions: TRIAGE_PROMPT,
        handoffs: [instructionAgent] // Only handoff to instruction agent - clarifying handled manually
      });

      // Run triage agent to determine the path
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      console.log(`🚀 Starting agent pipeline with prompt: ${outlinePrompt.substring(0, 100)}...`);
      ssePush(sessionId, { type: 'status', status: 'analyzing', message: 'Starting agent analysis...' });

      const result = await runner.run(triageAgent, outlinePrompt);
      
      console.log(`🎯 Agent pipeline completed. Result type:`, typeof result.output);
      console.log(`📊 Agent result:`, JSON.stringify(result, null, 2));

      // Check if clarifications needed by examining the output
      if (result.output && typeof result.output === 'object' && 'questions' in result.output) {
        const questions = (result.output as any).questions;
        
        // Save state and questions for resuming later
        await db.update(outlineSessions)
          .set({
            status: 'clarifying',
            clarificationQuestions: questions,
            agentState: result.state, // Save state for resuming
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, sessionId));

        console.log(`🤔 Clarification needed for session ${sessionId}:`, questions);
        ssePush(sessionId, { 
          type: 'clarification_needed', 
          questions,
          message: 'Please answer these questions to improve the research outline:'
        });

        return { sessionId, needsClarification: true, questions };
      }

      // If no clarification needed, the pipeline should complete automatically
      // The agents will handoff: Triage → Instruction → Research
      console.log(`✅ No clarification needed, research completed for session ${sessionId}`);
      
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

      ssePush(sessionId, { 
        type: 'completed', 
        outline: finalOutline,
        citations,
        message: 'Research outline completed successfully!'
      });

      return { sessionId, needsClarification: false, outline: finalOutline };

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

      // Re-create the instruction and research agents for resuming the workflow
      const researchAgent = new Agent({
        name: 'ResearchAgent',
        model: 'o3-deep-research',
        instructions: RESEARCH_AGENT_PROMPT,
        tools: [
          webSearchTool()
          // Note: fileSearchTool not supported with o3-deep-research model
        ]
      });

      const instructionAgent = new Agent({
        name: 'InstructionBuilder',
        model: 'o3-2025-04-16',
        instructions: INSTRUCTION_BUILDER_PROMPT,
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