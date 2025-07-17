/**
 * Utility functions for managing agentic workflows and preventing text-only responses
 */

/**
 * Detects when an assistant sends plain text instead of using tools
 */
export function assistantSentPlainText(event: any): boolean {
  return (
    event.type === 'run_item_stream_event' &&
    event.name === 'message_output_created' &&
    !event.item.tool_calls?.length            // => no function call
  );
}

/**
 * Standard retry nudge for agents that output text instead of tools
 */
export const RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the required function. ' +
  'Do NOT output progress updates or explanatory text.';

/**
 * Semantic SEO specific retry nudge
 */
export const SEMANTIC_AUDIT_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the audit_section function. ' +
  'Do NOT output progress updates.';

/**
 * Article writing specific retry nudge  
 */
export const ARTICLE_WRITING_RETRY_NUDGE =
  '🚨 FORMAT INVALID – respond ONLY by calling the write_section function. ' +
  'Do NOT output progress updates.';

/**
 * General purpose retry nudge factory
 */
export function createRetryNudge(expectedTool: string): string {
  return `🚨 FORMAT INVALID – respond ONLY by calling the ${expectedTool} function. ` +
         'Do NOT output progress updates.';
}