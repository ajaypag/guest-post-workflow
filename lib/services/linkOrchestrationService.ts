import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { db } from '@/lib/db/connection';
import { linkOrchestrationSessions } from '@/lib/db/schema';
import { 
  internalLinksAgent,
  clientMentionAgent,
  clientLinkAgent,
  CLIENT_LINK_FOLLOWUPS,
  imagesAgent,
  linkRequestsAgent,
  urlSuggestionAgent
} from '@/lib/agents/linkOrchestrationAgents';
import {
  insertInternalLink,
  insertClientMention,
  insertClientLink,
  generateImage,
  outputImageStrategy,
  outputLinkRequests,
  suggestUrl
} from '@/lib/agents/linkOrchestrationTools';
import { mergeTextModifications } from '@/lib/utils/textModificationMerger';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Lazy OpenAI provider initialization to avoid build-time errors
let openaiProvider: OpenAIProvider | null = null;

function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProvider) {
    openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }
  return openaiProvider;
}

// Singleton Runner instance as per CTO guidance
let runner: Runner | null = null;

function getRunner(): Runner {
  if (!runner) {
    runner = new Runner({
      modelProvider: getOpenAIProvider(),
      tracingDisabled: true
    });
  }
  return runner;
}

export interface LinkOrchestrationInput {
  workflowId: string;
  article: string;
  targetDomain: string;
  clientName: string;
  clientUrl: string;
  anchorText?: string;
  guestPostSite: string;
  targetKeyword: string;
  onProgress?: (phase: number, message: string) => void;
}

export interface LinkOrchestrationResult {
  sessionId: string;
  finalArticle: string;
  modifications: {
    internalLinks: any[];
    clientMentions: any[];
    clientLink: any;
  };
  imageStrategy: any;
  linkRequests: string;
  urlSuggestion: string;
  success: boolean;
  error?: string;
}

export class LinkOrchestrationService {
  private runner: Runner | null = null;

  constructor() {
    // Lazy initialization to avoid build-time errors
  }

  private getRunnerInstance(): Runner {
    if (!this.runner) {
      this.runner = getRunner();
    }
    return this.runner;
  }

  async orchestrate(input: LinkOrchestrationInput): Promise<LinkOrchestrationResult> {
    const sessionId = uuidv4();
    const startTime = new Date();

    try {
      // Create session in database
      await db.insert(linkOrchestrationSessions).values({
        id: sessionId,
        workflowId: input.workflowId,
        status: 'initializing',
        originalArticle: input.article,
        targetDomain: input.targetDomain,
        clientName: input.clientName,
        clientUrl: input.clientUrl,
        anchorText: input.anchorText,
        guestPostSite: input.guestPostSite,
        targetKeyword: input.targetKeyword,
        createdAt: startTime,
        updatedAt: startTime,
        startedAt: startTime
      });

      // Phase 1: Internal Links + Client Mentions (Parallel)
      const phase1Result = await this.executePhase1(sessionId, input);
      
      // Phase 2: Client Link (Sequential with conversation)
      const phase2Result = await this.executePhase2(sessionId, input, phase1Result.article);
      
      // Phase 3: Images + Link Requests + URL (Parallel)
      const phase3Result = await this.executePhase3(sessionId, input, phase2Result.article);

      // Update session as completed
      await db.update(linkOrchestrationSessions)
        .set({
          status: 'completed',
          finalArticle: phase2Result.article,
          imageStrategy: phase3Result.imageStrategy,
          linkRequests: phase3Result.linkRequests,
          urlSuggestion: phase3Result.urlSuggestion,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(linkOrchestrationSessions.id, sessionId));

      return {
        sessionId,
        finalArticle: phase2Result.article,
        modifications: {
          internalLinks: phase1Result.internalLinks,
          clientMentions: phase1Result.clientMentions,
          clientLink: phase2Result.clientLink
        },
        imageStrategy: phase3Result.imageStrategy,
        linkRequests: phase3Result.linkRequests,
        urlSuggestion: phase3Result.urlSuggestion,
        success: true
      };

    } catch (error: any) {
      // Update session with error
      await db.update(linkOrchestrationSessions)
        .set({
          status: 'failed',
          errorMessage: error.message,
          updatedAt: new Date()
        })
        .where(eq(linkOrchestrationSessions.id, sessionId));

      return {
        sessionId,
        finalArticle: input.article,
        modifications: {
          internalLinks: [],
          clientMentions: [],
          clientLink: null
        },
        imageStrategy: null,
        linkRequests: '',
        urlSuggestion: '',
        success: false,
        error: error.message
      };
    }
  }

  private async executePhase1(
    sessionId: string, 
    input: LinkOrchestrationInput
  ): Promise<{ article: string; internalLinks: any[]; clientMentions: any[] }> {
    input.onProgress?.(1, 'Starting Phase 1: Internal Links & Client Mentions');

    // Update session status
    await db.update(linkOrchestrationSessions)
      .set({
        status: 'phase1',
        currentPhase: 1,
        phase1Start: new Date(),
        updatedAt: new Date()
      })
      .where(eq(linkOrchestrationSessions.id, sessionId));

    // Context for both agents
    const context = {
      article: input.article,
      targetDomain: input.targetDomain,
      clientName: input.clientName,
      guestPostSite: input.guestPostSite
    };

    // Collect modifications from tool calls
    const internalLinks: any[] = [];
    const clientMentions: any[] = [];

    // Run both agents in parallel using Promise.allSettled for error resilience
    const [internalLinksResult, clientMentionResult] = await Promise.allSettled([
      // Internal links agent
      (async () => {
        const result = await this.getRunnerInstance().run(
          internalLinksAgent,
          [{
            role: 'user',
            content: `Article to enhance with internal links:

${input.article}

Target guest post site: ${input.guestPostSite}
Please find and add 3 relevant internal links from the guest post site.`
          }],
          { context, stream: true }
        );

        // Process streaming result
        for await (const event of result.toStream()) {
          if (event.type === 'run_item_stream_event' && event.name === 'tool_called') {
            const toolCall = event.item as any;
            if (toolCall.name === 'insert_internal_link' && toolCall.args) {
              internalLinks.push(toolCall.args);
            }
          }
        }

        return { internalLinks };
      })(),

      // Client mention agent
      (async () => {
        const result = await this.getRunnerInstance().run(
          clientMentionAgent,
          [{
            role: 'user',
            content: `Article to enhance with client mentions:

${input.article}

Client name: ${input.clientName}
Target domain: ${input.targetDomain}
Please add 2-3 strategic brand mentions following the provided guidelines.`
          }],
          { context, stream: true }
        );

        // Process streaming result
        for await (const event of result.toStream()) {
          if (event.type === 'run_item_stream_event' && event.name === 'tool_called') {
            const toolCall = event.item as any;
            if (toolCall.name === 'insert_client_mention' && toolCall.args) {
              clientMentions.push(toolCall.args);
            }
          }
        }

        return { clientMentions };
      })()
    ]);

    // Merge modifications into article
    const allModifications = [...internalLinks, ...clientMentions];
    const modifiedArticle = mergeTextModifications(input.article, allModifications);

    // Save results
    await db.update(linkOrchestrationSessions)
      .set({
        articleAfterPhase1: modifiedArticle,
        internalLinksResult: { internalLinks },
        clientMentionResult: { clientMentions },
        phase1Complete: new Date(),
        updatedAt: new Date()
      })
      .where(eq(linkOrchestrationSessions.id, sessionId));

    input.onProgress?.(1, 'Phase 1 completed: Internal links and client mentions added');

    return {
      article: modifiedArticle,
      internalLinks,
      clientMentions
    };
  }

  private async executePhase2(
    sessionId: string,
    input: LinkOrchestrationInput,
    articleFromPhase1: string
  ): Promise<{ article: string; clientLink: any }> {
    input.onProgress?.(2, 'Starting Phase 2: Client Link Placement');

    // Update session status
    await db.update(linkOrchestrationSessions)
      .set({
        status: 'phase2',
        currentPhase: 2,
        phase2Start: new Date(),
        updatedAt: new Date()
      })
      .where(eq(linkOrchestrationSessions.id, sessionId));

    let clientLink: any = null;
    let conversationHistory: any[] = [{
      role: 'user',
      content: `Article to add client link to:

${articleFromPhase1}

Client name: ${input.clientName}
Client URL: ${input.clientUrl}
Suggested anchor text: ${input.anchorText || 'Choose natural anchor text'}

Please add ONE strategic client link that feels natural and valuable.`
    }];

    // Initial client link placement
    const initialResult = await this.getRunnerInstance().run(
      clientLinkAgent,
      conversationHistory,
      {
        context: {
          article: articleFromPhase1,
          clientName: input.clientName,
          clientUrl: input.clientUrl
        },
        stream: true
      }
    );

    // Process streaming result to extract client link
    for await (const event of initialResult.toStream()) {
      if (event.type === 'run_item_stream_event' && event.name === 'tool_called') {
        const toolCall = event.item as any;
        if (toolCall.name === 'insert_client_link' && toolCall.args) {
          clientLink = toolCall.args;
        }
      }
      if (event.type === 'run_item_stream_event' && event.name === 'message_output_created') {
        const message = event.item as any;
        conversationHistory.push(message);
      }
    }

    // Three-prompt conversation for refinement
    for (let i = 0; i < 3; i++) {
      const followupPrompt = i === 2 
        ? CLIENT_LINK_FOLLOWUPS.prompt3(input.clientUrl)
        : i === 1 
        ? CLIENT_LINK_FOLLOWUPS.prompt2
        : CLIENT_LINK_FOLLOWUPS.prompt1;

      input.onProgress?.(2, `Refining client link placement (${i + 1}/3)`);

      conversationHistory.push({
        role: 'user',
        content: followupPrompt
      });

      const followupResult = await this.getRunnerInstance().run(
        clientLinkAgent,
        conversationHistory,
        {
          context: {
            article: articleFromPhase1,
            clientName: input.clientName,
            clientUrl: input.clientUrl
          },
          stream: true
        }
      );

      // Process followup result
      for await (const event of followupResult.toStream()) {
        if (event.type === 'run_item_stream_event' && event.name === 'tool_called') {
          const toolCall = event.item as any;
          if (toolCall.name === 'insert_client_link' && toolCall.args) {
            clientLink = toolCall.args;
          }
        }
        if (event.type === 'run_item_stream_event' && event.name === 'message_output_created') {
          const message = event.item as any;
          conversationHistory.push(message);
        }
      }
    }

    // Apply the final client link modification
    const finalArticle = clientLink 
      ? mergeTextModifications(articleFromPhase1, [clientLink])
      : articleFromPhase1;

    // Save results
    await db.update(linkOrchestrationSessions)
      .set({
        articleAfterPhase2: finalArticle,
        clientLinkResult: { clientLink },
        clientLinkConversation: conversationHistory,
        phase2Complete: new Date(),
        updatedAt: new Date()
      })
      .where(eq(linkOrchestrationSessions.id, sessionId));

    input.onProgress?.(2, 'Phase 2 completed: Client link optimized and placed');

    return {
      article: finalArticle,
      clientLink
    };
  }

  private async executePhase3(
    sessionId: string,
    input: LinkOrchestrationInput,
    finalArticle: string
  ): Promise<{ imageStrategy: any; linkRequests: string; urlSuggestion: string }> {
    input.onProgress?.(3, 'Starting Phase 3: Images, Link Requests & URL Suggestion');

    // Update session status
    await db.update(linkOrchestrationSessions)
      .set({
        status: 'phase3',
        currentPhase: 3,
        phase3Start: new Date(),
        updatedAt: new Date()
      })
      .where(eq(linkOrchestrationSessions.id, sessionId));

    // Helper function to extract agent outputs from streaming results
    const extractAgentOutput = async (agent: any, messages: any[], context: any) => {
      const result = await this.getRunnerInstance().run(agent, messages, { context, stream: true });
      let output: any = {};
      
      for await (const event of result.toStream()) {
        if (event.type === 'run_item_stream_event' && event.name === 'tool_called') {
          const toolCall = event.item as any;
          // Collect tool outputs based on tool name
          if (toolCall.name === 'generate_image' || toolCall.name === 'find_stock_image') {
            output.images = output.images || [];
            output.images.push(toolCall.args);
          } else if (toolCall.name === 'output_image_strategy' && toolCall.args) {
            output.imageStrategy = toolCall.args.imageStrategy;
          } else if (toolCall.name === 'output_link_requests' && toolCall.args) {
            output.linkRequests = toolCall.args.linkRequests;
            output.plainTextOutput = toolCall.args.plainTextOutput;
          } else if (toolCall.name === 'suggest_url' && toolCall.args) {
            output.urlSuggestion = toolCall.args.urlSuggestion;
          }
        }
      }
      
      return output;
    };

    // Run all three agents in parallel
    const [imagesResult, linkRequestsResult, urlResult] = await Promise.allSettled([
      extractAgentOutput(
        imagesAgent,
        [{
          role: 'user',
          content: `Article to add images to:

${finalArticle}

Guest post site: ${input.guestPostSite}
Please analyze the article type and create an appropriate image strategy.`
        }],
        { article: finalArticle }
      ),

      extractAgentOutput(
        linkRequestsAgent,
        [{
          role: 'user',
          content: `New guest post article:

${finalArticle}

Guest post site: ${input.guestPostSite}
Target keyword: ${input.targetKeyword}

Find 3 existing articles on ${input.guestPostSite} that should link TO this new guest post.`
        }],
        { 
          article: finalArticle,
          guestPostSite: input.guestPostSite
        }
      ),

      extractAgentOutput(
        urlSuggestionAgent,
        [{
          role: 'user',
          content: `Article:

${finalArticle}

Target keyword: ${input.targetKeyword}
Guest post site: ${input.guestPostSite}

Suggest an SEO-optimized URL for this article.`
        }],
        {
          article: finalArticle,
          targetKeyword: input.targetKeyword
        }
      )
    ]);

    // Extract results with error handling
    const imageStrategy = imagesResult.status === 'fulfilled'
      ? imagesResult.value.imageStrategy
      : null;

    const linkRequests = linkRequestsResult.status === 'fulfilled'
      ? linkRequestsResult.value.plainTextOutput || ''
      : '';

    const urlSuggestion = urlResult.status === 'fulfilled'
      ? urlResult.value.urlSuggestion?.suggestedUrl || ''
      : '';

    // Save results
    await db.update(linkOrchestrationSessions)
      .set({
        finalArticle,
        imageStrategy,
        linkRequests,
        urlSuggestion,
        phase3Complete: new Date(),
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(linkOrchestrationSessions.id, sessionId));

    input.onProgress?.(3, 'Phase 3 completed: All link building tasks finished');

    return {
      imageStrategy,
      linkRequests,
      urlSuggestion
    };
  }

  // Method to resume a failed session
  async resumeSession(sessionId: string, onProgress?: (phase: number, message: string) => void): Promise<LinkOrchestrationResult> {
    const [session] = await db.select()
      .from(linkOrchestrationSessions)
      .where(eq(linkOrchestrationSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error('Session not found');
    }

    const input: LinkOrchestrationInput = {
      workflowId: session.workflowId,
      article: session.originalArticle,
      targetDomain: session.targetDomain || '',
      clientName: session.clientName || '',
      clientUrl: session.clientUrl || '',
      anchorText: session.anchorText || undefined,
      guestPostSite: session.guestPostSite || '',
      targetKeyword: session.targetKeyword || '',
      onProgress
    };

    // Resume from the appropriate phase
    if (!session.phase1Complete) {
      return this.orchestrate(input); // Start from beginning
    } else if (!session.phase2Complete) {
      // Resume from phase 2
      const phase2Result = await this.executePhase2(sessionId, input, session.articleAfterPhase1!);
      const phase3Result = await this.executePhase3(sessionId, input, phase2Result.article);
      
      return {
        sessionId,
        finalArticle: phase2Result.article,
        modifications: {
          internalLinks: (session.internalLinksResult as any)?.internalLinks || [],
          clientMentions: (session.clientMentionResult as any)?.clientMentions || [],
          clientLink: phase2Result.clientLink
        },
        imageStrategy: phase3Result.imageStrategy,
        linkRequests: phase3Result.linkRequests,
        urlSuggestion: phase3Result.urlSuggestion,
        success: true
      };
    } else if (!session.phase3Complete) {
      // Resume from phase 3
      const phase3Result = await this.executePhase3(sessionId, input, session.articleAfterPhase2!);
      
      return {
        sessionId,
        finalArticle: session.articleAfterPhase2!,
        modifications: {
          internalLinks: (session.internalLinksResult as any)?.internalLinks || [],
          clientMentions: (session.clientMentionResult as any)?.clientMentions || [],
          clientLink: (session.clientLinkResult as any)?.clientLink || null
        },
        imageStrategy: phase3Result.imageStrategy,
        linkRequests: phase3Result.linkRequests,
        urlSuggestion: phase3Result.urlSuggestion,
        success: true
      };
    }

    // Session already complete
    return {
      sessionId,
      finalArticle: session.finalArticle || session.originalArticle,
      modifications: {
        internalLinks: (session.internalLinksResult as any)?.internalLinks || [],
        clientMentions: (session.clientMentionResult as any)?.clientMentions || [],
        clientLink: (session.clientLinkResult as any)?.clientLink || null
      },
      imageStrategy: session.imageStrategy,
      linkRequests: session.linkRequests || '',
      urlSuggestion: session.urlSuggestion || '',
      success: true
    };
  }
}

// Export singleton instance
export const linkOrchestrationService = new LinkOrchestrationService();