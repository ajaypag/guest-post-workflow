import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';
import { websites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    console.log(`🏗️ Creating fresh shadow data for: ${email}`);
    
    // 1. Create or find publisher
    let publisher = await db.select().from(publishers).where(eq(publishers.email, email)).limit(1);
    
    if (publisher.length === 0) {
      // Create new publisher
      const publisherId = crypto.randomUUID();
      await db.insert(publishers).values({
        id: publisherId,
        email: email,
        contactName: 'Test Publisher',
        companyName: 'Test Company',
        accountStatus: 'active'
      });
      
      // Re-query to get the created publisher
      publisher = await db.select().from(publishers).where(eq(publishers.id, publisherId)).limit(1);
      
      console.log(`📝 Created new publisher: ${publisherId}`);
    }
    
    const publisherId = publisher[0].id;
    
    // 2. Define test websites for coinlib.io
    const testWebsites = [
      { domain: 'coinlib.io', price: '200', turnaround: '5' },
      { domain: 'adherents.com', price: '100', turnaround: '7' },
      { domain: 'alternativas.eu', price: '50', turnaround: '3' },
      { domain: 'newsslash.com', price: '130', turnaround: '4' }
    ];
    
    const shadowDataCreated: any[] = [];
    
    // 3. Create shadow data for each test website
    for (const testSite of testWebsites) {
      // Find the website in the websites table
      const websiteRecord = await db.select().from(websites).where(eq(websites.domain, testSite.domain)).limit(1);
      
      if (websiteRecord.length === 0) {
        console.log(`⚠️ Website not found in database: ${testSite.domain}`);
        shadowDataCreated.push({
          domain: testSite.domain,
          status: 'website_not_found'
        });
        continue;
      }
      
      const websiteId = websiteRecord[0].id;
      
      // Check if shadow data already exists
      const existingShadow = await db.select().from(shadowPublisherWebsites)
        .where(and(
          eq(shadowPublisherWebsites.publisherId, publisherId),
          eq(shadowPublisherWebsites.websiteId, websiteId)
        )).limit(1);
      
      if (existingShadow.length > 0) {
        console.log(`⏭️ Shadow data already exists for ${testSite.domain}`);
        shadowDataCreated.push({
          domain: testSite.domain,
          status: 'already_exists',
          shadowId: existingShadow[0].id
        });
        continue;
      }
      
      // Create shadow data
      await db.insert(shadowPublisherWebsites).values({
        publisherId: publisherId,
        websiteId: websiteId,
        confidence: '0.90',
        source: 'test_data',
        extractionMethod: 'manual_test',
        verified: true,
        migrationStatus: 'pending'
      });
      
      console.log(`✅ Created shadow data for ${testSite.domain}: $${testSite.price}, ${testSite.turnaround} days`);
      shadowDataCreated.push({
        domain: testSite.domain,
        status: 'created',
        price: testSite.price,
        turnaround: testSite.turnaround
      });
    }
    
    console.log(`🎯 Shadow data creation complete. Created ${shadowDataCreated.filter(s => s.status === 'created').length} new records`);
    
    return NextResponse.json({
      success: true,
      publisherId,
      email,
      shadowDataCreated,
      totalCreated: shadowDataCreated.filter(s => s.status === 'created').length,
      totalExisting: shadowDataCreated.filter(s => s.status === 'already_exists').length
    });
    
  } catch (error) {
    console.error('Failed to create shadow data:', error);
    return NextResponse.json(
      { error: 'Failed to create shadow data' },
      { status: 500 }
    );
  }
}