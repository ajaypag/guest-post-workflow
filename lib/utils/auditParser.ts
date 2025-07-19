import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

interface AuditSection {
  strengths: string;
  weaknesses: string;
  suggestedVersion: string;
}

/**
 * Extracts audit sections from markdown content using the structured headings:
 * ### Strengths
 * ### Weaknesses  
 * ### Suggested Version
 */
export function extractAuditSections(markdown: string): AuditSection[] {
  const tree = unified().use(remarkParse).parse(markdown);
  const sections: AuditSection[] = [];
  
  let currentSection: AuditSection = { strengths: '', weaknesses: '', suggestedVersion: '' };
  let currentField: keyof AuditSection | null = null;
  let hasContent = false;
  
  tree.children.forEach((node: any, index: number) => {
    if (node.type === 'heading' && node.depth === 3) {
      const headingText = (node.children?.[0] as any)?.value?.toLowerCase() || '';
      
      // Check for section headers
      if (headingText.includes('strength')) {
        currentField = 'strengths';
      } else if (headingText.includes('weakness')) {
        currentField = 'weaknesses';
      } else if (headingText.includes('suggested') || headingText.includes('version')) {
        currentField = 'suggestedVersion';
      }
    } else if (currentField && node.position) {
      // Capture content under the current heading
      const content = markdown.slice(node.position.start.offset, node.position.end.offset);
      if (content.trim()) {
        currentSection[currentField] += (currentSection[currentField] ? '\n' : '') + content;
        hasContent = true;
      }
    }
    
    // Check if we're at the end or hitting a new audit section
    const nextNode = tree.children[index + 1];
    const isNewAuditSection = nextNode?.type === 'heading' && 
                             (nextNode as any)?.depth === 3 && 
                             (nextNode as any)?.children?.[0]?.value?.toLowerCase().includes('strength');
    
    if ((index === tree.children.length - 1 || isNewAuditSection) && hasContent) {
      sections.push({ ...currentSection });
      currentSection = { strengths: '', weaknesses: '', suggestedVersion: '' };
      currentField = null;
      hasContent = false;
    }
  });
  
  return sections;
}

/**
 * Detects the header level from a markdown line
 */
function getHeaderLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

/**
 * Formats a single section with proper spacing based on content type
 */
function formatSection(content: string, isFirstSection: boolean = false): string {
  const lines = content.split('\n');
  const formattedLines: string[] = [];
  let previousLineType: 'header' | 'paragraph' | 'list' | 'empty' = 'empty';
  let previousHeaderLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip multiple consecutive empty lines
    if (!trimmedLine) {
      if (previousLineType !== 'empty') {
        formattedLines.push('');
        previousLineType = 'empty';
      }
      continue;
    }
    
    // Detect line type and header level
    let currentLineType: 'header' | 'paragraph' | 'list' | 'empty' = 'paragraph';
    const headerLevel = getHeaderLevel(trimmedLine);
    
    if (headerLevel > 0) {
      currentLineType = 'header';
    } else if (/^[-*+]\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine)) {
      currentLineType = 'list';
    }
    
    // Add appropriate spacing before the line
    if (currentLineType === 'header') {
      // Add spacing based on header hierarchy
      if (formattedLines.length > 0 && previousLineType !== 'empty') {
        // Major headers (H1, H2) get more space
        if (headerLevel <= 2) {
          formattedLines.push('');
          if (previousLineType !== 'header' || previousHeaderLevel > 2) {
            formattedLines.push(''); // Double space before major headers
          }
        } else {
          // Minor headers (H3+) get single space
          formattedLines.push('');
        }
      }
      previousHeaderLevel = headerLevel;
    } else if (currentLineType === 'list' && previousLineType === 'paragraph') {
      // Add space before list starts
      formattedLines.push('');
    } else if (currentLineType === 'paragraph' && previousLineType === 'list') {
      // Add space after list ends
      formattedLines.push('');
    }
    
    formattedLines.push(line);
    previousLineType = currentLineType;
  }
  
  // Special handling for first section - ensure it doesn't start with empty lines
  if (isFirstSection) {
    while (formattedLines.length > 0 && formattedLines[0] === '') {
      formattedLines.shift();
    }
  }
  
  return formattedLines.join('\n');
}

/**
 * Extracts only the suggested article content from the audit sections
 */
export function extractSuggestedArticle(markdown: string): string {
  const sections = extractAuditSections(markdown);
  const formattedSections: string[] = [];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const content = section.suggestedVersion.trim();
    
    if (content.length > 0) {
      // Format individual section, marking if it's the first section
      const formattedContent = formatSection(content, i === 0);
      formattedSections.push(formattedContent);
    }
  }
  
  // Join sections with appropriate spacing
  // Use triple line break between major sections for clear separation
  const mergedArticle = formattedSections.join('\n\n\n');
  
  // Final cleanup: normalize line endings and trim
  return mergedArticle
    .replace(/\n{4,}/g, '\n\n\n') // Replace 4+ line breaks with max 3
    .replace(/[ \t]+$/gm, '') // Remove trailing spaces on each line
    .trim();
}

/**
 * Extracts all audit feedback (strengths and weaknesses) for logging/analysis
 */
export function extractAuditFeedback(markdown: string): Array<{strengths: string, weaknesses: string}> {
  const sections = extractAuditSections(markdown);
  return sections.map(section => ({
    strengths: section.strengths.trim(),
    weaknesses: section.weaknesses.trim()
  }));
}