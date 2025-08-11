import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, desc, sum, sql } from 'drizzle-orm';
import { pgTable, uuid, integer, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

// Credits system tables (to be added to your payment schema)
export const accountCredits = pgTable('account_credits', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  
  // Credit details
  amount: integer('amount').notNull(), // Amount in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  
  // Credit metadata
  type: varchar('type', { length: 50 }).notNull(), // 'promotional', 'refund', 'adjustment', 'bonus'
  source: varchar('source', { length: 100 }).notNull(), // 'admin_grant', 'refund_processing', 'loyalty_program'
  description: text('description').notNull(),
  
  // Usage restrictions
  minimumOrderAmount: integer('minimum_order_amount'), // Min order amount to use this credit
  maximumUsageAmount: integer('maximum_usage_amount'), // Max amount that can be used from this credit
  applicableOrderTypes: varchar('applicable_order_types').array(), // ['guest_post', 'content_audit', etc.]
  
  // Expiration
  expiresAt: timestamp('expires_at'),
  
  // Usage tracking
  usedAmount: integer('used_amount').notNull().default(0),
  remainingAmount: integer('remaining_amount').notNull(), // Computed field, kept in sync
  isFullyUsed: boolean('is_fully_used').notNull().default(false),
  
  // Audit trail
  grantedBy: uuid('granted_by'), // User ID who granted this credit
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('idx_account_credits_account').on(table.accountId),
  typeIdx: index('idx_account_credits_type').on(table.type),
  expiresIdx: index('idx_account_credits_expires').on(table.expiresAt),
  usageIdx: index('idx_account_credits_usage').on(table.isFullyUsed),
}));

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  creditId: uuid('credit_id').notNull().references(() => accountCredits.id),
  orderId: uuid('order_id').references(() => orders.id),
  
  // Transaction details
  type: varchar('type', { length: 20 }).notNull(), // 'grant', 'use', 'expire', 'refund'
  amount: integer('amount').notNull(), // Positive for grants, negative for usage
  previousBalance: integer('previous_balance').notNull(),
  newBalance: integer('new_balance').notNull(),
  
  // Context
  description: text('description').notNull(),
  processedBy: uuid('processed_by'), // User ID who processed this transaction
  
  // Metadata
  metadata: text('metadata'), // JSON string for additional context
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  accountIdx: index('idx_credit_transactions_account').on(table.accountId),
  creditIdx: index('idx_credit_transactions_credit').on(table.creditId),
  orderIdx: index('idx_credit_transactions_order').on(table.orderId),
  typeIdx: index('idx_credit_transactions_type').on(table.type),
  createdIdx: index('idx_credit_transactions_created').on(table.createdAt),
}));

/**
 * Comprehensive Credits and Wallet System
 * Handles account credits, usage tracking, and payment integration
 */
export class CreditsWalletService {
  
  /**
   * Get account credit balance with breakdown
   */
  static async getAccountBalance(accountId: string): Promise<{
    totalBalance: number;
    availableBalance: number;
    expiringBalance: number; // Credits expiring within 30 days
    credits: Array<{
      id: string;
      amount: number;
      remainingAmount: number;
      type: string;
      description: string;
      expiresAt: Date | null;
      restrictions: {
        minimumOrderAmount?: number;
        maximumUsageAmount?: number;
        applicableOrderTypes?: string[];
      };
    }>;
  }> {
    // Get all active credits for the account
    const credits = await db
      .select()
      .from(accountCredits)
      .where(
        and(
          eq(accountCredits.accountId, accountId),
          eq(accountCredits.isFullyUsed, false),
          sql`(${accountCredits.expiresAt} IS NULL OR ${accountCredits.expiresAt} > NOW())`
        )
      )
      .orderBy(desc(accountCredits.expiresAt), desc(accountCredits.grantedAt));

    const totalBalance = credits.reduce((sum, credit) => sum + credit.remainingAmount, 0);
    
    // Calculate expiring balance (within 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringBalance = credits
      .filter(credit => credit.expiresAt && credit.expiresAt <= thirtyDaysFromNow)
      .reduce((sum, credit) => sum + credit.remainingAmount, 0);

    return {
      totalBalance,
      availableBalance: totalBalance,
      expiringBalance,
      credits: credits.map(credit => ({
        id: credit.id,
        amount: credit.amount,
        remainingAmount: credit.remainingAmount,
        type: credit.type,
        description: credit.description,
        expiresAt: credit.expiresAt,
        restrictions: {
          minimumOrderAmount: credit.minimumOrderAmount || undefined,
          maximumUsageAmount: credit.maximumUsageAmount || undefined,
          applicableOrderTypes: credit.applicableOrderTypes || undefined,
        },
      })),
    };
  }

  /**
   * Grant credits to an account
   */
  static async grantCredits(options: {
    accountId: string;
    amount: number;
    type: 'promotional' | 'refund' | 'adjustment' | 'bonus';
    source: string;
    description: string;
    grantedBy: string;
    expiresAt?: Date;
    restrictions?: {
      minimumOrderAmount?: number;
      maximumUsageAmount?: number;
      applicableOrderTypes?: string[];
    };
  }): Promise<{
    creditId: string;
    newBalance: number;
  }> {
    const {
      accountId,
      amount,
      type,
      source,
      description,
      grantedBy,
      expiresAt,
      restrictions = {}
    } = options;

    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    // Get current balance
    const currentBalance = await this.getAccountBalance(accountId);

    return await db.transaction(async (tx) => {
      // Create credit record
      const [credit] = await tx
        .insert(accountCredits)
        .values({
          accountId,
          amount,
          type,
          source,
          description,
          remainingAmount: amount,
          grantedBy,
          expiresAt,
          minimumOrderAmount: restrictions.minimumOrderAmount,
          maximumUsageAmount: restrictions.maximumUsageAmount,
          applicableOrderTypes: restrictions.applicableOrderTypes,
          grantedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Record transaction
      await tx
        .insert(creditTransactions)
        .values({
          accountId,
          creditId: credit.id,
          type: 'grant',
          amount,
          previousBalance: currentBalance.totalBalance,
          newBalance: currentBalance.totalBalance + amount,
          description,
          processedBy: grantedBy,
          createdAt: new Date(),
        });

      return {
        creditId: credit.id,
        newBalance: currentBalance.totalBalance + amount,
      };
    });
  }

  /**
   * Apply credits to an order with intelligent selection
   */
  static async applyCreditsToOrder(
    accountId: string,
    orderId: string,
    orderAmount: number,
    orderType: string,
    maxCreditAmount?: number
  ): Promise<{
    creditsApplied: number;
    remainingOrderAmount: number;
    appliedCredits: Array<{
      creditId: string;
      amountUsed: number;
      creditType: string;
      description: string;
    }>;
  }> {
    const maxToApply = maxCreditAmount || orderAmount;
    
    return await db.transaction(async (tx) => {
      // Get eligible credits (FIFO by expiration, then by grant date)
      const eligibleCredits = await tx
        .select()
        .from(accountCredits)
        .where(
          and(
            eq(accountCredits.accountId, accountId),
            eq(accountCredits.isFullyUsed, false),
            sql`(${accountCredits.expiresAt} IS NULL OR ${accountCredits.expiresAt} > NOW())`,
            sql`(${accountCredits.minimumOrderAmount} IS NULL OR ${accountCredits.minimumOrderAmount} <= ${orderAmount})`,
            sql`(${accountCredits.applicableOrderTypes} IS NULL OR ${orderType} = ANY(${accountCredits.applicableOrderTypes}))`
          )
        )
        .orderBy(
          // Prioritize expiring credits first
          sql`CASE WHEN ${accountCredits.expiresAt} IS NOT NULL THEN ${accountCredits.expiresAt} ELSE '9999-12-31'::timestamp END ASC`,
          accountCredits.grantedAt
        );

      let remainingToApply = Math.min(maxToApply, orderAmount);
      const appliedCredits: Array<{
        creditId: string;
        amountUsed: number;
        creditType: string;
        description: string;
      }> = [];

      for (const credit of eligibleCredits) {
        if (remainingToApply <= 0) break;

        // Calculate how much of this credit to use
        const maxFromThisCredit = credit.maximumUsageAmount 
          ? Math.min(credit.maximumUsageAmount, credit.remainingAmount)
          : credit.remainingAmount;
        
        const amountToUse = Math.min(remainingToApply, maxFromThisCredit);
        
        if (amountToUse > 0) {
          // Update credit balance
          const newRemainingAmount = credit.remainingAmount - amountToUse;
          const isFullyUsed = newRemainingAmount <= 0;

          await tx
            .update(accountCredits)
            .set({
              usedAmount: credit.usedAmount + amountToUse,
              remainingAmount: newRemainingAmount,
              isFullyUsed,
              updatedAt: new Date(),
            })
            .where(eq(accountCredits.id, credit.id));

          // Record transaction
          await tx
            .insert(creditTransactions)
            .values({
              accountId,
              creditId: credit.id,
              orderId,
              type: 'use',
              amount: -amountToUse, // Negative for usage
              previousBalance: credit.remainingAmount,
              newBalance: newRemainingAmount,
              description: `Applied to order ${orderId}`,
              createdAt: new Date(),
            });

          appliedCredits.push({
            creditId: credit.id,
            amountUsed: amountToUse,
            creditType: credit.type,
            description: credit.description,
          });

          remainingToApply -= amountToUse;
        }
      }

      const totalCreditsApplied = appliedCredits.reduce((sum, c) => sum + c.amountUsed, 0);

      return {
        creditsApplied: totalCreditsApplied,
        remainingOrderAmount: orderAmount - totalCreditsApplied,
        appliedCredits,
      };
    });
  }

  /**
   * Process credit refund (when order is refunded)
   */
  static async processRefund(
    accountId: string,
    orderId: string,
    refundAmount: number,
    reason: string
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Find credit usage for this order
      const creditUsage = await tx
        .select()
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.accountId, accountId),
            eq(creditTransactions.orderId, orderId),
            eq(creditTransactions.type, 'use')
          )
        );

      let remainingRefund = refundAmount;

      for (const usage of creditUsage) {
        if (remainingRefund <= 0) break;

        const refundForThisCredit = Math.min(Math.abs(usage.amount), remainingRefund);
        
        if (refundForThisCredit > 0) {
          // Restore credit balance
          await tx
            .update(accountCredits)
            .set({
              usedAmount: sql`${accountCredits.usedAmount} - ${refundForThisCredit}`,
              remainingAmount: sql`${accountCredits.remainingAmount} + ${refundForThisCredit}`,
              isFullyUsed: false,
              updatedAt: new Date(),
            })
            .where(eq(accountCredits.id, usage.creditId));

          // Record refund transaction
          await tx
            .insert(creditTransactions)
            .values({
              accountId,
              creditId: usage.creditId,
              orderId,
              type: 'refund',
              amount: refundForThisCredit,
              previousBalance: usage.newBalance,
              newBalance: usage.newBalance + refundForThisCredit,
              description: `Refunded from order ${orderId}: ${reason}`,
              createdAt: new Date(),
            });

          remainingRefund -= refundForThisCredit;
        }
      }
    });
  }

  /**
   * Expire old credits (run as scheduled job)
   */
  static async expireCredits(): Promise<{
    expiredCredits: number;
    totalAmountExpired: number;
  }> {
    const expiredCredits = await db
      .select()
      .from(accountCredits)
      .where(
        and(
          eq(accountCredits.isFullyUsed, false),
          sql`${accountCredits.expiresAt} <= NOW()`
        )
      );

    const totalAmountExpired = expiredCredits.reduce((sum, credit) => sum + credit.remainingAmount, 0);

    if (expiredCredits.length > 0) {
      await db.transaction(async (tx) => {
        // Mark credits as fully used
        await tx
          .update(accountCredits)
          .set({
            isFullyUsed: true,
            updatedAt: new Date(),
          })
          .where(
            sql`${accountCredits.id} IN (${expiredCredits.map(c => `'${c.id}'`).join(',')})`
          );

        // Record expiration transactions
        for (const credit of expiredCredits) {
          await tx
            .insert(creditTransactions)
            .values({
              accountId: credit.accountId,
              creditId: credit.id,
              type: 'expire',
              amount: -credit.remainingAmount,
              previousBalance: credit.remainingAmount,
              newBalance: 0,
              description: 'Credit expired',
              createdAt: new Date(),
            });
        }
      });
    }

    return {
      expiredCredits: expiredCredits.length,
      totalAmountExpired,
    };
  }

  /**
   * Generate credits usage report for an account
   */
  static async getCreditReport(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: {
      creditsGranted: number;
      creditsUsed: number;
      creditsExpired: number;
      creditsRefunded: number;
    };
    transactions: Array<{
      id: string;
      date: Date;
      type: string;
      amount: number;
      description: string;
      orderId?: string;
      creditType?: string;
    }>;
  }> {
    const transactions = await db
      .select({
        transaction: creditTransactions,
        credit: accountCredits,
      })
      .from(creditTransactions)
      .leftJoin(accountCredits, eq(creditTransactions.creditId, accountCredits.id))
      .where(
        and(
          eq(creditTransactions.accountId, accountId),
          sql`${creditTransactions.createdAt} BETWEEN ${startDate} AND ${endDate}`
        )
      )
      .orderBy(desc(creditTransactions.createdAt));

    const summary = transactions.reduce(
      (acc, { transaction }) => {
        switch (transaction.type) {
          case 'grant':
            acc.creditsGranted += transaction.amount;
            break;
          case 'use':
            acc.creditsUsed += Math.abs(transaction.amount);
            break;
          case 'expire':
            acc.creditsExpired += Math.abs(transaction.amount);
            break;
          case 'refund':
            acc.creditsRefunded += transaction.amount;
            break;
        }
        return acc;
      },
      { creditsGranted: 0, creditsUsed: 0, creditsExpired: 0, creditsRefunded: 0 }
    );

    return {
      summary,
      transactions: transactions.map(({ transaction, credit }) => ({
        id: transaction.id,
        date: transaction.createdAt,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        orderId: transaction.orderId || undefined,
        creditType: credit?.type || undefined,
      })),
    };
  }
}

// Type exports
export type AccountCredit = typeof accountCredits.$inferSelect;
export type NewAccountCredit = typeof accountCredits.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;