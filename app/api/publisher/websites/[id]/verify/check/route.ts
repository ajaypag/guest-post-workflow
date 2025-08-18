import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { 
  publisherOfferingRelationships,
  publisherEmailClaims 
} from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

// POST /api/publisher/websites/[id]/verify/check - Check verification status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { method, token } = body;

    if (!method || !token) {
      return NextResponse.json(
        { error: 'Method and token are required' },
        { status: 400 }
      );
    }

    // Check if publisher has a relationship with this website
    const relationships = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(and(
        eq(publisherOfferingRelationships.websiteId, websiteId),
        eq(publisherOfferingRelationships.publisherId, session.publisherId)
      ))
      .limit(1);
    
    const relationship = relationships[0];

    if (!relationship) {
      return NextResponse.json(
        { error: 'You do not have a relationship with this website' },
        { status: 403 }
      );
    }

    // Get website details
    const websiteData = await db
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    
    const website = websiteData[0];

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    let verified = false;
    let verificationMessage = '';

    // Check verification based on method
    switch (method) {
      case 'email':
        // Check if email was verified (would check email click in production)
        const emailClaims = await db
          .select()
          .from(publisherEmailClaims)
          .where(and(
            eq(publisherEmailClaims.publisherId, session.publisherId),
            eq(publisherEmailClaims.websiteId, websiteId),
            eq(publisherEmailClaims.verificationToken, token)
          ))
          .limit(1);
        
        const emailClaim = emailClaims[0];

        if (emailClaim && emailClaim.verifiedAt) {
          verified = true;
          verificationMessage = 'Email verification successful';
        } else {
          verificationMessage = 'Email verification pending. Please check your email and click the verification link.';
        }
        break;

      case 'dns':
        try {
          // Check DNS TXT record
          const txtRecords = await resolveTxt(`_linkio-verify.${website.domain}`);
          const flatRecords = txtRecords.flat();
          
          verified = flatRecords.some(record => record.includes(token));
          
          if (verified) {
            verificationMessage = 'DNS TXT record verified successfully';
          } else {
            verificationMessage = 'DNS TXT record not found. Please ensure the record is added and DNS has propagated.';
          }
        } catch (err) {
          verificationMessage = 'Could not find DNS TXT record. Please ensure it is added correctly and wait for DNS propagation.';
        }
        break;

      case 'meta':
        try {
          // Fetch the website homepage and check for meta tag
          const response = await fetch(`https://${website.domain}`, {
            headers: {
              'User-Agent': 'Linkio-Verification-Bot/1.0'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            const metaTagPattern = new RegExp(`<meta\\s+name=["']linkio-site-verification["']\\s+content=["']${token}["']`, 'i');
            
            verified = metaTagPattern.test(html);
            
            if (verified) {
              verificationMessage = 'HTML meta tag verified successfully';
            } else {
              verificationMessage = 'Meta tag not found on homepage. Please ensure it is added to the <head> section.';
            }
          } else {
            verificationMessage = 'Could not access website homepage. Please ensure the site is accessible.';
          }
        } catch (err) {
          verificationMessage = 'Error checking website for meta tag. Please try again later.';
        }
        break;

      case 'file':
        try {
          // Check for verification file
          const fileUrl = `https://${website.domain}/linkio-verify-${token}.html`;
          const response = await fetch(fileUrl, {
            headers: {
              'User-Agent': 'Linkio-Verification-Bot/1.0'
            }
          });
          
          if (response.ok) {
            const content = await response.text();
            verified = content.includes(token);
            
            if (verified) {
              verificationMessage = 'HTML file verification successful';
            } else {
              verificationMessage = 'Verification file found but content is incorrect. Please ensure the file content matches exactly.';
            }
          } else {
            verificationMessage = 'Verification file not found. Please ensure it is uploaded to the root directory.';
          }
        } catch (err) {
          verificationMessage = 'Error checking for verification file. Please try again later.';
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid verification method' },
          { status: 400 }
        );
    }

    // If verified, update the relationship
    if (verified) {
      await db.update(publisherOfferingRelationships)
        .set({
          verificationStatus: 'verified',
          verifiedAt: new Date(),
          verifiedBy: session.userId,
          updatedAt: new Date()
        })
        .where(eq(publisherOfferingRelationships.id, relationship.id));

      // If email verification, update the email claim
      if (method === 'email') {
        await db.update(publisherEmailClaims)
          .set({
            verifiedAt: new Date(),
            status: 'verified',
            updatedAt: new Date()
          })
          .where(and(
            eq(publisherEmailClaims.publisherId, session.publisherId),
            eq(publisherEmailClaims.websiteId, websiteId),
            eq(publisherEmailClaims.verificationToken, token)
          ));
      }
    }

    return NextResponse.json({
      verified,
      message: verificationMessage,
      status: verified ? 'verified' : 'pending'
    });

  } catch (error) {
    console.error('Error checking verification:', error);
    return NextResponse.json(
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}