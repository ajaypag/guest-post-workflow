import { GuestPostWorkflow } from '@/types/workflow';
import { db } from '@/lib/db/connection';
import { targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Resolves the target URL for a workflow by looking up the target page ID
 * from workflow metadata. Falls back to legacy clientTargetUrl from topic
 * generation step outputs during transition period.
 * 
 * @param workflow - The workflow to resolve target URL for
 * @returns The resolved target URL or null if not found
 */
export async function resolveTargetUrl(workflow: GuestPostWorkflow): Promise<string | null> {
  // First priority: Check new metadata.targetPageId field
  if (workflow.metadata?.targetPageId) {
    console.log('🎯 [TARGET URL] Using NEW system - resolving from targetPageId:', workflow.metadata.targetPageId);
    try {
      // Look up the target page URL from the database
      const targetPage = await db
        .select({ url: targetPages.url })
        .from(targetPages)
        .where(eq(targetPages.id, workflow.metadata.targetPageId))
        .limit(1);
      
      if (targetPage.length > 0 && targetPage[0].url) {
        console.log('✅ [TARGET URL] Found in database:', targetPage[0].url);
        return targetPage[0].url;
      } else {
        console.log('⚠️ [TARGET URL] targetPageId exists but no URL found in database');
      }
    } catch (error) {
      console.error('❌ [TARGET URL] Database error:', error);
    }
  }
  
  // Fallback during transition: Check legacy clientTargetUrl from topic generation step
  const topicGenerationStep = workflow.steps?.find(s => s.id === 'topic-generation');
  if (topicGenerationStep?.outputs?.clientTargetUrl) {
    console.log('⚠️ [TARGET URL] Using LEGACY system - clientTargetUrl:', topicGenerationStep.outputs.clientTargetUrl);
    return topicGenerationStep.outputs.clientTargetUrl;
  }
  
  // No target URL found
  console.log('❌ [TARGET URL] No target URL found (neither targetPageId nor clientTargetUrl)');
  return null;
}

/**
 * Synchronous version that only checks workflow data without database lookup.
 * Useful for quick checks when database access is not available.
 * 
 * @param workflow - The workflow to check
 * @returns The target page ID, legacy clientTargetUrl, or null
 */
export function getTargetUrlReference(workflow: GuestPostWorkflow): { 
  type: 'targetPageId' | 'clientTargetUrl' | 'none', 
  value: string | null 
} {
  // Check new metadata.targetPageId field
  if (workflow.metadata?.targetPageId) {
    return { type: 'targetPageId', value: workflow.metadata.targetPageId };
  }
  
  // Check legacy clientTargetUrl from topic generation step
  const topicGenerationStep = workflow.steps?.find(s => s.id === 'topic-generation');
  if (topicGenerationStep?.outputs?.clientTargetUrl) {
    return { type: 'clientTargetUrl', value: topicGenerationStep.outputs.clientTargetUrl };
  }
  
  return { type: 'none', value: null };
}