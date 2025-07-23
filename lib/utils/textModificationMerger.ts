interface TextModification {
  kind: 'exact_replacement' | 'rewrite' | 'add_sentence';
  start: number;
  end?: number | null;
  originalText: string;
  newText: string;
}

/**
 * Merges multiple text modifications into a single article.
 * Handles overlapping modifications by applying them in reverse order (last to first).
 * This ensures position indices remain valid as we modify the text.
 */
export function mergeTextModifications(
  originalText: string,
  modifications: TextModification[]
): string {
  if (!modifications || modifications.length === 0) {
    return originalText;
  }

  // Sort modifications by start position in descending order
  // This allows us to apply modifications from end to start,
  // preserving the validity of position indices
  const sortedMods = [...modifications].sort((a, b) => b.start - a.start);

  let result = originalText;

  for (const mod of sortedMods) {
    try {
      switch (mod.kind) {
        case 'exact_replacement':
        case 'rewrite':
          // For replacements and rewrites, we need both start and end
          if (mod.end === null || mod.end === undefined) {
            console.warn('Skipping modification without end position:', mod);
            continue;
          }
          
          // Validate positions
          if (mod.start < 0 || mod.end > result.length || mod.start > mod.end) {
            console.warn('Invalid modification positions:', mod);
            continue;
          }

          // Replace the text
          result = result.slice(0, mod.start) + mod.newText + result.slice(mod.end);
          break;

        case 'add_sentence':
          // For additions, we insert after the start position
          if (mod.start < 0 || mod.start > result.length) {
            console.warn('Invalid insertion position:', mod);
            continue;
          }

          // Find the end of the sentence at the start position
          let insertPos = mod.start;
          
          // If we're not at the end of the text, find the next sentence boundary
          if (insertPos < result.length) {
            // Look for sentence endings
            const sentenceEndPattern = /[.!?]\s*/g;
            sentenceEndPattern.lastIndex = insertPos;
            
            const match = sentenceEndPattern.exec(result);
            if (match) {
              insertPos = match.index + match[0].length;
            } else {
              // If no sentence ending found, insert at the end of the paragraph
              const nextNewline = result.indexOf('\n', insertPos);
              insertPos = nextNewline !== -1 ? nextNewline : result.length;
            }
          }

          // Insert the new text with appropriate spacing
          const needsSpace = insertPos > 0 && 
                           insertPos < result.length && 
                           result[insertPos - 1] !== ' ' && 
                           result[insertPos] !== ' ';
          
          result = result.slice(0, insertPos) + 
                  (needsSpace ? ' ' : '') + 
                  mod.newText + 
                  result.slice(insertPos);
          break;

        default:
          console.warn('Unknown modification kind:', mod.kind);
      }
    } catch (error) {
      console.error('Error applying modification:', error, mod);
      // Continue with other modifications
    }
  }

  return result;
}

/**
 * Validates that modifications don't have problematic overlaps.
 * Returns true if all modifications can be safely applied.
 */
export function validateModifications(modifications: TextModification[]): {
  valid: boolean;
  conflicts: Array<[TextModification, TextModification]>;
} {
  const conflicts: Array<[TextModification, TextModification]> = [];
  
  // Check each pair of modifications for conflicts
  for (let i = 0; i < modifications.length; i++) {
    for (let j = i + 1; j < modifications.length; j++) {
      const mod1 = modifications[i];
      const mod2 = modifications[j];
      
      // Skip if either is an add_sentence (they don't conflict)
      if (mod1.kind === 'add_sentence' || mod2.kind === 'add_sentence') {
        continue;
      }
      
      // Check for overlap
      const end1 = mod1.end ?? mod1.start;
      const end2 = mod2.end ?? mod2.start;
      
      if ((mod1.start >= mod2.start && mod1.start < end2) ||
          (mod2.start >= mod1.start && mod2.start < end1)) {
        conflicts.push([mod1, mod2]);
      }
    }
  }
  
  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

/**
 * Groups modifications by type for reporting purposes
 */
export function groupModificationsByType(modifications: TextModification[]): {
  replacements: TextModification[];
  rewrites: TextModification[];
  additions: TextModification[];
} {
  return {
    replacements: modifications.filter(m => m.kind === 'exact_replacement'),
    rewrites: modifications.filter(m => m.kind === 'rewrite'),
    additions: modifications.filter(m => m.kind === 'add_sentence')
  };
}

/**
 * Calculates the total character change from modifications
 */
export function calculateTextDelta(modifications: TextModification[]): number {
  return modifications.reduce((delta, mod) => {
    const originalLength = mod.kind === 'add_sentence' ? 0 : 
      (mod.end ?? mod.start) - mod.start;
    const newLength = mod.newText.length;
    return delta + (newLength - originalLength);
  }, 0);
}