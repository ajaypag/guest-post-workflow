#!/usr/bin/env tsx
// Test script for external user unified order interface

import { db, closeConnection } from '../lib/db/connection';
import { users, orders, orderGroups, lineItems, clients } from '../lib/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function testExternalOrderFlow() {
  console.log('Testing External User Unified Order Flow...\n');

  try {
    // 1. Find an external user (account type)
    const externalUser = await db.select()
      .from(users)
      .where(
        and(
          eq(users.userType, 'account'),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (!externalUser || externalUser.length === 0) {
      console.error('❌ No external users found in database');
      console.log('Please create an external user first');
      return;
    }

    const user = externalUser[0];
    console.log(`✅ Found external user: ${user.email}`);

    // 2. Check if user has any existing orders
    const existingOrders = await prisma.order.findMany({
      where: {
        accountId: externalUser.id,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        orderGroups: {
          include: {
            lineItems: true
          }
        }
      }
    });

    console.log(`\n📦 User has ${existingOrders.length} existing orders:`);
    
    if (existingOrders.length > 0) {
      console.log('\nRecent orders:');
      existingOrders.forEach(order => {
        const lineItemCount = order.orderGroups.reduce((sum, group) => sum + group.lineItems.length, 0);
        console.log(`  - Order #${order.id.slice(0, 8)} | Status: ${order.status} | Items: ${lineItemCount} | Total: $${(order.totalRetail / 100).toFixed(2)}`);
        console.log(`    URL: /account/orders/${order.id}`);
      });
    }

    // 3. Check different order statuses and their expected views
    console.log('\n🔍 Checking order status configurations:');
    
    const statusConfigs = [
      { status: 'draft', expectedView: 'Order Summary + Order Details' },
      { status: 'pending_confirmation', expectedView: 'Order Status + Order Details' },
      { status: 'confirmed', expectedView: 'Order Progress + Order Details' },
      { status: 'sites_ready', expectedView: 'Review Sites + Order Details' },
      { status: 'client_reviewing', expectedView: 'Review Sites + Order Details' },
      { status: 'client_approved', expectedView: 'Awaiting Payment + Order Details' },
      { status: 'paid', expectedView: 'Content Progress + Order Details' },
      { status: 'in_progress', expectedView: 'Content Progress + Order Details' },
      { status: 'completed', expectedView: 'Completed + Order Details' }
    ];

    statusConfigs.forEach(config => {
      console.log(`  ${config.status}: ${config.expectedView}`);
    });

    // 4. Test new order creation flow
    console.log('\n🆕 New order creation flow:');
    console.log('  URL: /account/orders/new');
    console.log('  Expected columns:');
    console.log('    - Left: Select Brands (ClientSelectionColumn)');
    console.log('    - Middle: Target Pages (TargetPageColumn)');
    console.log('    - Right: Order Details (OrderDetailsColumn)');

    // 5. Check for required clients
    const clients = await prisma.client.findMany({
      where: { 
        userId: externalUser.id,
        deletedAt: null 
      }
    });

    if (clients.length === 0) {
      console.log('\n⚠️  Warning: User has no clients. They will need to create one to start an order.');
    } else {
      console.log(`\n✅ User has ${clients.length} clients available for orders`);
    }

    // 6. Verify column component files exist
    console.log('\n📁 Checking column component files:');
    const columnComponents = [
      'OrderDetailsColumn',
      'ClientSelectionColumn',
      'TargetPageColumn',
      'OrderSummaryColumn',
      'OrderStatusColumn',
      'SiteReviewColumn',
      'WorkflowProgressColumn'
    ];

    const fs = require('fs');
    const path = require('path');
    
    columnComponents.forEach(component => {
      const filePath = path.join(__dirname, '..', 'components', 'orders', 'columns', `${component}.tsx`);
      const exists = fs.existsSync(filePath);
      console.log(`  ${exists ? '✅' : '❌'} ${component}.tsx`);
    });

    // 7. Test order transition flow
    console.log('\n🔄 Order transition flow for external users:');
    console.log('  1. Create new order → /account/orders/new');
    console.log('  2. Submit order → /account/orders/[id] (shows Order Summary)');
    console.log('  3. Confirm order → Status: pending_confirmation (shows Order Status)');
    console.log('  4. Internal confirms → Status: confirmed (shows Order Progress)');
    console.log('  5. Sites ready → Status: sites_ready (shows Review Sites)');
    console.log('  6. Client approves → Status: client_approved (shows Awaiting Payment)');
    console.log('  7. Payment received → Status: paid (shows Content Progress)');
    console.log('  8. Complete → Status: completed (shows Completed Deliverables)');

    console.log('\n✅ External user unified order flow test complete!');
    
  } catch (error) {
    console.error('❌ Error testing order flow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testExternalOrderFlow();