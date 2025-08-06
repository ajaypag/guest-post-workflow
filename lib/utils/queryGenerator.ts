// Query generation utility for server-side rendering
export interface GeneratedQuery {
  query: string;
  type: string;
  description: string;
}

// Popular guest post search operators organized by type
const SEARCH_OPERATORS = {
  basic: [
    { operator: '"write for us"', description: 'Direct write for us pages' },
    { operator: '"guest post"', description: 'General guest posting opportunities' },
    { operator: '"guest author"', description: 'Sites seeking guest authors' },
    { operator: '"contribute"', description: 'Contribution opportunities' },
    { operator: '"submit"', description: 'Submission guidelines' }
  ],
  advanced: [
    { operator: 'inurl:write-for-us', description: 'URLs containing write-for-us' },
    { operator: 'inurl:guest-post', description: 'URLs containing guest-post' },
    { operator: 'inurl:contribute', description: 'URLs containing contribute' },
    { operator: 'intitle:"write for us"', description: 'Page titles with write for us' },
    { operator: 'intitle:"guest post"', description: 'Page titles with guest post' }
  ],
  quality: [
    { operator: '"guest posting guidelines"', description: 'Detailed submission rules' },
    { operator: '"editorial guidelines"', description: 'Editorial standards' },
    { operator: '"submission requirements"', description: 'Submission criteria' },
    { operator: '"author guidelines"', description: 'Author submission rules' },
    { operator: '"content guidelines"', description: 'Content quality standards' }
  ]
};

// Niche-specific modifiers to add variety
const NICHE_MODIFIERS = {
  health: ['wellness', 'fitness', 'nutrition', 'medical', 'healthcare'],
  business: ['entrepreneur', 'startup', 'corporate', 'finance', 'marketing'],
  technology: ['tech', 'software', 'digital', 'innovation', 'IT'],
  lifestyle: ['living', 'culture', 'personal', 'daily', 'modern'],
  finance: ['money', 'investment', 'financial', 'banking', 'wealth'],
  fitness: ['workout', 'exercise', 'training', 'gym', 'sports'],
  travel: ['tourism', 'vacation', 'adventure', 'destination', 'journey'],
  food: ['cooking', 'recipe', 'culinary', 'restaurant', 'dining'],
  marketing: ['advertising', 'branding', 'digital marketing', 'social media', 'SEO'],
  education: ['learning', 'academic', 'teaching', 'school', 'university']
};

export function generateNicheQueries(categoryName: string): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const niche = categoryName.toLowerCase();
  const modifiers = NICHE_MODIFIERS[niche as keyof typeof NICHE_MODIFIERS] || [niche];
  
  // Basic niche + operators
  Object.entries(SEARCH_OPERATORS).forEach(([category, operators]) => {
    operators.forEach(op => {
      queries.push({
        query: `${op.operator} + "${niche}"`,
        type: `${category.charAt(0).toUpperCase() + category.slice(1)} Niche`,
        description: `${niche} ${op.description.toLowerCase()}`
      });
    });
  });

  // Niche with modifiers
  modifiers.slice(0, 3).forEach(modifier => {
    queries.push({
      query: `"write for us" + "${modifier}"`,
      type: 'Modifier Search',
      description: `${modifier} guest posting opportunities`
    });
    
    queries.push({
      query: `"guest post" + "${modifier}" + "guidelines"`,
      type: 'Guidelines Search',
      description: `${modifier} guest post submission rules`
    });
  });

  // Advanced combinations
  queries.push({
    query: `inurl:write-for-us + "${niche}" + "blog"`,
    type: 'Advanced URL',
    description: `${niche} blog write-for-us pages`
  });

  queries.push({
    query: `intitle:"guest post" + "${niche}" + "submit"`,
    type: 'Advanced Title',
    description: `${niche} guest post submission pages`
  });

  queries.push({
    query: `"${niche}" + "guest author" + "contribute"`,
    type: 'Author Opportunity',
    description: `${niche} guest author opportunities`
  });

  queries.push({
    query: `"${niche}" + "write for us" + "pitch"`,
    type: 'Pitch Opportunity',
    description: `${niche} sites accepting pitches`
  });

  // Quality-focused searches
  queries.push({
    query: `"${niche}" + "guest posting guidelines" + "high quality"`,
    type: 'Quality Focus',
    description: `High-quality ${niche} guest posting sites`
  });

  queries.push({
    query: `"${niche}" + "editorial standards" + "guest post"`,
    type: 'Editorial Standards',
    description: `${niche} sites with editorial standards`
  });

  // Long-tail opportunities
  modifiers.slice(0, 2).forEach(modifier => {
    queries.push({
      query: `"${modifier}" + "guest post" + "accept submissions"`,
      type: 'Long-tail Opportunity',
      description: `${modifier} sites accepting submissions`
    });
    
    queries.push({
      query: `"${modifier}" + "write for us" + "author bio"`,
      type: 'Bio Opportunity',
      description: `${modifier} sites allowing author bios`
    });
  });

  // Industry-specific searches
  queries.push({
    query: `"${niche} industry" + "guest post" + "expert"`,
    type: 'Industry Expert',
    description: `${niche} industry expert guest posts`
  });

  queries.push({
    query: `"${niche} blog" + "guest contributor" + "wanted"`,
    type: 'Contributor Wanted',
    description: `${niche} blogs seeking contributors`
  });

  // Resource page opportunities
  queries.push({
    query: `"${niche} resources" + "submit" + "link"`,
    type: 'Resource Page',
    description: `${niche} resource page opportunities`
  });

  // Remove duplicates and limit to reasonable number
  const uniqueQueries = queries.filter((query, index, self) => 
    index === self.findIndex(q => q.query === query.query)
  );

  return uniqueQueries.slice(0, 25); // Limit to 25 for page performance
}

export function getQueryUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}