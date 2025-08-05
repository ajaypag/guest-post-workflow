import { ChatwootService } from './chatwootService';
import { Pool } from 'pg';
import { db } from '@/lib/db/connection';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

export class ChatwootSyncService {
  /**
   * Sync all accounts as Chatwoot contacts
   */
  static async syncAccounts(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const stats = {
      synced: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const accounts = await pool.query(`
        SELECT 
          a.id,
          a.email,
          a.name,
          a.company_name,
          COUNT(DISTINCT o.id) as total_orders
        FROM accounts a
        LEFT JOIN orders o ON o.account_id = a.id
        WHERE a.user_type = 'account'
        GROUP BY a.id
      `);

      for (const account of accounts.rows) {
        try {
          await ChatwootService.createOrUpdateContact({
            email: account.email,
            name: account.name || account.company_name || account.email,
            customAttributes: {
              postflowId: account.id,
              clientId: account.id,
              accountType: 'advertiser',
              companyName: account.company_name,
              totalOrders: account.total_orders
            }
          });
          stats.synced++;
        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`Failed to sync account ${account.email}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error syncing accounts:', error);
      stats.errors.push(`Failed to fetch accounts: ${error.message}`);
    }

    return stats;
  }

  /**
   * Create conversation when order is confirmed
   */
  static async createOrderConversations(orderId: string): Promise<void> {
    try {
      // Get order with items and account info
      const orderQuery = `
        SELECT 
          o.id as order_id,
          o.account_id,
          o.assigned_to,
          a.email as account_email,
          a.name as account_name,
          a.company_name,
          oi.id as item_id,
          oi.domain,
          oi.domain_id,
          w.id as website_id
        FROM orders o
        JOIN accounts a ON o.account_id = a.id
        JOIN guest_post_items oi ON oi.order_id = o.id
        LEFT JOIN websites w ON w.domain = oi.domain
        WHERE o.id = $1
      `;

      const orderResult = await pool.query(orderQuery, [orderId]);

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      // Create or update account contact
      const firstItem = orderResult.rows[0];
      const contact = await ChatwootService.createOrUpdateContact({
        email: firstItem.account_email,
        name: firstItem.account_name || firstItem.company_name || firstItem.account_email,
        customAttributes: {
          postflowId: firstItem.account_id,
          clientId: firstItem.account_id,
          accountType: 'advertiser'
        }
      });

      // Create conversation for each order item
      for (const item of orderResult.rows) {
        try {
          const conversation = await ChatwootService.createOrderConversation({
            contactId: contact.id,
            orderId: item.order_id,
            orderType: 'guest_post',
            clientName: item.company_name || item.account_name,
            assignedUserId: item.assigned_to,
            customAttributes: {
              order_item_id: item.item_id,
              target_domain: item.domain,
              website_id: item.website_id
            }
          });

          // Store conversation ID in database
          await pool.query(`
            UPDATE guest_post_items 
            SET chatwoot_conversation_id = $1
            WHERE id = $2
          `, [conversation.id, item.item_id]);

          // Send initial internal note
          await ChatwootService.sendMessage({
            conversationId: conversation.id,
            content: `Order confirmed for guest post on ${item.domain}. Workflow will begin soon.`,
            private: true
          });
        } catch (error: any) {
          console.error(`Failed to create conversation for item ${item.item_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error creating order conversations:', error);
      throw error;
    }
  }

  /**
   * Send workflow completion email through Chatwoot
   */
  static async sendWorkflowEmail(workflowId: string): Promise<void> {
    try {
      // Get workflow details
      const workflowQuery = `
        SELECT 
          w.id,
          w.client_id,
          oi.id as item_id,
          oi.order_id,
          oi.domain,
          oi.chatwoot_conversation_id,
          ws.outputs
        FROM workflows w
        JOIN guest_post_items oi ON oi.workflow_id = w.id
        JOIN workflow_steps ws ON ws.workflow_id = w.id AND ws.step_id = 'email-template'
        WHERE w.id = $1
        LIMIT 1
      `;

      const workflowResult = await pool.query(workflowQuery, [workflowId]);

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow or email template not found');
      }

      const workflow = workflowResult.rows[0];
      const emailOutputs = workflow.outputs || {};
      
      // Extract email content
      const subject = emailOutputs.subject || `Guest Post Submission for ${workflow.domain}`;
      const emailBody = emailOutputs.combinedEmail || emailOutputs.emailBody || '';

      if (!emailBody) {
        throw new Error('No email content found in workflow');
      }

      // Find website contact
      const websiteQuery = `
        SELECT 
          w.id,
          wc.email,
          wc.is_primary
        FROM websites w
        JOIN website_contacts wc ON w.id = wc.website_id
        WHERE w.domain = $1 AND wc.is_primary = true
        LIMIT 1
      `;

      const websiteResult = await pool.query(websiteQuery, [workflow.domain]);

      if (websiteResult.rows.length === 0) {
        throw new Error('No contact found for website');
      }

      const website = websiteResult.rows[0];

      // Send email through Chatwoot
      const result = await ChatwootService.sendOutreachEmail({
        orderId: workflow.order_id,
        orderItemId: workflow.item_id,
        websiteId: website.id,
        emailContent: emailBody,
        subject: subject
      });

      // Update workflow status
      await pool.query(`
        UPDATE workflows 
        SET status = 'email_sent', updated_at = NOW()
        WHERE id = $1
      `, [workflowId]);

      // Log the email send
      await pool.query(`
        INSERT INTO workflow_email_logs (
          workflow_id, order_id, order_item_id,
          recipient_email, subject, status,
          chatwoot_conversation_id, chatwoot_message_id,
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        workflowId,
        workflow.order_id,
        workflow.item_id,
        website.email,
        subject,
        'sent',
        result.conversation.id,
        result.message.id
      ]);
    } catch (error) {
      console.error('Error sending workflow email:', error);
      throw error;
    }
  }

  /**
   * Sync website contacts to Chatwoot
   */
  static async syncWebsiteContacts(limit: number = 100): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const stats = {
      synced: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const websites = await pool.query(`
        SELECT DISTINCT
          w.id,
          w.domain,
          wc.email,
          wc.is_primary,
          wc.has_paid_guest_post,
          wc.guest_post_cost
        FROM websites w
        JOIN website_contacts wc ON w.id = wc.website_id
        WHERE wc.is_primary = true
        LIMIT $1
      `, [limit]);

      for (const website of websites.rows) {
        try {
          await ChatwootService.createOrUpdateContact({
            email: website.email,
            name: website.domain,
            customAttributes: {
              postflowId: website.id,
              websiteId: website.id,
              domain: website.domain,
              accountType: 'publisher',
              has_paid_guest_post: website.has_paid_guest_post,
              guest_post_cost: website.guest_post_cost,
              requirement: website.requirement
            }
          });
          stats.synced++;
        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`Failed to sync ${website.domain}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error syncing website contacts:', error);
      stats.errors.push(`Failed to fetch websites: ${error.message}`);
    }

    return stats;
  }
}