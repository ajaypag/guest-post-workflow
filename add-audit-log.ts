import { db } from './lib/db/connection';
import { intelligenceGenerationLogs } from './lib/db/intelligenceLogsSchema';
import { targetPageIntelligence } from './lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';

async function addAuditLog() {
  const targetPageId = '7ac4c76e-8094-4bf0-8fa9-1f51993cd97b';
  
  // Get the existing failed session
  const [session] = await db.select()
    .from(targetPageIntelligence)
    .where(eq(targetPageIntelligence.targetPageId, targetPageId))
    .limit(1);
  
  if (!session) {
    console.log('No session found');
    return;
  }
  
  console.log('Found session:', {
    status: session.researchStatus,
    sessionId: session.researchSessionId,
    startedAt: session.researchStartedAt
  });
  
  // Create a historical audit log entry for this failed session
  const logEntry = await db.insert(intelligenceGenerationLogs).values({
    targetPageId,
    sessionType: 'research',
    openaiSessionId: session.researchSessionId || 'resp_68afc1923f408196b60cf3d201f6b5040562a676e47feb7f',
    startedAt: session.researchStartedAt || new Date('2025-02-14T07:40:00Z'),
    completedAt: session.researchCompletedAt || new Date('2025-02-14T07:42:00Z'),
    durationSeconds: 120, // 2 minutes
    status: 'failed',
    errorMessage: 'OpenAI API error - session failed during initial attempt',
    metadata: {
      historicalEntry: true,
      addedRetrospectively: true,
      originalSessionId: session.id,
      note: 'Added manually to show session history feature'
    },
    initiatedBy: session.createdBy,
    userType: 'internal'
  }).returning();
  
  console.log('Created audit log entry:', logEntry[0].id);
  console.log('Session will now appear in history!');
  
  process.exit(0);
}

addAuditLog().catch(console.error);