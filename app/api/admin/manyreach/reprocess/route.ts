import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs, EmailProcessingLog } from '@/lib/db/emailProcessingSchema';
import { eq, sql } from 'drizzle-orm';
import { EmailParserV3Simplified } from '@/lib/services/emailParserV3Simplified';

export async function POST(request: NextRequest) {
  try {
    const { draftId } = await request.json();
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    console.log(`🔄 Re-processing draft ${draftId}...`);
    
    // Get the draft and associated email log
    const result = await db.execute(sql`
      SELECT 
        pd.id as draft_id,
        pd.email_log_id,
        el.html_content,
        el.campaign_id,
        el.campaign_name,
        el.email_from,
        el.email_to,
        el.email_subject
      FROM publisher_drafts pd
      JOIN email_processing_logs el ON pd.email_log_id = el.id
      WHERE pd.id = ${draftId}
      LIMIT 1
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    const draft = result.rows[0] as any;
    
    // Get campaign sender email if we have campaign info
    let campaignSenderEmail: string | undefined;
    if (draft.campaign_id) {
      // Try to get campaign from ManyReach to get sender
      try {
        const campaignResult = await db.execute(sql`
          SELECT DISTINCT campaign_id, campaign_name 
          FROM email_processing_logs 
          WHERE campaign_id = ${draft.campaign_id}
          LIMIT 1
        `);
        
        // For now, we'll check common known senders
        // In production, this would query ManyReach API
        const knownSenders = [
          'nick.outreachlabs@gmail.com',
          'milena@reachaiapply.com', 
          'teodora@reachaiapply.com',
          'damon@outreachlabs.com',
          'jodie@thehrguy.co'
        ];
        
        // Check if any known sender appears in the email
        for (const sender of knownSenders) {
          if (draft.html_content?.includes(sender)) {
            campaignSenderEmail = sender;
            break;
          }
        }
      } catch (error) {
        console.warn('Could not get campaign sender:', error);
      }
    }
    
    // Re-process the email with the parser
    const emailParser = new EmailParserV3Simplified();
    const parsedData = await emailParser.parseEmail(
      draft.html_content || '', 
      campaignSenderEmail,
      {
        from: draft.email_from,
        to: draft.email_to,
        subject: draft.email_subject
      }
    );
    
    console.log(`✅ Re-processed email from ${draft.email_from}`);
    
    // Update the draft with new parsed data
    await db.execute(sql`
      UPDATE publisher_drafts
      SET 
        parsed_data = ${JSON.stringify(parsedData)}::jsonb,
        status = 'pending'
      WHERE id = ${draftId}
    `);
    
    // Update the email log as well
    await db.execute(sql`
      UPDATE email_processing_logs
      SET 
        parsed_data = ${JSON.stringify(parsedData)}::jsonb,
        status = 'parsed'
      WHERE id = ${draft.email_log_id}
    `);
    
    return NextResponse.json({ 
      success: true,
      draftId,
      parsedData,
      message: 'Draft re-processed successfully'
    });
    
  } catch (error) {
    console.error('Re-process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Re-process failed' },
      { status: 500 }
    );
  }
}