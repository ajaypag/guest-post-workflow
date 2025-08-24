// SAFE IMPLEMENTATION: Guest post topic preferences using existing workflow metadata
// No database schema changes required

export type PrimaryKeywordFocus = 
  | 'commercial-investigation'  // Reviews, comparisons, evaluations
  | 'informational'            // How-to, guides, educational
  | 'transactional'           // Buying intent, purchase-focused
  | 'mixed'                   // Balanced approach
  | 'local'                   // Location-based keywords
  | 'custom';                 // Advanced custom configuration

// Guest post topic preferences for targeting specific content types
export interface KeywordPreferences {
  // Primary simple selection
  primaryFocus: PrimaryKeywordFocus;
  
  // Custom notes and instructions
  customInstructions?: string;
  
  // Target URL specific overrides (optional)
  urlSpecificPreferences?: {
    [url: string]: {
      primaryFocus: PrimaryKeywordFocus;
      reason?: string;
      customInstructions?: string;
    };
  };
}

// Default guest post topic preference templates
export const KEYWORD_PREFERENCE_TEMPLATES: Record<PrimaryKeywordFocus, Partial<KeywordPreferences>> = {
  'commercial-investigation': {
    primaryFocus: 'commercial-investigation',
    customInstructions: 'Focus on comparison topics, review articles, and evaluation content that targets buying research intent.'
  },
  
  'informational': {
    primaryFocus: 'informational',
    customInstructions: 'Focus on educational topics, how-to guides, and informational content that helps users learn.'
  },
  
  'transactional': {
    primaryFocus: 'transactional',
    customInstructions: 'Focus on high-intent topics that target ready-to-purchase behavior and direct buying signals.'
  },
  
  'mixed': {
    primaryFocus: 'mixed',
    customInstructions: 'Use a balanced approach mixing educational and commercial topics to capture users at different funnel stages.'
  },
  
  'custom': {
    primaryFocus: 'custom'
  },
  
  'local': {
    primaryFocus: 'local',
    customInstructions: 'Focus on location-based topics, related to the client area'
  }
};

// Human-readable descriptions for guest post topic types
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
      description: 'Define your own keyword preference instructions.',
      examples: 'Fully customizable based on specific requirements'
    },
    'local': {
      title: 'Local/Location-Based',
      description: 'Geographic and location-specific keywords for local businesses and area-based services.',
      examples: '"plumber in Denver", "best restaurants near me", "San Francisco SEO agency"'
    }
  }
};

// Generate prompt enhancement text based on guest post topic preferences
export function generatePromptEnhancement(preferences: KeywordPreferences, targetUrl?: string): string {
  // Check for URL-specific preferences first
  if (targetUrl && preferences.urlSpecificPreferences?.[targetUrl]) {
    const urlPref = preferences.urlSpecificPreferences[targetUrl];
    let enhancement = `\n\nNote: For this target URL, I prefer ${urlPref.primaryFocus.replace('-', ' ')} guest post topics.`;
    
    if (urlPref.reason) {
      enhancement += ` Reason: ${urlPref.reason}`;
    }
    
    if (urlPref.customInstructions) {
      enhancement += ` ${urlPref.customInstructions}`;
    }
    
    return enhancement;
  }
  
  // Use general preferences
  const template = KEYWORD_PREFERENCE_TEMPLATES[preferences.primaryFocus];
  let enhancement = `\n\nNote: I prefer ${preferences.primaryFocus.replace('-', ' ')} guest post topics.`;
  
  if (template?.customInstructions) {
    enhancement += ` ${template.customInstructions}`;
  }
  
  if (preferences.customInstructions) {
    enhancement += ` Additional instructions: ${preferences.customInstructions}`;
  }
  
  return enhancement;
}

// SAFE: Store preferences in workflow metadata (no schema changes)
export function getWorkflowKeywordPreferences(workflow: any): KeywordPreferences | null {
  return workflow.metadata?.keywordPreferences || null;
}

export function setWorkflowKeywordPreferences(workflow: any, preferences: KeywordPreferences): any {
  return {
    ...workflow,
    metadata: {
      ...workflow.metadata,
      keywordPreferences: preferences
    }
  };
}

// SAFE: Store client preferences in client description field temporarily (no schema changes)
export function getClientKeywordPreferences(client: any): KeywordPreferences | null {
  // Store as JSON in description field temporarily until we add proper column
  try {
    if (client?.description?.startsWith('KEYWORD_PREFS:')) {
      const jsonData = client.description.replace('KEYWORD_PREFS:', '');
      return JSON.parse(jsonData);
    }
  } catch (error) {
    console.error('Error parsing client topic preferences:', error);
  }
  
  // Return default preference: Commercial Investigation
  return {
    primaryFocus: 'commercial-investigation',
    customInstructions: 'Focus on comparison topics, review articles, and evaluation content that targets buying research intent.'
  };
}

export function setClientKeywordPreferences(client: any, preferences: KeywordPreferences): any {
  // Store as JSON in description field temporarily
  const prefData = `KEYWORD_PREFS:${JSON.stringify(preferences)}`;
  return {
    ...client,
    description: prefData
  };
}