# Steps 8-14 Orchestration Agent Plan

## Overview
Build a single orchestration agent that handles Internal Links, External Links (excluding Airtable), Client Mention, Client Link insertion, Images, Link Requests, and URL Suggestion in an efficient, parallelized workflow.

## Architecture Design

### 1. Article Retrieval Strategy (Corrected)
```typescript
// Fallback chain priority:
1. formattingQaStep.outputs.cleanedArticle     // Formatting & QA (Step 7)
2. finalPolishStep.outputs.finalArticle        // Polish & Finalize (Step 6)
3. contentAuditStep.outputs.seoOptimizedArticle // Semantic SEO (Step 5)
4. articleDraftStep.outputs.fullArticle        // Article Draft (Step 4)
```

### 2. Parallel vs Sequential Processing
```
Phase 1 - Parallel Group (can run simultaneously):
- Internal Links (Step 8) - needs: article + target domain
- Client Mention (Step 10) - needs: article + client name

Phase 2 - Sequential (must wait for Phase 1):
- Client Link (Step 11) - needs: article with previous modifications + client URL/anchor

Phase 3 - Parallel Group (after all links are added):
- Images (Step 12) - needs: final article with all links
- Link Requests (Step 13) - needs: final article + guest post site
- URL Suggestion (Step 14) - needs: article + guest post site + keyword
```

### 3. Agent Structure (Multi-Agent Pattern)
```typescript
import { Agent } from '@openai/agents';
import { webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// Each agent has specific instructions and tools for its task
export const internalLinksAgent = new Agent({
  name: 'InternalLinksAgent',
  model: 'o3-2025-04-16',
  instructions: `You are an expert internal link strategist. Analyze the article and find 3 perfect opportunities to add internal links to the guest post site.

Your primary goal: Add valuable, contextually relevant links that enhance reader experience.

For each link opportunity:
1. Find existing text that naturally relates to the target site's content
2. Choose the modification approach that feels most natural
3. Ensure the link adds value and flows seamlessly

Prioritize paragraphs without existing links. Space links throughout the article.
Never force links - they must feel completely natural.`,
  tools: [webSearchTool(), internalLinkTool],
  outputType: internalLinksSchema
});

export const clientMentionAgent = new Agent({
  name: 'ClientMentionAgent', 
  model: 'o3-2025-04-16',
  instructions: `You are an expert at strategic brand positioning for AI search results. Add 2-3 natural mentions of the client's brand throughout the article.

These are NOT links - just brand name mentions designed to help with AI overview visibility.

Focus on mentioning the brand in contexts that highlight their expertise, unique value, or as examples.
The mentions must feel completely organic and add value to the content.`,
  tools: [clientMentionTool],
  outputType: clientMentionSchema
});

export const clientLinkAgent = new Agent({
  name: 'ClientLinkAgent',
  model: 'o3-2025-04-16',
  instructions: `You are an expert at natural link placement. Your task is to add ONE client link that feels perfectly organic.

Place the link where it adds the most value and fits naturally with the content flow.
The link should enhance the reader's experience, not interrupt it.`,
  tools: [clientLinkTool],
  outputType: clientLinkSchema
});

export const imagesAgent = new Agent({
  name: 'ImagesAgent',
  model: 'o3-2025-04-16',
  instructions: `[Full instructions from Step 12 - Image Creator/Finder logic]`,
  tools: [generateImageTool, webSearchTool(), imageAnalysisTool],
  outputType: imagesSchema
});

export const linkRequestsAgent = new Agent({
  name: 'LinkRequestsAgent',
  model: 'o3-2025-04-16',
  instructions: `[Full instructions from Step 13 - verbatim from user]`,
  tools: [webSearchTool(), linkRequestTool],
  outputType: linkRequestSchema
});

export const urlSuggestionAgent = new Agent({
  name: 'UrlSuggestionAgent',
  model: 'o3-2025-04-16',
  instructions: `[Full instructions from Step 14 - verbatim from user]`,
  tools: [urlSuggestionTool],
  outputType: urlSuggestionSchema
});
```

### 4. Database Schema Updates
```sql
-- New session table for multi-phase orchestration
CREATE TABLE link_orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  version INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'initializing', 'phase1', 'phase2', 'phase3', 'completed', 'failed'
  
  -- Phase tracking
  current_phase INTEGER DEFAULT 1,
  phase1_start TIMESTAMP,
  phase1_complete TIMESTAMP,
  phase2_start TIMESTAMP,
  phase2_complete TIMESTAMP,
  phase3_start TIMESTAMP,
  phase3_complete TIMESTAMP,
  
  -- Article versions
  original_article TEXT NOT NULL,
  article_after_phase1 TEXT,
  article_after_phase2 TEXT,
  final_article TEXT,
  
  -- Phase 1 results (parallel)
  internal_links_result JSONB,
  client_mention_result JSONB,
  
  -- Phase 2 results
  client_link_result JSONB,
  client_link_conversation JSONB, -- Store full conversation history
  
  -- Phase 3 results (parallel)
  image_strategy JSONB,
  link_requests TEXT, -- Plain text output for copy/paste
  url_suggestion TEXT,
  
  -- Input parameters
  target_domain VARCHAR(255),
  client_name VARCHAR(255),
  client_url TEXT,
  anchor_text VARCHAR(255),
  guest_post_site VARCHAR(255),
  target_keyword VARCHAR(255),
  
  -- Metadata and tracking
  error_message TEXT,
  session_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_link_orchestration_workflow ON link_orchestration_sessions(workflow_id);
CREATE INDEX idx_link_orchestration_status ON link_orchestration_sessions(status);
```

### 5. Enhanced Tool Definitions with Natural Editing Support

```typescript
// Tool for internal links with flexible modification types
const internalLinkTool = tool({
  name: 'suggest_internal_links',
  description: 'Suggest internal links to guest post site with natural integration',
  parameters: z.object({
    suggestions: z.array(z.object({
      // Original location info
      original_text: z.string().describe('The exact text to be linked or modified'),
      surrounding_context: z.string().describe('~100 chars before and after for context'),
      
      // Modification type
      modification_type: z.enum(['exact_replacement', 'sentence_rewrite', 'add_sentence'])
        .describe('How to integrate the link naturally'),
      
      // The actual modification
      suggested_change: z.object({
        from: z.string().describe('Exact text to replace (can be full sentence)'),
        to: z.string().describe('Replacement text with link integrated')
      }),
      
      // Link details
      anchor_text: z.string().describe('The clickable text for the link'),
      target_url: z.string().describe('URL on the guest post site'),
      
      // Confidence and rationale
      confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
      rationale: z.string().describe('Why this modification type was chosen')
    })),
    summary: z.string().describe('Overall strategy for internal links')
  }),
  execute: async (args) => {
    // Save suggestions and update session
    return 'Internal link suggestions saved';
  }
});

// Client mention tool with natural integration
const clientMentionTool = tool({
  name: 'suggest_client_mentions',
  description: 'Add strategic brand mentions for AI overviews',
  parameters: z.object({
    suggestions: z.array(z.object({
      original_text: z.string(),
      surrounding_context: z.string(),
      modification_type: z.enum(['exact_replacement', 'sentence_rewrite', 'add_sentence']),
      suggested_change: z.object({
        from: z.string(),
        to: z.string()
      }),
      mention_type: z.enum(['brand_name', 'product_mention', 'expertise_reference']),
      confidence: z.number().min(0).max(1),
      rationale: z.string()
    })),
    summary: z.string()
  })
});

// Client link tool with natural integration
const clientLinkTool = tool({
  name: 'add_client_link',
  description: 'Add the client link naturally in the article',
  parameters: z.object({
    modification_type: z.enum(['exact_replacement', 'sentence_rewrite', 'add_sentence']),
    original_text: z.string(),
    surrounding_context: z.string(),
    suggested_change: z.object({
      from: z.string(),
      to: z.string()
    }),
    anchor_text: z.string(),
    target_url: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
    placement_strategy: z.string()
  })
});

// Image generation tool for Step 12
const generateImageTool = tool({
  name: 'generate_image',
  description: 'Generate an image using DALL-E',
  parameters: z.object({
    prompt: z.string().describe('The DALL-E prompt for image generation'),
    purpose: z.string().describe('What this image is for')
  }),
  execute: async (args) => {
    // Call DALL-E API
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: args.prompt,
      n: 1,
      size: "1792x1024" // Widescreen format
    });
    return response.data[0].url;
  }
});

// Image analysis output tool for Step 12
const imageAnalysisTool = tool({
  name: 'output_image_strategy',
  description: 'Output the complete image strategy with all generated and found images',
  parameters: z.object({
    article_type: z.enum(['informational', 'listicle', 'product_roundup', 'hybrid']),
    total_images: z.number(),
    images: z.array(z.object({
      placement: z.string().describe('After which section/paragraph'),
      type: z.enum(['CREATE', 'FIND']),
      purpose: z.string().describe('Why this image adds value'),
      status: z.enum(['generated', 'found', 'failed']),
      url: z.string().optional().describe('The image URL'),
      prompt_or_search: z.string().describe('The DALL-E prompt used or search terms'),
      error: z.string().optional()
    })),
    summary: z.string().describe('Overall image strategy summary')
  })
});

// Link request tool for Step 13
const linkRequestTool = tool({
  name: 'output_link_requests',
  description: 'Output link request suggestions in plain text format',
  parameters: z.object({
    suggestions: z.array(z.object({
      link_from_url: z.string().describe('URL of existing article'),
      anchor_text: z.string().describe('Text to be linked'),
      modification_type: z.enum(['no_modification', 'sentence_change', 'sentence_addition']),
      modification_details: z.object({
        original_text: z.string().optional(),
        new_text: z.string().optional(),
        after_sentence: z.string().optional()
      }).optional()
    })),
    plain_text_output: z.string().describe('The formatted plain text output for copy/paste')
  })
});

// URL suggestion tool for Step 14
const urlSuggestionTool = tool({
  name: 'suggest_url',
  description: 'Suggest SEO-optimized URL for the guest post',
  parameters: z.object({
    suggested_url: z.string(),
    url_structure: z.object({
      slug: z.string(),
      includes_keyword: z.boolean(),
      length_words: z.number()
    }),
    seo_analysis: z.object({
      keyword_placement: z.string(),
      readability: z.string(),
      best_practices_followed: z.array(z.string())
    }),
    alternatives: z.array(z.string()).optional()
  })
});
```

### 6. Enhanced Orchestration Flow with Follow-ups
```typescript
import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';

export class LinkOrchestrationService {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async performOrchestration(sessionId: string) {
    // 1. Retrieve article using fallback chain
    const article = await this.getArticleWithFallback(workflowId);
    
    // 2. Phase 1: Parallel processing (Internal Links + Client Mention)
    const [internalLinksResult, clientMentionResult] = await Promise.all([
      this.runInternalLinksAgent(article, targetDomain),
      this.runClientMentionAgent(article, clientName)
    ]);
    
    // 3. Merge Phase 1 results
    const articleAfterPhase1 = this.applyModifications(article, [
      ...internalLinksResult.suggestions,
      ...clientMentionResult.suggestions
    ]);
    
    // 4. Phase 2: Client Link with follow-up refinement
    const clientLinkResult = await this.runClientLinkWithFollowups(
      articleAfterPhase1, 
      clientUrl, 
      anchorText
    );
    
    // 5. Apply final client link
    const articleAfterPhase2 = this.applyModifications(
      articleAfterPhase1, 
      [clientLinkResult.finalSuggestion]
    );
    
    // 6. Phase 3: Parallel processing (Images, Link Requests, URL Suggestion)
    const [imageResult, linkRequestResult, urlSuggestionResult] = await Promise.all([
      this.runImageAnalysisAgent(articleAfterPhase2),
      this.runLinkRequestAgent(articleAfterPhase2, guestPostSite),
      this.runUrlSuggestionAgent(articleAfterPhase2, guestPostSite, keyword)
    ]);
    
    // 7. Save all results
    await this.saveFinalOrchestrationResults(workflowId, {
      finalArticle: articleAfterPhase2,
      imageStrategy: imageResult,
      linkRequests: linkRequestResult,
      urlSuggestion: urlSuggestionResult
    });
  }

  // Parallel agent execution (no conversation needed)
  private async runInternalLinksAgent(article: string, targetDomain: string) {
    const runner = new Runner({
      modelProvider: this.openaiProvider,
      tracingDisabled: true
    });

    const result = await runner.run(internalLinksAgent, [{
      role: 'user',
      content: `Target Domain: ${targetDomain}\n\nArticle Content:\n\n${article}`
    }], {
      stream: true,
      maxTurns: 1
    });

    return await result.finalOutput;
  }

  // Special handling for Client Link with 3 follow-ups
  private async runClientLinkWithFollowups(article: string, clientUrl: string, anchorText?: string) {
    const runner = new Runner({ 
      modelProvider: this.openaiProvider,
      tracingDisabled: true
    });
    
    // Initial prompt
    let conversationHistory = [{
      role: 'user',
      content: formatClientLinkPrompt(article, clientUrl, anchorText)
    }];
    
    // Get initial suggestion
    const result1 = await runner.run(clientLinkAgent, conversationHistory, {
      stream: true,
      maxTurns: 1
    });
    
    // CRITICAL: Preserve SDK history
    await result1.finalOutput;
    conversationHistory = (result1 as any).history;
    
    // Follow-up 1: Context refinement
    conversationHistory.push({ role: 'user', content: CLIENT_LINK_FOLLOWUPS.prompt1 });
    const result2 = await runner.run(clientLinkAgent, conversationHistory, {
      stream: true,
      maxTurns: 1
    });
    
    await result2.finalOutput;
    conversationHistory = (result2 as any).history;
    
    // Follow-up 2: Source-based rewrite
    conversationHistory.push({ role: 'user', content: CLIENT_LINK_FOLLOWUPS.prompt2 });
    const result3 = await runner.run(clientLinkAgent, conversationHistory, {
      stream: true,
      maxTurns: 1
    });
    
    await result3.finalOutput;
    conversationHistory = (result3 as any).history;
    
    // Follow-up 3: Validation
    conversationHistory.push({ 
      role: 'user', 
      content: CLIENT_LINK_FOLLOWUPS.prompt3(clientUrl) 
    });
    const finalResult = await runner.run(clientLinkAgent, conversationHistory, {
      stream: true,
      maxTurns: 1
    });
    
    // Extract and return only the final refined suggestion
    return await finalResult.finalOutput;
  }
}
```

### 7. GPT Instructions and Prompts

#### Step 8 - Internal Links GPT
```typescript
// IMPORTANT: This agent uses system instructions, NOT empty instructions like V2 pattern
const internalLinksAgent = new Agent({
  name: 'InternalLinksAgent',
  model: 'o3-2025-04-16',
  instructions: `The user is going to give you an article that's completely done, and they're going to tell you what site it's being published on. Your job is to search the web and try to find one article on this guest post site where you can add an internal link to. You're going to specifically say the URL, the anchor text, and in which sentence to use it, to make it easy for the user to update their actual draft with the link. Here's the thing: The content should be relevant, authoritative, have its own rankings, not just some random internal link. The hyperlink should not go into any sentences that start at a paragraph or at the beginning of a section. That takes away from the authority of that section. Also avoid adding a link within the first half of the article.`,
  tools: [
    webSearchTool(), // Required for finding guest post site articles
    internalLinkTool
  ]
});

// User prompt template for Internal Links (matches current UI format)
const INTERNAL_LINKS_PROMPT = `Target Domain: {TARGET_DOMAIN}

Article Content:

{ARTICLE}`;

// Additional context for the agent (from tool description or phase intro)
const INTERNAL_LINKS_CONTEXT = `
Search for relevant, authoritative content on the target domain that would make a good internal link.
The agent knows from its system instructions to:
- Find high-quality, ranking content
- Ensure contextual relevance
- Avoid paragraph/section beginnings
- Not place in first half of article
- Provide specific URL, anchor text, and placement`;

#### Step 10 - Client Mention GPT
```typescript
// Client Mention agent also uses system instructions
const clientMentionAgent = new Agent({
  name: 'ClientMentionAgent',
  model: 'o3-2025-04-16',
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

For the actual suggestion, show exactly where it should go, including if it's a sentence edit, what the current sentence is and what the new sentence is, or if it's a sentence addition, what the current sentence is and where it should be placed after. Avoid mentioning competitors, avoid modifying the introduction or the conclusion. Try to include the mention somewhere in the middle of the article. Avoid modifying the first sentence of a paragraph. Finally, don't include any hyperlink in your sentence. This is about unlinked brand mentions.`,
  tools: [
    webSearchTool(), // For verifying client claims
    clientMentionTool
  ]
});

// User prompt template for Client Mention (matches current UI format)
const CLIENT_MENTION_PROMPT = `Brand Name: {CLIENT_NAME}

Article Content:

{ARTICLE}`;

#### Step 11 - Client Link GPT
```typescript
// Client Link agent with precise insertion instructions
const clientLinkAgent = new Agent({
  name: 'ClientLinkAgent',
  model: 'o3-2025-04-16',
  instructions: `Your single job:
Tell a writer exactly where (and, if needed, how) to insert a client's link in a guest-post draft so the link feels like it always belonged there.

1. Inputs you'll receive
Guest-post draft (full article text).

Client URL (the page that needs a backlink).

Preferred anchor text (may be blank).

2. What to do, step-by-step
Crawl & study the client URL

Extract the page's primary keyword/topic, page type (definition, service, how-to, tips, etc.), and a quick one-sentence summary of what it offers.

Copy one or two short phrases/facts from the client page that you could plausibly cite as a "source" in the guest post.

Generate anchor text (if missing)

Propose 2-3 concise options (2–5 words each) that naturally reflect the page's topic.

Keep them lowercase unless brand rules require caps.

Scan the guest post for a natural hook

Work only in the top third of the article, but skip the intro section.

Skip bullet lists and the first sentence following any H2/H3 header.

Look for sentences that already touch the client page's topic or could benefit from the fact/phrase you pulled in Step 1.

Pick the best insertion point

Drop the link on a keyword/phrase that matches either the provided anchor or one of your suggestions.

If you find no perfect fit, draft a minimal one-sentence lead-in (placed right before the chosen sentence) that references the client page's fact and sets up the link.

Never force the link; the reader should feel you're simply citing a useful source.

Output exactly this structure:

## Recommended anchor text
- option 1
- option 2
(only include if user didn't supply one)

## Exact placement
> [Copy-paste the sentence or two from the guest post, showing **where** the link and anchor go. Bold the anchor text.]

## If you added a lead-in
> [New sentence] ← explain in one line why it's needed.

## Why this works (brief)
One-sentence rationale covering context + relevance.

3. Hard rules to remember
Natural first, SEO second. The link must read like a seamless citation.

Stay inside the top third, never in intro, bullets, or first-lines after headers.

If you add text, keep it one sentence, 20 words max, and do not alter tone.

No fluffy explanations; be surgical and direct.

Use this checklist every time and you'll nail it on the first shot.`,
  tools: [
    webSearchTool(), // For crawling client URL
    clientLinkTool
  ]
});

// User prompt template for Client Link (matches current UI format)
const CLIENT_LINK_PROMPT = `Client URL to Link: {CLIENT_URL}
{ANCHOR_TEXT_LINE}

Article Content:

{ARTICLE}`;

// Follow-up prompts for Client Link refinement
const CLIENT_LINK_FOLLOWUPS = {
  prompt1: `again, a link insert should not feel random or out of left field or feel like theres no reason why its being linked to. a good link is one that instantly looks like it belongs. as in, the article is saying something, and the way the link is introduced is a natural extension of wahts being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a link to the target url, and b) what lead in can you add to the existing article to make it work.`,
  
  prompt2: `what makes more sense to do it is take something from the article that is being linkeded to, reference it in the guest post and then link back to the article as the source using the anchor text. with those constraints, you may actually manage to do something actually useful and natural. note, if the anchor text doesnt match the same intent of the client url page title, its probably not viable. you are also allowed to create a while new paragraph if you aren't finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. ANCHOR TEXT AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.`,
  
  prompt3: (clientUrl: string) => `Okay, now:

what is this article about? ${clientUrl}.

Based on the anchor text you suggested in the sentence, what would you assume that the link that the anchor text is pointing to would be about?

Next, review what the client url is about: what is this article about? ${clientUrl}.

Tell me if that's making sense or not.`
};

#### Step 12 - Images Agent (Fully Automated)
The Images agent intelligently determines when to CREATE custom images vs FIND existing ones, then automatically generates or finds all recommended images.

```typescript
// Images agent with full automation
const imagesAgent = new Agent({
  name: 'ImagesAgent',
  model: 'o3-2025-04-16',
  instructions: `You are an intelligent image strategy advisor for guest post articles. Your task is to analyze articles and provide a comprehensive image plan that determines when to CREATE custom images versus when to FIND existing ones.

STEP 1: Article Analysis
- Examine title and headers to determine article type (informational, listicle, comparison, hybrid)
- Identify all sections that would benefit from visual support
- Extract all products, services, and software mentioned

STEP 2: Image Strategy Rules

For FEATURED IMAGES (top of article):
- Always CREATE - never find existing images
- Design should capture the article's core value, not just repeat the title
- Use widescreen format for blog compatibility

For PHYSICAL PRODUCTS (items that exist in the real world):
- FIND actual product images
- Examples: laptops, phones, furniture, kitchen appliances, tools
- Provide specific product name and model for accurate image finding
- Rationale: Readers want to see the actual physical item

For SOFTWARE/SERVICES (digital/abstract offerings):
- CREATE custom premium images
- Research the brand's logo and visual identity
- Combine brand elements with visualizations of the specific benefits discussed in your article
- Examples: SaaS tools, apps, consulting services, online platforms
- Rationale: Abstract services benefit from unique visual interpretation

For CONCEPTUAL/INFORMATIONAL content:
- CREATE supporting visuals that explain or enhance understanding
- Focus on the key concept being explained in that section

STEP 3: Image Prompt Guidelines for CREATE

SMART AND STREAMLINED:
- You CAN include text elements - just keep them concise
- 2-3 text elements work well if each is brief (3-5 words max)
- Focus on clear visual hierarchy
- Be specific about layout and composition

GOOD PROMPT EXAMPLES:
"Professional dashboard interface showing 'Revenue Growth' header, three metric cards labeled 'Sales', 'Users', 'Retention', clean modern design, widescreen format"

"Split-screen comparison with 'Before' and 'After' labels, showing workflow transformation, minimal text, bold typography, widescreen format"

FOR SOFTWARE/SERVICE IMAGES:
"Notion logo in top corner, central text 'Project Management Made Simple', visual flowchart below, clean white background, widescreen format"

PROMPT STRUCTURE:
- Main visual concept
- Specific text elements (keep each under 5 words)
- Visual style and composition
- "widescreen format"

The key is CONCISE TEXT, not NO TEXT. Brief headers, labels, and key phrases enhance the image when used strategically.

STEP 4: Image Quantity Guidelines
- Informational articles: Up to 5 images (1 featured + 4 supporting)
- Listicles: 1 featured + 1 per item mentioned
- Hybrid articles: Adapt based on content needs

STEP 5: Automated Execution
- For each CREATE image: Generate immediately using DALL-E
- For each FIND image: Search and return the best matching image URL
- Provide all results in a single response with downloadable links`,
  tools: [
    generateImageTool,  // DALL-E API integration
    webSearchTool(),    // For finding product images
    imageAnalysisTool   // Structure the output
  ]
});

// User prompt template for Images
const IMAGES_PROMPT = `Article Content:

{ARTICLE}

Analyze this article, determine the optimal image strategy, and then:
1. Generate all recommended CREATE images using DALL-E
2. Find all recommended FIND images using web search
3. Return all image URLs with placement instructions`;

#### Step 13 - Link Requests Agent
This agent finds existing articles on the guest post site that should link TO the new guest post article (reverse of Step 8).

```typescript
// Link requests agent with automated search and analysis
const linkRequestAgent = new Agent({
  name: 'LinkRequestAgent',
  model: 'o3-2025-04-16',
  instructions: `You are a link opportunity finder for guest post optimization. Your task is to find existing articles on the guest post site that should link TO the new guest post article.

STEP 1: Analyze the New Guest Post
- Extract key topics, themes, and keywords
- Identify the main value proposition
- Note specific concepts, solutions, or insights discussed

STEP 2: Search the Guest Post Site
- Use web search to find 3 relevant existing articles on the same domain
- Search using multiple query patterns to find the best matches
- Evaluate both exact keyword matches and conceptual relevance
- Select articles where a link would genuinely benefit readers

STEP 3: Analyze Each Found Article
- Crawl each article thoroughly
- Identify optimal placement avoiding:
  - Introduction paragraphs
  - Conclusion sections
  - Sections that are about to introduce a new topic
  - Places where a link would interrupt the flow
- Look for existing text that could anchor the link
- If no suitable anchor exists, identify where minimal modifications would work

STEP 4: Create Link Suggestions
For each article (list sequentially):

Link from: [URL of existing article]
Anchor text: [specific text to be linked]
Modifications:

[Use the most appropriate option:]

If suitable anchor text exists:
No modifications needed - link from existing text: "[exact text to link]"

If sentence needs modification:
Change from: [original sentence]
To: [modified sentence with link opportunity]

If new sentence needed:
After this sentence: [existing sentence]
Add: [new sentence containing link opportunity]

---

[Repeat for second article]

---

[Repeat for third article]

QUALITY GUIDELINES:
- Prioritize existing anchor text when possible
- Keep modifications minimal and natural
- Ensure the link adds value in context
- Don't force links into awkward positions
- Consider the reader's journey through the article

Output as plain text for easy copy/paste into a text file.`,
  tools: [
    webSearchTool(),
    linkRequestTool
  ]
});

// User prompt template for Link Requests
const LINK_REQUESTS_PROMPT = `Guest post site: {GUEST_POST_SITE}

Finalized guest post article:

{ARTICLE}`;

#### Step 14 - URL Suggestion Agent
```typescript
// URL suggestion agent
const urlSuggestionAgent = new Agent({
  name: 'UrlSuggestionAgent', 
  model: 'o3-2025-04-16',
  instructions: `Here's what I want you to do:

I'm going to give you a guest post website. I'm going to give you the pitch topic or keyword and I'm going to give you the article. What I want you to do is review the site and suggest what the article URL should be. Obviously it should be in the blog section, if it's a new section, if it's a new site. However, if the website has categories, then which category should it go into? Also, the exact URL that you choose should be keyword optimized. We don't want some super long URL. We want something that's thought out well based on SEO best practices.

Output just the suggested URL.`,
  tools: [
    webSearchTool(), // To review the site structure
    urlSuggestionTool
  ]
});

// User prompt template for URL Suggestion
const URL_SUGGESTION_PROMPT = `Guest post website: {GUEST_POST_SITE}

Pitch topic: {POST_TITLE}

Keyword: {KEYWORD}

Article content:

{ARTICLE}`;

// Database-driven prompts structure
const prompts = {
  internalLinks: INTERNAL_LINKS_PROMPT,
  clientMention: CLIENT_MENTION_PROMPT,
  clientLink: CLIENT_LINK_PROMPT,
  clientLinkFollowups: CLIENT_LINK_FOLLOWUPS,
  images: IMAGES_PROMPT,
  linkRequests: LINK_REQUESTS_PROMPT,
  urlSuggestion: URL_SUGGESTION_PROMPT,
  
  // Orchestration prompts
  phase1Introduction: 'Analyze this article for internal link and client mention opportunities...',
  phase2Introduction: 'Now add the client link based on previous modifications...',
  phase3Introduction: 'Analyze the final article for image strategy, link requests, and URL optimization...',
  completionCheck: 'Verify all modifications are complete and natural...'
};
```

### 8. SSE Streaming Updates
```typescript
// Real-time progress updates for all phases
sseUpdate(sessionId, {
  type: 'phase',
  phase: 'internal_links', // or 'client_mention', 'client_link', 'images', 'link_requests', 'url_suggestion'
  status: 'processing', // or 'completed', 'error'
  message: 'Analyzing article for internal link opportunities...'
});
```

### 9. Error Handling & Retry
- Apply retry pattern if agent outputs text instead of tools
- Validate each tool output before proceeding
- Rollback capability if final merge fails

### 10. UI Integration
```typescript
// New component: LinkOrchestrationStep.tsx
- Single button: "Run Link Optimization"
- Progress indicators for each sub-step
- Preview of changes before final save
- Option to accept/reject individual suggestions
```

## Implementation Steps

1. **Phase 1: Infrastructure**
   - Create database tables
   - Set up service class structure
   - Implement SSE connections

2. **Phase 2: Prompt Collection**
   - Extract prompts from each GPT (8, 10, 11)
   - Store in database or config
   - Create prompt builder functions

3. **Phase 3: Tool Implementation**
   - Build each tool with proper validation
   - Implement merge logic for article updates
   - Add position tracking for modifications

4. **Phase 4: Orchestration Logic**
   - Implement parallel phase 1
   - Implement sequential phase 2
   - Build final article merger

5. **Phase 5: UI Components**
   - Create orchestration step component
   - Add progress tracking
   - Implement preview/approval flow

## Article Modification System

### Natural Edit Merge Logic
```typescript
function applyModifications(article: string, modifications: Modification[]): string {
  // Sort by position (reverse to maintain positions during edits)
  const sorted = modifications.sort((a, b) => 
    findPosition(b.original_text, article) - findPosition(a.original_text, article)
  );
  
  let modifiedArticle = article;
  
  for (const mod of sorted) {
    switch (mod.modification_type) {
      case 'exact_replacement':
        // Simple find and replace
        modifiedArticle = modifiedArticle.replace(mod.suggested_change.from, mod.suggested_change.to);
        break;
        
      case 'sentence_rewrite':
        // Replace entire sentence
        const sentenceBounds = findSentenceBounds(modifiedArticle, mod.original_text);
        if (sentenceBounds) {
          modifiedArticle = 
            modifiedArticle.slice(0, sentenceBounds.start) + 
            mod.suggested_change.to + 
            modifiedArticle.slice(sentenceBounds.end);
        }
        break;
        
      case 'add_sentence':
        // Insert new sentence at appropriate position
        const insertPos = findInsertPosition(modifiedArticle, mod.surrounding_context);
        modifiedArticle = 
          modifiedArticle.slice(0, insertPos) + 
          ' ' + mod.suggested_change.to +
          modifiedArticle.slice(insertPos);
        break;
    }
  }
  
  return modifiedArticle;
}
```

### AI Prompt Instructions for Natural Edits
```
When suggesting modifications, choose the most natural approach:

1. EXACT_REPLACEMENT: Wrap existing text with a link
   - Use when: Text perfectly matches desired anchor text
   - Example: "SEO strategies" → "[SEO strategies](url)"

2. SENTENCE_REWRITE: Rewrite sentence to naturally include link
   - Use when: Link needs better context or flow
   - Example: "This improves rankings." → "This improves rankings through [proven SEO strategies](url)."

3. ADD_SENTENCE: Insert new sentence with link
   - Use when: No suitable text exists, additional context helps
   - Example: Add "For detailed implementation, see our [comprehensive guide](url)."

Always provide:
- modification_type
- exact "from" text (what to find)
- exact "to" text (the replacement)
- confidence score (0-1)
- rationale for your choice
```

## Key Decisions (Updated)

1. **Article Modification Tracking**
   - ✅ Use context-based matching with surrounding text
   - ✅ Support three modification types for flexibility

2. **Conflict Resolution**
   - Process modifications in reverse position order
   - If overlapping, apply highest confidence first
   - Log conflicts for user review

3. **Validation Rules**
   - Maximum 2 links per section
   - Minimum 100 chars between links
   - Relevance score must be > 0.7

4. **User Control**
   - Preview mode by default
   - Batch approve/reject options
   - Manual edit capability for each suggestion

## Important Implementation Notes (Updated for Steps 8-14)

### Internal Links Agent (Step 8)
- **Model**: Must be `o3-2025-04-16` 
- **Tools**: MUST include `webSearchTool()` for finding guest post articles
- **Instructions**: Uses system instructions (NOT empty like V2 pattern)
- **Key Constraints**:
  - Only suggest ONE internal link (not multiple)
  - Link must be from the guest post domain
  - Must avoid first half of article
  - Must avoid paragraph/section beginnings
  - Must find authoritative, ranking content

### Client Mention Agent (Step 10)
- **Model**: `o3-2025-04-16`
- **Tools**: `webSearchTool()` for verifying client claims
- **Purpose**: Strategic brand mentions for AI overviews (NOT links)
- **Key Requirements**:
  - Natural "commercial-term + brand name" format (e.g., "SOC 2 compliance software like Vanta")
  - Must pass five organic checks (context, backs claim, concrete example, useful resource, reads smoothly)
  - Verify ALL claims with 2 sources (1 client-owned, 1 additional)
  - NO hyperlinks - just brand mentions
  - Avoid intro/conclusion, competitors, first sentences
  - Middle of article placement preferred
  - One mention per article (unless >2k words)

### Client Link Agent (Step 11)
- **Model**: `o3-2025-04-16`
- **Tools**: `webSearchTool()` for crawling client URL
- **Key Requirements**:
  - Work only in TOP THIRD of article (skip intro)
  - Skip bullet lists and first sentences after headers
  - Natural first, SEO second
  - Can add minimal lead-in sentence (20 words max)
  - Must feel like citing a useful source
- **CRITICAL: Requires 3 Follow-up Prompts**:
  1. Context refinement prompt
  2. Source-based rewrite prompt  
  3. Anchor/URL validation prompt
  - System must send all 3 prompts sequentially
  - Only the final output after prompt 3 should be used

### Images Agent (Step 12)
- **Model**: `o3-2025-04-16`
- **Purpose**: Analyze article and provide image strategy (not create images)
- **Key Points**:
  - Does NOT interface with external Image Creator/Finder GPTs
  - Provides recommendations: 3 images for informational, 1 + products for listicles
  - Suggests placement and prompts for each image
  - User manually uses external GPTs based on recommendations

### Link Requests Agent (Step 13)
- **Model**: `o3-2025-04-16`
- **Tools**: `webSearchTool()` for finding existing articles on guest post site
- **Purpose**: Find 3 existing articles that should link TO the new guest post
- **Key Requirements**:
  - Searches guest post site for relevant existing content
  - Suggests specific placement in existing articles
  - Provides anchor text and relevance reasoning
  - Focus on value-add for readers of existing content

### URL Suggestion Agent (Step 14)
- **Model**: `o3-2025-04-16`
- **Purpose**: Suggest SEO-optimized URL structure
- **Key Requirements**:
  - Include primary keyword
  - 3-5 words ideal length
  - Use hyphens between words
  - Avoid stop words when possible
  - Consider both SEO and readability

### Orchestration Considerations
- Phase 1: Internal Links and Client Mention run in parallel
- Phase 2: Client Link runs sequentially with 3 follow-up prompts
- Phase 3: Images, Link Requests, and URL Suggestion run in parallel
- All agents use predefined system instructions (not V2 empty pattern)
- Simple prompt formats rely on comprehensive system instructions
- Client Link requires multi-turn conversation for refinement
- Phase 3 agents provide recommendations/analysis, not direct modifications

## Next Steps
1. ✅ Review and approve this plan 
2. ✅ Collect Internal Links GPT prompt (Step 8)
3. ✅ Collect Client Mention GPT prompt (Step 10)
4. ✅ Collect Client Link GPT prompt (Step 11) - with 3 follow-ups
5. ✅ Add steps 12-14 to orchestration plan
6. 🔄 Start with database schema implementation
7. 🔄 Build service class skeleton
8. 🔄 Implement tools incrementally
9. 🔄 Create unified UI component for steps 8-14

## Notes
- Consider caching article analysis to avoid re-parsing
- Track token usage for cost optimization
- Plan for future addition of Step 9 (External Links with Airtable)
- Remember article retrieval fallback chain for all steps
- Steps 12-14 are analysis/recommendation steps, not content modification
- External GPT links maintained for Image Creator/Finder in Step 12