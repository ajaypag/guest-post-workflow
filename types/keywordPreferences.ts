// Comprehensive keyword preference types based on professional keyword research framework

export type KeywordLength = 'head' | 'mid-tail' | 'long-tail';
export type SearcherIntent = 'informational' | 'navigational' | 'commercial-investigation' | 'transactional';
export type BrandAssociation = 'branded' | 'non-branded' | 'mixed';
export type LocationFocus = 'local' | 'national' | 'global';
export type ResearchRole = 'seed' | 'lsi-semantic' | 'question' | 'comparison';
export type FunnelStage = 'awareness' | 'consideration' | 'decision';
export type SpecialFormat = 'voice-conversational' | 'image-visual' | 'hashtag-social' | 'standard';

// Primary preference categories for simplified UI
export type PrimaryKeywordFocus = 
  | 'commercial-investigation'  // Reviews, comparisons, evaluations
  | 'informational'            // How-to, guides, educational
  | 'transactional'           // Buying intent, purchase-focused
  | 'mixed'                   // Balanced approach
  | 'custom';                 // Advanced custom configuration

// Detailed keyword preferences
export interface KeywordPreferences {
  // Primary simple selection
  primaryFocus: PrimaryKeywordFocus;
  
  // Detailed preferences (for advanced users)
  detailed: {
    length: KeywordLength[];
    intent: SearcherIntent[];
    brandAssociation: BrandAssociation;
    locationFocus: LocationFocus;
    researchRole: ResearchRole[];
    funnelStage: FunnelStage[];
    specialFormat: SpecialFormat[];
  };
  
  // Custom notes and instructions
  customInstructions?: string;
  
  // Target URL specific overrides
  urlSpecificPreferences?: {
    [url: string]: {
      primaryFocus: PrimaryKeywordFocus;
      reason?: string;
      customInstructions?: string;
    };
  };
}

// Default preference templates
export const KEYWORD_PREFERENCE_TEMPLATES: Record<PrimaryKeywordFocus, Partial<KeywordPreferences>> = {
  'commercial-investigation': {
    primaryFocus: 'commercial-investigation',
    detailed: {
      length: ['mid-tail', 'long-tail'],
      intent: ['commercial-investigation'],
      brandAssociation: 'mixed',
      locationFocus: 'national',
      researchRole: ['comparison', 'seed'],
      funnelStage: ['consideration'],
      specialFormat: ['standard']
    },
    customInstructions: 'Focus on comparison keywords, review terms, and evaluation phrases that indicate buying research intent.'
  },
  
  'informational': {
    primaryFocus: 'informational',
    detailed: {
      length: ['mid-tail', 'long-tail'],
      intent: ['informational'],
      brandAssociation: 'non-branded',
      locationFocus: 'national',
      researchRole: ['question', 'lsi-semantic'],
      funnelStage: ['awareness'],
      specialFormat: ['standard', 'voice-conversational']
    },
    customInstructions: 'Focus on educational keywords, how-to terms, and informational queries that help users learn.'
  },
  
  'transactional': {
    primaryFocus: 'transactional',
    detailed: {
      length: ['head', 'mid-tail'],
      intent: ['transactional'],
      brandAssociation: 'mixed',
      locationFocus: 'national',
      researchRole: ['seed'],
      funnelStage: ['decision'],
      specialFormat: ['standard']
    },
    customInstructions: 'Focus on high-intent keywords that indicate ready-to-purchase behavior and direct buying signals.'
  },
  
  'mixed': {
    primaryFocus: 'mixed',
    detailed: {
      length: ['mid-tail', 'long-tail'],
      intent: ['informational', 'commercial-investigation'],
      brandAssociation: 'mixed',
      locationFocus: 'national',
      researchRole: ['seed', 'question', 'comparison'],
      funnelStage: ['awareness', 'consideration'],
      specialFormat: ['standard']
    },
    customInstructions: 'Use a balanced approach mixing educational and commercial keywords to capture users at different funnel stages.'
  },
  
  'custom': {
    primaryFocus: 'custom',
    detailed: {
      length: ['mid-tail'],
      intent: ['informational'],
      brandAssociation: 'non-branded',
      locationFocus: 'national',
      researchRole: ['seed'],
      funnelStage: ['awareness'],
      specialFormat: ['standard']
    }
  }
};

// Human-readable descriptions for UI
export const KEYWORD_DESCRIPTIONS = {
  primaryFocus: {
    'commercial-investigation': {
      title: 'Commercial Investigation',
      description: 'Reviews, comparisons, "best of" lists. Users researching before buying.',
      examples: '"best project management software", "Asana vs Monday review"'
    },
    'informational': {
      title: 'Informational',
      description: 'Educational content, how-to guides, explanatory articles.',
      examples: '"how to manage remote teams", "what is agile methodology"'
    },
    'transactional': {
      title: 'Transactional',
      description: 'High purchase intent, ready-to-buy keywords.',
      examples: '"buy project management software", "Asana pricing plans"'
    },
    'mixed': {
      title: 'Mixed Approach',
      description: 'Balanced strategy covering multiple intent types.',
      examples: 'Combination of educational and commercial terms'
    },
    'custom': {
      title: 'Custom Configuration',
      description: 'Advanced users can configure detailed preferences.',
      examples: 'Fully customizable based on specific requirements'
    }
  },
  
  length: {
    'head': { title: 'Head Terms', description: 'Short, broad keywords (1-2 words)', example: '"shoes"' },
    'mid-tail': { title: 'Mid-tail', description: 'Moderate specificity (2-3 words)', example: '"running shoes"' },
    'long-tail': { title: 'Long-tail', description: 'Highly specific (4+ words)', example: '"best cushioned running shoes for flat feet"' }
  },
  
  intent: {
    'informational': { title: 'Informational', description: 'Learning and research', example: '"how to tie running shoes"' },
    'navigational': { title: 'Navigational', description: 'Finding specific sites/brands', example: '"nike store near me"' },
    'commercial-investigation': { title: 'Commercial Investigation', description: 'Pre-purchase research', example: '"nike pegasus review"' },
    'transactional': { title: 'Transactional', description: 'Ready to purchase', example: '"buy nike pegasus size 10"' }
  }
};

// Generate prompt enhancement text based on preferences
export function generatePromptEnhancement(preferences: KeywordPreferences, targetUrl?: string): string {
  // Check for URL-specific preferences first
  if (targetUrl && preferences.urlSpecificPreferences?.[targetUrl]) {
    const urlPref = preferences.urlSpecificPreferences[targetUrl];
    let enhancement = `\n\nNote: For this target URL, I prefer ${urlPref.primaryFocus.replace('-', ' ')} keywords.`;
    
    if (urlPref.reason) {
      enhancement += ` Reason: ${urlPref.reason}`;
    }
    
    if (urlPref.customInstructions) {
      enhancement += ` ${urlPref.customInstructions}`;
    }
    
    return enhancement;
  }
  
  // Use general client preferences
  const template = KEYWORD_PREFERENCE_TEMPLATES[preferences.primaryFocus];
  let enhancement = `\n\nNote: I prefer ${preferences.primaryFocus.replace('-', ' ')} keywords.`;
  
  if (template?.customInstructions) {
    enhancement += ` ${template.customInstructions}`;
  }
  
  if (preferences.customInstructions) {
    enhancement += ` Additional instructions: ${preferences.customInstructions}`;
  }
  
  return enhancement;
}

// Client interface with keyword preferences
export interface ClientWithPreferences {
  id: string;
  name: string;
  website: string;
  keywordPreferences?: KeywordPreferences;
  // ... other client properties
}