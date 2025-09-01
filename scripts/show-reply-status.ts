import fetch from 'node-fetch';

const MANYREACH_API_KEY = process.env.MANYREACH_API_KEY || '';
const BASE_URL = 'https://app.manyreach.com/api';

async function showReplyStatus() {
  console.log('📊 ManyReach Reply Status Report\n');
  console.log('='.repeat(80));
  
  const campaignId = 26001;
  const campaignName = 'LI for BB (countrybrook)';
  
  console.log(`Campaign: ${campaignName}`);
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`From: nick.outreachlabs@gmail.com`);
  console.log('\n' + '-'.repeat(80));
  
  try {
    // Get all prospects from campaign
    const prospectsResponse = await fetch(
      `${BASE_URL}/campaigns/${campaignId}/prospects?apikey=${MANYREACH_API_KEY}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const prospectsData = await prospectsResponse.json();
    const prospects = prospectsData.data;
    
    // Find prospects marked as replied
    const repliedProspects = prospects.filter((p: any) => p.replied === true);
    
    console.log(`\n📧 Campaign Statistics:`);
    console.log(`  Total prospects: ${prospects.length}`);
    console.log(`  Prospects marked as "replied": ${repliedProspects.length}`);
    console.log('\n' + '-'.repeat(80));
    
    console.log('\n🔍 CHECKING EACH "REPLIED" PROSPECT:\n');
    
    for (let i = 0; i < repliedProspects.length; i++) {
      const prospect = repliedProspects[i];
      console.log(`\n${i + 1}. Email: ${prospect.email}`);
      console.log(`   Status in ManyReach: replied = ${prospect.replied}`);
      console.log(`   Date sent: ${prospect.dateSentInitial || 'Unknown'}`);
      
      // Check messages for this prospect
      const messagesResponse = await fetch(
        `${BASE_URL}/prospects/messages/${encodeURIComponent(prospect.email)}?apikey=${MANYREACH_API_KEY}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const messages = messagesData.data || [];
        
        const sentMessages = messages.filter((m: any) => m.type === 'SENT');
        const replyMessages = messages.filter((m: any) => m.type === 'REPLY');
        
        console.log(`   Messages found via API:`);
        console.log(`     - SENT messages: ${sentMessages.length}`);
        console.log(`     - REPLY messages: ${replyMessages.length}`);
        
        if (replyMessages.length > 0) {
          console.log(`   ✅ REPLY CONTENT FOUND!`);
          replyMessages.forEach((reply: any) => {
            const cleanBody = reply.emailBody
              ?.replace(/<[^>]*>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 100);
            console.log(`      Preview: "${cleanBody}..."`);
          });
        } else {
          console.log(`   ❌ NO REPLY CONTENT FOUND (but ManyReach says they replied)`);
        }
      } else {
        console.log(`   ⚠️  Failed to fetch messages: ${messagesResponse.status}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 SUMMARY:\n');
    console.log('This is what I mean by "Other 2 replied prospects show no REPLY messages":');
    console.log('\nManyReach marks these 3 prospects as having replied (replied=true).');
    console.log('But when I query the /messages endpoint for each email:');
    console.log('  - Only 1 returns a REPLY message (editor@littlegatepublishing.com)');
    console.log('  - The other 2 only return SENT messages, no REPLY messages');
    console.log('\nYou can verify this in the ManyReach UI to see if the replies are visible there.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

showReplyStatus();