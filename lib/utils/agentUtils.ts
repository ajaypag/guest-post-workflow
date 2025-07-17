/**
 * Utility functions for managing agentic workflows and preventing text-only responses
 */

/**
 * Detects when an assistant sends plain text instead of using tools
 * Enhanced to catch complete text-only responses more reliably
 */
export function assistantSentPlainText(event: any): boolean {
  // Primary check: message_output_created without tool calls
  if (event.type === 'run_item_stream_event' && 
      event.name === 'message_output_created' &&
      !event.item.tool_calls?.length) {
    console.log('🚨 DETECTED TEXT-ONLY RESPONSE:', event.item.content);
    return true;
  }
  
  // Secondary check: response_done with text content but no tool calls
  if (event.type === 'raw_model_stream_event' &&
      event.data.type === 'response_done' &&
      event.data.response?.choices?.[0]?.message?.content &&
      !event.data.response?.choices?.[0]?.message?.tool_calls?.length) {
    console.log('🚨 DETECTED COMPLETE TEXT RESPONSE:', event.data.response.choices[0].message.content.substring(0, 100) + '...');
    return true;
  }
  
  return false;
}

/**
 * Standard retry nudge for agents that output text instead of tools
 */
export const RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the required function. ' +
  'Do NOT output progress updates or explanatory text.';

/**
 * Semantic SEO specific retry nudges for different phases
 */
export const SEMANTIC_AUDIT_PARSE_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the parse_article function. ' +
  'Do NOT output progress updates.';

export const SEMANTIC_AUDIT_SECTION_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the audit_section function. ' +
  'Do NOT output progress updates.';

/**
 * Article writing specific retry nudge  
 */
export const ARTICLE_WRITING_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the write_section function. ' +
  'Do NOT output progress updates.';

/**
 * Article planning specific retry nudge
 */
export const ARTICLE_PLANNING_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the plan_article function. ' +
  'Do NOT output progress updates.';

/**
 * Formatting QA check specific retry nudge
 */
export const FORMATTING_QA_CHECK_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the analyze_formatting_check function. ' +
  'Do NOT output progress updates.';

/**
 * Formatting QA article generation specific retry nudge
 */
export const FORMATTING_QA_GENERATE_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the generate_cleaned_article function. ' +
  'Do NOT output progress updates.';

/**
 * Polish service specific retry nudges
 */
export const POLISH_AFTER_FILESEARCH_RETRY_NUDGE =
  '🚨 FORMAT INVALID – You just searched the knowledge base. Now respond ONLY by calling the parse_polish_article function. ' +
  'Do NOT summarize what you found. Do NOT discuss the guidelines. IMMEDIATELY parse the article.';

export const POLISH_PARSE_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the parse_polish_article function. ' +
  'Do NOT output progress updates or summaries.';

export const POLISH_SECTION_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the polish_section function. ' +
  'Do NOT output progress updates. Continue polishing sections.';

/**
 * General purpose retry nudge factory
 */
export function createRetryNudge(expectedTool: string): string {
  return `🚨 FORMAT INVALID – respond ONLY by calling the ${expectedTool} function. ` +
         'Do NOT output progress updates.';
}