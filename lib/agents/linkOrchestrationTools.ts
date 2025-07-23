import { tool } from '@openai/agents';
import { z } from 'zod';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// ===========================================
// Text Modification Tools (Phase 1 & 2)
// ===========================================

export const insertInternalLink = tool({
  name: 'insert_internal_link',
  description: 'Propose an internal link edit with position info. Find relevant content on the guest post site to link to.',
  parameters: z.object({
    kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence'])
      .describe('Type of modification to make'),
    start: z.number()
      .describe('0-based character index where modification starts'),
    end: z.number().nullable()
      .describe('0-based character index where modification ends (omit for inserts)'),
    originalText: z.string()
      .describe('The original text being modified'),
    newText: z.string()
      .describe('The new text with link integrated naturally'),
    anchorText: z.string()
      .describe('The clickable link text'),
    targetUrl: z.string()
      .describe('Full URL on the guest post site to link to'),
    confidence: z.number().min(0).max(1)
      .describe('Confidence score 0-1'),
    rationale: z.string()
      .describe('Why this link adds value and why this modification type was chosen')
  }),
  async execute(params) {
    // Return JSON-serializable data
    return {
      ok: true,
      modification: {
        kind: params.kind,
        start: params.start,
        end: params.end,
        originalText: params.originalText,
        newText: params.newText,
        anchorText: params.anchorText,
        targetUrl: params.targetUrl,
        confidence: params.confidence,
        rationale: params.rationale,
        timestamp: new Date().toISOString()
      }
    };
  }
});

export const insertClientMention = tool({
  name: 'insert_client_mention',
  description: 'Add strategic brand mention for AI overviews. NO LINKS - just natural brand name mentions.',
  parameters: z.object({
    kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence'])
      .describe('Type of modification to make'),
    start: z.number()
      .describe('0-based character index where modification starts'),
    end: z.number().nullable()
      .describe('0-based character index where modification ends (omit for inserts)'),
    originalText: z.string()
      .describe('The original text being modified'),
    newText: z.string()
      .describe('The new text with brand mention (NO LINKS)'),
    mentionType: z.enum(['brand_name', 'product_mention', 'expertise_reference'])
      .describe('Type of brand mention'),
    confidence: z.number().min(0).max(1)
      .describe('Confidence score 0-1'),
    rationale: z.string()
      .describe('Why this mention adds value and passes the 5 organic checks')
  }),
  async execute(params) {
    return {
      ok: true,
      modification: {
        kind: params.kind,
        start: params.start,
        end: params.end,
        originalText: params.originalText,
        newText: params.newText,
        mentionType: params.mentionType,
        confidence: params.confidence,
        rationale: params.rationale,
        timestamp: new Date().toISOString()
      }
    };
  }
});

export const insertClientLink = tool({
  name: 'insert_client_link',
  description: 'Add the ONE client link naturally in the article. Place where it adds most value.',
  parameters: z.object({
    kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence'])
      .describe('Type of modification to make'),
    start: z.number()
      .describe('0-based character index where modification starts'),
    end: z.number().nullable()
      .describe('0-based character index where modification ends (omit for inserts)'),
    originalText: z.string()
      .describe('The original text being modified'),
    newText: z.string()
      .describe('The new text with client link integrated'),
    anchorText: z.string()
      .describe('The clickable link text'),
    targetUrl: z.string()
      .describe('The client URL to link to'),
    confidence: z.number().min(0).max(1)
      .describe('Confidence score 0-1'),
    rationale: z.string()
      .describe('Why this placement adds value and flows naturally'),
    placementStrategy: z.string()
      .describe('Overall strategy for where and why this placement was chosen')
  }),
  async execute(params) {
    return {
      ok: true,
      modification: {
        kind: params.kind,
        start: params.start,
        end: params.end,
        originalText: params.originalText,
        newText: params.newText,
        anchorText: params.anchorText,
        targetUrl: params.targetUrl,
        confidence: params.confidence,
        rationale: params.rationale,
        placementStrategy: params.placementStrategy,
        timestamp: new Date().toISOString()
      }
    };
  }
});

// ===========================================
// Phase 3 Tools - Images, Link Requests, URL
// ===========================================

export const generateImage = tool({
  name: 'generate_image',
  description: 'Generate an image using DALL-E 3 for informational/software articles',
  parameters: z.object({
    prompt: z.string()
      .describe('The DALL-E prompt for image generation. Be specific and descriptive.'),
    purpose: z.string()
      .describe('What this image is for and where it will be placed in the article'),
    aspectRatio: z.enum(['1024x1024', '1792x1024', '1024x1792'])
      .describe('Image dimensions - use 1792x1024 for widescreen, 1024x1024 for square')
  }),
  async execute(params) {
    try {
      const response = await getOpenAIClient().images.generate({
        model: "dall-e-3",
        prompt: params.prompt,
        n: 1,
        size: params.aspectRatio as '1024x1024' | '1792x1024' | '1024x1792'
      });
      
      return {
        ok: true,
        image: {
          url: response.data?.[0]?.url || '',
          prompt: params.prompt,
          purpose: params.purpose,
          aspectRatio: params.aspectRatio,
          revisedPrompt: response.data?.[0]?.revised_prompt || params.prompt,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error.message || 'Failed to generate image',
        prompt: params.prompt
      };
    }
  }
});

export const outputImageStrategy = tool({
  name: 'output_image_strategy',
  description: 'Output the complete image strategy with all generated and found images',
  parameters: z.object({
    articleType: z.enum(['informational', 'listicle', 'product_roundup', 'hybrid'])
      .describe('Type of article for image strategy'),
    totalImages: z.number()
      .describe('Total number of images in the strategy'),
    images: z.array(z.object({
      placement: z.string()
        .describe('After which section/paragraph the image should be placed'),
      type: z.enum(['CREATE', 'FIND'])
        .describe('Whether to create with DALL-E or find existing image'),
      purpose: z.string()
        .describe('Why this image adds value at this location'),
      status: z.enum(['generated', 'found', 'failed'])
        .describe('Current status of the image'),
      url: z.string().nullable()
        .describe('The image URL if generated or found'),
      promptOrSearch: z.string()
        .describe('The DALL-E prompt used or search terms for finding'),
      error: z.string().nullable()
        .describe('Error message if image generation/search failed')
    })),
    summary: z.string()
      .describe('Overall image strategy summary and reasoning')
  }),
  async execute(params) {
    return {
      ok: true,
      strategy: params,
      timestamp: new Date().toISOString()
    };
  }
});

export const outputLinkRequests = tool({
  name: 'output_link_requests',
  description: 'Output link request suggestions for existing articles to link TO the new guest post',
  parameters: z.object({
    suggestions: z.array(z.object({
      linkFromUrl: z.string()
        .describe('Full URL of existing article that should link to our post'),
      linkFromTitle: z.string()
        .describe('Title of the existing article'),
      anchorText: z.string()
        .describe('Suggested anchor text for the link'),
      modificationType: z.enum(['no_modification', 'sentence_change', 'sentence_addition'])
        .describe('Whether the existing content needs modification'),
      modificationDetails: z.object({
        originalText: z.string().nullable()
          .describe('Original text if modification needed'),
        newText: z.string().nullable()
          .describe('Suggested new text with link'),
        afterSentence: z.string().nullable()
          .describe('Sentence after which to add new content')
      }).nullable(),
      relevanceScore: z.number().min(0).max(1)
        .describe('How relevant this link would be'),
      rationale: z.string()
        .describe('Why this article should link to the new post')
    })),
    plainTextOutput: z.string()
      .describe('The formatted plain text output for copy/paste to share with guest post site')
  }),
  async execute(params) {
    return {
      ok: true,
      linkRequests: params.suggestions,
      plainTextOutput: params.plainTextOutput,
      timestamp: new Date().toISOString()
    };
  }
});

export const suggestUrl = tool({
  name: 'suggest_url',
  description: 'Suggest SEO-optimized URL for the guest post',
  parameters: z.object({
    suggestedUrl: z.string()
      .describe('The complete suggested URL path (without domain)'),
    urlStructure: z.object({
      slug: z.string()
        .describe('The URL slug portion'),
      includesKeyword: z.boolean()
        .describe('Whether the target keyword is included'),
      lengthWords: z.number()
        .describe('Number of words in the URL')
    }),
    seoAnalysis: z.object({
      keywordPlacement: z.string()
        .describe('How the keyword is incorporated'),
      readability: z.string()
        .describe('Assessment of URL readability'),
      bestPracticesFollowed: z.array(z.string())
        .describe('Which SEO best practices are followed')
    }),
    alternatives: z.array(z.string()).nullable()
      .describe('Alternative URL suggestions if applicable')
  }),
  async execute(params) {
    return {
      ok: true,
      suggestion: params,
      timestamp: new Date().toISOString()
    };
  }
});