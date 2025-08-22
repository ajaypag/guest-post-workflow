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

interface TargetMatchResult {
  domainId: string;
  domain: string;
  target_analysis: Array<{
    target_url: string;
    overlap_status: 'direct' | 'related' | 'both' | 'none';
    strength_direct: 'strong' | 'moderate' | 'weak' | 'n/a';
    strength_related: 'strong' | 'moderate' | 'weak' | 'n/a';
    match_quality: 'excellent' | 'good' | 'fair' | 'poor';
    evidence: {
      direct_count: number;
      direct_median_position: number | null;
      direct_keywords: string[];
      related_count: number;
      related_median_position: number | null;
      related_keywords: string[];
    };
    reasoning: string;
  }>;
  best_target_url: string;
  recommendation_summary: string;
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
   * Step 2: Match qualified domains to target URLs
   */
  async matchTargetUrls(
    qualifiedDomains: Array<{domain: DomainData, qualification: QualificationResult}>,
    clientContext: ClientContext,
    onProgress?: (completed: number, total: number) => void
  ): Promise<TargetMatchResult[]> {
    console.log(`🎯 Starting target URL matching for ${qualifiedDomains.length} qualified domains`);
    
    const results: TargetMatchResult[] = [];
    let completed = 0;
    
    // Process domains in chunks of MAX_CONCURRENT at a time
    for (let i = 0; i < qualifiedDomains.length; i += this.MAX_CONCURRENT) {
      const chunk = qualifiedDomains.slice(i, i + this.MAX_CONCURRENT);
      
      // Process each domain in the chunk concurrently
      const chunkPromises = chunk.map(({ domain, qualification }) => 
        this.processTargetMatching(domain, clientContext)
          .catch(error => {
            console.error(`Skipping target matching for ${domain.domain} due to error:`, error);
            // Return null for errors - will be filtered out
            return null;
          })
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      // Only add successful results - errors remain as pending
      results.push(...chunkResults.filter((r): r is TargetMatchResult => r !== null));
      
      // Report progress
      completed += chunk.length;
      onProgress?.(completed, qualifiedDomains.length);
      
      console.log(`✅ Target matched ${completed}/${qualifiedDomains.length} domains`);
    }
    
    return results;
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
          .catch(error => {
            console.error(`Skipping ${domain.domain} due to error:`, error);
            // Return null for errors - will be filtered out
            return null;
          })
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      // Only add successful results - errors remain as pending
      results.push(...chunkResults.filter((r): r is QualificationResult => r !== null));
      
      // Report progress
      completed += chunk.length;
      onProgress?.(completed, domains.length);
      
      console.log(`✅ Processed ${completed}/${domains.length} domains`);
    }
    
    return results;
  }

  /**
   * Process target matching for a single domain
   */
  private async processTargetMatching(
    domain: DomainData, 
    context: ClientContext
  ): Promise<TargetMatchResult> {
    try {
      const prompt = this.buildTargetMatchingPrompt(domain, context);
      
      const response = await this.openai.responses.create({
        model: "o3",
        input: prompt,
        reasoning: { effort: "high" },
        store: true
      });

      const content = response.output_text;
      if (!content) throw new Error('No response from AI');

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
        console.error('Failed to parse AI target matching response as JSON:', parseError);
        console.error('Full response:', content);
        throw new Error('Invalid JSON in AI target matching response');
      }
      
      // Validate the target matching result structure
      if (result.target_analysis && result.best_target_url && result.recommendation_summary) {
        return {
          domainId: domain.domainId,
          domain: domain.domain,
          target_analysis: result.target_analysis || [],
          best_target_url: result.best_target_url,
          recommendation_summary: result.recommendation_summary
        };
      }
      
      throw new Error('Invalid target matching response format from AI');

    } catch (error) {
      console.error(`Target matching for domain ${domain.domain} failed:`, error);
      // Re-throw to let caller handle - domain will remain pending
      throw error;
    }
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
      
      const response = await this.openai.responses.create({
        model: "o3",
        input: prompt,  // Put entire prompt as input (includes instructions + data)
        reasoning: { effort: "high" },
        store: true
      });

      const content = response.output_text;
      if (!content) throw new Error('No response from AI');


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
      // Re-throw to let caller handle - domain will remain pending
      throw error;
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
      clientKeywords: context.clientKeywords
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
   – Each potential target page: url, description  
   – List of relevant niche keywords (from highly specific up to broader industry terms)

 • **Guest Post Site to Evaluate**  
   – Domain name  
   – List of all its keyword rankings that overlap with the client's list of relevant niche keywords  
     (keyword, Google position ≤100, optional volume)

YOUR TASK  
1. Read all keywords for both sides and judge topical overlap:  
   - *Direct*  → the site already ranks for a highly specific client niche term  
   - *Related* → the site ranks for an obviously relevant sibling/broader industry topic but not the highly specific ones.  
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
   • **short_tail** - Site can rank for broader industry term without modifiers
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

  private buildTargetMatchingPrompt(domain: DomainData, context: ClientContext): string {
    // Format client data
    const clientInfo = {
      targetPages: context.targetPages.map(page => ({
        url: page.url,
        keywords: page.keywords.join(', '),
        description: page.description || ''
      })),
      clientKeywords: context.clientKeywords
    };

    // Include ALL keyword rankings - no filtering or limiting
    const domainInfo = {
      domainId: domain.domainId,
      domain: domain.domain,
      totalKeywords: domain.keywordRankings.length,
      keywordRankings: domain.keywordRankings
        .sort((a, b) => {
          // Sort by position then volume for better readability
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

    return `You will match a qualified guest post site to the best target URLs.

**Your Task:**
For EACH target URL, analyze the topical overlap and ranking strength.

**Analysis Framework:**

1. **Overlap Assessment per Target URL:**
   For each target URL, judge topical overlap between the site's rankings and that specific target URL's keywords:
   - *Direct* → Site already ranks for highly specific keywords that match this target URL's niche  
   - *Related* → Site ranks for obviously relevant sibling/broader industry topics to this target URL but not the highly specific ones
   - *Both* → Site has both direct and related keyword coverage for this target URL
   - *None* → No meaningful keyword alignment with this target URL

2. **Strength Assessment per Overlap Type:**
   *Strong* ≈ positions 1-30 (pages 1-3)  
   *Moderate* ≈ positions 31-60 (pages 4-6)  
   *Weak* ≈ positions 61-100 (pages 7-10)
   
3. **Match Quality Determination:**
   • **excellent** → Direct overlap AND Strong/Moderate strength
   • **good** → Direct overlap with Weak strength OR Related overlap with Strong/Moderate strength
   • **fair** → Related overlap with Weak strength OR mixed signals
   • **poor** → No meaningful overlap

4. **Evidence Collection:**
   Count matches and identify median positions for audit trail.

Client Target URLs to Match:
${JSON.stringify(clientInfo, null, 2)}

Guest Post Site Rankings:
${JSON.stringify(domainInfo, null, 2)}

OUTPUT — RETURN EXACTLY THIS JSON:
{
  "target_analysis": [
    {
      "target_url": "<URL>",
      "overlap_status": "direct" | "related" | "both" | "none",
      "strength_direct": "strong" | "moderate" | "weak" | "n/a",
      "strength_related": "strong" | "moderate" | "weak" | "n/a", 
      "match_quality": "excellent" | "good" | "fair" | "poor",
      "evidence": {
        "direct_count": <integer>,
        "direct_median_position": <integer or null>,
        "direct_keywords": ["keyword1 (pos #X)", "keyword2 (pos #Y)"],
        "related_count": <integer>,
        "related_median_position": <integer or null>,
        "related_keywords": ["keyword1 (pos #X)", "keyword2 (pos #Y)"]
      },
      "reasoning": "Brief explanation of match quality and evidence"
    }
  ],
  "best_target_url": "<URL with highest match quality>",
  "recommendation_summary": "Overall strategy recommendation based on strongest matches"
}`;
  }

  private validateQualification(qual: string): 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified' {
    const valid = ['high_quality', 'good_quality', 'marginal_quality', 'disqualified'];
    return valid.includes(qual) ? qual as any : 'marginal_quality';
  }
}