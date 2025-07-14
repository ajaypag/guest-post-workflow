import OpenAI from 'openai';
import { Runner, FunctionTool, RunToolCallItem, Agent, tool } from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { articleSections, agentSessions, workflows } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
    order: z.number().describe('Section order number')
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
      // Create agent session record
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(agentSessions).values({
        id: sessionId,
        workflowId,
        stepId: 'article-draft',
        status: 'planning',
        outline,
        sessionMetadata: {
          styleRules: WRITING_STYLE_RULES,
          startedAt: now.toISOString()
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

${outline}

Once you've analyzed and planned everything, use the plan_article function to record your plan. Then I'll give you instructions for writing the actual sections.`;

      // Create tools that save data but let the agent control the flow
      const planTool = tool({
        name: "plan_article",
        description: "Save the article plan with headline, sections, word count, and style notes",
        parameters: planArticleSchema,
        execute: async (args) => {
          console.log('Plan tool executed:', args);
          
          // Save planning results to database
          await this.processPlanningResult(sessionId, args);
          ssePush(sessionId, { type: 'plan', plan: args });
          
          return `Plan saved successfully! I can see you've planned ${args.sections.length} sections with a target of ${args.target_word_range.min}-${args.target_word_range.max} words. Now I'll give you instructions for writing. 

Remember we're going to be creating this article section by section. The format should be primarily narrative, which means the piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability. Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. 

Start with the title and introduction. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Avoid using Em-dashes. The section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divide up the words per section so you can allocate appropriate word count for this section.

REQUIRED ACTION: You must now call the write_section function to write the title and introduction section. Do not respond with text - call the function immediately.`;
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
          
          // Save section to database
          const ordinal = (currentSession?.completedSections || 0) + 1;
          await db.insert(articleSections).values({
            id: uuidv4(),
            workflowId: currentSession!.workflowId,
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
            
            // Get the final assembled article to send to UI
            const finalSections = await db.select()
              .from(articleSections)
              .where(and(
                eq(articleSections.workflowId, currentSession!.workflowId),
                eq(articleSections.status, 'completed')
              ))
              .orderBy(articleSections.sectionNumber);
            
            const finalArticle = finalSections.map(section => {
              // Check if content already includes the header to avoid duplication
              const contentStartsWithHeader = section.content?.trim().startsWith(`## ${section.title}`);
              if (contentStartsWithHeader) {
                return section.content;
              } else {
                return `## ${section.title}\n\n${section.content}`;
              }
            }).join('\n\n');
            
            ssePush(sessionId, { 
              type: 'completed', 
              finalArticle,
              totalSections: finalSections.length,
              totalWords: finalSections.reduce((sum, section) => sum + (section.wordCount || 0), 0)
            });
            
            return `Perfect! You've completed the final section "${section_title}". The article is now complete with ${ordinal} sections total.`;
          } else {
            return `Excellent work on "${section_title}"! This is section ${ordinal}. 

Proceed to the next section. Remember, the format should be primarily narrative, which means the piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability. Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. 

Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Also be sure to reference my original prompt that contains the article information that should feed your context. I've already done the research and given it to you there - so that's what you need to reference each time. Avoid using Em-dashes. If it's the section that is the "meat" of the article, you must further break your output down into subsections and only output the first subsection so as not to over simplify each component. Note: defining what a subsection means is important. We're not doing sub-subsections, so if the section of the article is already apparently a subsection, then that entire section should be included in your output even if there are apparently sub-subsections within. Note 2: the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divide up the words per section so you can allocate appropriate word count for this section.

REQUIRED ACTION: You must now call the write_section function to write the next section. Do not respond with text - call the function immediately.`;
          }
        }
      });

      // Create Agent with tools
      const agent = new Agent({
        name: 'ArticleWriter',
        instructions: 'You are an expert article writer for guest posts. Follow the user instructions carefully and use the provided tools to plan and write the article systematically.',
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
                
                // Single guard rail: if assistant didn't use a tool when expected
                if (conversationActive) {
                  messages.push({ 
                    role: 'user', 
                    content: 'Please respond by calling the appropriate function as instructed.' 
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
      sectionNumber: section.order,
      title: section.title,
      status: 'pending' as const,
      generationMetadata: {
        targetWordCount: section.est_words,
        planningNotes: writing_style_notes
      },
      createdAt: now,
      updatedAt: now
    }));

    await db.insert(articleSections).values(sectionInserts);
  }


  private async updateWorkflowWithFinalArticle(workflowId: string): Promise<void> {
    // Get all completed sections
    const sections = await db.select()
      .from(articleSections)
      .where(and(
        eq(articleSections.workflowId, workflowId),
        eq(articleSections.status, 'completed')
      ))
      .orderBy(articleSections.sectionNumber);

    // Combine into final article
    const fullArticle = sections.map(section => {
      // Check if content already includes the header to avoid duplication
      const contentStartsWithHeader = section.content?.trim().startsWith(`## ${section.title}`);
      if (contentStartsWithHeader) {
        return section.content;
      } else {
        return `## ${section.title}\n\n${section.content}`;
      }
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
      .where(eq(articleSections.workflowId, session.workflowId))
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