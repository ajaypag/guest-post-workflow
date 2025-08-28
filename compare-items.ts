import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq } from 'drizzle-orm';

async function compareItems() {
  const orderId = '1176a884-7825-4c73-99f3-9d3fae687bf8';
  
  const items = await db
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId));
  
  // Find publicmediasolution.com (working) and skyryedesign.com (not working)
  const workingItem = items.find(i => i.assignedDomain === 'publicmediasolution.com');
  const notWorkingItem = items.find(i => i.assignedDomain === 'skyryedesign.com');
  
  if (!workingItem || !notWorkingItem) {
    console.log('Could not find items to compare');
    return;
  }
  
  console.log('\n🔍 COLUMN-BY-COLUMN COMPARISON');
  console.log('================================');
  console.log('Working: publicmediasolution.com');
  console.log('Not Working: skyryedesign.com');
  console.log('================================\n');
  
  const columns = Object.keys(workingItem);
  
  for (const column of columns) {
    const workingValue = workingItem[column as keyof typeof workingItem];
    const notWorkingValue = notWorkingItem[column as keyof typeof notWorkingItem];
    
    // Skip if both are same
    if (workingValue === notWorkingValue) continue;
    
    // Check for meaningful differences
    const workingDisplay = workingValue === null ? 'NULL' : 
                          workingValue === '' ? 'EMPTY STRING' :
                          workingValue === undefined ? 'UNDEFINED' :
                          typeof workingValue === 'object' ? JSON.stringify(workingValue).substring(0, 100) :
                          String(workingValue).substring(0, 100);
    
    const notWorkingDisplay = notWorkingValue === null ? 'NULL' : 
                             notWorkingValue === '' ? 'EMPTY STRING' :
                             notWorkingValue === undefined ? 'UNDEFINED' :
                             typeof notWorkingValue === 'object' ? JSON.stringify(notWorkingValue).substring(0, 100) :
                             String(notWorkingValue).substring(0, 100);
    
    if (workingDisplay !== notWorkingDisplay) {
      console.log(`📌 ${column}:`);
      console.log(`   Working: ${workingDisplay}`);
      console.log(`   Not Working: ${notWorkingDisplay}`);
      console.log('');
    }
  }
  
  console.log('\n🎯 KEY DIFFERENCES SUMMARY:');
  console.log('----------------------------');
  console.log('assignedDomainId:', workingItem.assignedDomainId ? '✅ Has ID' : '❌ NULL', 'vs', notWorkingItem.assignedDomainId ? '✅ Has ID' : '❌ NULL');
  console.log('status:', workingItem.status, 'vs', notWorkingItem.status);
  console.log('clientReviewStatus:', workingItem.clientReviewStatus || 'NULL', 'vs', notWorkingItem.clientReviewStatus || 'NULL');
  console.log('addedAt:', workingItem.addedAt ? '✅' : '❌', 'vs', notWorkingItem.addedAt ? '✅' : '❌');
  console.log('metadata:', typeof workingItem.metadata, 'vs', typeof notWorkingItem.metadata);
  
  console.log('\n📊 PENDING STATUS CHECK:');
  console.log('Working item status:', workingItem.status, '- Client review status:', workingItem.clientReviewStatus || 'NULL');
  console.log('Not working status:', notWorkingItem.status, '- Client review status:', notWorkingItem.clientReviewStatus || 'NULL');
  
  console.log('\n📋 ALL ITEMS STATUS CHECK:');
  items.forEach(item => {
    const isPending = item.clientReviewStatus === 'pending' || (!item.clientReviewStatus && item.status === 'assigned');
    console.log(`${item.assignedDomain}: Status=${item.status}, ClientReview=${item.clientReviewStatus || 'NULL'} ${isPending ? '⏳ PENDING' : ''}`);
  });
}

compareItems();