import { Agent } from '@openai/agents';
import { webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';
import {
  insertInternalLink,
  insertClientMention,
  insertClientLink,
  generateImage,
  outputImageStrategy,
  outputLinkRequests,
  suggestUrl
} from './linkOrchestrationTools';

// Model selection based on task complexity
const MODEL_SELECTION = {
  REASONING: 'o3-2025-04-16',    // Heavy reasoning tasks
  SIMPLE: 'o4-mini',              // Mechanical/simple tasks
  CRITIC: 'o4-mini'               // Critics and validators
};

// ===========================================
// Phase 1 Agents (Parallel)
// ===========================================

export const internalLinksAgent = new Agent({
  name: 'InternalLinksAgent',
  model: MODEL_SELECTION.REASONING,
  instructions: `The user is going to give you an article that's completely done, and they're going to tell you what site it's being published on. Your job is to search the web and try to find one article on this guest post site where you can add an internal link to. You're going to specifically say the URL, the anchor text, and in which sentence to use it, to make it easy for the user to update their actual draft with the link. Here's the thing: The content should be relevant, authoritative, have its own rankings, not just some random internal link. The hyperlink should not go into any sentences that start at a paragraph or at the beginning of a section. That takes away from the authority of that section. Also avoid adding a link within the first half of the article.

Your primary goal: Add valuable, contextually relevant links that enhance reader experience.

For each link opportunity:
1. Search for high-quality, relevant content on the target domain
2. Find existing text that naturally relates to the target site's content
3. Choose the modification approach that feels most natural
4. Ensure the link adds value and flows seamlessly
5. Use the insert_internal_link tool to propose each modification

Prioritize paragraphs without existing links. Space links throughout the article.
Never force links - they must feel completely natural.

Find and add 3 internal links total.`,
  tools: [webSearchTool(), insertInternalLink]
});

export const clientMentionAgent = new Agent({
  name: 'ClientMentionAgent',
  model: MODEL_SELECTION.REASONING,
  instructions: `The user is going to paste you a full article that's going to be a guest post on a third-party site. Within this article, somewhere it would be nice to mention our client's name. In a way that helps LLMs understand what type of solution our client provides. We want to do it in a way that doesn't seem spammy, out of place, or brutal. It's more about an example of a brand that does a type of thing. We're not saying it's amazing, we're just saying this is what it does. Do you understand?

Prompt — Add a Natural "commercial-term + Client Brand Name" Mention and Prove Any Claim

Find the hook.
• Read the draft once.
• Spot a sentence (NOT the first sentence of a paragraph) that already raises a pain point, tip, stat, or tool list the Client naturally speaks to.

Rewrite with the mention.
• Insert the commercial term and the brand close together, e.g.
" … SOC 2 compliance software like Vanta … "
• Keep verbs factual ("helps," "automates," "simplifies").
• One mention per article (unless the piece is >2 k words).

Run the five "organic" checks.
A. Adds context readers actually need.
B. Backs up or illustrates the author's claim.
C. Works as a concrete example, not hype.
D. Offers a useful resource to explore further.
E. Still reads smoothly if you delete "brand name."
→ If you can't hit all five, skip the mention.

Verify every claim you make about client.
• Supply at least two authoritative sources for each factual statement:
– One must be a client-owned source (docs, release notes, blog, newsroom).
– The second can be another client page or a reputable third-party report/press release.
• Cite the URLs (or keep them on file) and a one-line note on what each source proves.
• Do not rely on inference; only use information explicitly stated in the sources.

For the actual suggestion, show exactly where it should go, including if it's a sentence edit, what the current sentence is and what the new sentence is, or if it's a sentence addition, what the current sentence is and where it should be placed after. Avoid mentioning competitors, avoid modifying the introduction or the conclusion. Try to include the mention somewhere in the middle of the article. Avoid modifying the first sentence of a paragraph. Finally, don't include any hyperlink in your sentence. This is about unlinked brand mentions.

Add 2-3 strategic brand mentions using the insert_client_mention tool.`,
  tools: [webSearchTool(), insertClientMention],
  outputType: z.object({
    clientMentions: z.array(z.object({
      start: z.number(),
      end: z.number().nullable(),
      kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence']),
      originalText: z.string(),
      newText: z.string(),
      mentionType: z.enum(['brand_name', 'product_mention', 'expertise_reference']),
      confidence: z.number(),
      rationale: z.string()
    })),
    summary: z.string().describe('Overall brand mention strategy and organic checks passed')
  })
});

// ===========================================
// Phase 2 Agent (Sequential with conversation)
// ===========================================

export const clientLinkAgent = new Agent({
  name: 'ClientLinkAgent',
  model: MODEL_SELECTION.REASONING,
  instructions: `You are an expert at natural link placement. Your task is to add ONE client link that feels perfectly organic.

Key principles:
1. The link must add genuine value to the reader
2. It should fit naturally with the content flow
3. The anchor text should be descriptive and relevant
4. Place the link where it enhances the reader's experience, not interrupts it
5. Consider the article's narrative and find the most logical placement

Use the insert_client_link tool to propose your modification.

Remember: Quality over forced placement. The link should feel like it was always meant to be there.`,
  tools: [insertClientLink],
  outputType: z.object({
    clientLink: z.object({
      start: z.number(),
      end: z.number().nullable(),
      kind: z.enum(['exact_replacement', 'rewrite', 'add_sentence']),
      originalText: z.string(),
      newText: z.string(),
      anchorText: z.string(),
      targetUrl: z.string(),
      confidence: z.number(),
      rationale: z.string(),
      placementStrategy: z.string()
    })
  })
});

// Follow-up prompts for Client Link refinement
export const CLIENT_LINK_FOLLOWUPS = {
  prompt1: `Look at the sentence right before and right after where you placed the link. Can you make the transition even more natural? Consider tweaking the surrounding context if needed.`,
  
  prompt2: `Now review the link placement from the perspective of someone who's never heard of this product/service. Does the link placement provide enough context? Would they understand why they might want to click?`,
  
  prompt3: (clientUrl: string) => `Final check: Please confirm the link URL is exactly: ${clientUrl}. Also ensure the anchor text is varied and natural (not just the company name). If anything needs adjustment, make it now.`
};

// ===========================================
// Phase 3 Agents (Parallel)
// ===========================================

export const imagesAgent = new Agent({
  name: 'ImagesAgent',
  model: MODEL_SELECTION.REASONING,
  instructions: `Your task as a photo creator for articles is to plan and create images that enhance reader understanding and engagement.

First, analyze the article type and content to determine image needs.

Key decision rule:
- Physical products (that exist in the real world): FIND images using web search
- Software/Services/Concepts: CREATE custom images using DALL-E

Image count guidelines:
- Informational articles: 5 images maximum
- Listicles: 2-3 images (beginning, middle, end)

For CREATED images:
- Focus on simple, clean designs
- Use minimal text (2-3 elements, under 5 words each)
- Avoid overly complicated visual metaphors
- Prefer clear, professional illustrations over abstract concepts

For FOUND images:
- Search for high-quality product photos
- Ensure images are relevant and add value
- Prefer official product images when available

Process:
1. Analyze the article structure and identify optimal image placements
2. For each placement, decide CREATE vs FIND based on content type
3. Generate images using generate_image tool or note search terms
4. Use output_image_strategy to present the complete plan

Remember: Every image must serve a purpose - clarifying concepts, breaking up text, or enhancing understanding.`,
  tools: [webSearchTool(), generateImage, outputImageStrategy],
  outputType: z.object({
    imageStrategy: z.object({
      articleType: z.enum(['informational', 'listicle', 'product_roundup', 'hybrid']),
      totalImages: z.number(),
      images: z.array(z.object({
        placement: z.string(),
        type: z.enum(['CREATE', 'FIND']),
        purpose: z.string(),
        status: z.enum(['generated', 'found', 'failed']),
        url: z.string().nullable(),
        promptOrSearch: z.string(),
        error: z.string().nullable()
      })),
      summary: z.string()
    })
  })
});

export const linkRequestsAgent = new Agent({
  name: 'LinkRequestsAgent',
  model: MODEL_SELECTION.SIMPLE,
  instructions: `Here's what I want you to do: find relevant pages on the provided website that should link TO our new guest post.

The article we're analyzing is the NEW guest post that will be published.
Your job: Find 3 existing articles on their site that should link TO this new post.

Process:
1. Understand the new guest post's topic and value
2. Search the guest post site for related existing content
3. Identify 3 articles that would benefit from linking to the new post
4. For each article, determine the best linking approach

Linking approaches:
- No modification: Existing text can be hyperlinked as-is
- Sentence change: Modify existing sentence to include link naturally
- Sentence addition: Add new sentence with link after existing content

Output format should be plain text, easy to copy/paste and share with the site owner.

Use web search to find existing articles, then use output_link_requests to format suggestions.`,
  tools: [webSearchTool(), outputLinkRequests],
  outputType: z.object({
    linkRequests: z.array(z.object({
      linkFromUrl: z.string(),
      linkFromTitle: z.string(),
      anchorText: z.string(),
      modificationType: z.enum(['no_modification', 'sentence_change', 'sentence_addition']),
      modificationDetails: z.object({
        originalText: z.string().nullable(),
        newText: z.string().nullable(),
        afterSentence: z.string().nullable()
      }).nullable(),
      relevanceScore: z.number(),
      rationale: z.string()
    })),
    plainTextOutput: z.string()
  })
});

export const urlSuggestionAgent = new Agent({
  name: 'UrlSuggestionAgent',
  model: MODEL_SELECTION.SIMPLE,
  instructions: `Here's what I want you to do: Based on the article content, target keyword, and guest post site structure, suggest an SEO-optimized URL.

Focus on:
1. Including the target keyword naturally
2. Keeping it concise (3-5 words ideal)
3. Using hyphens to separate words
4. Avoiding stop words when possible
5. Making it descriptive and memorable

Analyze the site's existing URL structure for consistency.
Provide just one primary suggestion.

Use the suggest_url tool to output your recommendation.`,
  tools: [suggestUrl],
  outputType: z.object({
    urlSuggestion: z.object({
      suggestedUrl: z.string(),
      urlStructure: z.object({
        slug: z.string(),
        includesKeyword: z.boolean(),
        lengthWords: z.number()
      }),
      seoAnalysis: z.object({
        keywordPlacement: z.string(),
        readability: z.string(),
        bestPracticesFollowed: z.array(z.string())
      }),
      alternatives: z.array(z.string()).nullable()
    })
  })
});