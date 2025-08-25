const BASE_URL = 'http://localhost:3002';
const publisherId = '55b185d8-d13e-4db6-ba74-73b78feaed6c'; // coinlib publisher

async function checkOfferingWebsite() {
  console.log('🔍 Checking offering-website associations for coinlib publisher...\n');
  
  try {
    // Get all offerings for this publisher
    const response = await fetch(`${BASE_URL}/api/test/offering-database-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        publisherId: publisherId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('📊 Database Results:');
      console.log('🆔 Publisher ID:', result.publisherId);
      console.log('📝 Total offerings found:', result.offerings?.length || 0);
      
      if (result.offerings && result.offerings.length > 0) {
        console.log('\n📋 Offering Details:');
        result.offerings.forEach((offering, index) => {
          console.log(`\n${index + 1}. Offering: ${offering.offeringName || 'Unnamed'}`);
          console.log(`   - ID: ${offering.id}`);
          console.log(`   - Type: ${offering.offeringType}`);
          console.log(`   - Direct Website ID: ${offering.website_id || 'NONE'}`);
          console.log(`   - Website from Join: ${offering.website?.domain || 'NO WEBSITE JOINED'}`);
          console.log(`   - Relationship exists: ${offering.hasRelationship ? 'YES' : 'NO'}`);
          if (offering.relationshipDetails) {
            console.log(`   - Relationship Website ID: ${offering.relationshipDetails.websiteId}`);
            console.log(`   - Relationship Domain: ${offering.relationshipDetails.domain}`);
          }
        });
        
        console.log('\n🎯 Analysis:');
        const guestPost1 = result.offerings.find(o => o.offeringType === 'guest_post');
        if (guestPost1) {
          console.log('✅ Found Guest Post #1:', guestPost1.offeringName || guestPost1.id);
          console.log('🌐 Should show website:', guestPost1.website?.domain || guestPost1.relationshipDetails?.domain || 'NO WEBSITE FOUND');
          console.log('🔍 Problem diagnosis:');
          if (!guestPost1.website && !guestPost1.relationshipDetails) {
            console.log('   ❌ NO website association found in database');
          } else {
            console.log('   ✅ Website association exists in database');
          }
        } else {
          console.log('❌ No guest post offering found');
        }
      } else {
        console.log('⚠️ No offerings found for this publisher');
      }
      
      return result;
    } else {
      console.error('❌ Failed to check offering data:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking offering data:', error);
    return null;
  }
}

checkOfferingWebsite();