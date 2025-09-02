import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, websites, publisherWebsites } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

// For testing purposes - bypass auth in local development
const isLocalDevelopment = process.env.NODE_ENV === 'development' && 
  (process.env.NEXTAUTH_URL?.includes('localhost') || !process.env.NEXTAUTH_URL);

export async function POST(request: NextRequest) {
  // Skip auth check for local testing
  if (!isLocalDevelopment) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const testPublishers = [
      {
        id: uuidv4(),
        email: 'test1@example.com',
        contactName: 'John Smith',
        companyName: 'Premium Content Publishers',
        accountStatus: 'shadow' as const,
        source: 'test',
        invitationToken: uuidv4(),
        emailVerified: false,
        confidenceScore: '0.95',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'test2@example.com',
        contactName: 'Sarah Johnson',
        companyName: 'Digital Media Group',
        accountStatus: 'shadow' as const,
        source: 'test',
        invitationToken: uuidv4(),
        emailVerified: false,
        confidenceScore: '0.90',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'test3@example.com',
        contactName: 'Mike Wilson',
        companyName: 'Tech Blog Network',
        accountStatus: 'shadow' as const,
        source: 'test',
        invitationToken: uuidv4(),
        emailVerified: false,
        confidenceScore: '0.85',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert test publishers
    const insertedPublishers = await db.insert(publishers).values(testPublishers).returning();
    
    // Create test websites for each publisher
    const testWebsites = [];
    const testRelationships = [];
    
    for (const publisher of insertedPublishers) {
      const websiteId = uuidv4();
      testWebsites.push({
        id: websiteId,
        domain: `${publisher.companyName?.toLowerCase().replace(/\s+/g, '-')}.com`,
        guestPostCost: 25000, // $250 in cents
        avgResponseTimeHours: 48,
        successRatePercentage: '85',
        source: 'test',
        airtableCreatedAt: new Date(),
        airtableUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      testRelationships.push({
        id: uuidv4(),
        publisherId: publisher.id,
        websiteId: websiteId,
        isPrimary: true,
        isActive: true,
        relationshipType: 'owner',
        verificationStatus: 'claimed',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Insert websites and relationships
    if (testWebsites.length > 0) {
      await db.insert(websites).values(testWebsites);
      await db.insert(publisherWebsites).values(testRelationships);
    }

    return NextResponse.json({
      success: true,
      created: insertedPublishers.length,
      publishers: insertedPublishers.map(p => ({
        id: p.id,
        email: p.email,
        companyName: p.companyName
      }))
    });

  } catch (error: any) {
    console.error('[EMAIL_TEST] Error creating test data:', error);
    
    // Check if it's a unique constraint error (publishers already exist)
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Test publishers already exist. They can be reused.',
        created: 0
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create test data' 
    }, { status: 500 });
  }
}