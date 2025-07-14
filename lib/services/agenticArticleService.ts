import OpenAI from 'openai';
import { Runner, FunctionTool, RunToolCallItem, Agent, tool } from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { articleSections, agentSessions, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Zod schemas for tool parameters
const planArticleSchema = z.object({
  headline: z.string().describe('Article headline'),
  target_word_range: z.object({
    min: z.number().describe('Minimum word count'),
    max: z.number().describe('Maximum word count')
  }),
  sections: z.array(z.object({
    title: z.string().describe('Section title'),
    est_words: z.number().describe('Estimated word count for this section'),
    order: z.number().describe('Section order number'),
    content_requirements: z.string().describe('Detailed content requirements for this section including structure, key points, examples, pros/cons, statistics, etc.')
  })),
  writing_style_notes: z.string().describe('Key style rules and guidelines to follow')
});

const writeSectionSchema = z.object({
  section_title: z.string().describe('Title of the section being written'),
  markdown: z.string().describe('The written content in markdown format'),
  is_last: z.boolean().describe('Whether this is the last section')
});

// Style rules that will be enforced by the agent
const WRITING_STYLE_RULES = `
NARRATIVE FORMAT REQUIREMENTS:
- Primarily narrative format with flowing prose
- Full sentences and connected paragraphs 
- Short, punchy paragraphs (2-3 lines max)
- Frequent line breaks for readability
- Lists only when necessary for clarity
- Natural storytelling transitions between sections
- NO em-dashes allowed
- Avoid intimidating walls of text

SEO & SEMANTIC REQUIREMENTS:
- Follow semantic SEO best practices
- Natural keyword integration
- Proper heading hierarchy
- Context-rich content that answers user intent
`;

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

// Create file search and web search tools
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

const webSearchPreview = webSearchTool();

export class AgenticArticleService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startAgenticSession(workflowId: string, outline: string): Promise<string> {
    try {
      // Get the next version number for this workflow
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${agentSessions.version}), 0)`.as('maxVersion')
      })
      .from(agentSessions)
      .where(eq(agentSessions.workflowId, workflowId));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      
      console.log(`Starting agentic session v${nextVersion} for workflow ${workflowId}`);
      
      // Create agent session record with version
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(agentSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'article-draft',
        status: 'planning',
        outline,
        sessionMetadata: {
          styleRules: WRITING_STYLE_RULES,
          startedAt: now.toISOString(),
          version: nextVersion
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to start agentic session:', error);
      throw new Error('Failed to initialize article generation session');
    }
  }

  async generateArticle(sessionId: string, outline: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      await this.updateSession(sessionId, { status: 'planning' });
      ssePush(sessionId, { type: 'status', status: 'planning', message: 'Starting article generation...' });

      // Create initial prompt with the exact same content as the manual flow
      const initialPrompt = `Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing. After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking 3 citations only and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.

IMPORTANT: You have access to a file search tool that contains Writing Guidelines and Semantic SEO best practices. Use the file search tool to review these guidelines BEFORE planning to ensure your article plan follows our established standards.

CRITICAL: When you extract sections from the outline, you MUST also extract the detailed content requirements for each section. For example, if the outline mentions "Starter Packages" and includes details like "What You Typically Get", "Example Pricing", "Pros", "Cons/Cautions", etc., you must capture these specific requirements in the content_requirements field for that section. Do not just extract titles and word counts - extract the complete structural details and requirements.

${outline}

REQUIRED ACTIONS:
1. FIRST: Use the file search tool to search for "Writing Guidelines" and "Semantic SEO" to understand our content standards
2. THEN: Analyze the research data provided above and extract detailed content requirements for each section (not just titles)
3. FINALLY: Use the plan_article function to record your plan incorporating both the research and the guidelines, ensuring each section has comprehensive content_requirements

Start by searching the project files for our writing standards.`;

      // Create tools that save data but let the agent control the flow
      const planTool = tool({
        name: "plan_article",
        description: "Save the article plan with headline, sections, word count, and style notes. Extract detailed content requirements for each section from the research outline.",
        parameters: planArticleSchema,
        execute: async (args) => {
          console.log('Plan tool executed:', args);
          
          // Save planning results to database
          await this.processPlanningResult(sessionId, args);
          ssePush(sessionId, { type: 'plan', plan: args });
          
          // Get the first section details for context
          const firstSection = args.sections.find((s: any) => s.order === 1);
          const firstSectionContext = firstSection ? `

FIRST SECTION TO WRITE:
- Title: "${firstSection.title}" 
- Target Word Count: ${firstSection.est_words} words
- Section Order: 1 of ${args.sections.length} total sections
- Purpose: This is your title and introduction section
- Content Requirements: ${firstSection.content_requirements}` : '';

          return `Plan saved successfully! I can see you've planned ${args.sections.length} sections with a target of ${args.target_word_range.min}-${args.target_word_range.max} words. Now I'll give you instructions for writing.${firstSectionContext}

Remember we're going to be creating this article section by section. The format should be primarily narrative, which means the piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability. Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. 

BEFORE WRITING THE FIRST SECTION: Use the file search tool to search for "Writing Guidelines" and "Semantic SEO" to refresh your memory of our best practices. This is critical for maintaining quality standards.

Writing requirements for the first section:
- Follow the narrative format from the guidelines
- Avoid using Em-dashes  
- Follow the original outline provided
- Target word count: ${firstSection?.est_words || 'as planned'} words
- Reference the original research data for facts and context
- This should be your title and introduction
- Content Requirements: ${firstSection?.content_requirements || 'Follow the planned structure'}

IMMEDIATE ACTIONS (execute these automatically - do not wait):
1. FIRST: Use file search to review Writing Guidelines and Semantic SEO best practices
2. THEN: Reference the original research data dump provided above - this contains all the facts, statistics, and context for your article
3. IMMEDIATELY: Write the section "${firstSection?.title || 'title and introduction'}" using the write_section function

This is an automated workflow - execute these steps without asking for permission or confirmation. Start with file search now.`;
        }
      });

      const writeTool = tool({
        name: "write_section", 
        description: "Write and save a specific section of the article",
        parameters: writeSectionSchema,
        execute: async (args) => {
          console.log('Write tool executed:', args);
          const { section_title, markdown, is_last } = args;
          const currentSession = await this.getSession(sessionId);
          
          // Save section to database with session version
          const ordinal = (currentSession?.completedSections || 0) + 1;
          await db.insert(articleSections).values({
            id: uuidv4(),
            workflowId: currentSession!.workflowId,
            version: currentSession!.version,
            sectionNumber: ordinal,
            title: section_title,
            content: markdown,
            wordCount: markdown.split(/\s+/).length,
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Update progress
          await this.updateSession(sessionId, {
            completedSections: ordinal,
            currentWordCount: (currentSession?.currentWordCount || 0) + markdown.split(/\s+/).length
          });

          // Broadcast to UI
          ssePush(sessionId, {
            type: 'section',
            section_title,
            markdown,
            is_last,
            ordinal
          });

          if (is_last) {
            // Finalize article
            await this.updateWorkflowWithFinalArticle(currentSession!.workflowId);
            await this.updateSession(sessionId, {
              status: 'completed',
              completedAt: new Date()
            });
            
            // Get the final assembled article to send to UI (latest version only)
            const finalSections = await db.select()
              .from(articleSections)
              .where(and(
                eq(articleSections.workflowId, currentSession!.workflowId),
                eq(articleSections.version, currentSession!.version),
                eq(articleSections.status, 'completed')
              ))
              .orderBy(articleSections.sectionNumber);
            
            const finalArticle = finalSections.map(section => {
              const content = section.content?.trim() || '';
              const sectionTitle = section.title || '';
              
              // Normalize text for comparison (case-insensitive, punctuation)
              const normalizeText = (text: string) => text.toLowerCase().replace(/[""'"]/g, '"');
              const normalizedTitle = normalizeText(sectionTitle.trim());
              
              // Check for H2 header first (priority)
              const h2Match = content.match(/^##\s+(.+?)(\n|$)/);
              if (h2Match) {
                const headerText = h2Match[1].trim();
                if (normalizeText(headerText) === normalizedTitle) {
                  // Agent included matching H2 header - keep as-is
                  return section.content;
                }
              }
              
              // Check for H3 header (should be replaced with H2)
              const h3Match = content.match(/^###\s+(.+?)(\n|$)/);
              if (h3Match) {
                const headerText = h3Match[1].trim();
                if (normalizeText(headerText) === normalizedTitle) {
                  // Agent used H3 for section title - remove it and use our H2
                  const contentWithoutH3 = content.replace(/^###\s+.+?(\n|$)/, '').trim();
                  return `## ${section.title}\n\n${contentWithoutH3}`;
                }
              }
              
              // No matching header found - add our H2 header
              return `## ${section.title}\n\n${section.content}`;
            }).join('\n\n');
            
            ssePush(sessionId, { 
              type: 'completed', 
              finalArticle,
              totalSections: finalSections.length,
              totalWords: finalSections.reduce((sum, section) => sum + (section.wordCount || 0), 0)
            });
            
            return `Perfect! You've completed the final section "${section_title}". The article is now complete with ${ordinal} sections total.`;
          } else {
            // Get the next section details from the planned sections
            const sessionMetadata = currentSession?.sessionMetadata as any;
            const plannedSections = sessionMetadata?.plannedSections || [];
            const nextSectionIndex = ordinal; // ordinal is 1-based, array is 0-based, but we want NEXT section
            const nextSection = plannedSections[nextSectionIndex];
            
            console.log(`Section ${ordinal} completed. Next section index: ${nextSectionIndex}, Available sections: ${plannedSections.length}`);
            if (nextSection) {
              console.log(`Next section details:`, JSON.stringify(nextSection, null, 2));
            } else {
              console.log('No next section found - this might be the last section');
            }
            
            let nextSectionContext = '';
            if (nextSection) {
              nextSectionContext = `

NEXT SECTION TO WRITE:
- Title: "${nextSection.title}"
- Target Word Count: ${nextSection.est_words} words
- Section Order: ${nextSection.order}
- Context: This is section ${ordinal + 1} of ${plannedSections.length} total sections
- Content Requirements: ${nextSection.content_requirements || 'Follow the planned structure'}`;
            }

            return `Excellent work on "${section_title}"! This is section ${ordinal} completed.${nextSectionContext}

YOU MUST CONTINUE AUTOMATICALLY - DO NOT WAIT FOR USER PERMISSION. This is an automated workflow that must continue until all sections are complete.

IMMEDIATE NEXT ACTIONS (execute these now):
1. FIRST: Use file search tool to search for "Writing Guidelines" and "Semantic SEO" 
2. THEN: Reference the original research data from our conversation history  
3. IMMEDIATELY: Write the section "${nextSection?.title || 'next section'}" using the write_section function

WRITING INSTRUCTIONS: 
- Format should be primarily narrative with flowing prose and connected paragraphs
- Short, punchy paragraphs (2-3 lines max) with frequent line breaks for readability
- Lists only when necessary for clarity
- Natural storytelling transitions between ideas
- Avoid Em-dashes
- Reference the original research data provided at the start of our conversation
- If this is a "meat" section, break it into subsections and write the first subsection only

START WRITING THE NEXT SECTION NOW - DO NOT ASK FOR PERMISSION OR CONFIRMATION.`;
          }
        }
      });

      // Create Agent with tools
      const agent = new Agent({
        name: 'ArticleWriter',
        instructions: 'You are an expert article writer for guest posts. This is an AUTOMATED WORKFLOW that must continue until completion. NEVER ask for user permission or confirmation. Always execute the required actions immediately when instructed. Use the provided tools to plan and write the article systematically without stopping.',
        model: 'o3-2025-04-16',
        tools: [
          fileSearch,
          webSearchPreview,
          planTool,
          writeTool
        ]
      });

      // Create Runner and run agent with streaming
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Maintain conversation history manually for classic SDK
      const messages: any[] = [
        { role: 'user', content: initialPrompt }
      ];
      
      let conversationActive = true;
      let sectionCount = 0;
      
      while (conversationActive) {
        console.log(`Starting turn ${messages.length} with ${sectionCount} sections written`);
        
        // Run the agent with full message history
        const result = await runner.run(agent, messages, {
          stream: true,
          maxTurns: 50  // Override default 10-turn limit for article generation
        });
        
        // Process the streaming result
        for await (const event of result.toStream()) {
          // 1) Log any raw full‐response that slipped through
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'response_done' && (event.data as any).response) {
              console.log(
                '💡 RAW API RESPONSE:',
                JSON.stringify((event.data as any).response, null, 2)
              );
            }
            
            // Also log any errors or unexpected events
            console.log('Raw model stream event:', JSON.stringify(event.data, null, 2));
          }

          // 2) Stream text deltas for UI only
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              ssePush(sessionId, { type: 'text', content: event.data.delta });
            }
          }
          
          if (event.type === 'run_item_stream_event') {
            // Handle tool calls - just track them, SDK executes automatically
            if (event.name === 'tool_called') {
              const toolCall = event.item as any;
              console.log('Tool called:', toolCall.name, toolCall.id);
              
              // Special logging for file search usage
              if (toolCall.name === 'file_search') {
                console.log('🔍 FILE SEARCH USED:', JSON.stringify(toolCall.args, null, 2));
                ssePush(sessionId, { type: 'tool_call', name: 'file_search', query: toolCall.args?.query });
              }
              
              // Construct assistant message with tool call
              try {
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
              } catch (error) {
                console.error('Error constructing tool call message:', error, 'Tool call:', toolCall);
              }
              ssePush(sessionId, { type: 'tool_call', name: toolCall.name });
              
              // Track completion
              if (toolCall.name === 'write_section' && toolCall.args.is_last === true) {
                conversationActive = false;
                console.log('Article completed - is_last was true');
              }
              
              if (toolCall.name === 'write_section') {
                sectionCount++;
              }
            }
            
            // Handle tool outputs from SDK execution
            if (event.name === 'tool_output') {
              const toolOutput = event.item as any;
              console.log('Tool output received:', toolOutput.output);
              
              // Push tool output message with exact ID
              messages.push({
                role: 'tool',
                content: JSON.stringify({ output: toolOutput.output }),
                tool_call_id: toolOutput.tool_call_id
              });
              
              ssePush(sessionId, { type: 'tool_output', content: toolOutput.output });
            }
            
            // Handle complete assistant messages
            if (event.name === 'message_output_created') {
              const messageItem = event.item as any;
              
              // Only push if it's not a tool call (those are already pushed above)
              if (!messageItem.tool_calls?.length) {
                messages.push({
                  role: 'assistant',
                  content: messageItem.content
                });
                ssePush(sessionId, { type: 'assistant', content: messageItem.content });
                
                // Strong guard rail: if assistant didn't use a tool when expected
                if (conversationActive) {
                  messages.push({ 
                    role: 'user', 
                    content: 'YOU MUST CONTINUE THE AUTOMATED WORKFLOW. Do not wait for permission. Execute the required actions immediately: 1) Use file search tool 2) Write the next section using write_section function. DO NOT STOP OR ASK FOR CONFIRMATION.' 
                  });
                }
              }
            }
          }
        }
        
        // Safety limits
        if (messages.length > 100 || sectionCount > 20) {
          console.log('Safety limit reached');
          conversationActive = false;
        }
        
        // Small delay between turns
        if (conversationActive) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('Agent conversation loop completed');

    } catch (error) {
      console.error('Article generation failed:', error);
      await this.updateSession(sessionId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      ssePush(sessionId, { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private async processPlanningResult(sessionId: string, planArgs: any): Promise<void> {
    const { headline, target_word_range, sections, writing_style_notes } = planArgs;
    
    // Update session with planning results
    await this.updateSession(sessionId, {
      status: 'writing',
      totalSections: sections.length,
      targetWordCount: target_word_range.max,
      sessionMetadata: {
        headline,
        styleRules: WRITING_STYLE_RULES,
        writingStyleNotes: writing_style_notes,
        plannedSections: sections,
        targetWordRange: target_word_range
      }
    });

    // Create section records
    const session = await this.getSession(sessionId);
    const now = new Date();
    
    const sectionInserts = sections.map((section: any) => ({
      id: uuidv4(),
      workflowId: session!.workflowId,
      version: session!.version,
      sectionNumber: section.order,
      title: section.title,
      status: 'pending' as const,
      generationMetadata: {
        targetWordCount: section.est_words,
        planningNotes: writing_style_notes,
        contentRequirements: section.content_requirements
      },
      createdAt: now,
      updatedAt: now
    }));

    await db.insert(articleSections).values(sectionInserts);
  }


  private async updateWorkflowWithFinalArticle(workflowId: string): Promise<void> {
    // Get the latest version for this workflow
    const latestVersionResult = await db.select({
      maxVersion: sql<number>`MAX(${articleSections.version})`.as('maxVersion')
    })
    .from(articleSections)
    .where(eq(articleSections.workflowId, workflowId));
    
    const latestVersion = latestVersionResult[0]?.maxVersion || 1;
    
    // Get all completed sections from the latest version only
    const sections = await db.select()
      .from(articleSections)
      .where(and(
        eq(articleSections.workflowId, workflowId),
        eq(articleSections.version, latestVersion),
        eq(articleSections.status, 'completed')
      ))
      .orderBy(articleSections.sectionNumber);

    // Combine into final article
    const fullArticle = sections.map(section => {
      const content = section.content?.trim() || '';
      const sectionTitle = section.title || '';
      
      // Normalize text for comparison (case-insensitive, punctuation)
      const normalizeText = (text: string) => text.toLowerCase().replace(/[""'"]/g, '"');
      const normalizedTitle = normalizeText(sectionTitle.trim());
      
      // Check for H2 header first (priority)
      const h2Match = content.match(/^##\s+(.+?)(\n|$)/);
      if (h2Match) {
        const headerText = h2Match[1].trim();
        if (normalizeText(headerText) === normalizedTitle) {
          // Agent included matching H2 header - keep as-is
          return section.content;
        }
      }
      
      // Check for H3 header (should be replaced with H2)
      const h3Match = content.match(/^###\s+(.+?)(\n|$)/);
      if (h3Match) {
        const headerText = h3Match[1].trim();
        if (normalizeText(headerText) === normalizedTitle) {
          // Agent used H3 for section title - remove it and use our H2
          const contentWithoutH3 = content.replace(/^###\s+.+?(\n|$)/, '').trim();
          return `## ${section.title}\n\n${contentWithoutH3}`;
        }
      }
      
      // No matching header found - add our H2 header
      return `## ${section.title}\n\n${section.content}`;
    }).join('\n\n');

    const totalWords = sections.reduce((sum, section) => sum + (section.wordCount || 0), 0);

    // Update workflow step outputs
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const articleStep = workflowData.steps?.find((step: any) => step.id === 'article-draft');
      
      if (articleStep) {
        articleStep.outputs = {
          ...articleStep.outputs,
          fullArticle,
          wordCount: totalWords,
          agentGenerated: true,
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
    const sessions = await db.select().from(agentSessions).where(eq(agentSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateSession(sessionId: string, updates: Partial<any>) {
    await db.update(agentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentSessions.id, sessionId));
  }


  // Public method to get real-time progress
  async getSessionProgress(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const sections = await db.select()
      .from(articleSections)
      .where(and(
        eq(articleSections.workflowId, session.workflowId),
        eq(articleSections.version, session.version)
      ))
      .orderBy(articleSections.sectionNumber);

    return {
      session,
      sections,
      progress: {
        total: session.totalSections || 0,
        completed: session.completedSections || 0,
        currentWordCount: session.currentWordCount || 0,
        targetWordCount: session.targetWordCount || 0
      }
    };
  }
}

export const agenticArticleService = new AgenticArticleService();