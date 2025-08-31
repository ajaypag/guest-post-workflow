import { db } from '../lib/db/connection';
import { publisherOfferings } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function deleteDuplicate() {
  // Delete the newer duplicate offering
  await db.delete(publisherOfferings).where(eq(publisherOfferings.id, '5e04a616-6735-4425-9800-9b6ed44fa8a7'));
  console.log('✅ Deleted duplicate offering');
  process.exit(0);
}

deleteDuplicate().catch(console.error);