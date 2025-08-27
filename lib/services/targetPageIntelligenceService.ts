import OpenAI from 'openai';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';

/**
 * Target Page Intelligence Service
 * Handles AI-powered research and brief generation for specific target pages
 */
export class TargetPageIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Phase 1: Conduct deep research on a specific target page
   * Simulates a 15-20 minute deep research process
   */
  async conductResearch(
    targetPageId: string,
    targetPageUrl: string,
    sessionId: string
  ): Promise<void> {
    console.log('🚀 Starting target page intelligence research for page:', targetPageId);
    console.log('Target URL:', targetPageUrl);
    console.log('Session ID:', sessionId);
    
    try {
      // Check if there's already an in_progress research that might have completed
      const existing = await db.select()
        .from(targetPageIntelligence)
        .where(eq(targetPageIntelligence.targetPageId, targetPageId))
        .limit(1);

      if (existing.length > 0 && existing[0].researchSessionId && existing[0].researchStatus === 'in_progress') {
        console.log('🔄 Found existing in_progress research, checking if completed...');
        try {
          const existingResponse = await this.openai.responses.retrieve(existing[0].researchSessionId);
          if (existingResponse.status === 'completed') {
            console.log('✅ Found completed abandoned research, processing...');
            await this.processCompletedResearch(targetPageId, existing[0].researchSessionId, existingResponse);
            return;
          } else if (existingResponse.status === 'failed' || existingResponse.status === 'cancelled') {
            console.log('❌ Found failed abandoned research, marking as error...');
            await db.update(targetPageIntelligence)
              .set({ 
                researchStatus: 'error',
                researchCompletedAt: new Date()
              })
              .where(eq(targetPageIntelligence.targetPageId, targetPageId));
          }
        } catch (abandonedError) {
          console.log('⚠️ Could not check abandoned research status, proceeding with new research');
        }
      }

      // Update status to in_progress
      await db.update(targetPageIntelligence)
        .set({ 
          researchStatus: 'in_progress',
          researchStartedAt: new Date(),
          researchSessionId: sessionId
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));

      // Conduct the research using o3-deep-research
      const researchPrompt = `
You're a researcher tasked with researching everything about this specific product/service. You're empowered to look at the target page and related pages on the same site to understand the specific offering comprehensively.

The purpose of your task is to build a comprehensive overview of this specific product/service so that as we write content, we'll have full knowledge about this particular offering that we can then feed our writing agent.

You have two tasks:
1. Create the analysis and document it
2. Find the gaps in your analysis - things that should be available about this product/service that you weren't able to find

I want you to have your output be both your analysis and then also the questions that you have.

Target URL: ${targetPageUrl}

Please provide:
1. A comprehensive analysis of the specific product/service (2000+ words)
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

      // Use o4-mini-deep-research model with responses API
      const response = await this.openai.responses.create({
        model: 'o4-mini-deep-research',
        input: researchPrompt,
        background: true, // Run in background like outline service
        store: true,
        tools: [
          { type: 'web_search_preview' } // Required for o3-deep-research model
        ]
      });
      
      console.log(`🚀 Background response created with ID: ${response.id}, status: ${response.status}`);

      // Store the response ID for polling
      await db.update(targetPageIntelligence)
        .set({ 
          researchStatus: 'in_progress',
          researchSessionId: response.id // Store response ID as session ID for polling
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));

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
        tokensUsed: 0, // o4-mini-deep-research doesn't provide token usage
        modelUsed: 'o4-mini-deep-research',
        completionReason: 'completed'
      };

      // Update database with research results
      await db.update(targetPageIntelligence)
        .set({
          researchStatus: 'completed',
          researchCompletedAt: new Date(),
          researchOutput: {
            ...researchResult,
            metadata
          }
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));

    } catch (error) {
      console.error('Research failed:', error);
      
      // Update status to error
      await db.update(targetPageIntelligence)
        .set({
          researchStatus: 'error',
          researchCompletedAt: new Date()
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));
      
      throw error;
    }
  }

  /**
   * Process completed research from abandoned session
   */
  private async processCompletedResearch(targetPageId: string, responseId: string, response: any): Promise<void> {
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
        modelUsed: 'o4-mini-deep-research',
        completionReason: 'recovered_abandoned'
      };

      // Update database with recovered research results
      await db.update(targetPageIntelligence)
        .set({
          researchStatus: 'completed',
          researchCompletedAt: new Date(),
          researchOutput: {
            ...researchResult,
            metadata
          }
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));

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
    targetPageId: string,
    sessionId: string
  ): Promise<void> {
    try {
      // Get existing research and client input
      const [existing] = await db.select()
        .from(targetPageIntelligence)
        .where(eq(targetPageIntelligence.targetPageId, targetPageId))
        .limit(1);

      if (!existing || !existing.researchOutput || !existing.clientInput) {
        throw new Error('Missing research output or client input');
      }

      // Update status to in_progress
      await db.update(targetPageIntelligence)
        .set({
          briefStatus: 'in_progress',
          briefSessionId: sessionId
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));

      // Extract metadata
      const metadata = existing.metadata as any || {};
      console.log('📋 Preparing brief with metadata:', {
        hasEditedResearch: !!metadata.editedResearch,
        hasClientAnswers: !!metadata.clientAnswers,
        hasAdditionalInfo: !!metadata.additionalInfo,
        answersCount: metadata.clientAnswers ? Object.keys(metadata.clientAnswers).length : 0,
        usingEditedResearch: !!metadata.editedResearch
      });

      // Use edited research if available, otherwise use original
      const researchToUse = metadata.editedResearch || 
        (existing.researchOutput ? JSON.stringify(existing.researchOutput, null, 2) : '');
      
      // Build clean client input without redundant research
      let cleanClientInput = '';
      
      // Add individual question answers if available
      if (metadata.clientAnswers && existing.researchOutput) {
        const researchOutput = existing.researchOutput as any;
        if (researchOutput.gaps && Array.isArray(researchOutput.gaps)) {
          cleanClientInput += `ANSWERS TO SPECIFIC QUESTIONS:\n\n`;
          researchOutput.gaps.forEach((gap: any, index: number) => {
            const answer = metadata.clientAnswers[index.toString()] || metadata.clientAnswers[index] || 'No answer provided';
            cleanClientInput += `Q${index + 1} [${gap.importance?.toUpperCase() || 'MEDIUM'}]: ${gap.question}\n`;
            cleanClientInput += `A: ${answer}\n\n`;
          });
        }
      }
      
      // Add additional business information if available
      if (metadata.additionalInfo) {
        cleanClientInput += `ADDITIONAL BUSINESS INFORMATION:\n${metadata.additionalInfo}\n\n`;
      }
      
      // Fall back to original client input if no structured data
      if (!cleanClientInput && !metadata.clientAnswers) {
        cleanClientInput = existing.clientInput || '';
      }

      const briefPrompt = `
You are tasked with creating a comprehensive brand brief based on deep research and client input.

RESEARCH ANALYSIS:
${researchToUse}

CLIENT INPUT:
${cleanClientInput}

Your task is to synthesize this information into a concise brief about this company that can be used to feed our content creation process. The brief should include:

1. Business Overview (what they do, how they make money)
2. Key Products/Services and Pricing
3. Target Audience and Market Position
4. Unique Value Propositions
5. Notable Achievements or Case Studies
6. Brand Voice and Messaging Guidelines

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
        // o3 model only supports temperature=1 (default)
        max_completion_tokens: 20000  // Set to 20000 tokens for comprehensive brief
      });

      const finalBrief = completion.choices[0].message.content || '';

      // Update database with final brief
      await db.update(targetPageIntelligence)
        .set({
          briefStatus: 'completed',
          briefGeneratedAt: new Date(),
          finalBrief
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));

    } catch (error) {
      console.error('Brief generation failed:', error);
      
      // Update status to error
      await db.update(targetPageIntelligence)
        .set({
          briefStatus: 'error',
          briefGeneratedAt: new Date()
        })
        .where(eq(targetPageIntelligence.targetPageId, targetPageId));
      
      throw error;
    }
  }

  /**
   * Simulate long-running research for demo purposes
   * In production, this would be replaced with actual deep research
   */
  async simulateResearch(
    targetPageId: string,
    clientWebsite: string,
    sessionId: string
  ): Promise<void> {
    // For demo: Create a shorter research process
    await this.conductResearch(targetPageId, clientWebsite, sessionId);
  }
}

// Export singleton instance
export const targetPageIntelligenceService = new TargetPageIntelligenceService();