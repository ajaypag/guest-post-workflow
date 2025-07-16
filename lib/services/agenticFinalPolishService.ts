import OpenAI from 'openai';
import { Runner, FunctionTool, RunToolCallItem, Agent, tool } from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { polishSessions, polishSections, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Helper function to sanitize strings by removing null bytes and control characters
function sanitizeForPostgres(str: string): string {
  if (!str) return str;
  // Remove null bytes and other control characters (0x00-0x1F except tab, newline, carriage return)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// Zod schemas for polish tool parameters
const parsePolishSchema = z.object({
  sections: z.array(z.object({
    title: z.string().describe('Section or subsection title'),
    content: z.string().describe('SEO-optimized section content to be polished'),
    order: z.number().describe('Sequential order number for polishing'),
    level: z.enum(['section', 'subsection']).describe('Whether this is a main section (H2) or subsection (H3)'),
    parentSection: z.string().describe('Parent section title if this is a subsection, or empty string for main sections'),
    headerLevel: z.enum(['h2', 'h3']).describe('Header level to use in final output')
  })),
  totalSections: z.number().describe('Total number of sections and subsections for final polish')
});

const polishSectionSchema = z.object({
  section_title: z.string().describe('Title of the section being polished'),
  strengths: z.string().describe('How well this section follows brand and semantic guides - specific strengths identified'),
  weaknesses: z.string().describe('Areas where this section could better follow brand engagement or semantic directness guides'),
  brand_conflicts: z.string().describe('Specific conflicts between brand guide (reader engagement) and semantic guide (being to the point)'),
  polished_content: z.string().describe('The updated section content that threads the needle between brand engagement and semantic directness'),
  polish_approach: z.string().describe('Approach used to resolve conflicts: engagement-focused, clarity-focused, balanced, etc.'),
  engagement_score: z.number().min(1).max(10).describe('How well the polished content engages readers per brand guide (1-10)'),
  clarity_score: z.number().min(1).max(10).describe('How direct and to-the-point the polished content is per semantic guide (1-10)'),
  is_last: z.boolean().describe('Whether this is the last section')
});

// Store active SSE connections for real-time updates
const activePolishStreams = new Map<string, any>();

export function addPolishSSEConnection(sessionId: string, res: any) {
  activePolishStreams.set(sessionId, res);
}

export function removePolishSSEConnection(sessionId: string) {
  activePolishStreams.delete(sessionId);
}

function polishSSEPush(sessionId: string, payload: any) {
  const stream = activePolishStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('Polish SSE push failed:', error);
    activePolishStreams.delete(sessionId);
  }
}

export class AgenticFinalPolishService {
  private openaiProvider: OpenAIProvider;

  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startPolishSession(workflowId: string, originalArticle: string, researchContext?: string): Promise<string> {
    try {
      // Get the next version number for this workflow's polish sessions
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${polishSessions.version}), 0)`.as('maxVersion')
      })
      .from(polishSessions)
      .where(eq(polishSessions.workflowId, workflowId));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      
      console.log(`Starting polish session v${nextVersion} for workflow ${workflowId}`);

      // Create polish session record
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(polishSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'final-polish',
        status: 'pending',
        originalArticle: sanitizeForPostgres(originalArticle),
        researchContext: sanitizeForPostgres(researchContext || ''),
        polishMetadata: {
          startedAt: now.toISOString(),
          version: nextVersion,
          polishApproaches: [], // Track approaches used across sections
          totalConflictsResolved: 0
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to start polish session:', error);
      throw new Error('Failed to initialize final polish session');
    }
  }

  async performFinalPolish(sessionId: string): Promise<void> {
    try {
      const session = await this.getPolishSession(sessionId);
      if (!session) throw new Error('Polish session not found');

      await this.updatePolishSession(sessionId, { status: 'polishing' });
      polishSSEPush(sessionId, { type: 'status', status: 'polishing', message: 'Starting final polish...' });

      // Create initial prompt for article parsing and first section polish
      const initialPrompt = `I'm providing you with an SEO-optimized article that needs final polish. Your job is to gauge how well it follows the guides, give it strengths and weaknesses, and update each section with improvements. Acceptable changes: tighten phrasing, fix passive voice, clarify facts, strengthen internal anchors. Do not inject new ideas or restructure.

ARTICLE TO POLISH:
${session.originalArticle}

RESEARCH CONTEXT:
${session.researchContext || 'No additional research context provided'}

FINAL POLISH INSTRUCTIONS:
You have access to a file search tool containing brand guideline semantic seo guide, writing style guides and words not to use. Use this knowledge base to understand both the approach we take to writing and seo directness principles.

YOUR CORE CHALLENGE:
Often times, the brand guide and semantic principals might conflict - where the semantic guide wants you to be very to the point and the brand guide wants you to keep the reader engaged - it's your job to thread that needle effectively. Often times, the first sentence in a section or paragraph should need the semantic goals whereas subsequent sentences or paragraphs should have some more brand guide type elements to keep the article feeling engaging.

POLISH REQUIREMENTS:
- Ensure adherence to both the brand voice and semantic SEO guidelines
- Improve phrasing: tighten language, eliminate passive voice, clarify factual statements, and strengthen internal anchor links. Do not inject new ideas or restructure the article
- Typically, the first sentence in a section or paragraph should focus on semantic goals, while subsequent sentences can lean more into brand voice for engagement. This is a guideline—not a hard rule. Use your judgment to decide when it applies
- Use a different polish approach from previous sections to maintain variety
- Score and report improvements in engagement and clarity

PARSING INSTRUCTIONS:
When you parse the article, break it into manageable polish chunks. If a section is very long or contains multiple distinct topics/subsections, break it down:
- Main sections should be H2 level (level: "section", headerLevel: "h2")  
- Subsections should be H3 level (level: "subsection", headerLevel: "h3", parentSection: "Main Section Title")
- Each chunk should be polishable independently but not too granular
- Maintain logical content groupings and hierarchical structure

REQUIRED ACTIONS:
1. FIRST: Use file search to review brand guidelines, semantic seo guide, writing style and do not use words list from the vector knowledge base
2. THEN: Parse the article into manageable polish chunks using the parse_polish_article function
3. FINALLY: Begin polishing the first section with the polish_section function

Start by searching the knowledge base for brand guide, semantic seo, writing style and words not to use guides.`;

      // Create tools for the polish process
      const parsePolishTool = tool({
        name: "parse_polish_article",
        description: "Parse the SEO-optimized article into manageable polish chunks (sections and subsections) for systematic final polish",
        parameters: parsePolishSchema,
        execute: async (args) => {
          console.log('Parse polish article tool executed:', args);
          
          // Store section information in polish session metadata
          await this.updatePolishSession(sessionId, {
            totalSections: args.totalSections,
            polishMetadata: {
              ...(session.polishMetadata || {}),
              parsedSections: args.sections.map(s => ({
                ...s,
                title: sanitizeForPostgres(s.title),
                content: sanitizeForPostgres(s.content)
              })),
              polishApproaches: [],
              conflictsResolved: 0
            }
          });
          
          polishSSEPush(sessionId, { type: 'parsed', sections: args.sections, totalSections: args.totalSections });
          
          // Get the first section details for context
          const firstSection = args.sections.find((s: any) => s.order === 1);
          const firstSectionContext = firstSection ? `

STARTING FINAL POLISH:
You're polishing "${firstSection.title}" - the first section of ${args.totalSections} sections.

SECTION CONTENT TO POLISH:
${firstSection.content}

POLISH REQUIREMENTS:
- Gauge how well this section follows both brand and semantic guides
- Identify specific strengths and areas for improvement
- Note any conflicts between brand engagement needs and semantic directness
- Update the content to thread the needle effectively
- Score the result on engagement and clarity (1-10 each)` : '';

          return `Article parsed into ${args.totalSections} sections for final polish.${firstSectionContext}

YOU MUST CONTINUE AUTOMATICALLY - DO NOT WAIT FOR PERMISSION. This is an automated polish workflow.

FINAL POLISH PRINCIPLES:
- Thread the needle between brand engagement and semantic directness
- Resolve conflicts by finding balanced solutions that satisfy both requirements
- Gauge adherence to guides before making improvements
- Always explain your reasoning for how you balanced competing requirements`;
        }
      });

      const polishSectionTool = tool({
        name: "polish_section", 
        description: "Polish an individual section by gauging guide adherence, identifying strengths/weaknesses, and updating with improvements that balance brand engagement with semantic directness",
        parameters: polishSectionSchema,
        execute: async (args) => {
          console.log('Polish section tool executed:', args);

          try {
            // Get current session and metadata
            const currentSession = await this.getPolishSession(sessionId);
            if (!currentSession) {
              console.error('Polish section failed: Session not found for ID:', sessionId);
              throw new Error('Session not found');
            }

            const sessionMetadata = currentSession.polishMetadata as any;
            const parsedSections = sessionMetadata?.parsedSections || [];
            const ordinal = parsedSections.findIndex((s: any) => s.title === args.section_title) + 1;
            
            console.log(`Saving polish for section "${args.section_title}" (ordinal: ${ordinal})`);
            console.log('Current session metadata:', {
              sessionId: currentSession.id,
              workflowId: currentSession.workflowId,
              version: currentSession.version,
              status: currentSession.status,
              parsedSectionsCount: parsedSections.length
            });

            if (ordinal === 0) {
              console.error(`Section "${args.section_title}" not found in parsed sections`);
              console.log('Available sections:', parsedSections.map((s: any) => s.title));
              throw new Error(`Section "${args.section_title}" not found in parsed sections`);
            }

            // Prepare the data for insertion
            const sectionId = uuidv4();
            const now = new Date();
            
            const insertData = {
              id: sectionId,
              polishSessionId: sessionId,
              workflowId: currentSession.workflowId,
              version: currentSession.version,
              sectionNumber: ordinal,
              title: sanitizeForPostgres(args.section_title),
              originalContent: sanitizeForPostgres(parsedSections[ordinal - 1]?.content || ''),
              polishedContent: sanitizeForPostgres(args.polished_content),
              strengths: sanitizeForPostgres(args.strengths),
              weaknesses: sanitizeForPostgres(args.weaknesses),
              brandConflicts: sanitizeForPostgres(args.brand_conflicts),
              polishApproach: sanitizeForPostgres(args.polish_approach),
              engagementScore: args.engagement_score,
              clarityScore: args.clarity_score,
              status: 'completed',
              polishMetadata: {
                originalLength: parsedSections[ordinal - 1]?.content?.length || 0,
                polishedLength: args.polished_content.length,
                timestamp: now.toISOString()
              },
              errorMessage: null, // Explicitly set to null
              createdAt: now,
              updatedAt: now
            };

            console.log('Attempting to insert polish section with data:', {
              id: sectionId,
              sessionId: sessionId,
              workflowId: currentSession.workflowId,
              sectionNumber: ordinal,
              title: args.section_title
            });

            // Store the polished section in database
            try {
              await db.insert(polishSections).values(insertData);
              console.log('Successfully inserted polish section:', sectionId);
            } catch (dbError: any) {
              console.error('Database insert failed:', dbError);
              console.error('Full database error object:', JSON.stringify(dbError, null, 2));
              console.error('Error details:', {
                message: dbError.message,
                code: dbError.code,
                detail: dbError.detail,
                hint: dbError.hint,
                stack: dbError.stack,
                table: dbError.table,
                column: dbError.column,
                constraint: dbError.constraint,
                routine: dbError.routine
              });
              
              // Log the actual data we tried to insert
              console.error('Failed insert data:', JSON.stringify(insertData, null, 2));
              
              // Return a more informative error message
              return `I encountered a database error while trying to save the polished section. The section has been successfully polished but could not be saved to the database.

Database Error: ${dbError.message || 'Unknown database error'}
${dbError.code ? `Code: ${dbError.code}` : ''}
${dbError.detail ? `Detail: ${dbError.detail}` : ''}
${dbError.hint ? `Hint: ${dbError.hint}` : ''}
${dbError.column ? `Column: ${dbError.column}` : ''}
${dbError.constraint ? `Constraint: ${dbError.constraint}` : ''}

Here is the polished content for "${args.section_title}":

**Strengths:** ${args.strengths}

**Weaknesses:** ${args.weaknesses}

**Brand Conflicts:** ${args.brand_conflicts}

**Polish Approach:** ${args.polish_approach}

**Engagement Score:** ${args.engagement_score}/10
**Clarity Score:** ${args.clarity_score}/10

**Polished Content:**
${args.polished_content}

Please save this manually or check the database configuration.`;
            }

            // Update session progress and metadata
            const newConflictsTotal = (currentSession.brandConflictsFound || 0) + (args.brand_conflicts ? 1 : 0);
            const newPolishApproaches = [...(sessionMetadata?.polishApproaches || []), args.polish_approach];
          
          await this.updatePolishSession(sessionId, {
            completedSections: ordinal,
            brandConflictsFound: newConflictsTotal,
            polishMetadata: {
              ...(sessionMetadata || {}),
              polishApproaches: newPolishApproaches,
              conflictsResolved: newConflictsTotal
            }
          });

          // Broadcast to UI
          polishSSEPush(sessionId, {
            type: 'section_completed',
            section_title: args.section_title,
            strengths: args.strengths,
            weaknesses: args.weaknesses,
            brand_conflicts: args.brand_conflicts,
            polished_content: args.polished_content,
            polish_approach: args.polish_approach,
            engagement_score: args.engagement_score,
            clarity_score: args.clarity_score,
            ordinal,
            total_conflicts_resolved: newConflictsTotal
          });

          if (args.is_last) {
            // Finalize polish and update workflow
            await this.updateWorkflowWithPolishedArticle(currentSession.workflowId);
            await this.updatePolishSession(sessionId, {
              status: 'completed',
              completedAt: new Date()
            });
            
            // Get final assembled article
            const finalSections = await db.select()
              .from(polishSections)
              .where(and(
                eq(polishSections.polishSessionId, sessionId),
                eq(polishSections.status, 'completed')
              ))
              .orderBy(polishSections.sectionNumber);
            
            const finalPolishedArticle = finalSections && finalSections.length > 0 
              ? finalSections.map(section => {
                  // Get section metadata to determine header level
                  const sessionMetadata = currentSession?.polishMetadata as any;
                  const parsedSections = sessionMetadata?.parsedSections || [];
                  const originalSection = parsedSections.find((s: any) => s.order === section.sectionNumber);
                  
                  // Use appropriate header level (H2 for sections, H3 for subsections)
                  const headerLevel = originalSection?.headerLevel === 'h3' ? '###' : '##';
                  return `${headerLevel} ${section.title}\n\n${section.polishedContent}`;
                }).join('\n\n')
              : '';
            
            // Calculate average scores
            const avgEngagementScore = finalSections.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / finalSections.length;
            const avgClarityScore = finalSections.reduce((sum, s) => sum + (s.clarityScore || 0), 0) / finalSections.length;
            
            polishSSEPush(sessionId, { 
              type: 'completed', 
              finalPolishedArticle,
              totalSections: finalSections.length,
              totalConflictsResolved: newConflictsTotal,
              polishApproaches: newPolishApproaches,
              avgEngagementScore: Math.round(avgEngagementScore * 10) / 10,
              avgClarityScore: Math.round(avgClarityScore * 10) / 10
            });
            
            return `Excellent! Final polish completed for all ${ordinal} sections. Article successfully balanced brand engagement with semantic directness. Resolved ${newConflictsTotal} conflicts using varied approaches: ${newPolishApproaches.join(', ')}.`;
          } else {
            // Get the next section details from parsed sections
            const nextSectionIndex = ordinal; // ordinal is 1-based, array is 0-based, but we want NEXT section
            const nextSection = parsedSections[nextSectionIndex];
            
            console.log(`Section ${ordinal} polished. Next section index: ${nextSectionIndex}, Available sections: ${parsedSections.length}`);
            
            let nextSectionContext = '';
            if (nextSection) {
              const recentApproaches = newPolishApproaches.slice(-2); // Last 2 approaches
              
              nextSectionContext = `

CONTINUING FINAL POLISH:
Next section: "${nextSection.title}" (Section ${ordinal + 1} of ${parsedSections.length})

SECTION CONTENT TO POLISH:
${nextSection.content}

APPROACH AWARENESS:
- Recent polish approaches: ${recentApproaches.join(', ')}
- Conflicts resolved so far: ${newConflictsTotal}
- Try to vary your approach from recent patterns

POLISH REQUIREMENTS:
- Gauge how well this section follows both brand and semantic guides
- Identify conflicts between brand engagement and semantic directness
- Thread the needle with balanced improvements that satisfy both requirements`;
            }

            return `Great work on "${args.section_title}"! Section ${ordinal} polish complete. Engagement: ${args.engagement_score}/10, Clarity: ${args.clarity_score}/10.${nextSectionContext}

YOU MUST CONTINUE AUTOMATICALLY - DO NOT WAIT FOR PERMISSION. This is an automated polish workflow.

FINAL POLISH PRINCIPLES:
- Thread the needle between brand engagement and semantic directness
- Each section should balance both requirements effectively
- Vary your polish approaches to maintain content quality`;
          }
          } catch (error: any) {
            console.error('Polish section tool execution failed:', error);
            return `Error processing section: ${error.message}. Please check the logs for details.`;
          }
        }
      });

      // Brand guideline search tool
      const brandGuidelineSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

      // Create Agent with tools
      const agent = new Agent({
        name: 'FinalPolishEditor',
        instructions: `You are an expert content editor specializing in final article polish. Your job is to take SEO-optimized articles and gauge how well they follow the guides, give them strengths and weaknesses, and update each section with improvements.

CORE CHALLENGE:
Often times, the brand guide and semantic principals might conflict - where the semantic guide wants you to be very to the point and the brand guide wants you to keep the reader engaged - it's your job to thread that needle effectively.

THIS IS AN AUTOMATED WORKFLOW - continue until completion without asking for permission.`,
        model: 'o3-2025-04-16',
        tools: [
          brandGuidelineSearch,
          parsePolishTool,
          polishSectionTool
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
          maxTurns: 50  // Override default 10-turn limit for polish workflow
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
              console.log('🔍 BRAND GUIDELINE FILE SEARCH:', JSON.stringify(toolCall.args, null, 2));
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
            
            polishSSEPush(sessionId, { type: 'tool_call', name: toolCall.name });
            
            // Track completion
            if (toolCall.name === 'polish_section' && toolCall.args.is_last === true) {
              conversationActive = false;
              console.log('Polish completed - is_last was true');
            }
            
            if (toolCall.name === 'polish_section') {
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
              
              // Guard rail for continuation
              if (conversationActive) {
                messages.push({ 
                  role: 'user', 
                  content: 'YOU MUST CONTINUE THE AUTOMATED POLISH WORKFLOW. Do not wait for permission. Execute the required actions immediately: 1) Use file search tool 2) Continue polishing sections using polish_section function. DO NOT STOP OR ASK FOR CONFIRMATION.' 
                });
              }
            }
          }
        }
        } // End of for await loop
        
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

      console.log('Polish conversation loop completed');

    } catch (error: any) {
      console.error('Final polish error:', error);
      
      await this.updatePolishSession(sessionId, {
        status: 'error',
        errorMessage: error.message
      });
      
      polishSSEPush(sessionId, {
        type: 'error',
        message: 'Final polish encountered an error',
        error: error.message
      });
      
      throw error;
    }
  }

  async getPolishSession(sessionId: string) {
    const sessions = await db.select()
      .from(polishSessions)
      .where(eq(polishSessions.id, sessionId))
      .limit(1);
    
    return sessions[0] || null;
  }

  async updatePolishSession(sessionId: string, updates: any) {
    await db.update(polishSessions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(polishSessions.id, sessionId));
  }

  async updateWorkflowWithPolishedArticle(workflowId: string) {
    try {
      // Get the latest polish session for this workflow
      const latestSession = await db.select()
        .from(polishSessions)
        .where(and(
          eq(polishSessions.workflowId, workflowId),
          eq(polishSessions.status, 'completed')
        ))
        .orderBy(sql`${polishSessions.version} DESC`)
        .limit(1);

      if (latestSession.length === 0) return;

      // Get all completed sections for this session
      const polishedSections = await db.select()
        .from(polishSections)
        .where(and(
          eq(polishSections.polishSessionId, latestSession[0].id),
          eq(polishSections.status, 'completed')
        ))
        .orderBy(polishSections.sectionNumber);

      // Assemble the final polished article
      const finalPolishedArticle = polishedSections.map(section => {
        const sessionMetadata = latestSession[0].polishMetadata as any;
        const parsedSections = sessionMetadata?.parsedSections || [];
        const originalSection = parsedSections.find((s: any) => s.order === section.sectionNumber);
        
        const headerLevel = originalSection?.headerLevel === 'h3' ? '###' : '##';
        return `${headerLevel} ${section.title}\n\n${section.polishedContent}`;
      }).join('\n\n');

      // Update the workflow's final-polish step with the polished article
      const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
      if (workflow[0]) {
        const workflowData = workflow[0].content as any;
        const finalPolishStep = workflowData.steps?.find((s: any) => s.id === 'final-polish');
        
        if (finalPolishStep) {
          finalPolishStep.outputs = {
            ...finalPolishStep.outputs,
            polishedArticle: finalPolishedArticle,
            polishSessionId: latestSession[0].id,
            polishSummary: {
              timestamp: new Date().toISOString(),
              totalSections: polishedSections.length,
              conflictsResolved: latestSession[0].brandConflictsFound,
              avgEngagementScore: polishedSections.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / polishedSections.length,
              avgClarityScore: polishedSections.reduce((sum, s) => sum + (s.clarityScore || 0), 0) / polishedSections.length,
              polishApproaches: (latestSession[0].polishMetadata as any)?.polishApproaches || []
            }
          };

          await db.update(workflows)
            .set({
              content: workflowData,
              updatedAt: new Date()
            })
            .where(eq(workflows.id, workflowId));
        }
      }
    } catch (error) {
      console.error('Error updating workflow with polished article:', error);
    }
  }

  async getPolishResults(sessionId: string) {
    try {
      const session = await this.getPolishSession(sessionId);
      if (!session) {
        return { error: 'Session not found' };
      }

      const sections = await db.select()
        .from(polishSections)
        .where(eq(polishSections.polishSessionId, sessionId))
        .orderBy(polishSections.sectionNumber);

      return {
        session,
        sections,
        totalSections: sections.length,
        completedSections: sections.filter(s => s.status === 'completed').length,
        avgEngagementScore: sections.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / sections.length,
        avgClarityScore: sections.reduce((sum, s) => sum + (s.clarityScore || 0), 0) / sections.length
      };
    } catch (error: any) {
      console.error('Error getting polish results:', error);
      return { 
        error: 'Failed to get polish results',
        details: error.message 
      };
    }
  }
}

export const agenticFinalPolishService = new AgenticFinalPolishService();