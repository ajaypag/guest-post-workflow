/**
 * Client-side safe utilities for workflows
 * These functions don't use database connections and can be used in client components
 */

import { GuestPostWorkflow } from '@/types/workflow';

/**
 * Client-side version that only checks workflow data without database lookup.
 * For full resolution including database lookup, use the API endpoint.
 * 
 * @param workflow - The workflow to check
 * @returns The legacy clientTargetUrl or null
 */
export function getTargetUrlFromWorkflow(workflow: GuestPostWorkflow): string | null {
  // Check legacy clientTargetUrl from topic generation step
  const topicGenerationStep = workflow.steps?.find(s => s.id === 'topic-generation');
  if (topicGenerationStep?.outputs?.clientTargetUrl) {
    return topicGenerationStep.outputs.clientTargetUrl;
  }
  
  // No target URL found in workflow data
  return null;
}

/**
 * Check if workflow has a targetPageId that needs resolution
 */
export function hasTargetPageId(workflow: GuestPostWorkflow): boolean {
  return !!workflow.metadata?.targetPageId;
}

/**
 * Get the target page ID from workflow metadata
 */
export function getTargetPageId(workflow: GuestPostWorkflow): string | null {
  return workflow.metadata?.targetPageId || null;
}