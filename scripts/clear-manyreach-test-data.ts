import { db } from '../lib/db/connection';
import { emailProcessingLogs } from '../lib/db/emailProcessingSchema';
import { eq, and, or, sql } from 'drizzle-orm';

// Set database URL
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow?sslmode=disable';

async function clearTestData() {
  console.log('🗑️ Clearing ManyReach test data...\n');
  
  try {
    // Clear specific test email
    const email = 'editor@littlegatepublishing.com';
    const campaignId = '26001'; // LI for BB (countrybrook)
    
    // First, check what we have
    const existing = await db
      .select()
      .from(emailProcessingLogs)
      .where(
        or(
          eq(emailProcessingLogs.emailFrom, email),
          eq(emailProcessingLogs.campaignId, campaignId)
        )
      );
    
    console.log(`Found ${existing.length} email processing logs to clear`);
    
    if (existing.length > 0) {
      // Get all email log IDs for clearing drafts
      const emailLogIds = existing.map(e => e.id);
      
      // Clear publisher drafts first (foreign key constraint)
      if (emailLogIds.length > 0) {
        const deleteDraftsResult = await db.execute(sql`
          DELETE FROM publisher_drafts 
          WHERE email_log_id = ANY(${emailLogIds})
        `);
        console.log(`✅ Deleted publisher drafts`);
      }
      
      // Clear email processing logs
      const deleteLogsResult = await db
        .delete(emailProcessingLogs)
        .where(
          or(
            eq(emailProcessingLogs.emailFrom, email),
            eq(emailProcessingLogs.campaignId, campaignId)
          )
        );
      
      console.log(`✅ Deleted ${existing.length} email processing logs`);
      
      // Show what was deleted
      console.log('\n📋 Cleared records:');
      existing.forEach(record => {
        console.log(`  - ${record.emailFrom} | Campaign: ${record.campaignName || record.campaignId} | Status: ${record.import_status}`);
      });
    } else {
      console.log('No records found to delete');
    }
    
    console.log('\n✨ Test data cleared! You can now re-import.');
    
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  }
  
  process.exit(0);
}

clearTestData();