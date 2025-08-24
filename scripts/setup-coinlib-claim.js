const BASE_URL = 'http://localhost:3002';

async function setupCoinlibClaim() {
  console.log('🚀 Setting up claim token for info@coinlib.io...\n');
  
  try {
    // Create or update publisher with claim token
    const response = await fetch(`${BASE_URL}/api/test/setup-publisher-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'info@coinlib.io',
        contactName: 'Coinlib Team',
        companyName: 'Coinlib'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Claim setup successful!');
      console.log('📧 Email:', result.email);
      console.log('🆔 Publisher ID:', result.publisherId);
      console.log('🔗 Claim URL:', result.claimUrl);
      console.log('🎫 Token:', result.token);
      
      console.log('\n📋 Instructions:');
      console.log('1. Visit the claim URL above in your browser');
      console.log('2. Complete the claim process with your password');
      console.log('3. Check how the 4 websites transfer during shadow data migration');
      console.log('4. Test the publisher portal functionality');
      
      return result;
    } else {
      console.error('❌ Failed to setup claim:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error setting up claim:', error);
    return null;
  }
}

setupCoinlibClaim();