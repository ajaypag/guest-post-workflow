import OpenAI from 'openai';

interface QualificationResult {
  domainId: string;
  domain: string;
  qualification: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified';
  reasoning: string;
  // V2 fields
  overlapStatus: 'direct' | 'related' | 'both' | 'none';
  authorityDirect: 'strong' | 'moderate' | 'weak' | 'n/a';
  authorityRelated: 'strong' | 'moderate' | 'weak' | 'n/a';
  topicScope: 'short_tail' | 'long_tail' | 'ultra_long_tail';
  evidence: {
    direct_count: number;
    direct_median_position: number | null;
    related_count: number;
    related_median_position: number | null;
  };
}

interface DomainData {
  domainId: string;
  domain: string;
  keywordRankings: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    url: string;
  }>;
}

interface ClientContext {
  targetPages: Array<{
    url: string;
    keywords: string[];
    description?: string;
  }>;
  clientKeywords: string[]; // All keywords from narrow to broad
}

/**
 * AI-powered site qualification service using O3 model
 * Evaluates guest post opportunities based on topical relevance and ranking potential
 */
export class AIQualificationService {
  private openai: OpenAI;
  private readonly MAX_CONCURRENT = 10; // Process up to 10 domains in parallel

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Qualify multiple domains with concurrent processing
   */
  async qualifyDomains(
    domains: DomainData[],
    clientContext: ClientContext,
    onProgress?: (completed: number, total: number) => void
  ): Promise<QualificationResult[]> {
    console.log(`🤖 Starting AI qualification for ${domains.length} domains`);
    
    const results: QualificationResult[] = [];
    let completed = 0;
    
    // Process domains in chunks of MAX_CONCURRENT at a time
    for (let i = 0; i < domains.length; i += this.MAX_CONCURRENT) {
      const chunk = domains.slice(i, i + this.MAX_CONCURRENT);
      
      // Process each domain in the chunk concurrently
      const chunkPromises = chunk.map(domain => 
        this.processSingleDomain(domain, clientContext)
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Report progress
      completed += chunk.length;
      onProgress?.(completed, domains.length);
      
      console.log(`✅ Processed ${completed}/${domains.length} domains`);
    }
    
    return results;
  }

  /**
   * Process a single domain
   */
  private async processSingleDomain(
    domain: DomainData,
    clientContext: ClientContext
  ): Promise<QualificationResult> {
    try {
      const prompt = this.buildPromptForSingleDomain(domain, clientContext);
      
      const response = await this.openai.chat.completions.create({
        model: "o3-2025-04-16",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from AI');

      // Log the raw response for debugging
      console.log(`🔍 Raw AI response for ${domain.domain}:`, content.substring(0, 200));

      // Try to parse JSON from the response
      let result;
      try {
        // If the response starts with text, try to extract JSON
        if (!content.trim().startsWith('{')) {
          // Look for JSON in the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } else {
          result = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.error('Full response:', content);
        throw new Error('Invalid JSON in AI response');
      }
      
      // Validate the V2 result structure
      if (result.qualification && result.reasoning) {
        // Log the parsed result for debugging
        console.log(`✅ Parsed AI response for ${domain.domain}:`, {
          qualification: result.qualification,
          overlap_status: result.overlap_status,
          authority_direct: result.authority_direct,
          authority_related: result.authority_related,
          topic_scope: result.topic_scope,
          evidence: result.evidence
        });
        
        return {
          domainId: domain.domainId,
          domain: domain.domain,
          qualification: this.validateQualification(result.qualification),
          reasoning: result.reasoning,
          overlapStatus: result.overlap_status || 'none',
          authorityDirect: result.authority_direct || 'n/a',
          authorityRelated: result.authority_related || 'n/a',
          topicScope: result.topic_scope || 'long_tail',
          evidence: result.evidence ? {
            direct_count: result.evidence.direct_count || 0,
            direct_median_position: result.evidence.direct_median_position || null,
            related_count: result.evidence.related_count || 0,
            related_median_position: result.evidence.related_median_position || null
          } : {
            direct_count: 0,
            direct_median_position: null,
            related_count: 0,
            related_median_position: null
          }
        };
      }
      
      throw new Error('Invalid response format from AI');

    } catch (error) {
      console.error(`Domain ${domain.domain} processing error:`, error);
      // Return as needing manual review
      return {
        domainId: domain.domainId,
        domain: domain.domain,
        qualification: 'marginal_quality' as const,
        reasoning: 'AI processing error - requires manual review',
        overlapStatus: 'none',
        authorityDirect: 'n/a',
        authorityRelated: 'n/a',
        topicScope: 'long_tail',
        evidence: {
          direct_count: 0,
          direct_median_position: null,
          related_count: 0,
          related_median_position: null
        }
      };
    }
  }

  private buildPromptForSingleDomain(domain: DomainData, context: ClientContext): string {
    // Format client data
    const clientInfo = {
      targetPages: context.targetPages.map(page => ({
        url: page.url,
        keywords: page.keywords.join(', '),
        description: page.description || ''
      })),
      keywordThemes: this.extractKeywordThemes(context.clientKeywords)
    };

    // Include ALL keyword rankings - no filtering or limiting
    const domainInfo = {
      domainId: domain.domainId,
      domain: domain.domain,
      totalKeywords: domain.keywordRankings.length,
      keywordRankings: domain.keywordRankings
        .sort((a, b) => {
          // Still sort by position then volume for better readability
          if (a.position !== b.position) return a.position - b.position;
          return b.searchVolume - a.searchVolume;
        })
        .map(r => ({
          keyword: r.keyword,
          position: r.position,
          volume: r.searchVolume,
          url: r.url
        }))
    };

    return `You will receive two JSON blobs:

 • **Client Information**  
   – Each page: url, one-sentence description  
   – List of core keywords (from narrow long-tails up to broad terms)

 • **Site to Evaluate**  
   – Domain name  
   – List of all its keyword rankings  
     (keyword, Google position ≤100, optional volume)

YOUR TASK  
1. Read all keywords for both sides and judge topical overlap:  
   - *Direct*  → the site already ranks for a client core term  
   - *Related* → the site ranks for an obviously relevant sibling topic but not the exact core term  
   If both Direct and Related exist, note that as "Both."  
   If nothing meaningful appears, mark as "None."

2. Estimate how strong the site is inside each overlap bucket:  
   *Strong* ≈ positions 1-30 (pages 1-3)  
   *Moderate* ≈ positions 31-60 (pages 4-6)  
   *Weak* ≈ positions 61-100 (pages 7-10)  
   Use median position or any sensible heuristic—you choose.

3. Return a verdict:  
   • **high_quality**  
        Direct overlap AND strength is Strong or Moderate  
   • **good_quality**  
        a) Direct overlap but strength is Weak  OR  
        b) No Direct overlap, but Related overlap is Strong/Moderate  
   • **marginal_quality**  
        Some overlap exists, yet every strength signal looks Weak  
   • **disqualified**  
        No meaningful overlap at all

4. Determine topic scope based on guest site authority:
   • **short_tail** - Site can rank for broad core term without modifiers
   • **long_tail** - Site needs simple modifier (geo, buyer type, "best", "how to")  
   • **ultra_long_tail** - Site needs very specific niche angle with multiple modifiers

5. Provide evidence counts & median positions so a human can audit your call. Keep the explanation concise, actionable, and framed in SEO language.

   The reasoning must include two parts:
   a) Why this tail level citing specific keywords/positions
   b) What kind of modifier guidance (NO suggested keywords, just modifier type)

Client Information:
${JSON.stringify(clientInfo, null, 2)}

Site to Evaluate:
${JSON.stringify(domainInfo, null, 2)}

OUTPUT — RETURN EXACTLY THIS JSON
{
  "qualification": "high_quality" | "good_quality" | "marginal_quality" | "disqualified",
  "overlap_status": "direct" | "related" | "both" | "none",
  "authority_direct": "strong" | "moderate" | "weak" | "n/a",
  "authority_related": "strong" | "moderate" | "weak" | "n/a",
  "topic_scope": "short_tail" | "long_tail" | "ultra_long_tail",
  "evidence": {
      "direct_count": <integer>,
      "direct_median_position": <integer or null>,
      "related_count": <integer>,
      "related_median_position": <integer or null>
  },
  "reasoning": "One–two short paragraphs explaining why the verdict makes sense, which keyword clusters prove authority, and how that benefits (or fails) the client. Include: (a) Why this tail level citing keywords/positions (b) Modifier guidance (e.g. 'add geo modifier', 'use buyer-type qualifier', 'no modifier needed')"
}`;
  }

  private extractKeywordThemes(keywords: string[]): string[] {
    // Group keywords by common terms to identify themes
    const themes = new Set<string>();
    const commonWords = new Map<string, number>();
    
    // Count word frequency
    keywords.forEach(keyword => {
      const words = keyword.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Skip short words
          commonWords.set(word, (commonWords.get(word) || 0) + 1);
        }
      });
    });
    
    // Extract themes (words that appear in multiple keywords)
    Array.from(commonWords.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([word]) => themes.add(word));
    
    return Array.from(themes);
  }


  private validateQualification(qual: string): 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified' {
    const valid = ['high_quality', 'good_quality', 'marginal_quality', 'disqualified'];
    return valid.includes(qual) ? qual as any : 'marginal_quality';
  }
}