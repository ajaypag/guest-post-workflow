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
 * Extracts only the suggested article content from the audit sections
 */
export function extractSuggestedArticle(markdown: string): string {
  const sections = extractAuditSections(markdown);
  return sections
    .map(section => section.suggestedVersion.trim())
    .filter(content => content.length > 0)
    .join('\n\n');
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