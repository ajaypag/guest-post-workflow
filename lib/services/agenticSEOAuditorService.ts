import { Runner, Agent } from '@openai/agents';
import { OpenAIProvider, webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';
import { tool } from '@openai/agents';
import { db } from '@/lib/db/connection';
import { seoAuditSessions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { seoAnalysisTools } from '@/lib/agents/seoAnalysisTools';

// Store active SSE connections for real-time updates
const activeSEOAuditStreams = new Map<string, any>();

export function addSEOAuditSSEConnection(sessionId: string, res: any) {
  activeSEOAuditStreams.set(sessionId, res);
}

export function removeSEOAuditSSEConnection(sessionId: string) {
  activeSEOAuditStreams.delete(sessionId);
}

function seoAuditSSEPush(sessionId: string, payload: any) {
  const stream = activeSEOAuditStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('SEO audit SSE push failed:', error);
    activeSEOAuditStreams.delete(sessionId);
  }
}

// Web search tool for current SEO best practices and tools
const webSearch = webSearchTool();

// Create SEO auditor agent with specialized tools
export const seoAuditorAgent = new Agent({
  name: 'SEOAuditor',
  instructions: `You are an expert SEO auditor specializing in comprehensive website analysis. Your role is to:

1. **WEBSITE ANALYSIS**: Perform thorough technical and content analysis of websites
   - Use web search to fetch and analyze website content, structure, and performance
   - Analyze page speed, mobile responsiveness, and core web vitals
   - Check technical SEO factors (SSL, robots.txt, sitemaps, structured data)
   - Evaluate on-page optimization (titles, meta descriptions, headers, content)

2. **SEO BEST PRACTICES**: Apply current SEO knowledge and best practices
   - Use web search to find current Google algorithm updates and SEO guidelines
   - Compare against industry standards and competitor benchmarks
   - Identify opportunities based on latest SEO trends and techniques

3. **COMPREHENSIVE REPORTING**: Generate detailed, actionable audit reports
   - Prioritize issues by impact vs effort matrix
   - Provide specific implementation steps for each recommendation  
   - Create timeline-based action plans
   - Include competitor insights and market opportunities

4. **TOOL USAGE PROTOCOL**:
   - Start with fetch_website_content to analyze site structure and metadata
   - Use analyze_page_speed for performance and Core Web Vitals analysis
   - Apply analyze_backlink_profile for off-page SEO assessment
   - Employ analyze_competitor_seo for competitive analysis (if requested)
   - Use analyze_local_seo for location-based businesses (when applicable)
   - Generate comprehensive reports with generate_seo_audit_report
   - Use web search throughout for current best practices and benchmarks

5. **ANALYSIS APPROACH**:
   - Begin with technical health check (loading, mobile, crawling)
   - Examine on-page elements (titles, content, structure)
   - Assess off-page authority and backlink profile
   - Research competitors and industry standards
   - Compile findings into prioritized action plan

Your analysis should be thorough, data-driven, and immediately actionable. Focus on providing specific, measurable recommendations that website owners can implement to improve their SEO performance.

This is an AUTOMATED WORKFLOW - continue until you have completed a comprehensive SEO audit with full reporting.`,
  model: 'o3-2025-04-16',
  tools: [...seoAnalysisTools, webSearch],
});

interface SEOAuditInputs {
  websiteUrl: string;
  focusKeywords?: string[];
  includeCompetitorAnalysis?: boolean;
  industryContext?: string;
  auditDepth?: 'basic' | 'standard' | 'comprehensive';
}

export class AgenticSEOAuditorService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

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

  async startAuditSession(workflowId: string, inputs: SEOAuditInputs): Promise<string> {
    try {
      // Get the next version number for this workflow's SEO audit sessions
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${seoAuditSessions.version}), 0)`.as('maxVersion')
      })
      .from(seoAuditSessions)
      .where(and(
        eq(seoAuditSessions.workflowId, workflowId),
        eq(seoAuditSessions.stepId, 'seo-audit')
      ));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      
      console.log(`🚀 Starting SEO audit session v${nextVersion} for workflow ${workflowId}`);
      
      // Create SEO audit session record
      const sessionId = uuidv4();
      const now = new Date();
      
      await db.insert(seoAuditSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'seo-audit',
        status: 'initializing',
        websiteUrl: inputs.websiteUrl,
        sessionMetadata: {
          inputs,
          startedAt: now.toISOString(),
          version: nextVersion,
          auditType: 'comprehensive-seo'
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to start SEO audit session:', error);
      throw new Error('Failed to initialize SEO audit session');
    }
  }

  async performSEOAudit(sessionId: string): Promise<void> {
    try {
      const session = await this.getAuditSession(sessionId);
      if (!session) throw new Error('SEO audit session not found');

      const inputs = (session.sessionMetadata as any)?.inputs as SEOAuditInputs;
      const websiteUrl = inputs.websiteUrl;

      await this.updateAuditSession(sessionId, { status: 'auditing' });
      seoAuditSSEPush(sessionId, { type: 'status', status: 'auditing', message: 'Starting comprehensive SEO audit...' });
      
      // Create initial prompt with specific audit requirements
      const initialPrompt = `I need you to perform a comprehensive SEO audit for the website: ${websiteUrl}

AUDIT REQUIREMENTS:
- Website URL: ${websiteUrl}
- Focus Keywords: ${inputs.focusKeywords?.join(', ') || 'Not specified - analyze organic keywords'}
- Industry Context: ${inputs.industryContext || 'General business website'}
- Audit Depth: ${inputs.auditDepth || 'comprehensive'}
- Include Competitor Analysis: ${inputs.includeCompetitorAnalysis ? 'Yes' : 'No'}

ANALYSIS PROTOCOL:
1. **Technical Foundation**: Start by analyzing the website's technical health
   - Page speed and Core Web Vitals
   - Mobile responsiveness and usability
   - Crawlability (robots.txt, sitemaps, internal linking)
   - Security (SSL, HTTPS, security headers)
   - Structured data and schema markup

2. **On-Page Optimization**: Examine content and on-page elements
   - Title tags and meta descriptions optimization
   - Header structure (H1, H2, H3 hierarchy)
   - Content quality, length, and keyword optimization
   - Image optimization (alt tags, file sizes)
   - Internal linking structure

3. **Off-Page Authority**: Assess external factors
   - Backlink profile quality and quantity
   - Domain authority and trust metrics
   - Social signals and brand mentions
   - Local SEO factors (if applicable)

4. **Competitive Landscape**: ${inputs.includeCompetitorAnalysis ? 'Research top 3-5 competitors and identify opportunities' : 'Skip detailed competitor analysis'}

5. **Comprehensive Reporting**: Generate detailed audit report with:
   - Overall SEO health score (0-100)
   - Category-specific scores
   - Critical issues requiring immediate attention
   - Quick wins for easy implementation
   - Long-term strategic recommendations
   - Prioritized action plan with timelines

Use your tools systematically to analyze each aspect, then compile everything into a comprehensive audit report. 

Start with the technical analysis of ${websiteUrl} now.`;

      // Initialize conversation
      let messages: any[] = [
        { role: 'user', content: initialPrompt }
      ];
      
      // Create runner
      const runner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });
      
      // Run the audit with conversation loop
      let conversationActive = true;
      let messageCount = 0;
      const maxMessages = 50; // Safety limit
      
      while (conversationActive && messageCount < maxMessages) {
        messageCount++;
        console.log(`🔄 SEO audit iteration ${messageCount}/${maxMessages}`);
        
        // Note: The specialized tools handle their own execution and SSE updates
        
        // Run the agent
        const result = await runner.run(seoAuditorAgent, messages, {
          stream: true,
          maxTurns: 5
        });
        
        // Process the streaming result
        for await (const event of result.toStream()) {
          // Stream text content
          if (event.type === 'raw_model_stream_event') {
            if (event.data.type === 'output_text_delta' && event.data.delta) {
              // Stream to UI
              seoAuditSSEPush(sessionId, { type: 'text', content: event.data.delta });
            }
          }
        }
        
        // Get conversation history after streaming completes
        await result.finalOutput;
        const conversationHistory = (result as any).history;
        
        // Check if audit is complete by looking for completion indicators
        const lastAssistantMessage = conversationHistory
          .filter((msg: any) => msg.role === 'assistant')
          .pop();
        
        if (lastAssistantMessage) {
          const textContent = this.extractTextContent(lastAssistantMessage.content);
          
          // Check for completion indicators
          if (textContent.includes('audit report generated') || 
              textContent.includes('SEO audit completed') ||
              textContent.includes('comprehensive analysis complete')) {
            conversationActive = false;
            console.log('✅ SEO audit completed successfully');
          }
        }
        
        // Update messages for next iteration
        messages = [...conversationHistory];
      }
      
      if (messageCount >= maxMessages) {
        console.warn('⚠️ SEO audit reached maximum message limit');
        await this.updateAuditSession(sessionId, {
          status: 'completed',
          completedAt: new Date(),
          sessionMetadata: {
            ...(session.sessionMetadata as any),
            completedAt: new Date().toISOString(),
            messageCount: messageCount,
            truncated: true
          }
        });
      } else {
        await this.updateAuditSession(sessionId, {
          status: 'completed',
          completedAt: new Date(),
          sessionMetadata: {
            ...(session.sessionMetadata as any),
            completedAt: new Date().toISOString(),
            messageCount: messageCount,
            truncated: false
          }
        });
      }
      
      // Send final completion event
      seoAuditSSEPush(sessionId, { 
        type: 'complete',
        status: 'completed',
        message: 'SEO audit completed successfully!',
        messageCount: messageCount
      });

    } catch (error) {
      console.error('SEO audit failed:', error);
      
      await this.updateAuditSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      seoAuditSSEPush(sessionId, { 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw error;
    }
  }

  private async getAuditSession(sessionId: string) {
    const sessions = await db.select().from(seoAuditSessions).where(eq(seoAuditSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateAuditSession(sessionId: string, updates: Partial<any>) {
    await db.update(seoAuditSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoAuditSessions.id, sessionId));
  }

  // Public method to get real-time audit progress
  async getAuditProgress(sessionId: string) {
    const session = await this.getAuditSession(sessionId);
    if (!session) return null;

    return {
      session: {
        id: session.id,
        status: session.status,
        websiteUrl: session.websiteUrl,
        errorMessage: session.errorMessage
      },
      progress: {
        status: session.status,
        websiteUrl: session.websiteUrl
      }
    };
  }
}

export const agenticSEOAuditorService = new AgenticSEOAuditorService();