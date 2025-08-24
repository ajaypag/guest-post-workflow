import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function setupTestPublisherClaim() {
  try {
    console.log('🚀 Setting up test publisher claim flow...\n');

    const testEmail = 'test-publisher@example.com';
    
    // Check if test publisher already exists
    const [existingPublisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, testEmail))
      .limit(1);

    let publisherId: string;

    if (existingPublisher) {
      console.log('✅ Found existing test publisher');
      publisherId = existingPublisher.id;
      
      // Update with new claim token
      const invitationToken = crypto.randomBytes(32).toString('base64url');
      
      await db
        .update(publishers)
        .set({
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          accountStatus: 'shadow', // Ensure it's in shadow status for claiming
          updatedAt: new Date()
        })
        .where(eq(publishers.id, publisherId));

      console.log('🔄 Updated claim token for existing publisher');
    } else {
      // Create new test publisher
      const invitationToken = crypto.randomBytes(32).toString('base64url');
      
      const [newPublisher] = await db
        .insert(publishers)
        .values({
          id: crypto.randomUUID(),
          email: testEmail,
          contactName: 'Test Publisher',
          companyName: 'Test Publishing Company',
          accountStatus: 'shadow',
          source: 'manyreach',
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: publishers.id });

      publisherId = newPublisher.id;
      console.log('✅ Created new test publisher');
    }

    // Get updated publisher with token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (!publisher || !publisher.invitationToken) {
      throw new Error('Failed to create publisher with token');
    }

    // Generate claim URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
    const claimUrl = `${baseUrl}/publisher/claim?token=${publisher.invitationToken}`;

    console.log('\n🎉 Test Publisher Claim Flow Setup Complete!\n');
    console.log('📋 Publisher Details:');
    console.log(`   Email: ${publisher.email}`);
    console.log(`   Name: ${publisher.contactName}`);
    console.log(`   Company: ${publisher.companyName}`);
    console.log(`   Status: ${publisher.accountStatus}`);
    console.log(`   Source: ${publisher.source}`);
    console.log('\n🔗 Test URLs:');
    console.log(`   Landing Page: ${baseUrl}/publisher`);
    console.log(`   Signup Page: ${baseUrl}/publisher/signup`);
    console.log(`   Login Page: ${baseUrl}/publisher/login`);
    console.log(`   Claim Page: ${claimUrl}`);
    
    console.log('\n📝 Testing Instructions:');
    console.log('1. Visit the landing page to see the new design');
    console.log('2. Try the signup flow (removes double password)');
    console.log('3. Test the claim flow with the URL above');
    console.log('4. Check that all pages have proper navigation and footer');
    console.log('\n⚠️  Note: The claim URL is valid for 30 days');
    
    return {
      publisherId,
      email: publisher.email,
      claimUrl,
      token: publisher.invitationToken
    };

  } catch (error) {
    console.error('❌ Error setting up test publisher claim:', error);
    throw error;
  }
}

// Run the script
setupTestPublisherClaim()
  .then((result) => {
    console.log('\n✨ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });