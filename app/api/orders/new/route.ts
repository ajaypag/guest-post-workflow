import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal users can create orders
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Access denied. This action requires internal user privileges.' }, { status: 403 });
    }

    const data = await request.json();
    const {
      account,
      isNewAccount,
      orderGroups: orderGroupsData,
      includesClientReview,
      rushDelivery,
      internalNotes
    } = data;

    // Use the authenticated user's ID
    const createdBy = session.userId;

    // Start a transaction
    return await db.transaction(async (tx) => {
      let accountId: string;

      // Handle account creation or selection
      if (isNewAccount) {
        // NOTE: Account creation should be done through proper account onboarding flow
        // For now, we'll require selecting an existing account
        throw new Error('Account creation not supported in order flow. Please create account first.');
      } else {
        // Use existing account
        accountId = account.id;
        
        // Verify account exists in accounts table (not users table)
        const { accounts } = await import('@/lib/db/accountSchema');
        const [existingAccount] = await tx.select().from(accounts).where(eq(accounts.id, accountId));
        if (!existingAccount) {
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
      
      // Get account details from the accounts table
      const { accounts } = await import('@/lib/db/accountSchema');
      const [accountRecord] = await tx.select().from(accounts).where(eq(accounts.id, accountId));
      
      if (!accountRecord) {
        throw new Error('Account not found');
      }
      
      const accountDetails = {
        email: accountRecord.email,
        name: accountRecord.contactName || account.name,
        company: accountRecord.companyName || account.company || ''
      };
      
      const [newOrder] = await tx.insert(orders).values({
        id: orderId,
        accountId: accountId, // Now properly using accounts table
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
        createdBy: session.userId, // Use authenticated user ID
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