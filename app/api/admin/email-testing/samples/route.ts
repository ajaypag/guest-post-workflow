import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { desc, isNotNull, and, ne } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/services/authServiceServer';

export async function GET() {
  try {
    // Check auth
    const authService = new AuthServiceServer();
    const session = await authService.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get 20 recent email samples with content
    const samples = await db
      .select({
        id: emailProcessingLogs.id,
        emailFrom: emailProcessingLogs.emailFrom,
        emailSubject: emailProcessingLogs.emailSubject,
        rawContent: emailProcessingLogs.rawContent,
        receivedAt: emailProcessingLogs.receivedAt,
        campaignName: emailProcessingLogs.campaignName,
        status: emailProcessingLogs.status
      })
      .from(emailProcessingLogs)
      .where(
        and(
          isNotNull(emailProcessingLogs.rawContent),
          ne(emailProcessingLogs.rawContent, '')
        )
      )
      .orderBy(desc(emailProcessingLogs.receivedAt))
      .limit(20);

    return NextResponse.json({ 
      samples,
      count: samples.length 
    });
    
  } catch (error) {
    console.error('Failed to load email samples:', error);
    return NextResponse.json(
      { error: 'Failed to load samples' },
      { status: 500 }
    );
  }
}