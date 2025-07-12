// SAFE IMPLEMENTATION: Keyword preferences using existing workflow metadata
// No database schema changes required

export type PrimaryKeywordFocus = 
  | 'commercial-investigation'  // Reviews, comparisons, evaluations
  | 'informational'            // How-to, guides, educational
  | 'transactional'           // Buying intent, purchase-focused
  | 'mixed'                   // Balanced approach
  | 'custom';                 // Advanced custom configuration

// Simplified keyword preferences for initial implementation
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

// Default preference templates
export const KEYWORD_PREFERENCE_TEMPLATES: Record<PrimaryKeywordFocus, Partial<KeywordPreferences>> = {
  'commercial-investigation': {
    primaryFocus: 'commercial-investigation',
    customInstructions: 'Focus on comparison keywords, review terms, and evaluation phrases that indicate buying research intent.'
  },
  
  'informational': {
    primaryFocus: 'informational',
    customInstructions: 'Focus on educational keywords, how-to terms, and informational queries that help users learn.'
  },
  
  'transactional': {
    primaryFocus: 'transactional',
    customInstructions: 'Focus on high-intent keywords that indicate ready-to-purchase behavior and direct buying signals.'
  },
  
  'mixed': {
    primaryFocus: 'mixed',
    customInstructions: 'Use a balanced approach mixing educational and commercial keywords to capture users at different funnel stages.'
  },
  
  'custom': {
    primaryFocus: 'custom'
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
      description: 'Define your own keyword preference instructions.',
      examples: 'Fully customizable based on specific requirements'
    }
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
  
  // Use general preferences
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