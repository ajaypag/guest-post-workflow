const BASE_URL = 'http://localhost:3002';

async function checkCoinlibShadowData() {
  console.log('🔍 Checking shadow data for info@coinlib.io...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/test/check-shadow-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'info@coinlib.io'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('📊 Shadow Data Analysis for info@coinlib.io:');
      console.log('🆔 Publisher ID:', result.publisherId);
      console.log('📧 Email:', result.email);
      console.log('🌐 Shadow websites found:', result.shadowWebsites?.length || 0);
      
      if (result.shadowWebsites && result.shadowWebsites.length > 0) {
        console.log('\n📋 Websites that will be migrated:');
        result.shadowWebsites.forEach((site, index) => {
          console.log(`  ${index + 1}. ${site.domain}`);
          console.log(`     - Guest Post Cost: $${site.guest_post_cost || 'N/A'}`);
          console.log(`     - Turnaround: ${site.typical_turnaround_days || 'N/A'} days`);
          console.log(`     - Shadow ID: ${site.shadow_id}`);
          console.log('');
        });
        
        console.log(`🎯 Expected migration result: ${result.shadowWebsites.length} websites → ${result.shadowWebsites.length * 2} offerings (guest_post + link_insertion for each)`);
      } else {
        console.log('⚠️ No shadow websites found - migration will be empty');
      }
      
      return result;
    } else {
      console.error('❌ Failed to check shadow data:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking shadow data:', error);
    return null;
  }
}

checkCoinlibShadowData();