import OpenAI from 'openai';
import { Runner, FunctionTool, RunToolCallItem, Agent, tool } from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { auditSessions, auditSections, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Zod schemas for audit tool parameters - keeping the advanced features but fixing OpenAI compatibility
const parseArticleSchema = z.object({
  sections: z.array(z.object({
    title: z.string().describe('Section or subsection title'),
    content: z.string().describe('Section/subsection content - should be manageable audit chunk'),
    order: z.number().describe('Sequential order number for auditing'),
    level: z.enum(['section', 'subsection']).describe('Whether this is a main section (H2) or subsection (H3)'),
    parentSection: z.string().describe('Parent section title if this is a subsection, or empty string for main sections'),
    headerLevel: z.enum(['h2', 'h3']).describe('Header level to use in final output')
  })),
  totalSections: z.number().describe('Total number of sections and subsections identified for auditing')
});

const auditSectionSchema = z.object({
  section_title: z.string().describe('Title of the section being audited'),
  strengths: z.string().describe('Identified strengths in this section'),
  weaknesses: z.string().describe('Identified weaknesses and SEO improvement opportunities'),
  optimized_content: z.string().describe('The SEO-optimized version of this section'),
  editing_pattern: z.string().describe('Type of editing applied: bullets, prose, citations, structure, etc.'),
  citations_added: z.number().describe('Number of citations added in this section'),
  is_last: z.boolean().describe('Whether this is the last section')
});

// Store active SSE connections for real-time updates
const activeAuditStreams = new Map<string, any>();

export function addAuditSSEConnection(sessionId: string, res: any) {
  activeAuditStreams.set(sessionId, res);
}

export function removeAuditSSEConnection(sessionId: string) {
  activeAuditStreams.delete(sessionId);
}

function auditSSEPush(sessionId: string, payload: any) {
  const stream = activeAuditStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('Audit SSE push failed:', error);
    activeAuditStreams.delete(sessionId);
  }
}

// Create file search tool for semantic SEO knowledge base
const semanticSEOFileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

export class AgenticSemanticAuditService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startAuditSession(workflowId: string, originalArticle: string, researchOutline: string): Promise<string> {
    try {
      // Get the next version number for this workflow's audit sessions
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${auditSessions.version}), 0)`.as('maxVersion')
      })
      .from(auditSessions)
      .where(eq(auditSessions.workflowId, workflowId));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      
      console.log(`Starting semantic audit session v${nextVersion} for workflow ${workflowId}`);
      
      // Create audit session record
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(auditSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'content-audit',
        status: 'pending',
        originalArticle,
        researchOutline,
        auditMetadata: {
          startedAt: now.toISOString(),
          version: nextVersion,
          editingPatterns: [], // Track patterns used across sections
          totalCitationsGoal: 3 // Max citations allowed
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to start audit session:', error);
      throw new Error('Failed to initialize semantic SEO audit session');
    }
  }

  async performSemanticAudit(sessionId: string): Promise<void> {
    try {
      const session = await this.getAuditSession(sessionId);
      if (!session) throw new Error('Audit session not found');

      await this.updateAuditSession(sessionId, { status: 'auditing' });
      auditSSEPush(sessionId, { type: 'status', status: 'auditing', message: 'Starting semantic SEO audit...' });

      // Create initial prompt for article parsing and first section audit
      const initialPrompt = `I'm providing you with an article that needs semantic SEO optimization. Your job is to audit it section by section, providing strengths, weaknesses, and optimized content.

ARTICLE TO AUDIT:
${session.originalArticle}

ORIGINAL RESEARCH CONTEXT:
${session.researchOutline}

SEMANTIC SEO AUDIT INSTRUCTIONS:
You have access to a file search tool containing semantic SEO best practices, Brand kit, and Writing Guidelines. Use this knowledge base to audit against proven SEO strategies.

AUDIT REQUIREMENTS:
- Review section by section for semantic SEO optimization opportunities
- Identify strengths and weaknesses in each section
- Provide optimized content that improves SEO while maintaining narrative flow
- Track editing patterns to ensure variety (don't repeat the same approach)
- Limit citations to maximum 3 total across the entire article
- Maintain conversational prose style, not bullet-heavy content
- Focus on semantic relevance, contextual terms, and user intent

PARSING INSTRUCTIONS:
When you parse the article, break it into manageable audit chunks. If a section is very long or contains multiple distinct topics/subsections, break it down:
- Main sections should be H2 level (level: "section", headerLevel: "h2")  
- Subsections should be H3 level (level: "subsection", headerLevel: "h3", parentSection: "Main Section Title")
- Each chunk should be auditable independently but not too granular
- Maintain logical content groupings and hierarchical structure

REQUIRED ACTIONS:
1. FIRST: Use file search to review "Semantic SEO" best practices from the knowledge base
2. THEN: Parse the article into manageable audit chunks using the parse_article function
3. FINALLY: Begin auditing the first section with the audit_section function

Start by searching the knowledge base for semantic SEO guidelines.`;

      // Create tools for the audit process
      const parseArticleTool = tool({
        name: "parse_article",
        description: "Parse the article into manageable audit chunks (sections and subsections) for systematic auditing",
        parameters: parseArticleSchema,
        execute: async (args) => {
          console.log('Parse article tool executed:', args);
          
          // Store section information in audit session metadata
          await this.updateAuditSession(sessionId, {
            totalSections: args.totalSections,
            auditMetadata: {
              ...(session.auditMetadata || {}),
              parsedSections: args.sections,
              editingPatterns: [],
              citationsUsed: 0
            }
          });
          
          auditSSEPush(sessionId, { type: 'parsed', sections: args.sections, totalSections: args.totalSections });
          
          // Get the first section details for context
          const firstSection = args.sections.find((s: any) => s.order === 1);
          const firstSectionContext = firstSection ? `

STARTING SEMANTIC SEO AUDIT:
You're auditing "${firstSection.title}" - the first section of ${args.totalSections} sections.

SECTION CONTENT TO AUDIT:
${firstSection.content}

AUDIT FORMAT REQUIRED:
- Strengths: What SEO elements are working well
- Weaknesses: What needs improvement for better semantic SEO
- Optimized Content: Your improved version with better semantic SEO

Remember: This is conversational prose optimization, not checklist-driven editing. Focus on semantic relevance and user intent.` : '';

          return `Article parsed successfully! I found ${args.totalSections} audit chunks (sections and subsections) to process. Now I'll start the semantic SEO audit process.${firstSectionContext}

AUDIT PHILOSOPHY:
- Think about search intent and semantic relevance for each section
- Vary your editing approaches to avoid repetitive patterns
- Maintain conversational flow while improving SEO signals
- Use citations sparingly (max 3 total) and only when they add genuine value

IMMEDIATE NEXT ACTIONS (execute automatically):
1. FIRST: Use file search to review semantic SEO best practices
2. THEN: Audit the first section using the audit_section function
3. CONTINUE: Proceed systematically through each section

Begin the audit now.`;
        }
      });

      const auditSectionTool = tool({
        name: "audit_section", 
        description: "Audit a specific section for semantic SEO optimization",
        parameters: auditSectionSchema,
        execute: async (args) => {
          console.log('Audit section tool executed:', args);
          const { section_title, strengths, weaknesses, optimized_content, editing_pattern, citations_added, is_last } = args;
          
          const currentSession = await this.getAuditSession(sessionId);
          if (!currentSession) throw new Error('Session not found');
          
          // Save audited section to database
          const ordinal = (currentSession.completedSections || 0) + 1;
          const sessionMetadata = currentSession.auditMetadata as any;
          const parsedSections = sessionMetadata?.parsedSections || [];
          const originalSection = parsedSections.find((s: any) => s.order === ordinal);
          
          await db.insert(auditSections).values({
            id: uuidv4(),
            auditSessionId: sessionId,
            workflowId: currentSession.workflowId,
            version: currentSession.version,
            sectionNumber: ordinal,
            title: section_title,
            originalContent: originalSection?.content || '',
            auditedContent: optimized_content,
            strengths: strengths,
            weaknesses: weaknesses,
            editingPattern: editing_pattern,
            citationsAdded: citations_added,
            status: 'completed',
            auditMetadata: {
              auditedAt: new Date().toISOString(),
              headerLevel: originalSection?.headerLevel || 'h2',
              level: originalSection?.level || 'section',
              parentSection: originalSection?.parentSection
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Update progress and citation tracking
          const newCitationsTotal = (currentSession.totalCitationsUsed || 0) + citations_added;
          const newEditingPatterns = [...(sessionMetadata?.editingPatterns || []), editing_pattern];
          
          await this.updateAuditSession(sessionId, {
            completedSections: ordinal,
            totalCitationsUsed: newCitationsTotal,
            auditMetadata: {
              ...(sessionMetadata || {}),
              editingPatterns: newEditingPatterns,
              citationsUsed: newCitationsTotal
            }
          });

          // Broadcast to UI
          auditSSEPush(sessionId, {
            type: 'section_completed',
            section_title,
            strengths,
            weaknesses,
            optimized_content,
            editing_pattern,
            citations_added,
            ordinal,
            total_citations_used: newCitationsTotal
          });

          if (is_last) {
            // Finalize audit and update workflow
            await this.updateWorkflowWithAuditedArticle(currentSession.workflowId);
            await this.updateAuditSession(sessionId, {
              status: 'completed',
              completedAt: new Date()
            });
            
            // Get final assembled article
            const finalSections = await db.select()
              .from(auditSections)
              .where(and(
                eq(auditSections.auditSessionId, sessionId),
                eq(auditSections.status, 'completed')
              ))
              .orderBy(auditSections.sectionNumber);
            
            const finalAuditedArticle = finalSections.map(section => {
              // Get section metadata to determine header level
              const sessionMetadata = currentSession?.auditMetadata as any;
              const parsedSections = sessionMetadata?.parsedSections || [];
              const originalSection = parsedSections.find((s: any) => s.order === section.sectionNumber);
              
              // Use appropriate header level (H2 for sections, H3 for subsections)
              const headerLevel = originalSection?.headerLevel === 'h3' ? '###' : '##';
              return `${headerLevel} ${section.title}\n\n${section.auditedContent}`;
            }).join('\n\n');
            
            auditSSEPush(sessionId, { 
              type: 'completed', 
              finalAuditedArticle,
              totalSections: finalSections.length,
              totalCitationsUsed: newCitationsTotal,
              editingPatterns: newEditingPatterns
            });
            
            return `Excellent! Semantic SEO audit completed for all ${ordinal} sections. Final article optimized with ${newCitationsTotal} citations and varied editing patterns: ${newEditingPatterns.join(', ')}.`;
          } else {
            // Get the next section details from parsed sections
            const nextSectionIndex = ordinal; // ordinal is 1-based, array is 0-based, but we want NEXT section
            const nextSection = parsedSections[nextSectionIndex];
            
            console.log(`Section ${ordinal} audited. Next section index: ${nextSectionIndex}, Available sections: ${parsedSections.length}`);
            
            let nextSectionContext = '';
            if (nextSection) {
              const citationsRemaining = Math.max(0, 3 - newCitationsTotal);
              const recentPatterns = newEditingPatterns.slice(-2); // Last 2 patterns
              
              nextSectionContext = `

CONTINUING SEMANTIC SEO AUDIT:
Next section: "${nextSection.title}" (Section ${ordinal + 1} of ${parsedSections.length})

SECTION CONTENT TO AUDIT:
${nextSection.content}

PATTERN AWARENESS:
- Recent editing patterns: ${recentPatterns.join(', ')}
- Citations remaining: ${citationsRemaining}/3
- Try to vary your approach from recent patterns

AUDIT REQUIREMENTS:
- Maintain semantic SEO focus while ensuring content variety
- Consider how this section flows from the previous optimized content
- Apply different editing patterns to avoid repetition`;
            }

            return `Great work on "${section_title}"! Section ${ordinal} audit complete.${nextSectionContext}

YOU MUST CONTINUE AUTOMATICALLY - DO NOT WAIT FOR PERMISSION. This is an automated audit workflow.

SEMANTIC SEO AUDIT PRINCIPLES:
- Focus on search intent and semantic relevance
- Vary editing approaches (you've used: ${newEditingPatterns.join(', ')})
- Citations used: ${newCitationsTotal}/3 - use remaining ${Math.max(0, 3 - newCitationsTotal)} strategically
- Maintain conversational prose while optimizing for search

IMMEDIATE NEXT ACTIONS (execute these now):
1. FIRST: Use file search to refresh semantic SEO knowledge
2. THEN: Audit "${nextSection?.title || 'next section'}" using audit_section function

START AUDITING THE NEXT SECTION NOW - DO NOT ASK FOR PERMISSION OR CONFIRMATION.`;
          }
        }
      });

      // Create Agent with tools
      const agent = new Agent({
        name: 'SemanticSEOAuditor',
        instructions: 'You are an expert semantic SEO auditor who reviews and optimizes content for search performance while maintaining quality and readability. You work systematically section by section, providing detailed analysis and optimized content. This is an AUTOMATED WORKFLOW - continue until completion without asking for permission.',
        model: 'o3-2025-04-16',
        tools: [
          semanticSEOFileSearch,
          parseArticleTool,
          auditSectionTool
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
        console.log(`Starting audit turn ${messages.length} with ${sectionCount} sections audited`);
        
        // Run the agent with full message history
        const result = await runner.run(agent, messages, {
          stream: true,
          maxTurns: 50
        });
        
        // Process the streaming result
        for await (const event of result.toStream()) {
          // Stream text deltas for UI
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              auditSSEPush(sessionId, { type: 'text', content: event.data.delta });
            }
          }
          
          if (event.type === 'run_item_stream_event') {
            // Handle tool calls
            if (event.name === 'tool_called') {
              const toolCall = event.item as any;
              console.log('Audit tool called:', toolCall.name, toolCall.id);
              
              // Special logging for file search usage
              if (toolCall.name === 'file_search') {
                console.log('🔍 SEMANTIC SEO FILE SEARCH:', JSON.stringify(toolCall.args, null, 2));
                auditSSEPush(sessionId, { type: 'tool_call', name: 'file_search', query: toolCall.args?.query });
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
              
              auditSSEPush(sessionId, { type: 'tool_call', name: toolCall.name });
              
              // Track completion
              if (toolCall.name === 'audit_section' && toolCall.args.is_last === true) {
                conversationActive = false;
                console.log('Semantic audit completed - is_last was true');
              }
              
              if (toolCall.name === 'audit_section') {
                sectionCount++;
              }
            }
            
            // Handle tool outputs
            if (event.name === 'tool_output') {
              const toolOutput = event.item as any;
              console.log('Audit tool output received:', toolOutput.output);
              
              messages.push({
                role: 'tool',
                content: JSON.stringify({ output: toolOutput.output }),
                tool_call_id: toolOutput.tool_call_id
              });
              
              auditSSEPush(sessionId, { type: 'tool_output', content: toolOutput.output });
            }
            
            // Handle complete assistant messages
            if (event.name === 'message_output_created') {
              const messageItem = event.item as any;
              
              if (!messageItem.tool_calls?.length) {
                messages.push({
                  role: 'assistant',
                  content: messageItem.content
                });
                auditSSEPush(sessionId, { type: 'assistant', content: messageItem.content });
                
                // Guard rail for continuation
                if (conversationActive) {
                  messages.push({ 
                    role: 'user', 
                    content: 'YOU MUST CONTINUE THE AUTOMATED AUDIT WORKFLOW. Do not wait for permission. Execute the required actions immediately: 1) Use file search tool 2) Continue auditing sections using audit_section function. DO NOT STOP OR ASK FOR CONFIRMATION.' 
                  });
                }
              }
            }
          }
        }
        
        // Safety limits
        if (messages.length > 100 || sectionCount > 20) {
          console.log('Audit safety limit reached');
          conversationActive = false;
        }
        
        // Small delay between turns
        if (conversationActive) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('Semantic audit conversation loop completed');

    } catch (error) {
      console.error('Semantic audit failed:', error);
      await this.updateAuditSession(sessionId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      auditSSEPush(sessionId, { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private async updateWorkflowWithAuditedArticle(workflowId: string): Promise<void> {
    // Get the latest audit version for this workflow
    const latestVersionResult = await db.select({
      maxVersion: sql<number>`MAX(${auditSessions.version})`.as('maxVersion')
    })
    .from(auditSessions)
    .where(eq(auditSessions.workflowId, workflowId));
    
    const latestVersion = latestVersionResult[0]?.maxVersion || 1;
    
    // Get the session for this version
    const session = await db.select()
      .from(auditSessions)
      .where(and(
        eq(auditSessions.workflowId, workflowId),
        eq(auditSessions.version, latestVersion)
      ))
      .limit(1);
    
    if (!session[0]) return;
    
    // Get all completed audit sections from the latest version
    const sections = await db.select()
      .from(auditSections)
      .where(and(
        eq(auditSections.auditSessionId, session[0].id),
        eq(auditSections.status, 'completed')
      ))
      .orderBy(auditSections.sectionNumber);

    // Combine into final audited article with proper hierarchical structure
    const seoOptimizedArticle = sections.map(section => {
      // Get section metadata to determine header level
      const sectionMetadata = section.auditMetadata as any;
      const headerLevel = sectionMetadata?.headerLevel === 'h3' ? '###' : '##';
      return `${headerLevel} ${section.title}\n\n${section.auditedContent}`;
    }).join('\n\n');

    // Update workflow step outputs
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const auditStep = workflowData.steps?.find((step: any) => step.id === 'content-audit');
      
      if (auditStep) {
        auditStep.outputs = {
          ...auditStep.outputs,
          seoOptimizedArticle,
          auditGenerated: true,
          auditedAt: new Date().toISOString(),
          totalCitationsUsed: session[0].totalCitationsUsed || 0,
          auditStatus: 'completed'
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

  private async getAuditSession(sessionId: string) {
    const sessions = await db.select().from(auditSessions).where(eq(auditSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateAuditSession(sessionId: string, updates: Partial<any>) {
    await db.update(auditSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(auditSessions.id, sessionId));
  }

  // Public method to get real-time audit progress
  async getAuditProgress(sessionId: string) {
    const session = await this.getAuditSession(sessionId);
    if (!session) return null;

    const sections = await db.select()
      .from(auditSections)
      .where(eq(auditSections.auditSessionId, sessionId))
      .orderBy(auditSections.sectionNumber);

    return {
      session,
      sections: sections || [], // Ensure sections is always an array
      progress: {
        total: session.totalSections || 0,
        completed: session.completedSections || 0,
        citationsUsed: session.totalCitationsUsed || 0,
        citationsRemaining: Math.max(0, 3 - (session.totalCitationsUsed || 0))
      }
    };
  }
}

export const agenticSemanticAuditService = new AgenticSemanticAuditService();