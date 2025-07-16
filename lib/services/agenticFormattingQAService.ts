import { Agent, tool, Runner } from '@openai/agents';
import { OpenAIProvider, fileSearchTool } from '@openai/agents-openai';
import { z } from 'zod';
import { db } from '@/lib/db/connection';
import { 
  formattingQaSessions, 
  formattingQaChecks,
  workflows,
  type FormattingQaSession,
  type FormattingQaCheck 
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// SSE connection management
const activeStreams = new Map<string, any>();

export function addSSEConnection(sessionId: string, res: any) {
  activeStreams.set(sessionId, res);
}

export function removeSSEConnection(sessionId: string) {
  activeStreams.delete(sessionId);
}

function sseUpdate(sessionId: string, data: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) return;
  
  try {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    stream.write(message);
  } catch (error) {
    console.error('SSE update failed:', error);
    removeSSEConnection(sessionId);
  }
}

// Check types that the agent will validate
const checkTypes = [
  'header_hierarchy',
  'line_breaks',
  'section_completeness',
  'list_consistency',
  'bold_cleanup',
  'faq_formatting',
  'citation_placement',
  'utm_cleanup'
] as const;

type CheckType = typeof checkTypes[number];

export class AgenticFormattingQAService {
  private openaiProvider: OpenAIProvider;

  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startQASession(workflowId: string): Promise<string> {
    try {
      // Get workflow data including the final article
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
        with: {
          steps: true
        }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Get the final polished article from Step 6
      const finalPolishStep = workflow.steps?.find(s => s.stepNumber === 6);
      const finalArticle = (finalPolishStep?.outputs as any)?.finalArticle || '';

      if (!finalArticle) {
        throw new Error('No final article found in workflow');
      }

      // Get the highest version number for this workflow's QA sessions
      const existingSessions = await db.query.formattingQaSessions.findMany({
        where: eq(formattingQaSessions.workflowId, workflowId),
        orderBy: [desc(formattingQaSessions.version)]
      });

      const nextVersion = existingSessions.length > 0 
        ? (existingSessions[0].version || 0) + 1 
        : 1;

      // Create new QA session
      const sessionId = uuidv4();
      const now = new Date();

      await db.insert(formattingQaSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'formatting-qa',
        status: 'pending',
        totalChecks: checkTypes.length,
        passedChecks: 0,
        failedChecks: 0,
        originalArticle: finalArticle,
        qaMetadata: {
          checkTypes: checkTypes,
          startTime: now.toISOString()
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      console.log(`Created formatting QA session ${sessionId} for workflow ${workflowId} (version ${nextVersion})`);
      return sessionId;

    } catch (error) {
      console.error('Error starting QA session:', error);
      throw error;
    }
  }

  async performQAChecks(sessionId: string): Promise<void> {
    let conversationActive = true;
    const messages: any[] = [];

    try {
      // Get session details
      const session = await db.query.formattingQaSessions.findFirst({
        where: eq(formattingQaSessions.id, sessionId)
      });

      if (!session) {
        throw new Error('QA session not found');
      }

      // Initialize agent with proper context
      const agent = await this.createFormattingQAAgent(sessionId, session.workflowId, session.version || 1);

      // Update session status
      await db.update(formattingQaSessions)
        .set({ status: 'checking', updatedAt: new Date() })
        .where(eq(formattingQaSessions.id, sessionId));

      sseUpdate(sessionId, { 
        type: 'status', 
        status: 'checking', 
        message: 'Starting automated formatting and quality checks...' 
      });

      // Initial prompt
      const initialPrompt = `You are performing an automated formatting and quality check on this article:

${session.originalArticle}

You need to check the following formatting and quality aspects:
1. Header hierarchy (H2s and H3s use proper heading styles, not just bold)
2. Line breaks (exactly one blank line between paragraphs, no orphan breaks)
3. Section completeness (Intro, body sections, FAQ intro, Conclusion all present)
4. List consistency (bullets/numbers don't change mid-section)
5. Bold cleanup (remove random/unnecessary bolding)
6. FAQ formatting (questions bold sentence-case, answers plain text)
7. Citation placement (single citation near top, no extras)
8. UTM cleanup (remove source=chatgpt UTM parameters)

Begin your analysis by systematically checking each aspect. For each check, identify specific issues if any exist, note their locations, and provide fix suggestions.`;

      messages.push({ role: 'user', content: initialPrompt });

      // Run the agent conversation loop
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });
      
      // Track check progress
      let checkNumber = 0;
      
      while (conversationActive) {
        console.log(`Starting QA check turn ${messages.length} with ${checkNumber}/${checkTypes.length} checks completed`);
        
        const result = await runner.run(agent, messages, {
          stream: true,
          maxTurns: 50
        });

        for await (const event of result.toStream()) {
          // Stream text deltas for UI updates
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              sseUpdate(sessionId, { 
                type: 'agent_thinking', 
                message: 'Analyzing article formatting...' 
              });
            }
          }

          // Handle tool calls
          if (event.type === 'run_item_stream_event') {
            if (event.name === 'tool_called') {
              const toolCall = event.item as any;
              console.log(`Tool called: ${toolCall.name}`, toolCall.id);
              
              // Add tool call to messages
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
            }
            
            if (event.name === 'tool_output') {
              const toolOutput = event.item as any;
              console.log(`Tool output received:`, toolOutput);
              
              // Add tool result to messages
              messages.push({
                role: 'tool',
                content: toolOutput.output,
                tool_call_id: toolOutput.tool_call_id
              });
            }
            
            // Handle message_output_created for proper message tracking
            if (event.name === 'message_output_created') {
              const messageItem = event.item as any;
              
              if (!messageItem.tool_calls?.length) {
                messages.push({
                  role: 'assistant',
                  content: messageItem.content
                });
                
                sseUpdate(sessionId, { 
                  type: 'assistant', 
                  content: messageItem.content 
                });
              }
            }
          }
        }

        // Check if conversation should continue based on checks completed
        const currentSession = await db.query.formattingQaSessions.findFirst({
          where: eq(formattingQaSessions.id, sessionId)
        });
        
        // Count completed checks
        const completedChecksCount = await db.query.formattingQaChecks.findMany({
          where: eq(formattingQaChecks.qaSessionId, sessionId)
        });
        
        checkNumber = completedChecksCount.length;
        conversationActive = checkNumber < checkTypes.length;

        // Continue if checks remain
        if (checkNumber < checkTypes.length && conversationActive) {
          // Add continuation prompt if needed
          messages.push({
            role: 'user',
            content: 'YOU MUST CONTINUE THE AUTOMATED WORKFLOW. Please proceed with the remaining formatting checks.'
          });
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Final summary
      const completedChecks = await db.query.formattingQaChecks.findMany({
        where: eq(formattingQaChecks.qaSessionId, sessionId)
      });

      const passedCount = completedChecks.filter(c => c.status === 'passed').length;
      const failedCount = completedChecks.filter(c => c.status === 'failed').length;

      await db.update(formattingQaSessions)
        .set({ 
          status: 'completed',
          passedChecks: passedCount,
          failedChecks: failedCount,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(formattingQaSessions.id, sessionId));

      sseUpdate(sessionId, {
        type: 'completed',
        totalChecks: checkTypes.length,
        passedChecks: passedCount,
        failedChecks: failedCount,
        message: `QA checks completed. ${passedCount} passed, ${failedCount} failed.`
      });

    } catch (error) {
      console.error('Error performing QA checks:', error);
      
      await db.update(formattingQaSessions)
        .set({ 
          status: 'error', 
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(formattingQaSessions.id, sessionId));

      sseUpdate(sessionId, {
        type: 'error',
        message: 'An error occurred during QA checks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async createFormattingQAAgent(sessionId: string, workflowId: string, version: number): Promise<Agent> {
    // Create context object for this specific agent instance
    const context = {
      sessionId,
      workflowId,
      version,
      checkNumber: 0,
      conversationActive: true
    };

    // Tool for analyzing formatting checks
    const analyzeFormattingCheckTool = tool({
      name: 'analyze_formatting_check',
      description: 'Analyze a specific formatting or quality aspect of the article',
      parameters: z.object({
        check_type: z.enum(checkTypes).describe('The type of check being performed'),
        analysis: z.string().describe('Detailed analysis of this check'),
        issues_found: z.array(z.string()).describe('List of specific issues found'),
        locations: z.array(z.string()).describe('Specific locations where issues occur'),
        confidence: z.number().min(1).max(10).describe('Confidence score in the check result'),
        passed: z.boolean().describe('Whether this check passed'),
        fix_suggestions: z.string().describe('Suggestions for fixing the issues')
      }),
      execute: async (args) => {
        if (!context.sessionId || !context.workflowId) {
          throw new Error('Missing session context');
        }

        try {
          // Create the check record
          const checkId = uuidv4();
          const now = new Date();
          
          const checkData = {
            id: checkId,
            qaSessionId: context.sessionId,
            workflowId: context.workflowId,
            version: context.version || 1,
            checkNumber: context.checkNumber + 1,
            checkType: args.check_type,
            checkDescription: this.getCheckDescription(args.check_type),
            status: args.passed ? 'passed' as const : 'failed' as const,
            issuesFound: args.issues_found.length > 0 ? args.issues_found.join('\n') : null,
            locationDetails: args.locations.length > 0 ? args.locations.join('\n') : null,
            confidenceScore: args.confidence,
            fixSuggestions: args.fix_suggestions || null,
            checkMetadata: {
              analysis: args.analysis,
              issueCount: args.issues_found.length
            },
            createdAt: now,
            updatedAt: now
          };

          await db.insert(formattingQaChecks).values(checkData);

          // Update current check index
          context.checkNumber++;

          // Send SSE update
          sseUpdate(context.sessionId, {
            type: 'check_completed',
            checkType: args.check_type,
            checkNumber: context.checkNumber,
            status: args.passed ? 'passed' : 'failed',
            issuesFound: args.issues_found,
            confidence: args.confidence,
            fixSuggestions: args.fix_suggestions
          });

          console.log(`Completed check ${args.check_type}: ${args.passed ? 'PASSED' : 'FAILED'}`);

          // Check if all checks are complete
          const isLastCheck = context.checkNumber >= checkTypes.length;
          
          if (isLastCheck) {
            context.conversationActive = false;
            return `All ${checkTypes.length} formatting checks have been completed. The QA process is now finished.`;
          }

          return `Check '${args.check_type}' completed (${args.passed ? 'PASSED' : 'FAILED'}). ${checkTypes.length - context.checkNumber} checks remaining.`;

        } catch (error) {
          console.error('Error saving formatting check:', error);
          throw error;
        }
      }
    });

    // Create the agent
    const agent = new Agent({
      name: 'FormattingQASpecialist',
      model: 'o3-2025-04-16',
      instructions: `You are an expert formatting and quality assurance specialist for guest post articles. Your job is to systematically check articles against specific formatting standards and quality requirements.

CORE RESPONSIBILITY:
Perform thorough, automated formatting and quality checks on articles, identifying specific issues and their locations.

FORMATTING STANDARDS TO CHECK:
1. Header Hierarchy: H2s and H3s must use proper heading styles (not just bold text)
2. Line Breaks: Exactly one blank line between paragraphs, no orphan line breaks
3. Section Completeness: Must have Intro, body sections, FAQ intro, and Conclusion
4. List Consistency: Bullet/number styles must not change within sections
5. Bold Cleanup: Remove unnecessary or random bolding (keep only purposeful bold)
6. FAQ Formatting: Questions in bold sentence-case, answers in plain text
7. Citation Placement: Single citation near the top (intro or first section), remove extras
8. UTM Cleanup: Remove any "source=chatgpt" UTM parameters from URLs

THIS IS AN AUTOMATED WORKFLOW - continue checking all aspects without asking for permission.

For each check:
- Analyze the entire article for that specific aspect
- Identify ALL instances of issues (be thorough)
- Note specific locations (section names, paragraph numbers, or quote snippets)
- Provide confidence score (1-10) in your analysis
- Suggest specific fixes for any issues found

Be precise about locations - use section headings, paragraph numbers, or quote the specific text where issues occur.`,
      tools: [analyzeFormattingCheckTool]
    });

    return agent;
  }

  private getCheckDescription(checkType: CheckType): string {
    const descriptions: Record<CheckType, string> = {
      header_hierarchy: 'Verify H2s and H3s use proper heading styles, not just bold text',
      line_breaks: 'Check for exactly one blank line between paragraphs, no orphan breaks',
      section_completeness: 'Ensure all required sections exist: Intro, body, FAQ intro, Conclusion',
      list_consistency: 'Verify bullet/number styles don\'t change within sections',
      bold_cleanup: 'Remove unnecessary or random bolding, keep only purposeful bold',
      faq_formatting: 'Check FAQ questions are bold sentence-case, answers are plain text',
      citation_placement: 'Verify single citation near top, remove any extras',
      utm_cleanup: 'Remove source=chatgpt UTM parameters from all URLs'
    };
    return descriptions[checkType];
  }

  async getQASession(sessionId: string) {
    const session = await db.query.formattingQaSessions.findFirst({
      where: eq(formattingQaSessions.id, sessionId),
      with: {
        formattingQaChecks: {
          orderBy: [formattingQaChecks.checkNumber]
        }
      }
    });

    return session;
  }

  async getLatestQASession(workflowId: string) {
    const session = await db.query.formattingQaSessions.findFirst({
      where: eq(formattingQaSessions.workflowId, workflowId),
      orderBy: [desc(formattingQaSessions.version)],
      with: {
        formattingQaChecks: {
          orderBy: [formattingQaChecks.checkNumber]
        }
      }
    });

    return session;
  }
}

// Export singleton instance
export const agenticFormattingQAService = new AgenticFormattingQAService();