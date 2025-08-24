/**
 * Utility functions for cleaning up AI-generated text content
 */

/**
 * Cleans up research analysis text by removing markdown formatting and links
 * Makes the text more readable and editable for users while preserving structure
 */
export function cleanResearchAnalysis(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // Remove markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove standalone URLs (http/https) but preserve surrounding text
  cleaned = cleaned.replace(/https?:\/\/[^\s\)\],]+/g, '');
  
  // Remove markdown bold/italic formatting **text** or *text* -> text
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  
  // Convert markdown headers to simple formatting
  cleaned = cleaned.replace(/^#{1,2}\s+(.+)$/gm, '\n$1:\n'); // Main headers
  cleaned = cleaned.replace(/^#{3,6}\s+(.+)$/gm, '\n• $1'); // Sub headers as bullets
  
  // Remove markdown code blocks but preserve content
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove questions/gaps sections since they're shown separately
  cleaned = cleaned.replace(/^.*(gaps|questions|information gaps).*:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gim, '');
  cleaned = cleaned.replace(/^.*gap\s*(identified|analysis|summary).*:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gim, '');
  cleaned = cleaned.replace(/^.*missing\s*information.*:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gim, '');
  
  // Preserve list formatting
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '• '); // Convert to bullet points
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '• '); // Convert numbered lists to bullets
  
  // Clean up whitespace but preserve paragraph breaks
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Multiple newlines -> double newline
  cleaned = cleaned.replace(/^\s+|\s+$/g, ''); // Trim start/end
  cleaned = cleaned.replace(/ +/g, ' '); // Multiple spaces -> single space (but preserve newlines)
  
  // Fix sentences that got broken by URL removal
  cleaned = cleaned.replace(/\s+\./g, '.');
  cleaned = cleaned.replace(/\.\s*\./g, '.');
  cleaned = cleaned.replace(/\s+,/g, ',');
  
  // Add spacing after colons for better readability
  cleaned = cleaned.replace(/:/g, ': ');
  cleaned = cleaned.replace(/: +/g, ': ');
  
  return cleaned;
}

/**
 * Creates a readable summary from research analysis
 * Preserves structure while cleaning up technical formatting
 */
export function createReadableSummary(researchOutput: any): string {
  if (!researchOutput) {
    return 'No research analysis available.';
  }

  // Try different fields that might contain the analysis
  let analysisText = researchOutput.analysis || 
                    researchOutput.outcomes || 
                    researchOutput.summary || 
                    researchOutput.content || 
                    researchOutput.result ||
                    researchOutput.text ||
                    '';

  // If we found text but it looks like JSON, try to extract the analysis text manually
  if (analysisText && typeof analysisText === 'string' && analysisText.trim().startsWith('{"analysis":')) {
    // Use regex to extract the analysis text from {"analysis": "text..."}
    // Using [\s\S] instead of . with /s flag for compatibility
    const match = analysisText.match(/^\{"analysis":\s*"([\s\S]*?)"\s*,/);
    if (match && match[1]) {
      analysisText = match[1];
      // Unescape common JSON escape sequences
      analysisText = analysisText
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    } else {
      // Try a broader match that captures everything after "analysis": "
      const broadMatch = analysisText.match(/"analysis":\s*"([^"]+(?:\\.[^"]*)*)"/) ;
      if (broadMatch && broadMatch[1]) {
        analysisText = broadMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
      } else {
      }
    }
  }

  // If we still don't have text, check if the whole object is a string
  if (!analysisText && typeof researchOutput === 'string') {
    analysisText = researchOutput;
  }

  // If we still don't have text but have an object, try to extract meaningful content
  if (!analysisText && typeof researchOutput === 'object') {
    // Look for any field that contains substantial text
    const textFields = Object.values(researchOutput).filter(value => 
      typeof value === 'string' && value.length > 50
    );
    analysisText = textFields[0] || '';
  }

  if (!analysisText) {
    return 'No research analysis text found. The AI research data may be in an unexpected format.';
  }

  // Just clean it up but preserve the structure
  const cleaned = cleanResearchAnalysis(analysisText);
  
  return cleaned || 'Research analysis could not be processed.';
}