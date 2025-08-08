# Exact Prompt Sent to Responses API

## API Call Structure

```typescript
const response = await this.openai.responses.create({
  model: "o3",
  input: prompt,  // <-- This contains the ENTIRE prompt below
  reasoning: { effort: "high" },
  store: true
});
```

## Example with Real Data

Here's an exact example of what gets sent as the `input` parameter:

```
You will receive two JSON blobs:

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
{
  "targetPages": [
    {
      "url": "https://clientsite.com/guest-posting-services",
      "keywords": "guest posting services, guest post service, professional guest posting",
      "description": "Professional guest posting and link building services"
    },
    {
      "url": "https://clientsite.com/link-building",
      "keywords": "link building services, quality backlinks, SEO link building",
      "description": "High-quality link building and outreach services"
    }
  ],
  "keywordThemes": [
    "guest",
    "posting",
    "services",
    "link",
    "building"
  ]
}

Site to Evaluate:
{
  "domainId": "dom_abc123",
  "domain": "techblog.example.com",
  "totalKeywords": 25,
  "keywordRankings": [
    {
      "keyword": "guest posting guidelines",
      "position": 12,
      "volume": 500,
      "url": "https://techblog.example.com/write-for-us"
    },
    {
      "keyword": "submit guest post",
      "position": 18,
      "volume": 300,
      "url": "https://techblog.example.com/write-for-us"
    },
    {
      "keyword": "technology guest posts",
      "position": 25,
      "volume": 200,
      "url": "https://techblog.example.com/guest-post-guidelines"
    },
    {
      "keyword": "link building strategies",
      "position": 42,
      "volume": 1000,
      "url": "https://techblog.example.com/seo/link-building-guide"
    },
    {
      "keyword": "SEO tips",
      "position": 55,
      "volume": 2000,
      "url": "https://techblog.example.com/seo/tips"
    },
    {
      "keyword": "content marketing",
      "position": 67,
      "volume": 1500,
      "url": "https://techblog.example.com/marketing/content-strategy"
    },
    {
      "keyword": "tech news",
      "position": 8,
      "volume": 5000,
      "url": "https://techblog.example.com/"
    },
    {
      "keyword": "software reviews",
      "position": 15,
      "volume": 3000,
      "url": "https://techblog.example.com/reviews"
    },
    {
      "keyword": "AI technology trends",
      "position": 22,
      "volume": 800,
      "url": "https://techblog.example.com/ai/trends"
    },
    {
      "keyword": "cybersecurity best practices",
      "position": 35,
      "volume": 600,
      "url": "https://techblog.example.com/security/best-practices"
    },
    {
      "keyword": "cloud computing",
      "position": 45,
      "volume": 2500,
      "url": "https://techblog.example.com/cloud"
    },
    {
      "keyword": "web development",
      "position": 52,
      "volume": 2000,
      "url": "https://techblog.example.com/dev"
    },
    {
      "keyword": "digital transformation",
      "position": 71,
      "volume": 900,
      "url": "https://techblog.example.com/digital-transformation"
    },
    {
      "keyword": "startup technology",
      "position": 83,
      "volume": 400,
      "url": "https://techblog.example.com/startups"
    },
    {
      "keyword": "mobile app development",
      "position": 91,
      "volume": 1200,
      "url": "https://techblog.example.com/mobile"
    }
  ]
}

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
}
```

## What Happens

1. The entire text above (instructions + JSON data) is sent as a single string in the `input` parameter
2. The model reads the instructions and analyzes the data
3. It returns a JSON response following the specified format
4. We parse the `output_text` field from the response to get the JSON result

## Key Points

- No prompt ID is used
- No separate instructions parameter
- Everything goes into the `input` field as one complete prompt
- The prompt includes both the task instructions AND the data to analyze