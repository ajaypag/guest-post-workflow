import { Runner, Agent } from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { v2AgentSessions, workflows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Store active SSE connections for real-time updates
const activeAuditV2Streams = new Map<string, any>();

export function addSemanticAuditV2SSEConnection(sessionId: string, res: any) {
  activeAuditV2Streams.set(sessionId, res);
}

export function removeSemanticAuditV2SSEConnection(sessionId: string) {
  activeAuditV2Streams.delete(sessionId);
}

function auditV2SSEPush(sessionId: string, payload: any) {
  const stream = activeAuditV2Streams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('Semantic audit V2 SSE push failed:', error);
    activeAuditV2Streams.delete(sessionId);
  }
}

// Create file search tool for semantic SEO knowledge base
const semanticSEOFileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// Web search tool for fact-checking and current information
const webSearch = webSearchTool();

// Create semantic auditor agent V2 - empty instructions pattern
export const semanticAuditorAgentV2 = new Agent({
  name: 'SemanticAuditorV2',
  instructions: '', // CRITICAL: Empty - all guidance from prompts
  model: 'o3-2025-04-16',
  tools: [semanticSEOFileSearch, webSearch], // Vector store and web search
});

export class AgenticSemanticAuditV2Service {
  // Helper to extract text content from various message formats
  private extractTextContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      return content
        .filter((item: any) => 
          item.type === 'text' || item.type === 'output_text'
        )
        .map((item: any) => item.text || item.output || '')
        .join('');
    }
    return '';
  }
  
  // Parse JSON response from audit
  private parseAuditJSON(response: string): {
    status?: 'complete';
    parsed?: {
      strengths: string[];
      weaknesses: string[];
      suggestedVersion: string;
    };
  } {
    try {
      // Try to extract JSON from the response
      // Sometimes AI might include extra text, so we look for JSON boundaries
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', response.substring(0, 200));
        return {};
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Check if it's the completion status
      if (parsed.status === 'complete') {
        return { status: 'complete' };
      }
      
      // Validate the structure
      if (parsed.strengths && parsed.weaknesses && parsed.suggestedVersion) {
        return {
          parsed: {
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [parsed.strengths],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [parsed.weaknesses],
            suggestedVersion: parsed.suggestedVersion
          }
        };
      }
      
      console.error('Invalid JSON structure:', parsed);
      return {};
    } catch (error) {
      console.error('Failed to parse JSON:', error, 'Response:', response.substring(0, 200));
      return {};
    }
  }
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startAuditSession(workflowId: string, originalArticle: string, researchOutline: string): Promise<string> {
    try {
      // Get the next version number for this workflow's V2 audit sessions
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${v2AgentSessions.version}), 0)`.as('maxVersion')
      })
      .from(v2AgentSessions)
      .where(and(
        eq(v2AgentSessions.workflowId, workflowId),
        eq(v2AgentSessions.stepId, 'content-audit')
      ));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      
      console.log(`🚀 Starting V2 semantic audit session v${nextVersion} for workflow ${workflowId}`);
      
      // Create V2 audit session record
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(v2AgentSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'content-audit',
        status: 'initializing',
        outline: researchOutline, // Store research outline in outline field
        sessionMetadata: {
          originalArticle, // Store original article in metadata
          startedAt: now.toISOString(),
          version: nextVersion,
          totalCitationsUsed: 0,
          auditType: 'semantic-seo-v2'
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to start V2 audit session:', error);
      throw new Error('Failed to initialize V2 semantic SEO audit session');
    }
  }

  async performSemanticAuditV2(sessionId: string): Promise<void> {
    try {
      const session = await this.getAuditSession(sessionId);
      if (!session) throw new Error('V2 audit session not found');

      const originalArticle = (session.sessionMetadata as any)?.originalArticle as string;
      const researchOutline = session.outline || '';

      await this.updateAuditSession(sessionId, { status: 'auditing' });
      auditV2SSEPush(sessionId, { type: 'status', status: 'auditing', message: 'Starting V2 semantic SEO audit...' });
      
      // Add end marker to article
      const END_MARKER = '<!-- END_OF_ARTICLE -->';
      const articleWithEndMarker = originalArticle + '\n\n' + END_MARKER;
      
      // Build initial prompt with exact user prompts
      const initialPrompt = `This is an article that you wrote for me:

${articleWithEndMarker}

If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss. For full reference, this was the original deep research data and outline that might be useful as you edit.

${researchOutline}

Now I realize this is a lot, so i want your first output to only be an audit of the first section. For each section you audit, output your analysis as valid JSON with exactly these three fields:

{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestedVersion": "Your improved version of the section here"
}

Important:
- Output ONLY the JSON object, no other text
- Ensure the JSON is valid and properly escaped
- The suggestedVersion should be a single string with proper line breaks as \n
- The suggestedVersion should preserve markdown formatting (headings, lists, bold, italics, etc.)

Start with the first section. In cases where a section has many subsections, output just the subsection.

When you reach <!-- END_OF_ARTICLE -->, output: {"status": "complete"}`;

      // Exact looping prompt from user
      const loopingPrompt = `Okay, now I want you to proceed your audit with the next section. Output your analysis as valid JSON with exactly these three fields:

{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestedVersion": "Your improved version of the section here"
}

In cases where a section has many subsections, output just the subsection. While auditing, keep in mind we are creating a "primarily narrative" article so bullet points can appear but only very sporadically.

Important: The suggestedVersion should preserve markdown formatting (headings, lists, bold, italics, etc.).

When you reach the end of the article or see <!-- END_OF_ARTICLE -->, output: {"status": "complete"}`;

      // Initialize conversation
      let messages: any[] = [
        { role: 'user', content: initialPrompt }
      ];
      
      // Create runner
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });
      
      let auditActive = true;
      let sectionsCompleted = 0;
      let auditedSections: Array<{
        strengths: string[];
        weaknesses: string[];
        suggestedVersion: string;
      }> = [];
      
      while (auditActive) {
        console.log(`🔄 V2 Audit turn ${messages.length} with ${sectionsCompleted} sections completed`);
        
        // Deduplicate messages before each run to prevent duplicate ID errors
        // This handles both msg_* and rs_* (reasoning) items
        const seen = new Set<string>();
        const deduplicatedMessages: any[] = [];
        const duplicateIds: string[] = [];
        
        for (const message of messages) {
          // Skip null/undefined messages
          if (!message) {
            console.log(`⚠️ Skipping null/undefined message`);
            continue;
          }
          
          const id = (message as any).id;
          
          // If no ID, it's safe to include (likely a user message)
          if (!id) {
            deduplicatedMessages.push(message);
            continue;
          }
          
          // Skip if we've already seen this ID
          if (seen.has(id)) {
            duplicateIds.push(id);
            console.log(`⚠️ Filtering duplicate message with id: ${id}, role: ${message.role}`);
            continue;
          }
          
          seen.add(id);
          deduplicatedMessages.push(message);
        }
        
        messages = deduplicatedMessages;
        console.log(`📊 Deduplicated message count: ${messages.length}, removed ${duplicateIds.length} duplicates`);
        
        if (duplicateIds.length > 0) {
          console.log(`🔍 Duplicate IDs found: ${duplicateIds.join(', ')}`);
        }
        
        // Run the agent with full message history
        const result = await runner.run(semanticAuditorAgentV2, messages, {
          stream: true,
          maxTurns: 150
        });
        
        // Process the streaming result
        for await (const event of result.toStream()) {
          // Stream text content
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              // Stream to UI
              auditV2SSEPush(sessionId, { type: 'text', content: event.data.delta });
              
              // Check for end marker in output
              if (event.data.delta.includes(END_MARKER)) {
                console.log('🎯 End marker detected in output');
                auditActive = false;
              }
            }
          }
        }
        
        // Get conversation history after streaming completes
        await result.finalOutput;
        const conversationHistory = (result as any).history;
        
        // Extract last assistant message
        const lastAssistantMessage = conversationHistory
          .filter((msg: any) => msg.role === 'assistant')
          .pop();
        
        if (lastAssistantMessage) {
          // Extract text content properly
          const textContent = this.extractTextContent(lastAssistantMessage.content);
          
          // Parse JSON response
          const sectionData = this.parseAuditJSON(textContent);
          
          // Check if audit is complete
          if (sectionData.status === 'complete') {
            console.log('✅ Audit completion detected - status: complete');
            auditActive = false;
          } else if (sectionData.parsed) {
            // Add to audited sections
            auditedSections.push(sectionData.parsed);
            sectionsCompleted++;
            console.log(`✅ Section ${sectionsCompleted} audited`);
          } else {
            console.error('Failed to parse section response:', textContent);
            // Check for completion indicators in plain text as fallback
            const lowerContent = textContent.toLowerCase();
            if (lowerContent.includes('end of article') ||
                lowerContent.includes('audit complete') ||
                lowerContent.includes('conclud') ||
                textContent.includes(END_MARKER)) {
              console.log('✅ Audit completion detected in text');
              auditActive = false;
            } else {
              // Continue anyway
              sectionsCompleted++;
            }
          }
          
          if (auditActive) {
            // CRITICAL: Use the SDK's complete history which includes message-reasoning pairs
            // Don't manually construct messages - let the SDK manage the conversation
            messages = [...conversationHistory];
            
            // Add the user prompt - this is safe as it doesn't have an ID yet
            messages.push({ role: 'user', content: loopingPrompt });
            
            // Update progress
            await this.updateAuditSession(sessionId, {
              completedSections: sectionsCompleted,
              sessionMetadata: {
                ...(session.sessionMetadata as any),
                sectionsCompleted,
                lastUpdate: new Date().toISOString()
              }
            });
            
            auditV2SSEPush(sessionId, { 
              type: 'section_completed',
              sectionsCompleted,
              content: sectionData.parsed,
              message: `Completed section ${sectionsCompleted}`
            });
          }
        }
        
        // Safety limits
        if (messages.length > 100 || sectionsCompleted > 50) {
          console.log('⚠️ Safety limit reached');
          auditActive = false;
        }
      }
      
      console.log('🏁 V2 semantic audit conversation loop completed');
      
      // Assemble the final audited article from JSON data
      console.log('🔍 Assembling audited article from structured data...');
      const cleanSuggestedArticle = auditedSections
        .map(section => section.suggestedVersion)
        .join('\n\n');
      
      const wordCount = cleanSuggestedArticle.split(/\s+/).filter(Boolean).length;
      console.log(`📊 Collected audit data for ${auditedSections.length} sections, ${wordCount} words`);
      
      // Prepare audit feedback for metadata
      const auditFeedback = auditedSections.map(section => ({
        strengths: section.strengths,
        weaknesses: section.weaknesses
      }));
      
      // Save final audited article (clean version)
      await this.updateAuditSession(sessionId, {
        status: 'completed',
        finalArticle: cleanSuggestedArticle,  // Store clean article
        completedSections: sectionsCompleted,
        completedAt: new Date(),
        sessionMetadata: {
          ...(session.sessionMetadata as any),
          completedAt: new Date().toISOString(),
          totalMessages: messages.length,
          auditedSections: auditedSections,  // Store structured audit data
          auditFeedback: auditFeedback  // Store feedback for analysis
        }
      });
      
      // Update workflow with clean audited article
      await this.updateWorkflowWithAuditedArticle(session.workflowId, cleanSuggestedArticle);
      
      // Send completion event with structured data
      auditV2SSEPush(sessionId, { 
        type: 'complete',
        status: 'completed',
        auditedSections: auditedSections,  // Structured audit data
        finalArticle: cleanSuggestedArticle,  // Clean article only
        sectionsCompleted,
        message: 'V2 semantic audit completed successfully!'
      });

    } catch (error) {
      console.error('V2 semantic audit failed:', error);
      
      await this.updateAuditSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      auditV2SSEPush(sessionId, { 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw error;
    }
  }

  private async updateWorkflowWithAuditedArticle(workflowId: string, auditedArticle: string): Promise<void> {
    // Update workflow step outputs
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const auditStep = workflowData.steps?.find((step: any) => step.id === 'content-audit');
      
      if (auditStep) {
        auditStep.outputs = {
          ...auditStep.outputs,
          seoOptimizedArticle: auditedArticle,
          auditGenerated: true,
          auditedAt: new Date().toISOString(),
          auditVersion: 'v2',
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
    const sessions = await db.select().from(v2AgentSessions).where(eq(v2AgentSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateAuditSession(sessionId: string, updates: Partial<any>) {
    await db.update(v2AgentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(v2AgentSessions.id, sessionId));
  }

  // Public method to get real-time audit progress
  async getAuditProgress(sessionId: string) {
    const session = await this.getAuditSession(sessionId);
    if (!session) return null;

    return {
      session: {
        id: session.id,
        status: session.status,
        completedSections: session.completedSections || 0,
        errorMessage: session.errorMessage
      },
      progress: {
        status: session.status,
        completedSections: session.completedSections || 0
      }
    };
  }
}

export const agenticSemanticAuditV2Service = new AgenticSemanticAuditV2Service();
