import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import EmailQualificationMigrationClient from '@/components/admin/EmailQualificationMigrationClient';

export default async function EmailQualificationMigrationPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  // Check current migration status
  let migrationStatus = {
    emailLogsColumns: false,
    offeringsColumns: false,
    indexes: false,
    legacyEmailsUpdated: 0
  };

  try {
    // Check if columns exist
    const emailLogsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_processing_logs' 
      AND column_name IN ('qualification_status', 'disqualification_reason')
    `);
    migrationStatus.emailLogsColumns = Array.isArray(emailLogsCheck) && emailLogsCheck.length === 2;

    const offeringsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'publisher_offerings' 
      AND column_name IN ('source_email_id', 'source_email_content', 'pricing_extracted_from')
    `);
    migrationStatus.offeringsColumns = Array.isArray(offeringsCheck) && offeringsCheck.length === 3;

    // Check indexes
    const indexCheck = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname IN ('idx_email_logs_qualification_status', 'idx_publisher_offerings_source_email')
    `);
    migrationStatus.indexes = Array.isArray(indexCheck) && indexCheck.length === 2;

    // Check legacy emails updated
    if (migrationStatus.emailLogsColumns) {
      const legacyCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM email_processing_logs 
        WHERE qualification_status = 'legacy_processed'
      `);
      migrationStatus.legacyEmailsUpdated = Array.isArray(legacyCount) && legacyCount[0] ? Number((legacyCount[0] as any).count) : 0;
    }
  } catch (error) {
    console.error('Error checking migration status:', error);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Email Qualification Migration</h1>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-amber-800 mb-2">⚠️ Production Migration Required</h2>
          <p className="text-amber-700">
            This migration adds email qualification tracking to prevent non-paid sites from being added to the database.
            <strong> This migration must be run in production before the updated V2 email parser is deployed.</strong>
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${migrationStatus.emailLogsColumns ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Email Processing Logs Columns ({migrationStatus.emailLogsColumns ? 'Added' : 'Missing'})</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${migrationStatus.offeringsColumns ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Publisher Offerings Columns ({migrationStatus.offeringsColumns ? 'Added' : 'Missing'})</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${migrationStatus.indexes ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Database Indexes ({migrationStatus.indexes ? 'Created' : 'Missing'})</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${migrationStatus.legacyEmailsUpdated > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Legacy Emails Updated ({migrationStatus.legacyEmailsUpdated} emails)</span>
            </div>
          </div>
        </div>

        <EmailQualificationMigrationClient initialStatus={migrationStatus} />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">What This Migration Does</h3>
          <ul className="text-blue-700 space-y-1 text-sm">
            <li>• Adds <code>qualification_status</code> and <code>disqualification_reason</code> to email logs</li>
            <li>• Adds <code>source_email_id</code>, <code>source_email_content</code>, <code>pricing_extracted_from</code> to offerings</li>
            <li>• Creates performance indexes for qualification queries</li>
            <li>• Marks existing emails as <code>legacy_processed</code> to maintain data integrity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}