#!/usr/bin/env tsx

/**
 * Test the new contextual publisher invitation email
 * Run with: tsx scripts/test-email-v2.tsx [recipient-email]
 */

import dotenv from 'dotenv';
import path from 'path';
import { Resend } from 'resend';
import { renderToStaticMarkup } from 'react-dom/server';
import PublisherInvitationEmailV2, { PublisherInvitationEmailV2PlainText } from '../lib/email/templates/PublisherInvitationEmailV2';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEmailV2() {
  console.log('📧 Testing New Publisher Invitation Email V2');
  console.log('==========================================\n');

  // Get recipient from command line or use default
  const recipient = process.argv[2] || 'test@example.com';
  
  // Check if API key is configured
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_test_key_here') {
    console.error('❌ Error: RESEND_API_KEY not configured in .env.local');
    process.exit(1);
  }

  console.log('✅ Resend API Key found:', apiKey.substring(0, 10) + '...');

  // Initialize Resend
  const resend = new Resend(apiKey);

  // Sample data that would come from their previous email responses
  const sampleData = {
    publisherName: 'Sarah',
    companyName: 'Premium Content Publishers',
    email: recipient,
    websites: [
      { 
        domain: 'techblog.com', 
        currentRate: 250, 
        estimatedTurnaround: 3 
      },
      { 
        domain: 'digitalmarketing.net', 
        currentRate: 350, 
        estimatedTurnaround: 5 
      },
      { 
        domain: 'businessinsights.org', 
        currentRate: 200, 
        estimatedTurnaround: 2 
      },
      { 
        domain: 'startupnews.io', 
        currentRate: 300, 
        estimatedTurnaround: 4 
      },
      { 
        domain: 'techtrends.blog', 
        currentRate: 275, 
        estimatedTurnaround: 3 
      }
    ],
    claimUrl: `http://localhost:3002/publisher/claim?token=test-token-${Date.now()}`,
    totalWebsites: 5,
    estimatedMonthlyValue: 1375
  };

  // Generate email HTML and text
  const emailHtml = renderToStaticMarkup(
    PublisherInvitationEmailV2(sampleData)
  );
  
  const emailText = PublisherInvitationEmailV2PlainText(sampleData);

  const testEmail = {
    from: 'Linkio Publishers <info@linkio.com>',
    to: recipient,
    replyTo: 'publishers@linkio.com',
    subject: 'Your Publisher Account is Ready - Start Receiving Guest Post Orders',
    html: emailHtml,
    text: emailText,
    tags: [
      { name: 'type', value: 'publisher_invitation' },
      { name: 'test', value: 'true' }
    ]
  };

  console.log('\n📊 Email Details:');
  console.log('================');
  console.log('To:', recipient);
  console.log('From:', testEmail.from);
  console.log('Reply-To:', testEmail.replyTo);
  console.log('Subject:', testEmail.subject);
  console.log('\nSample Data:');
  console.log('- Publisher:', sampleData.publisherName);
  console.log('- Company:', sampleData.companyName);
  console.log('- Websites:', sampleData.websites.length);
  console.log('  • First 3 shown in email');
  console.log('  • Includes pricing and turnaround times');
  console.log('\n');

  try {
    console.log('🚀 Sending email...\n');
    const result = await resend.emails.send(testEmail);
    
    console.log('✅ Email sent successfully!');
    console.log('=====================================');
    console.log('Email ID:', result.data?.id);
    console.log('Recipient:', recipient);
    console.log('\n📋 What the email contains:');
    console.log('1. Context about why they are receiving it');
    console.log('2. Their website data from previous responses');
    console.log('3. Clear benefits of joining');
    console.log('4. Simple call-to-action');
    console.log('\nCheck your inbox to see the formatted email!');
    
  } catch (error: any) {
    console.error('❌ Error sending email:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.error('\n📊 Full error:');
    console.error(error);
  }

  console.log('\n==========================================');
  console.log('Test complete!');
}

// Run the test
testEmailV2().catch(console.error);