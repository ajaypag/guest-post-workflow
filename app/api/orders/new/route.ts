import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      account,
      isNewAccount,
      orderGroups: orderGroupsData,
      includesClientReview,
      rushDelivery,
      internalNotes,
      createdBy // Internal user creating the order
    } = data;

    // For now, use a system user ID (in production, this would come from auth)
    const systemUserId = createdBy || 'system';

    // Start a transaction
    return await db.transaction(async (tx) => {
      let accountId: string;

      // Handle account creation or selection
      if (isNewAccount) {
        // Create new account (user)
        const [newUser] = await tx.insert(users).values({
          id: uuidv4(),
          email: account.email,
          name: account.name,
          passwordHash: '', // Temporary - user will set password via invite
          role: 'user',
          userType: 'account',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        accountId = newUser.id;
      } else {
        // Use existing account
        accountId = account.id;
        
        // Verify account exists
        const [existingUser] = await tx.select().from(users).where(eq(users.id, accountId));
        if (!existingUser) {
          throw new Error('Selected account not found');
        }
      }

      // Calculate total links and pricing
      const totalLinks = orderGroupsData.reduce((sum: number, group: any) => sum + group.linkCount, 0);
      
      // Calculate pricing (simplified for now)
      const basePrice = totalLinks * 30000; // $300 per link in cents
      let discountPercent = 0;
      
      // Volume discounts
      if (totalLinks >= 50) discountPercent = 20;
      else if (totalLinks >= 25) discountPercent = 15;
      else if (totalLinks >= 10) discountPercent = 10;
      else if (totalLinks >= 5) discountPercent = 5;
      
      const discountAmount = Math.round(basePrice * (discountPercent / 100));
      const subtotal = basePrice - discountAmount;
      const clientReviewFee = includesClientReview ? 50000 : 0; // $500 in cents
      const rushFee = rushDelivery ? 100000 : 0; // $1000 in cents
      const total = subtotal + clientReviewFee + rushFee;
      const profitMargin = Math.round(total * 0.4); // 40% margin

      // Create the main order
      const orderId = uuidv4();
      
      // Get account details for the order
      let accountDetails;
      if (isNewAccount) {
        accountDetails = {
          email: account.email,
          name: account.name,
          company: account.company || ''
        };
      } else {
        const [user] = await tx.select().from(users).where(eq(users.id, accountId));
        accountDetails = {
          email: user.email,
          name: user.name,
          company: account.company || '' // Use company from frontend data
        };
      }
      
      const [newOrder] = await tx.insert(orders).values({
        id: orderId,
        accountId: null, // We're using users table, not accounts table
        accountEmail: accountDetails.email,
        accountName: accountDetails.name,
        accountCompany: accountDetails.company,
        status: 'draft',
        state: 'configuring',
        subtotalRetail: basePrice,
        discountPercent: discountPercent.toString(),
        discountAmount,
        totalRetail: total,
        totalWholesale: Math.round(total * 0.6), // 60% of retail
        profitMargin,
        includesClientReview,
        clientReviewFee,
        rushDelivery,
        rushFee,
        requiresClientReview: includesClientReview,
        createdBy: '00000000-0000-0000-0000-000000000000', // Placeholder system user ID
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Create order groups for each client
      for (const groupData of orderGroupsData) {
        // Verify client exists
        const [client] = await tx.select().from(clients).where(eq(clients.id, groupData.clientId));
        if (!client) {
          throw new Error(`Client not found: ${groupData.clientId}`);
        }

        // Create order group
        const orderGroupId = uuidv4();
        await tx.insert(orderGroups).values({
          id: orderGroupId,
          orderId: orderId,
          clientId: groupData.clientId,
          linkCount: groupData.linkCount,
          targetPages: groupData.targetPages.map((pageId: string) => ({ pageId })),
          bulkAnalysisProjectId: null, // Will be set when bulk analysis is triggered
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // TODO: Create bulk analysis project for this order group
        // For now, we'll leave the project creation to be done separately
        // This allows the order to be created first, then projects can be created
        // through the bulk analysis interface
      }

      return NextResponse.json({
        success: true,
        orderId: newOrder.id,
        order: newOrder
      });
    });

  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}