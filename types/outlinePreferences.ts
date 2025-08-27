/**
 * Outline Preferences System
 * 
 * Simple text string that gets appended to outline prompts.
 * 
 * Storage: Uses clients.defaultRequirements JSONB field
 * Integration: Applied in DeepResearchStepClean.tsx to both manual and AI paths
 */

/**
 * Main outline preferences interface - DEAD SIMPLE
 */
export interface OutlinePreferences {
  version: 1;                                    // Schema version
  enabled?: boolean;                             // Toggle on/off
  
  // Structured form inputs
  excludeCompetitors?: string[];                 // List of competitor URLs/names to avoid
  customInstructions?: string;                   // Free-form custom research instructions
  
  // Generated prompt text (built from structured inputs)
  outlineInstructions?: string;                  // Final assembled prompt text
  
  // Metadata
  lastUpdated?: Date;
  updatedBy?: string;
}

/**
 * Default outline preferences template
 */
export const DEFAULT_OUTLINE_PREFERENCES: OutlinePreferences = {
  version: 1,
  enabled: true
};

/**
 * Generate prompt enhancement based on outline preferences
 * Builds structured prompt from form inputs
 */
export function generateOutlineEnhancement(
  preferences: OutlinePreferences, 
  targetUrl?: string,
  intelligence?: string
): string {
  if (!preferences || !preferences.enabled) {
    return '';
  }

  let enhancement = '';
  
  // Add intelligence context if available
  if (intelligence && intelligence.trim()) {
    enhancement += `\n\nBRAND/PRODUCT INTELLIGENCE: You have access to this comprehensive intelligence about the business/product. Use it to inform your research and make the outline more relevant and accurate:\n\n${intelligence.trim()}`;
  }
  
  // Add competitor exclusion instructions
  if (preferences.excludeCompetitors && preferences.excludeCompetitors.length > 0) {
    const competitorList = preferences.excludeCompetitors
      .filter(comp => comp.trim())
      .join(', ');
    
    if (competitorList) {
      enhancement += `\n\nIMPORTANT: When doing your research, avoid mentioning or including these competitors: ${competitorList}`;
    }
  }
  
  // Add custom instructions
  if (preferences.customInstructions && preferences.customInstructions.trim()) {
    enhancement += `\n\nAdditional Research Instructions: ${preferences.customInstructions.trim()}`;
  }
  
  return enhancement;
}

/**
 * Storage utilities for client preferences
 */

// Get outline preferences from client's defaultRequirements field
export function getClientOutlinePreferences(client: any): OutlinePreferences | null {
  try {
    // First try defaultRequirements field (proper storage)
    if (client?.defaultRequirements) {
      let requirements: any;
      
      // Handle both string and object formats
      if (typeof client.defaultRequirements === 'string') {
        requirements = JSON.parse(client.defaultRequirements);
      } else {
        requirements = client.defaultRequirements;
      }
      
      if (requirements.outlinePreferences) {
        return requirements.outlinePreferences;
      }
    }
    
    // Legacy fallback: check description field
    if (client?.description?.startsWith('OUTLINE_PREFS:')) {
      const jsonData = client.description.replace('OUTLINE_PREFS:', '');
      return JSON.parse(jsonData);
    }
  } catch (error) {
    console.error('Error parsing client outline preferences:', error);
  }
  
  return null;
}

// Set outline preferences in client's defaultRequirements field
export function setClientOutlinePreferences(
  client: any, 
  preferences: OutlinePreferences
): any {
  try {
    let requirements: any = {};
    
    // Parse existing requirements
    if (client.defaultRequirements) {
      if (typeof client.defaultRequirements === 'string') {
        requirements = JSON.parse(client.defaultRequirements);
      } else {
        requirements = client.defaultRequirements;
      }
    }
    
    // Update with new outline preferences
    requirements.outlinePreferences = {
      ...preferences,
      lastUpdated: new Date(),
      version: 1
    };
    
    return {
      ...client,
      defaultRequirements: JSON.stringify(requirements)
    };
  } catch (error) {
    console.error('Error setting client outline preferences:', error);
    return client;
  }
}

/**
 * Validation utilities
 */

// Validate outline preferences structure
export function validateOutlinePreferences(prefs: any): prefs is OutlinePreferences {
  if (!prefs || typeof prefs !== 'object') return false;
  
  // Check version
  if (prefs.version !== 1) return false;
  
  // Validate nested structures if present
  if (prefs.competitorsToAvoid && !Array.isArray(prefs.competitorsToAvoid)) return false;
  if (prefs.contentGuidelines && typeof prefs.contentGuidelines !== 'object') return false;
  if (prefs.listiclePreferences && typeof prefs.listiclePreferences !== 'object') return false;
  
  return true;
}

// Sanitize preferences for safe storage
export function sanitizeOutlinePreferences(prefs: OutlinePreferences): OutlinePreferences {
  // Remove any potentially harmful content
  const sanitized = { ...prefs };
  
  // Truncate extremely long strings
  if (sanitized.customInstructions && sanitized.customInstructions.length > 5000) {
    sanitized.customInstructions = sanitized.customInstructions.substring(0, 5000);
  }
  
  // Limit array sizes
  if (sanitized.excludeCompetitors && sanitized.excludeCompetitors.length > 50) {
    sanitized.excludeCompetitors = sanitized.excludeCompetitors.slice(0, 50);
  }
  
  return sanitized;
}

/**
 * Migration utilities
 */

// Migrate from old storage format to new
export async function migrateOutlinePreferences(client: any): Promise<any> {
  // Check if migration needed
  if (client?.description?.startsWith('OUTLINE_PREFS:')) {
    try {
      const jsonData = client.description.replace('OUTLINE_PREFS:', '');
      const oldPrefs = JSON.parse(jsonData);
      
      // Convert to new format
      const newClient = setClientOutlinePreferences(client, oldPrefs);
      
      // Clear old storage
      newClient.description = '';
      
      return newClient;
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
  
  return client;
}