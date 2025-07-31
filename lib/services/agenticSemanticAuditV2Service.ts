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

interface ArticleSection {
  id: string;
  title: string;
  level: number; // 1 for H1, 2 for H2, etc.
  content: string;
  wordCount: number;
}

interface SectionPlan {
  sections: ArticleSection[];
  totalSections: number;
  auditGroups: Array<{
    sectionIds: string[];
    sectionTitles: string[];
    prompt: string;
  }>;
}

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
  
  // Parse delimiter-based response from audit
  private parseAuditResponse(response: string): {
    parsed?: {
      strengths: string[];
      weaknesses: string[];
      suggestedVersion: string;
    };
  } {
    try {
      // Extract audit data
      const strengthsMatch = response.match(/===STRENGTHS_START===\s*([\s\S]*?)\s*===STRENGTHS_END===/);
      const weaknessesMatch = response.match(/===WEAKNESSES_START===\s*([\s\S]*?)\s*===WEAKNESSES_END===/);
      const suggestedMatch = response.match(/===SUGGESTED_VERSION_START===\s*([\s\S]*?)\s*===SUGGESTED_VERSION_END===/);
      
      // If we have all required data, parse it
      if (strengthsMatch && weaknessesMatch && suggestedMatch) {
        // Parse strengths and weaknesses as arrays (one per line)
        const strengths = strengthsMatch[1]
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.includes('(more strengths'));
          
        const weaknesses = weaknessesMatch[1]
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0 && !w.includes('(more weaknesses'));
          
        const suggestedVersion = suggestedMatch[1].trim();
        
        return {
          parsed: {
            strengths,
            weaknesses,
            suggestedVersion
          }
        };
      }
      
      console.error('Missing required delimiters in response:', response.substring(0, 200));
      return {};
    } catch (error) {
      console.error('Failed to parse delimiter response:', error, 'Response:', response.substring(0, 200));
      return {};
    }
  }
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Identify sections in the article using O3
  private async identifySections(article: string): Promise<SectionPlan> {
    const sectionIdentificationPrompt = `You are helping to break down this article into focused chunks for detailed AI analysis and improvement.

CONTEXT: Each section you create will be sent to another AI agent that will:
- Analyze it for semantic SEO opportunities
- Fact-check and enhance with research
- Improve clarity and engagement
- The smaller and more focused the section, the better the analysis quality

ARTICLE:
${article}

YOUR TASK:
Break this article into the optimal number of focused sections for detailed analysis.

RULES:
1. **Default approach**: Treat subsections (H3, H4, H5) as individual sections
2. **Introduction**: Always its own section (content before first heading)
3. **Listicles**: If this covers products/services/software/tools, each item should be its own section
4. **Only group when**: 
   - Individual subsections are very thin (under 100 words)
   - You'd create more than 20 sections total
   - Adjacent subsections are nearly identical in scope
5. **Never group**: Different H2 sections together by default
6. **Preserve exact markdown**: Headings must match exactly as written

REASONING APPROACH:
- Scan for article type (listicle, guide, comparison, etc.)
- Count natural breakpoints (H2, H3, H4 headings)
- Assess word count of each potential section
- Determine if any grouping is needed for thin content
- Prioritize focused analysis over artificial grouping

Output JSON in this exact format:
{
  "sections": [
    {
      "id": "intro",
      "title": "Introduction", 
      "level": 1,
      "headingText": null
    },
    {
      "id": "section-1",
      "title": "## Understanding Semantic SEO",
      "level": 2,
      "headingText": "## Understanding Semantic SEO"
    }
  ],
  "totalSections": 12
}

CRITICAL:
- "title" = exact markdown heading from article
- "headingText" = same as title (null only for intro)
- Maximum 20 sections total
- Err on the side of MORE focused sections, not fewer broad ones`;

    try {
      // Use a simple agent for section identification
      const sectionAgent = new Agent({
        name: 'SectionIdentifier',
        instructions: '',
        model: 'o3-2025-04-16', // Use same O3 model as other agents
        tools: []
      });

      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      console.log('🔍 Starting section identification...');
      const result = await runner.run(sectionAgent, [
        { role: 'user', content: sectionIdentificationPrompt }
      ], {
        stream: false,
        maxTurns: 1
      });

      await result.finalOutput;
      console.log('📋 Section identification completed, extracting response...');
      
      // Get conversation history and find last assistant message
      const conversationHistory = (result as any).history;
      console.log('📊 History length:', conversationHistory?.length);
      
      const lastAssistantMessage = conversationHistory
        ?.filter((msg: any) => msg.role === 'assistant')
        ?.pop();
      
      if (!lastAssistantMessage) {
        console.error('❌ No assistant message found in history');
        throw new Error('No response from section identification agent');
      }
      
      const response = this.extractTextContent(lastAssistantMessage.content);
      console.log('📝 Raw response:', response.substring(0, 500));
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in response:', response);
        throw new Error('Failed to extract JSON from section identification response');
      }

      console.log('🔧 Parsing JSON:', jsonMatch[0].substring(0, 200));
      const sectionData = JSON.parse(jsonMatch[0]);
      
      // Extract actual content for each section from the article
      const sections: ArticleSection[] = [];
      const lines = article.split('\n');
      
      for (let i = 0; i < sectionData.sections.length; i++) {
        const section = sectionData.sections[i];
        const nextSection = sectionData.sections[i + 1];
        
        let content = '';
        if (section.id === 'intro') {
          // Introduction is everything before the first heading
          const firstHeadingIndex = lines.findIndex(line => line.startsWith('#'));
          content = lines.slice(0, firstHeadingIndex).join('\n').trim();
        } else {
          // Find section content between headings
          const startIndex = lines.findIndex(line => line === section.headingText);
          let endIndex = lines.length;
          
          if (nextSection && nextSection.headingText) {
            endIndex = lines.findIndex((line, idx) => 
              idx > startIndex && line === nextSection.headingText
            );
          }
          
          if (startIndex !== -1) {
            content = lines.slice(startIndex, endIndex).join('\n').trim();
          }
        }
        
        sections.push({
          id: section.id,
          title: section.title,
          level: section.level,
          content: content,
          wordCount: content.split(/\s+/).filter(Boolean).length
        });
      }

      // Create audit groups (for now, one section per group)
      const auditGroups = sections.map(section => ({
        sectionIds: [section.id],
        sectionTitles: [section.title],
        prompt: this.generateSectionPrompt(section)
      }));

      return {
        sections,
        totalSections: sections.length,
        auditGroups
      };
    } catch (error) {
      console.error('❌ Section identification failed:', error);
      if (error instanceof SyntaxError) {
        console.error('JSON parsing error - AI may not have returned valid JSON');
      }
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw new Error(`Failed to analyze article structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate prompt for a specific section
  private generateSectionPrompt(section: ArticleSection): string {
    const sectionIndicator = section.id === 'intro' 
      ? 'the Introduction section'
      : `the section titled "${section.title}"`;
      
    return `Now audit ${sectionIndicator}. 

Here is the specific section to focus on:
${section.content}

Output your analysis in this EXACT format:

===STRENGTHS_START===
strength 1
strength 2
(more strengths if applicable)
===STRENGTHS_END===

===WEAKNESSES_START===
weakness 1
weakness 2
(more weaknesses if applicable)
===WEAKNESSES_END===

===SUGGESTED_VERSION_START===
Your improved version of the section here
===SUGGESTED_VERSION_END===

Important:
- Use EXACTLY these delimiters, don't modify them
- Each strength/weakness should be on its own line
- The suggestedVersion should preserve markdown formatting (headings, lists, bold, italics, etc.)
- When you identify weaknesses related to lack of numbers or data, DO NOT make up data. Instead, use the web search tool to find accurate, factual data to support your improvements
- Focus ONLY on this specific section. Do not audit any other sections.`;
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
      
      // Step 1: Identify sections in the article
      console.log('🔍 Identifying article sections...');
      auditV2SSEPush(sessionId, { type: 'status', status: 'analyzing', message: 'Analyzing article structure...' });
      
      const sectionPlan = await this.identifySections(originalArticle);
      console.log(`📋 Identified ${sectionPlan.totalSections} sections for audit`);
      
      auditV2SSEPush(sessionId, { 
        type: 'section_plan', 
        totalSections: sectionPlan.totalSections,
        sections: sectionPlan.sections.map(s => ({ id: s.id, title: s.title, wordCount: s.wordCount }))
      });
      
      // Build initial prompt with exact user prompts
      const firstSection = sectionPlan.sections[0];
      const firstSectionIndicator = firstSection.id === 'intro' 
        ? 'the Introduction section'
        : `the section titled "${firstSection.title}"`;
        
      const initialPrompt = `This is an article that you wrote for me:

${originalArticle}

If you look at your knowledge base, you'll see that I've added some instructions for semantic SEO in writing. I want you to be a content editor, and I want you to review the article section by section to see if it's meeting the best practices that we discuss.

For full reference, this was the original deep research data and outline that might be useful as you edit.
${researchOutline}

Now I realize this is a lot, so i want your first output to only be an audit of ${firstSectionIndicator}. For each section you audit, output your analysis in this EXACT format:

===STRENGTHS_START===
strength 1
strength 2
(more strengths if applicable)
===STRENGTHS_END===

===WEAKNESSES_START===
weakness 1
weakness 2
(more weaknesses if applicable)
===WEAKNESSES_END===

===SUGGESTED_VERSION_START===
Your improved version of the section here
===SUGGESTED_VERSION_END===

Important:
- Use EXACTLY these delimiters, don't modify them
- Each strength/weakness should be on its own line
- The suggestedVersion should preserve markdown formatting (headings, lists, bold, italics, etc.)
- When you identify weaknesses related to lack of numbers or data, DO NOT make up data. Instead, use the web search tool to find accurate, factual data to support your improvements
- Introduction sections should NOT include H2 headers. They appear at the start of the article before any section headings

Start with ${firstSectionIndicator}. Focus ONLY on this specific section.`;


      // Initialize conversation
      let messages: any[] = [
        { role: 'user', content: initialPrompt }
      ];
      
      // Create runner
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });
      
      let auditedSections: Array<{
        sectionId: string;
        sectionTitle: string;
        strengths: string[];
        weaknesses: string[];
        suggestedVersion: string;
      }> = [];
      
      // Process each section in order
      for (let sectionIndex = 0; sectionIndex < sectionPlan.sections.length; sectionIndex++) {
        const currentSection = sectionPlan.sections[sectionIndex];
        console.log(`🔄 Auditing section ${sectionIndex + 1}/${sectionPlan.totalSections}: ${currentSection.title}`);
        
        auditV2SSEPush(sessionId, { 
          type: 'section_progress',
          currentSection: sectionIndex + 1,
          totalSections: sectionPlan.totalSections,
          sectionTitle: currentSection.title
        });
        
        // For sections after the first, generate specific prompt
        if (sectionIndex > 0) {
          const sectionPrompt = this.generateSectionPrompt(currentSection);
          messages.push({ role: 'user', content: sectionPrompt });
        }
        
        // Deduplicate messages before each run to prevent duplicate ID errors
        const seen = new Set<string>();
        const deduplicatedMessages: any[] = [];
        
        for (const message of messages) {
          if (!message) continue;
          
          const id = (message as any).id;
          if (!id) {
            deduplicatedMessages.push(message);
            continue;
          }
          
          if (!seen.has(id)) {
            seen.add(id);
            deduplicatedMessages.push(message);
          }
        }
        
        messages = deduplicatedMessages;
        
        // Run the agent with full message history
        const result = await runner.run(semanticAuditorAgentV2, messages, {
          stream: true,
          maxTurns: 10 // Lower since we're doing one section at a time
        });
        
        // Process the streaming result
        for await (const event of result.toStream()) {
          // Stream text content
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              // Stream to UI
              auditV2SSEPush(sessionId, { type: 'text', content: event.data.delta });
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
          
          // Parse delimiter-based response
          const sectionData = this.parseAuditResponse(textContent);
          
          // Handle parsed audit data
          if (sectionData.parsed) {
            // Add to audited sections with section metadata
            auditedSections.push({
              sectionId: currentSection.id,
              sectionTitle: currentSection.title,
              ...sectionData.parsed
            });
            console.log(`✅ Section ${sectionIndex + 1} audited: ${currentSection.title}`);
            
            // Send section completed event
            await this.updateAuditSession(sessionId, {
              completedSections: sectionIndex + 1,
              sessionMetadata: {
                ...(session.sessionMetadata as any),
                sectionsCompleted: sectionIndex + 1,
                lastUpdate: new Date().toISOString()
              }
            });
            
            auditV2SSEPush(sessionId, { 
              type: 'section_completed',
              sectionsCompleted: sectionIndex + 1,
              totalSections: sectionPlan.totalSections,
              content: sectionData.parsed,
              sectionTitle: currentSection.title,
              message: `Completed ${currentSection.title}`
            });
          } else {
            console.error(`Failed to parse audit response for section: ${currentSection.title}`);
            // Could retry or handle error here
          }
          
          // Update messages for next iteration
          messages = [...conversationHistory];
        }
      }
      
      console.log('🏁 V2 semantic audit completed all sections');
      
      // Assemble the final audited article from JSON data
      console.log('🔍 Assembling audited article from structured data...');
      const cleanSuggestedArticle = auditedSections
        .map(section => section.suggestedVersion)
        .join('\n\n');
      
      const wordCount = cleanSuggestedArticle.split(/\s+/).filter(Boolean).length;
      console.log(`📊 Collected audit data for ${auditedSections.length} sections, ${wordCount} words`);
      
      // Prepare audit feedback for metadata
      const auditFeedback = auditedSections.map(section => ({
        sectionId: section.sectionId,
        sectionTitle: section.sectionTitle,
        strengths: section.strengths,
        weaknesses: section.weaknesses
      }));
      
      // Save final audited article (clean version)
      await this.updateAuditSession(sessionId, {
        status: 'completed',
        finalArticle: cleanSuggestedArticle,  // Store clean article
        completedSections: auditedSections.length,
        completedAt: new Date(),
        sessionMetadata: {
          ...(session.sessionMetadata as any),
          completedAt: new Date().toISOString(),
          totalMessages: messages.length,
          totalSections: sectionPlan.totalSections,
          auditedSections: auditedSections,  // Store structured audit data
          auditFeedback: auditFeedback,  // Store feedback for analysis
          sectionPlan: sectionPlan.sections.map(s => ({ id: s.id, title: s.title, wordCount: s.wordCount }))
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
        sectionsCompleted: auditedSections.length,
        totalSections: sectionPlan.totalSections,
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
