import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

// For testing purposes - bypass auth in local development
const isLocalDevelopment = process.env.NODE_ENV === 'development' && 
  (process.env.NEXTAUTH_URL?.includes('localhost') || !process.env.NEXTAUTH_URL);
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { renderToStaticMarkup } from 'react-dom/server';
import PublisherMigrationInvitationEmail, { 
  PublisherMigrationInvitationEmailPlainText 
} from '@/lib/email/templates/PublisherMigrationInvitationEmail';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  // Skip auth check for local testing
  if (!isLocalDevelopment) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { publisherId, type } = body;

    let publisher;
    let websites = [];
    
    if (publisherId) {
      // Use existing publisher
      publisher = await db.query.publishers.findFirst({
        where: eq(publishers.id, publisherId)
      });
      
      if (!publisher) {
        // Create mock publisher for preview
        publisher = {
          id: uuidv4(),
          email: 'preview@example.com',
          contactName: 'Preview Publisher',
          companyName: 'Preview Company Inc.',
          invitationToken: uuidv4()
        };
      }
    } else {
      // Create mock publisher for preview
      publisher = {
        id: uuidv4(),
        email: 'preview@example.com',
        contactName: 'Preview Publisher',
        companyName: 'Preview Company Inc.',
        invitationToken: uuidv4()
      };
    }

    // Create mock websites for preview
    websites = [
      { domain: 'example-blog.com', currentRate: 250, estimatedTurnaround: 3 },
      { domain: 'tech-news-site.com', currentRate: 350, estimatedTurnaround: 5 },
      { domain: 'lifestyle-magazine.net', currentRate: 200, estimatedTurnaround: 2 }
    ];

    // Generate the email HTML
    const emailComponent = PublisherMigrationInvitationEmail({
      publisherName: publisher.contactName || 'Publisher',
      companyName: publisher.companyName || 'Your Company',
      websites,
      claimUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/claim?token=${publisher.invitationToken}`,
      totalWebsites: websites.length,
      estimatedMonthlyValue: websites.reduce((sum, w) => sum + (w.currentRate || 0), 0) * 2
    });

    const html = renderToStaticMarkup(emailComponent);
    
    // Generate text version
    const text = PublisherMigrationInvitationEmailPlainText({
      publisherName: publisher.contactName || 'Publisher',
      companyName: publisher.companyName || 'Your Company',
      websites,
      claimUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/claim?token=${publisher.invitationToken}`,
      totalWebsites: websites.length,
      estimatedMonthlyValue: websites.reduce((sum, w) => sum + (w.currentRate || 0), 0) * 2
    });

    return NextResponse.json({
      success: true,
      html,
      text
    });

  } catch (error: any) {
    console.error('[EMAIL_TEST] Error generating preview:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to generate preview' 
    }, { status: 500 });
  }
}