import OpenAI from 'openai';
import { Runner, FunctionTool, RunToolCallItem, Agent, tool } from '@openai/agents';
import { OpenAIProvider, fileSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { auditSessions, auditSections, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Zod schemas for polish tool parameters
const parseArticleSchema = z.object({
  sections: z.array(z.object({
    title: z.string().describe('Section or subsection title'),
    content: z.string().describe('Section/subsection content for brand alignment'),
    order: z.number().describe('Sequential order number for polishing'),
    level: z.enum(['section', 'subsection']).describe('Whether this is a main section (H2) or subsection (H3)'),
    parentSection: z.string().describe('Parent section title if this is a subsection, or empty string for main sections'),
    headerLevel: z.enum(['h2', 'h3']).describe('Header level to use in final output')
  })),
  totalSections: z.number().describe('Total number of sections and subsections identified for polishing')
});

const proceedPolishSchema = z.object({
  section_title: z.string().describe('Title of the section being polished'),
  strengths: z.string().describe('Identified strengths in brand voice and alignment'),
  weaknesses: z.string().describe('Areas needing improvement for brand consistency'),
  updated_content: z.string().describe('Brand-aligned updated section ready for copy-paste'),
  editing_pattern: z.string().describe('Type of editing applied: narrative, bullets, citations, tone, etc.'),
  brand_elements: z.array(z.string()).describe('Brand elements identified or applied')
});

const cleanupPolishSchema = z.object({
  section_title: z.string().describe('Title of the section being cleaned up'),
  cleaned_content: z.string().describe('Final polished section after brand compliance review'),
  brand_compliance_score: z.number().min(1).max(10).describe('Brand compliance score from 1-10'),
  compliance_notes: z.string().describe('Notes about brand compliance adjustments made'),
  final_quality: z.enum(['excellent', 'good', 'fair', 'needs_work']).describe('Overall quality assessment')
});

// Store active SSE connections for real-time updates
const activePolishStreams = new Map<string, any>();

export function addPolishSSEConnection(sessionId: string, res: any) {
  activePolishStreams.set(sessionId, res);
}

export function removePolishSSEConnection(sessionId: string) {
  activePolishStreams.delete(sessionId);
}

// Store subscription callbacks for real-time updates
const polishSubscriptions = new Map<string, (data: any) => void>();

function polishSSEPush(sessionId: string, payload: any) {
  const stream = activePolishStreams.get(sessionId);
  if (stream) {
    try {
      stream.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      console.error('Polish SSE push failed:', error);
      activePolishStreams.delete(sessionId);
    }
  }
  
  // Also call subscription callback if exists
  const callback = polishSubscriptions.get(sessionId);
  if (callback) {
    try {
      callback(payload);
    } catch (error) {
      console.error('Polish subscription callback failed:', error);
    }
  }
}

// Create file search tool for brand guidelines and semantic SEO knowledge
const brandGuidelinesFileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

export class AgenticFinalPolishService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async createPolishSession(workflowId: string, seoOptimizedArticle: string, researchOutline: string): Promise<string> {
    try {
      // Get the next version number for this workflow's polish sessions
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${auditSessions.version}), 0)`.as('maxVersion')
      })
      .from(auditSessions)
      .where(and(
        eq(auditSessions.workflowId, workflowId),
        eq(auditSessions.auditType, 'final_polish')
      ));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      
      console.log(`Starting final polish session v${nextVersion} for workflow ${workflowId}`);
      
      // Create polish session record
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(auditSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'final-polish',
        auditType: 'final_polish',
        status: 'pending',
        originalArticle: seoOptimizedArticle,
        researchOutline,
        auditMetadata: {
          startedAt: now.toISOString(),
          version: nextVersion,
          editingPatterns: [], // Track patterns used across sections
          polishType: 'brand_alignment'
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      return sessionId;
    } catch (error) {
      console.error('Error starting polish session:', error);
      throw new Error('Failed to start polish session');
    }
  }

  async startPolishWorkflow(sessionId: string): Promise<void> {
    const session = await this.getPolishSession(sessionId);
    if (!session) throw new Error('Polish session not found');
    
    const seoOptimizedArticle = session.originalArticle || '';
    const researchOutline = session.researchOutline || '';
    
    return this.runPolishWorkflow(sessionId, seoOptimizedArticle, researchOutline);
  }

  private async runPolishWorkflow(sessionId: string, seoOptimizedArticle: string, researchOutline: string) {
    try {
      const session = await this.getPolishSession(sessionId);
      if (!session) throw new Error('Polish session not found');

      // Update session status to polishing
      await this.updatePolishSession(sessionId, { status: 'polishing' });

      const initialPrompt = `You are conducting a final polish for brand alignment on this SEO-optimized article.

ARTICLE TO POLISH:
${seoOptimizedArticle}

ORIGINAL RESEARCH CONTEXT:
${researchOutline}

BRAND ALIGNMENT INSTRUCTIONS:
You have access to a file search tool containing Brand Guidelines, Semantic SEO tips, and Words to Avoid documents. Use this knowledge base for brand consistency.

CRITICAL TWO-PROMPT WORKFLOW:
For each section, you MUST follow this exact pattern:
1. PROCEED: Review section against brand guide, provide strengths/weaknesses/updated content
2. CLEANUP: Review your proceed output against brand kit and forbidden words, make final refinements

POLISH REQUIREMENTS:
- Ensure consistent brand voice and tone throughout
- Follow brand guidelines for language, style, and messaging  
- Avoid forbidden words and phrases from "words to not use" document
- Maintain semantic SEO benefits while prioritizing brand alignment
- Keep content primarily narrative with flowing prose
- Use short, punchy paragraphs (2-3 lines max)
- NO em-dashes per brand guidelines

Start by searching the knowledge base for brand guidelines, then parse the article into sections.`;

      // Create tools for the polish process
      const parseArticleTool = tool({
        name: "parse_article",
        description: "Parse the article into manageable polish chunks (sections and subsections) for systematic brand alignment",
        parameters: parseArticleSchema,
        execute: async (args) => {
          console.log('Parse article tool executed:', args);
          
          // Store section information in polish session metadata
          await this.updatePolishSession(sessionId, {
            totalSections: args.totalSections,
            totalProceedSteps: args.totalSections,
            totalCleanupSteps: args.totalSections,
            auditMetadata: {
              ...(session.auditMetadata || {}),
              parsedSections: args.sections,
              editingPatterns: []
            }
          });
          
          polishSSEPush(sessionId, { type: 'parsed', sections: args.sections, totalSections: args.totalSections });
          
          // Get the first section details for context
          const firstSection = args.sections.find((s: any) => s.order === 1);
          const firstSectionContext = firstSection ? `

STARTING BRAND ALIGNMENT POLISH:
You're polishing "${firstSection.title}" - the first section of ${args.totalSections} sections.

SECTION CONTENT TO POLISH:
${firstSection.content}

TWO-PROMPT PROCESS:
1. PROCEED: Analyze this section against brand guidelines and provide:
   - Strengths: What brand elements are working well
   - Weaknesses: What needs improvement for brand consistency
   - Updated Content: Your brand-aligned version ready for copy-paste

Remember: This is brand voice optimization, not SEO editing. Focus on brand consistency and voice alignment.` : '';

          return `Article parsed successfully! I found ${args.totalSections} sections to polish for brand alignment. Now I'll start the two-prompt polish process.${firstSectionContext}

BRAND POLISH PHILOSOPHY:
- Prioritize brand voice and tone consistency over everything else
- Vary your editing approaches to avoid repetitive patterns
- Maintain content quality while ensuring brand compliance
- Apply brand guidelines systematically but thoughtfully

IMMEDIATE NEXT ACTIONS (execute automatically):
1. FIRST: Use file search to review brand guidelines and style requirements
2. THEN: Polish the first section using the proceed_polish function
3. CONTINUE: Follow with cleanup_polish, then proceed systematically

Begin the brand polish now.`;
        }
      });

      const proceedPolishTool = tool({
        name: "proceed_polish", 
        description: "STEP 1: Analyze section against brand guidelines and provide updated content (part 1 of 2-step process)",
        parameters: proceedPolishSchema,
        execute: async (args) => {
          console.log('Proceed polish tool executed:', args);
          const { section_title, strengths, weaknesses, updated_content, editing_pattern, brand_elements } = args;
          
          const currentSession = await this.getPolishSession(sessionId);
          if (!currentSession) throw new Error('Session not found');
          
          // Save proceed results to database
          const ordinal = (currentSession.completedProceedSteps || 0) + 1;
          const sessionMetadata = currentSession.auditMetadata as any;
          const parsedSections = sessionMetadata?.parsedSections || [];
          const originalSection = parsedSections.find((s: any) => s.order === ordinal);
          
          // Create or update section record
          await db.insert(auditSections).values({
            id: uuidv4(),
            auditSessionId: sessionId,
            workflowId: currentSession.workflowId,
            version: currentSession.version,
            sectionNumber: ordinal,
            title: section_title,
            originalContent: originalSection?.content || '',
            proceedContent: updated_content,
            strengths: strengths,
            weaknesses: weaknesses,
            editingPattern: editing_pattern,
            proceedStatus: 'completed',
            cleanupStatus: 'pending',
            status: 'auditing',
            auditMetadata: {
              proceedAt: new Date().toISOString(),
              headerLevel: originalSection?.headerLevel || 'h2',
              level: originalSection?.level || 'section',
              parentSection: originalSection?.parentSection,
              brandElements: brand_elements
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Update session proceed progress
          await this.updatePolishSession(sessionId, {
            completedProceedSteps: ordinal,
            auditMetadata: {
              ...(currentSession.auditMetadata || {}),
              editingPatterns: [...((currentSession.auditMetadata as any)?.editingPatterns || []), editing_pattern]
            }
          });

          polishSSEPush(sessionId, { 
            type: 'section_proceed', 
            sectionTitle: section_title,
            strengths,
            weaknesses,
            proceedContent: updated_content,
            editingPattern: editing_pattern
          });

          return `Excellent proceed analysis for "${section_title}"! I've identified the strengths and weaknesses and provided brand-aligned content.

CRITICAL: You MUST now run cleanup_polish on this exact content before moving to the next section.

PROCEED OUTPUT TO CLEANUP:
${updated_content}

IMMEDIATE REQUIRED ACTION:
Use cleanup_polish function to review this content against brand kit and "words to not use" document.

DO NOT proceed to the next section until cleanup is complete. This is the mandatory two-prompt workflow.`;
        }
      });

      const cleanupPolishTool = tool({
        name: "cleanup_polish",
        description: "STEP 2: Review proceed output against brand kit and forbidden words, make final refinements (part 2 of 2-step process)",
        parameters: cleanupPolishSchema,
        execute: async (args) => {
          console.log('Cleanup polish tool executed:', args);
          const { section_title, cleaned_content, brand_compliance_score, compliance_notes, final_quality } = args;
          
          const currentSession = await this.getPolishSession(sessionId);
          if (!currentSession) throw new Error('Session not found');
          
          // Find the section record to update
          const ordinal = (currentSession.completedCleanupSteps || 0) + 1;
          const sessionMetadata = currentSession.auditMetadata as any;
          const parsedSections = sessionMetadata?.parsedSections || [];
          
          // Update section with cleanup results
          await db.update(auditSections)
            .set({
              cleanupContent: cleaned_content,
              auditedContent: cleaned_content, // Final polished content
              brandComplianceScore: brand_compliance_score,
              cleanupStatus: 'completed',
              status: 'completed',
              auditMetadata: sql`jsonb_set(${auditSections.auditMetadata}, '{cleanupAt}', '"${new Date().toISOString()}"')`,
              updatedAt: new Date()
            })
            .where(and(
              eq(auditSections.auditSessionId, sessionId),
              eq(auditSections.sectionNumber, ordinal)
            ));

          // Update session cleanup progress and completed sections
          await this.updatePolishSession(sessionId, {
            completedCleanupSteps: ordinal,
            completedSections: ordinal
          });

          polishSSEPush(sessionId, { 
            type: 'section_cleanup', 
            sectionTitle: section_title,
            cleanupContent: cleaned_content,
            brandComplianceScore: brand_compliance_score
          });

          // Check if this is the last section
          const totalSections = currentSession.totalSections || parsedSections.length;
          const isLastSection = ordinal >= totalSections;
          
          if (isLastSection) {
            // Compile final polished article
            const finalArticle = await this.compileFinalPolishedArticle(sessionId);
            
            // Mark session as completed
            await this.updatePolishSession(sessionId, {
              status: 'completed',
              completedAt: new Date()
            });

            // Update workflow with final polish results
            await this.updateWorkflowWithPolishedArticle(currentSession.workflowId, finalArticle);
            
            polishSSEPush(sessionId, {
              type: 'completed',
              finalPolishedArticle: finalArticle,
              totalSections,
              totalBrandAdjustments: totalSections, // Count of sections that were brand-aligned
              editingPatterns: sessionMetadata?.editingPatterns || []
            });

            return `🎉 FINAL POLISH COMPLETED! All ${totalSections} sections have been processed through the two-prompt workflow.

Brand compliance score for "${section_title}": ${brand_compliance_score}/10

FINAL BRAND-ALIGNED ARTICLE READY:
- All sections reviewed against brand guidelines
- Consistent brand voice throughout
- Forbidden words removed
- Ready for publication

The complete polished article has been compiled and is available for use.`;
          } else {
            // Get next section for continuation
            const nextSection = parsedSections.find((s: any) => s.order === ordinal + 1);
            const nextSectionContext = nextSection ? `

CONTINUING BRAND POLISH:
Next section: "${nextSection.title}" (Section ${ordinal + 1} of ${totalSections})

SECTION CONTENT TO POLISH:
${nextSection.content}

PATTERN AWARENESS:
- Recent editing patterns: ${sessionMetadata?.editingPatterns?.slice(-2).join(', ') || 'none yet'}
- Try to vary your approach from recent patterns

POLISH REQUIREMENTS:
- Maintain brand voice consistency with previous polished sections
- Consider how this section flows from the previous brand-aligned content
- Apply different editing patterns to avoid repetition` : '';

            return `Great cleanup work on "${section_title}"! Brand compliance score: ${brand_compliance_score}/10. Section ${ordinal} polish complete.${nextSectionContext}

YOU MUST CONTINUE AUTOMATICALLY - DO NOT WAIT FOR PERMISSION. This is an automated polish workflow.

BRAND POLISH PRINCIPLES:
- Consistent brand voice and tone throughout
- Vary editing approaches (patterns used: ${sessionMetadata?.editingPatterns?.join(', ') || 'none yet'})
- Maintain quality while ensuring brand compliance

IMMEDIATE NEXT ACTIONS (execute these now):
1. FIRST: Use file search to refresh brand guidelines knowledge
2. THEN: Polish "${nextSection?.title || 'next section'}" using proceed_polish function

START POLISHING THE NEXT SECTION NOW - DO NOT ASK FOR PERMISSION OR CONFIRMATION.`;
          }
        }
      });

      // Create Agent with tools
      const agent = new Agent({
        name: 'BrandAlignmentPolisher',
        instructions: 'You are an expert content editor specializing in brand alignment and voice consistency for guest posts. You work systematically section by section using a mandatory two-prompt workflow: PROCEED then CLEANUP for each section. This is an AUTOMATED WORKFLOW - continue until completion without asking for permission.',
        model: 'gpt-4o',
        tools: [
          brandGuidelinesFileSearch,
          parseArticleTool,
          proceedPolishTool,
          cleanupPolishTool
        ]
      });

      // Create Runner and run agent with streaming
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Maintain conversation history
      const messages: any[] = [
        { role: 'user', content: initialPrompt }
      ];
      
      let conversationActive = true;
      let sectionCount = 0;
      
      while (conversationActive) {
        console.log(`Starting polish turn ${messages.length} with ${sectionCount} sections polished`);
        
        // Run the agent with full message history
        const result = await runner.run(agent, messages, {
          stream: true,
          maxTurns: 100 // Allow more turns for two-prompt workflow
        });
        
        // Process the streaming result
        for await (const event of result.toStream()) {
          // Stream text deltas for UI
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              polishSSEPush(sessionId, { type: 'text', content: event.data.delta });
            }
          }
          
          if (event.type === 'run_item_stream_event') {
            // Handle tool calls
            if (event.name === 'tool_called') {
              const toolCall = event.item as any;
              console.log('Polish tool called:', toolCall.name, toolCall.id);
              
              // Special logging for file search usage
              if (toolCall.name === 'file_search') {
                console.log('🔍 BRAND GUIDELINES FILE SEARCH:', JSON.stringify(toolCall.args, null, 2));
                polishSSEPush(sessionId, { type: 'tool_call', name: 'file_search', query: toolCall.args?.query });
              }
              
              // Construct assistant message with tool call
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
              
              polishSSEPush(sessionId, { 
                type: 'tool_call', 
                name: toolCall.name,
                query: toolCall.args?.query || 'brand guidelines'
              });
              
              // Track completion for two-prompt workflow
              if (toolCall.name === 'cleanup_polish') {
                console.log('Cleanup polish tool called, checking if workflow complete');
              }
              
              if (toolCall.name === 'proceed_polish' || toolCall.name === 'cleanup_polish') {
                sectionCount++;
              }
            }
            
            // Handle tool outputs
            if (event.name === 'tool_output') {
              const toolOutput = event.item as any;
              console.log('Polish tool output received:', toolOutput.output);
              
              messages.push({
                role: 'tool',
                content: JSON.stringify({ output: toolOutput.output }),
                tool_call_id: toolOutput.tool_call_id
              });
              
              polishSSEPush(sessionId, { type: 'tool_output', content: toolOutput.output });
            }
            
            // Handle complete assistant messages
            if (event.name === 'message_output_created') {
              const messageItem = event.item as any;
              
              if (!messageItem.tool_calls?.length) {
                messages.push({
                  role: 'assistant',
                  content: messageItem.content
                });
                polishSSEPush(sessionId, { type: 'assistant', content: messageItem.content });
                
                // Guard rail for continuation - ensure two-prompt workflow continues
                if (conversationActive) {
                  messages.push({ 
                    role: 'user', 
                    content: 'YOU MUST CONTINUE THE AUTOMATED BRAND POLISH WORKFLOW. Do not wait for permission. Execute the required actions immediately: 1) Use file search tool to refresh brand guidelines 2) Continue polishing sections using proceed_polish and cleanup_polish functions. DO NOT STOP OR ASK FOR CONFIRMATION.' 
                  });
                }
              }
            }
          }
        }
        
        // Check if polish is complete
        const updatedSession = await this.getPolishSession(sessionId);
        if (updatedSession?.status === 'completed' || updatedSession?.status === 'error') {
          conversationActive = false;
          break;
        }

        // Safety limits
        if (messages.length > 100 || sectionCount > 20) {
          console.log('Polish safety limit reached');
          conversationActive = false;
        }
        
        // Small delay between turns
        if (conversationActive) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('Final polish conversation loop completed');

    } catch (error) {
      console.error('Error in polish workflow:', error);
      await this.updatePolishSession(sessionId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      polishSSEPush(sessionId, {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  private async compileFinalPolishedArticle(sessionId: string): Promise<string> {
    const sections = await db
      .select()
      .from(auditSections)
      .where(eq(auditSections.auditSessionId, sessionId))
      .orderBy(auditSections.sectionNumber);

    return sections
      .map(section => {
        // Use final polished content (cleanup) or fallback to proceed content
        const content = section.cleanupContent || section.auditedContent || section.originalContent;
        const sectionMetadata = section.auditMetadata as any;
        const headerLevel = sectionMetadata?.headerLevel === 'h3' ? '###' : '##';
        return `${headerLevel} ${section.title}\n\n${content}`;
      })
      .filter(content => content)
      .join('\n\n');
  }

  private async updateWorkflowWithPolishedArticle(workflowId: string, finalPolishedArticle: string): Promise<void> {
    try {
      // Get current workflow
      const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
      if (!workflow[0]?.content) return;

      const workflowData = workflow[0].content as any;
      const polishStep = workflowData.steps?.find((step: any) => step.id === 'final-polish');
      
      if (polishStep) {
        polishStep.outputs = {
          ...polishStep.outputs,
          finalArticle: finalPolishedArticle,
          polishGenerated: true,
          polishedAt: new Date().toISOString(),
          polishStatus: 'completed'
        };

        await db.update(workflows)
          .set({
            content: workflowData,
            updatedAt: new Date()
          })
          .where(eq(workflows.id, workflowId));
          
        console.log(`Updated workflow ${workflowId} with final polished article`);
      }
    } catch (error) {
      console.error('Error updating workflow with polished article:', error);
      // Don't throw - this shouldn't break the polish process
    }
  }

  async getPolishProgress(sessionId: string) {
    const session = await this.getPolishSession(sessionId);
    if (!session) {
      throw new Error('Polish session not found');
    }

    const sections = await db
      .select()
      .from(auditSections)
      .where(eq(auditSections.auditSessionId, sessionId))
      .orderBy(auditSections.sectionNumber);

    const polishSections = sections.map(section => ({
      id: section.id,
      sectionNumber: section.sectionNumber,
      title: section.title,
      originalContent: section.originalContent || undefined,
      proceedContent: section.proceedContent || undefined,
      cleanupContent: section.cleanupContent || undefined,
      strengths: section.strengths || undefined,
      weaknesses: section.weaknesses || undefined,
      editingPattern: section.editingPattern || undefined,
      brandComplianceScore: section.brandComplianceScore || undefined,
      proceedStatus: section.proceedStatus as any || 'pending',
      cleanupStatus: section.cleanupStatus as any || 'pending',
      errorMessage: section.errorMessage || undefined,
      metadata: {
        headerLevel: (section.auditMetadata as any)?.headerLevel,
        level: (section.auditMetadata as any)?.level,
        parentSection: (section.auditMetadata as any)?.parentSection
      }
    }));

    return {
      session: {
        id: session.id,
        status: session.status as any,
        totalSections: session.totalSections || 0,
        completedSections: session.completedSections || 0,
        totalProceedSteps: session.totalProceedSteps || 0,
        completedProceedSteps: session.completedProceedSteps || 0,
        totalCleanupSteps: session.totalCleanupSteps || 0,
        completedCleanupSteps: session.completedCleanupSteps || 0,
        errorMessage: session.errorMessage || undefined
      },
      sections: polishSections,
      progress: {
        total: session.totalSections || 0,
        completed: session.completedSections || 0,
        proceedStepsCompleted: session.completedProceedSteps || 0,
        cleanupStepsCompleted: session.completedCleanupSteps || 0
      }
    };
  }

  private async getPolishSession(sessionId: string) {
    const [session] = await db
      .select()
      .from(auditSessions)
      .where(eq(auditSessions.id, sessionId));
    return session;
  }

  private async updatePolishSession(sessionId: string, updates: any) {
    await db
      .update(auditSessions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(auditSessions.id, sessionId));
  }

  // Subscription methods for real-time updates
  subscribe(sessionId: string, callback: (data: any) => void) {
    polishSubscriptions.set(sessionId, callback);
  }

  unsubscribe(sessionId: string) {
    polishSubscriptions.delete(sessionId);
  }
}

export const agenticFinalPolishService = new AgenticFinalPolishService();