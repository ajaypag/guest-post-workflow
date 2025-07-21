import { db } from '@/lib/db/connection';
import { workflows, v2AgentSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Helper function to sanitize strings for PostgreSQL
function sanitizeForPostgres(str: string): string {
  if (!str) return str;
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// Import the SSE update function from the real service
// This ensures we're using the same SSE infrastructure
const activeStreams = new Map<string, any>();

export function addSSEConnection(sessionId: string, res: any) {
  activeStreams.set(sessionId, res);
}

export function removeSSEConnection(sessionId: string) {
  activeStreams.delete(sessionId);
}

function sseUpdate(sessionId: string, payload: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('Mock SSE push failed:', error);
    activeStreams.delete(sessionId);
  }
}

export class AgenticArticleV2MockService {
  async performMockGeneration(sessionId: string, workflowId: string, outline: string): Promise<void> {
    try {
      console.log('🧪 Starting MOCK article generation for session:', sessionId);
      
      // Get session
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      // Update status to orchestrating
      await this.updateSession(sessionId, { status: 'orchestrating' });
      sseUpdate(sessionId, { 
        type: 'status', 
        status: 'orchestrating', 
        message: '[MOCK] Starting article orchestration...' 
      });

      // Simulate orchestration delay
      await this.delay(2000);

      // Parse outline to count sections
      const sectionCount = this.countSectionsInOutline(outline);
      console.log(`📋 MOCK: Detected ${sectionCount} sections in outline`);

      // Update to writing status
      await this.updateSession(sessionId, { 
        status: 'writing',
        totalSections: sectionCount 
      });
      
      sseUpdate(sessionId, { 
        type: 'phase_update',
        phase: 'writing',
        message: `[MOCK] Orchestrator created outline with ${sectionCount} sections`
      });

      // Generate mock article content
      let fullArticle = '';
      const sections: string[] = [];
      
      // Add title and introduction
      fullArticle += '# Mock Article: Understanding the Future of Technology\n\n';
      fullArticle += 'This is a mock introduction paragraph that demonstrates how the article generation works. ';
      fullArticle += 'In this comprehensive guide, we\'ll explore various aspects of modern technology and its impact on society.\n\n';

      // Generate sections
      for (let i = 1; i <= sectionCount; i++) {
        await this.delay(1500); // Simulate writing time

        const sectionContent = this.generateMockSection(i);
        sections.push(sectionContent);
        fullArticle += sectionContent + '\n\n';

        // Update progress
        await this.updateSession(sessionId, { 
          completedSections: i,
          currentWordCount: fullArticle.split(/\s+/).length 
        });

        sseUpdate(sessionId, {
          type: 'section_completed',
          sectionNumber: i,
          content: sectionContent,
          totalSections: sectionCount,
          completedSections: i
        });

        sseUpdate(sessionId, {
          type: 'progress_update',
          progress: {
            status: 'writing',
            currentSection: `Section ${i}`,
            totalSections: sectionCount,
            completedSections: i,
            currentWordCount: fullArticle.split(/\s+/).length
          }
        });
      }

      // Add conclusion
      fullArticle += '## Conclusion\n\n';
      fullArticle += 'In this mock article, we\'ve explored various aspects of our topic. ';
      fullArticle += 'This demonstrates how the V2 article generation system works, creating content section by section ';
      fullArticle += 'using an orchestrated approach.\n';

      const finalWordCount = fullArticle.split(/\s+/).length;
      console.log(`✅ MOCK generation complete: ${finalWordCount} words, ${sectionCount} sections`);

      // Save to workflow
      await this.saveArticleToWorkflow(workflowId, fullArticle);

      // Update session as completed
      await this.updateSession(sessionId, {
        status: 'completed',
        finalArticle: sanitizeForPostgres(fullArticle),
        totalWordCount: finalWordCount,
        completedAt: new Date(),
        sessionMetadata: {
          ...(session.sessionMetadata as any),
          completedAt: new Date().toISOString(),
          mockData: true,
          totalSectionsWritten: sectionCount
        }
      });

      // Send completion event
      sseUpdate(sessionId, {
        type: 'complete',
        status: 'completed',
        finalArticle: fullArticle,
        wordCount: finalWordCount,
        message: '[MOCK] Article generation completed successfully!'
      });

      // Simulate the completion error bug if configured
      const simulateCompletionError = true; // Toggle this to test error scenarios
      if (simulateCompletionError) {
        await this.delay(100);
        sseUpdate(sessionId, {
          type: 'error',
          error: '[MOCK] Simulated completion error - article was saved successfully'
        });
      }

    } catch (error: any) {
      console.error('❌ Mock generation failed:', error);
      
      await this.updateSession(sessionId, {
        status: 'failed',
        errorMessage: error.message
      });
      
      sseUpdate(sessionId, { 
        type: 'error', 
        error: `[MOCK] ${error.message}` 
      });
      
      throw error;
    }
  }

  private generateMockSection(sectionNumber: number): string {
    const headings = [
      'The Evolution of Digital Innovation',
      'Key Technologies Shaping Our World',
      'Understanding Machine Learning Fundamentals',
      'The Impact on Business Operations',
      'Future Trends and Predictions',
      'Best Practices for Implementation',
      'Common Challenges and Solutions',
      'Case Studies and Real-World Examples'
    ];

    const heading = headings[sectionNumber - 1] || `Section ${sectionNumber}: Important Considerations`;
    
    let content = `## ${heading}\n\n`;
    content += `This is mock content for section ${sectionNumber}. In a real article, this would contain detailed information about ${heading.toLowerCase()}. `;
    content += `The content would be well-researched and include relevant examples, statistics, and insights.\n\n`;
    content += `Here we might discuss various aspects, provide analysis, and offer actionable recommendations. `;
    content += `The writing style would be engaging and informative, maintaining a professional yet approachable tone throughout.\n\n`;
    content += `Additional paragraphs would expand on key points, ensuring comprehensive coverage of the topic while keeping readers engaged.`;
    
    return content;
  }

  private countSectionsInOutline(outline: string): number {
    // Count H2 headers in the outline
    const h2Matches = outline.match(/^##\s+/gm);
    return h2Matches ? h2Matches.length : 5; // Default to 5 sections if no H2s found
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getSession(sessionId: string) {
    const sessions = await db.select().from(v2AgentSessions).where(eq(v2AgentSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateSession(sessionId: string, updates: Partial<any>) {
    await db.update(v2AgentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(v2AgentSessions.id, sessionId));
  }

  private async saveArticleToWorkflow(workflowId: string, article: string): Promise<void> {
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const draftStep = workflowData.steps?.find((step: any) => step.id === 'article-draft');
      
      if (draftStep) {
        draftStep.outputs = {
          ...draftStep.outputs,
          fullArticle: article,
          agentGenerated: true,
          agentVersion: 'v2-mock',
          draftStatus: 'completed',
          generatedAt: new Date().toISOString()
        };

        await db.update(workflows)
          .set({
            content: workflowData,
            updatedAt: new Date()
          })
          .where(eq(workflows.id, workflowId));
          
        console.log('💾 MOCK article saved to workflow');
      }
    }
  }
}

export const agenticArticleV2MockService = new AgenticArticleV2MockService();