import fetch from 'node-fetch';

const MANYREACH_API_KEY = process.env.MANYREACH_API_KEY || '';
const BASE_URL = 'https://app.manyreach.com/api';

async function fetchCampaignReplies() {
  console.log('🔍 Fetching ManyReach Campaign Replies...\n');
  console.log('='.repeat(80));
  
  const campaignId = 26001; // LI for BB (countrybrook) - has 3 replies
  
  try {
    // Try multiple endpoints to find the messages/replies
    const endpoints = [
      `/campaigns/${campaignId}/messages`,
      `/campaigns/${campaignId}/replies`,
      `/campaigns/${campaignId}/prospects?filter=replied`,
      `/prospects?campaignId=${campaignId}&replied=true`,
      `/messages?campaignId=${campaignId}`,
      `/replies?campaignId=${campaignId}`
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\nTrying endpoint: ${endpoint}`);
      console.log('-'.repeat(40));
      
      const response = await fetch(
        `${BASE_URL}${endpoint}&apikey=${MANYREACH_API_KEY}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response structure:', Object.keys(data));
        
        if (data.data) {
          if (Array.isArray(data.data) && data.data.length > 0) {
            console.log(`✅ Found ${data.data.length} items!`);
            console.log('\nFirst item structure:', Object.keys(data.data[0]));
            console.log('\nFirst item preview:');
            console.log(JSON.stringify(data.data[0], null, 2));
            
            // If we find messages, extract email content
            if (data.data[0].body || data.data[0].message || data.data[0].content) {
              console.log('\n📧 EMAIL CONTENT FOUND!');
              for (let i = 0; i < Math.min(3, data.data.length); i++) {
                console.log(`\n--- Message ${i + 1} ---`);
                const msg = data.data[i];
                console.log('From:', msg.from || msg.fromEmail || msg.senderEmail || 'Unknown');
                console.log('To:', msg.to || msg.toEmail || msg.recipientEmail || 'Unknown');
                console.log('Subject:', msg.subject || 'No subject');
                console.log('Body:', (msg.body || msg.message || msg.content || '').substring(0, 500));
              }
            }
          } else if (data.data === null) {
            console.log('Response has null data');
          } else {
            console.log('Response has empty data array');
          }
        } else {
          console.log('No data field in response');
        }
      }
    }
    
    // Also try to get prospects and then their messages
    console.log('\n\n📋 Fetching prospects with replies...');
    console.log('='.repeat(80));
    
    const prospectsResponse = await fetch(
      `${BASE_URL}/campaigns/${campaignId}/prospects?apikey=${MANYREACH_API_KEY}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (prospectsResponse.ok) {
      const prospectsData = await prospectsResponse.json();
      console.log('Prospects response structure:', Object.keys(prospectsData));
      
      // The API might return prospects differently
      const prospects = prospectsData.data || prospectsData.prospects || prospectsData;
      
      if (Array.isArray(prospects)) {
        console.log(`Found ${prospects.length} prospects`);
        
        // Look for prospects with replies
        const repliedProspects = prospects.filter(p => 
          p.replied || p.hasReplied || p.replyCount > 0 || p.replies > 0
        );
        
        if (repliedProspects.length > 0) {
          console.log(`\n✅ Found ${repliedProspects.length} prospects with replies!`);
          
          for (const prospect of repliedProspects.slice(0, 3)) {
            console.log('\nProspect:', prospect.email || prospect.to);
            console.log('Structure:', Object.keys(prospect));
            
            // Try to get messages for this prospect
            if (prospect.prospectId || prospect.id) {
              const prospectId = prospect.prospectId || prospect.id;
              const msgResponse = await fetch(
                `${BASE_URL}/prospects/${prospectId}/messages?apikey=${MANYREACH_API_KEY}`,
                {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
              
              if (msgResponse.ok) {
                const msgData = await msgResponse.json();
                console.log('Messages for prospect:', msgData);
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fetchCampaignReplies();