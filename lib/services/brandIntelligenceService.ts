import OpenAI from 'openai';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence } from '@/lib/db/clientBrandIntelligenceSchema';
import { eq } from 'drizzle-orm';

/**
 * Brand Intelligence Service
 * Handles AI-powered brand research and brief generation for clients
 */
export class BrandIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Phase 1: Conduct deep research on a client's business
   * Simulates a 15-20 minute deep research process
   */
  async conductResearch(
    clientId: string,
    clientWebsite: string,
    sessionId: string
  ): Promise<void> {
    console.log('🚀 Starting brand intelligence research for client:', clientId);
    console.log('Website:', clientWebsite);
    console.log('Session ID:', sessionId);
    
    try {
      // Check if there's already an in_progress research that might have completed
      const existing = await db.select()
        .from(clientBrandIntelligence)
        .where(eq(clientBrandIntelligence.clientId, clientId))
        .limit(1);

      if (existing.length > 0 && existing[0].researchSessionId && existing[0].researchStatus === 'in_progress') {
        console.log('🔄 Found existing in_progress research, checking if completed...');
        try {
          const existingResponse = await this.openai.responses.retrieve(existing[0].researchSessionId);
          if (existingResponse.status === 'completed') {
            console.log('✅ Found completed abandoned research, processing...');
            await this.processCompletedResearch(clientId, existing[0].researchSessionId, existingResponse);
            return;
          } else if (existingResponse.status === 'failed' || existingResponse.status === 'cancelled') {
            console.log('❌ Found failed abandoned research, marking as error...');
            await db.update(clientBrandIntelligence)
              .set({ 
                researchStatus: 'error',
                researchCompletedAt: new Date()
              })
              .where(eq(clientBrandIntelligence.clientId, clientId));
          }
        } catch (abandonedError) {
          console.log('⚠️ Could not check abandoned research status, proceeding with new research');
        }
      }

      // Update status to in_progress
      await db.update(clientBrandIntelligence)
        .set({ 
          researchStatus: 'in_progress',
          researchStartedAt: new Date(),
          researchSessionId: sessionId
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));

      // Conduct the research using o3-deep-research
      const researchPrompt = `
You're a researcher tasked with researching everything about this business. You're empowered to look at the company website. You're empowered to look at their commercial pages to understand what they do. You're empowered to look at their pricing and understand what the pricing is. You're empowered to look at their about page and contact page to understand more about them. You're empowered to search the web, looking at third-party sites, talking about this business to get a sense of what is going on there.

The purpose of your task is to build a comprehensive overview of this business as it relates to its internet presence and what it does so that as we write listicles, we'll have a full breadth of knowledge about this company that we can then feed our writing agent so it knows what to write about.

You have two tasks:
1. Create the analysis and document it
2. Find the gaps in your analysis - things that should be news or information that's available about this type of company that you weren't able to find

I want you to have your output be both your analysis and then also the questions that you have.

Website: ${clientWebsite}

Please provide:
1. A comprehensive analysis of the business (2000+ words)
2. A list of gaps/questions categorized by importance (high/medium/low)

Format your response as JSON with the following structure:
{
  "analysis": "Your comprehensive analysis here...",
  "gaps": [
    {
      "category": "Business Model",
      "question": "What is the exact pricing structure for enterprise clients?",
      "importance": "high"
    }
  ],
  "sources": [
    {
      "type": "url",
      "value": "website URL or source",
      "description": "What information was gathered"
    }
  ]
}`;

      // Use o3-deep-research model with responses API (matching outline service EXACTLY)
      const response = await this.openai.responses.create({
        model: 'o3-deep-research',
        input: researchPrompt,
        background: true, // Run in background like outline service
        store: true,
        tools: [
          { type: 'web_search_preview' } // Required for o3-deep-research model
        ]
      });
      
      console.log(`🚀 Background response created with ID: ${response.id}, status: ${response.status}`);

      // Store the response ID for polling
      await db.update(clientBrandIntelligence)
        .set({ 
          researchStatus: 'in_progress',
          researchSessionId: response.id // Store response ID as session ID for polling
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));

      // Poll for completion (like outline service does)
      let attempts = 0;
      const maxAttempts = 60; // 30 minutes with 30 second intervals
      let finalResponse;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        attempts++;
        
        console.log(`📊 Polling attempt ${attempts}/${maxAttempts} for response ${response.id}`);
        
        finalResponse = await this.openai.responses.retrieve(response.id);
        console.log(`📊 Response status: ${finalResponse.status}`);
        
        if (finalResponse.status === 'completed') {
          break;
        } else if (finalResponse.status === 'failed' || finalResponse.status === 'cancelled') {
          throw new Error(`Research failed with status: ${finalResponse.status}`);
        }
      }
      
      if (!finalResponse || finalResponse.status !== 'completed') {
        throw new Error('Research timed out after 30 minutes');
      }

      // Parse the response output using the same pattern as outline service
      const output = finalResponse.output;
      console.log('🔍 Parsing o3-deep-research response...');
      
      let researchResult;
      
      // Use the same parsing logic as agenticOutlineServiceV2 (with type safety workarounds)
      const outputAny = output as any;
      
      if (typeof outputAny === 'string') {
        try {
          researchResult = JSON.parse(outputAny as string);
        } catch {
          // If not JSON, create structured response
          researchResult = {
            analysis: outputAny,
            gaps: [],
            sources: []
          };
        }
      } else if (Array.isArray(outputAny)) {
        // Handle array format like outline service does
        const assistantMsg = outputAny.find((msg: any) => msg.role === 'assistant');
        
        if (assistantMsg && Array.isArray((assistantMsg as any).content)) {
          const textItems = (assistantMsg as any).content
            .filter((item: any) => 
              typeof item === 'string' || 
              ((item as any).type !== 'reasoning' && (item as any).type !== 'web_search_call')
            )
            .map((item: any) => {
              if (typeof item === 'string') return item;
              return (item as any).text || (item as any).output_text || '';
            })
            .filter((text: string) => text.length > 0);
          
          if (textItems.length > 0) {
            const finalText = textItems[textItems.length - 1];
            try {
              researchResult = JSON.parse(finalText);
            } catch {
              researchResult = {
                analysis: finalText,
                gaps: [],
                sources: []
              };
            }
          }
        }
      } else if (outputAny && typeof outputAny === 'object') {
        researchResult = outputAny.text || 
                        outputAny.content || 
                        outputAny.output_text ||
                        outputAny;
      } else {
        researchResult = {
          analysis: JSON.stringify(outputAny),
          gaps: [],
          sources: []
        };
      }
      
      // Calculate metadata
      const metadata = {
        researchDuration: attempts * 30, // seconds
        tokensUsed: 0, // o3-deep-research doesn't provide token usage
        modelUsed: 'o3-deep-research',
        completionReason: 'completed'
      };

      // Update database with research results
      await db.update(clientBrandIntelligence)
        .set({
          researchStatus: 'completed',
          researchCompletedAt: new Date(),
          researchOutput: {
            ...researchResult,
            metadata
          }
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));

    } catch (error) {
      console.error('Research failed:', error);
      
      // Update status to error
      await db.update(clientBrandIntelligence)
        .set({
          researchStatus: 'error',
          researchCompletedAt: new Date()
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));
      
      throw error;
    }
  }

  /**
   * Process completed research from abandoned session
   */
  private async processCompletedResearch(clientId: string, responseId: string, response: any): Promise<void> {
    try {
      // Parse the response output - simplified approach to avoid complex type issues
      const output = response.output;
      console.log('🔍 Parsing abandoned research response...');
      
      let researchResult;
      
      // Simple type-agnostic parsing
      if (typeof output === 'string') {
        try {
          researchResult = JSON.parse(output);
        } catch {
          researchResult = {
            analysis: output,
            gaps: [],
            sources: []
          };
        }
      } else {
        // For any non-string output, try to extract text content
        const outputStr = JSON.stringify(output);
        researchResult = {
          analysis: outputStr,
          gaps: [],
          sources: []
        };
      }
      
      // Calculate metadata
      const metadata = {
        researchDuration: 0, // Unknown for abandoned sessions
        tokensUsed: 0,
        modelUsed: 'o3-deep-research',
        completionReason: 'recovered_abandoned'
      };

      // Update database with recovered research results
      await db.update(clientBrandIntelligence)
        .set({
          researchStatus: 'completed',
          researchCompletedAt: new Date(),
          researchOutput: {
            ...researchResult,
            metadata
          }
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));

      console.log('✅ Successfully recovered abandoned research');
    } catch (error) {
      console.error('❌ Error processing abandoned research:', error);
      throw error;
    }
  }

  /**
   * Phase 2: Generate comprehensive brand brief
   * Takes research output and client input to create final brief
   */
  async generateBrief(
    clientId: string,
    sessionId: string
  ): Promise<void> {
    try {
      // Get existing research and client input
      const [existing] = await db.select()
        .from(clientBrandIntelligence)
        .where(eq(clientBrandIntelligence.clientId, clientId))
        .limit(1);

      if (!existing || !existing.researchOutput || !existing.clientInput) {
        throw new Error('Missing research output or client input');
      }

      // Update status to in_progress
      await db.update(clientBrandIntelligence)
        .set({
          briefStatus: 'in_progress',
          briefSessionId: sessionId
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));

      const briefPrompt = `
You are tasked with creating a comprehensive brand brief based on deep research and client input.

DEEP RESEARCH FINDINGS:
${JSON.stringify(existing.researchOutput, null, 2)}

CLIENT INPUT:
${existing.clientInput}

Your task is to synthesize this information into a concise brief about this company that can be used to feed our content creation process. The brief should include:

1. Business Overview (what they do, how they make money)
2. Key Products/Services and Pricing
3. Target Audience and Market Position
4. Unique Value Propositions
5. Notable Achievements or Case Studies
6. Brand Voice and Messaging Guidelines
7. Content Opportunities and Angles

Create a concise, well-structured brief that is approximately 1000 words. Focus on the most important information that content writers need. Use markdown formatting with clear headers and bullet points for easy scanning. Be specific and actionable.`;

      const completion = await this.openai.chat.completions.create({
        model: 'o3-2025-04-16',
        messages: [
          {
            role: 'system',
            content: 'You are a brand strategist creating concise, actionable briefs for content teams. Be direct and focus on essential information.'
          },
          {
            role: 'user',
            content: briefPrompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 1500
      });

      const finalBrief = completion.choices[0].message.content || '';

      // Update database with final brief
      await db.update(clientBrandIntelligence)
        .set({
          briefStatus: 'completed',
          briefGeneratedAt: new Date(),
          finalBrief
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));

    } catch (error) {
      console.error('Brief generation failed:', error);
      
      // Update status to error
      await db.update(clientBrandIntelligence)
        .set({
          briefStatus: 'error',
          briefGeneratedAt: new Date()
        })
        .where(eq(clientBrandIntelligence.clientId, clientId));
      
      throw error;
    }
  }

  /**
   * Simulate long-running research for demo purposes
   * In production, this would be replaced with actual deep research
   */
  async simulateResearch(
    clientId: string,
    clientWebsite: string,
    sessionId: string
  ): Promise<void> {
    // For demo: Create a shorter research process
    await this.conductResearch(clientId, clientWebsite, sessionId);
  }
}

// Export singleton instance
export const brandIntelligenceService = new BrandIntelligenceService();