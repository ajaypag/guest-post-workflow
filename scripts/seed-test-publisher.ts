import 'dotenv/config';
import { db } from '../lib/db/connection';
import { 
  publisherOfferingRelationships, 
  publisherOfferings,
  publisherPricingRules 
} from '../lib/db/publisherSchemaActual';
import { publishers } from '../lib/db/accountSchema';
import { websites } from '../lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedTestPublisher() {
  console.log('🌱 Seeding test publisher data...');
  
  try {
    // Create test publisher
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    const [testPublisher] = await db
      .insert(publishers)
      .values({
        id: crypto.randomUUID(),
        email: 'test.publisher@example.com',
        password: hashedPassword,
        contactName: 'Test Publisher',
        companyName: 'Test Publishing Co',
        status: 'active',
        emailVerified: true
      })
      .onConflictDoUpdate({
        target: publishers.email,
        set: {
          password: hashedPassword,
          contactName: 'Test Publisher',
          companyName: 'Test Publishing Co',
          status: 'active',
          emailVerified: true
        }
      })
      .returning();
    
    console.log('✅ Test publisher created:', testPublisher.email);
    
    // Check if test website exists
    const existingWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.domain, 'testpublisher.com'))
      .limit(1);
    
    let websiteId: string;
    
    if (existingWebsite.length === 0) {
      // Create test website - start simple and debug
      const [testWebsite] = await db
        .insert(websites)
        .values({
          id: crypto.randomUUID(),
          domain: 'testpublisher.com',
          createdAt: new Date(),
          updatedAt: new Date(),
          airtableCreatedAt: new Date(),
          airtableUpdatedAt: new Date()
        })
        .returning();
      
      websiteId = testWebsite.id;
      console.log('✅ Test website created:', testWebsite.domain);
    } else {
      websiteId = existingWebsite[0].id;
      console.log('✅ Test website exists:', existingWebsite[0].domain);
    }
    
    // Create relationship between publisher and website
    await db
      .insert(publisherOfferingRelationships)
      .values({
        publisherId: testPublisher.id,
        websiteId: websiteId,
        verificationStatus: 'verified',
        isActive: true
      })
      .onConflictDoNothing();
    
    console.log('✅ Publisher-website relationship created');
    
    // Create test offering with comprehensive data
    const [testOffering] = await db
      .insert(publisherOfferings)
      .values({
        publisherId: testPublisher.id,
        offeringType: 'guest_post',
        basePrice: 25000, // $250 in cents
        currency: 'USD',
        turnaroundDays: 7,
        minWordCount: 1000,
        maxWordCount: 2500,
        currentAvailability: 'available',
        expressAvailable: true,
        expressPrice: 37500, // $375 in cents
        expressDays: 3,
        attributes: {
          contentRequirements: {
            minWords: 1000,
            maxWords: 2500,
            requiresOriginal: true,
            requiresImages: true,
            minImages: 2,
            allowsPromotional: false
          },
          allowedTopics: ['Technology', 'Business', 'Marketing', 'SaaS', 'AI/ML'],
          prohibitedTopics: ['Gambling', 'Adult', 'Politics'],
          linkRequirements: {
            maxDoFollow: 2,
            maxNoFollow: 1,
            allowsHomepageLinks: false,
            requiresRelevantAnchors: true
          },
          availableSlots: 5,
          restrictions: {
            requiresApproval: true,
            minimumDR: 30,
            bannedDomains: ['competitor1.com', 'competitor2.com']
          }
        },
        isActive: true
      })
      .returning();
    
    console.log('✅ Test offering created:', testOffering.offeringType);
    
    // Update relationship with offering ID
    await db
      .update(publisherOfferingRelationships)
      .set({ offeringId: testOffering.id })
      .where(eq(publisherOfferingRelationships.publisherId, testPublisher.id));
    
    // Create pricing rules for comprehensive testing
    const pricingRules = [
      {
        publisherOfferingId: testOffering.id,
        ruleName: 'Bulk Discount - 5+ posts',
        ruleType: 'volume_discount',
        conditions: { minQuantity: 5 },
        actions: { 
          adjustmentType: 'percentage',
          adjustmentValue: -10 // 10% discount
        },
        priority: 1,
        isActive: true
      },
      {
        publisherOfferingId: testOffering.id,
        ruleName: 'Seasonal Promotion - Q1',
        ruleType: 'seasonal',
        conditions: { 
          startDate: new Date('2025-01-01').toISOString(),
          endDate: new Date('2025-03-31').toISOString()
        },
        actions: {
          adjustmentType: 'percentage',
          adjustmentValue: -15 // 15% discount
        },
        priority: 2,
        isActive: true
      },
      {
        publisherOfferingId: testOffering.id,
        ruleName: 'Long Content Premium',
        ruleType: 'content_length',
        conditions: { minWords: 2000 },
        actions: {
          adjustmentType: 'fixed',
          adjustmentValue: 5000 // $50 extra
        },
        priority: 3,
        isActive: true
      }
    ];
    
    for (const rule of pricingRules) {
      await db.insert(publisherPricingRules).values(rule);
    }
    
    console.log('✅ Pricing rules created:', pricingRules.length);
    
    // Create a second website to test multiple websites
    /* const [secondWebsite] = await db
      .insert(websites)
      .values({
        domain: 'techblog.example.com',
        domainRating: 65,
        totalTraffic: 150000,
        guestPostCost: 45000, // $450 in cents
        categories: ['Technology', 'Software'],
        niche: 'Enterprise Software',
        type: 'News',
        websiteType: 'premium',
        status: 'active',
        hasGuestPost: true,
        hasLinkInsert: false,
        publishedOpportunities: 12,
        overallQuality: 'excellent',
        publisherTier: 'platinum',
        preferredContentTypes: JSON.stringify(['news', 'analysis', 'thought-leadership']),
        typicalTurnaroundDays: 5,
        acceptsDoFollow: true,
        requiresAuthorBio: false,
        maxLinksPerPost: 2,
        publisherCompany: 'Test Publishing Co',
        websiteLanguage: 'en',
        targetAudience: 'Enterprise decision makers',
        avgResponseTimeHours: 12,
        successRatePercentage: 98,
        totalPostsPublished: 500,
        internalQualityScore: 95,
        source: 'manual',
        airtableCreatedAt: new Date(),
        airtableUpdatedAt: new Date()
      })
      .returning();
    
    // Create relationship for second website
    await db
      .insert(publisherOfferingRelationships)
      .values({
        publisherId: testPublisher.id,
        websiteId: secondWebsite.id,
        verificationStatus: 'pending',
        isActive: true
      });
    
    console.log('✅ Second test website created:', secondWebsite.domain); */
    
    console.log('\n📝 Test Credentials:');
    console.log('Email:', testPublisher.email);
    console.log('Password: TestPassword123!');
    console.log('Publisher ID:', testPublisher.id);
    console.log('Website ID:', websiteId);
    console.log('Offering ID:', testOffering.id);
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedTestPublisher();