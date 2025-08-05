import { ChatwootService } from './chatwootService';
import { db } from '@/lib/db/connection';
import { Pool } from 'pg';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

interface SendGuestPostEmailParams {
  workflowId: string;
  orderId: string;
  orderItemId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  googleDocUrl?: string;
  inboxId?: string; // Optional - defaults to env variable if not provided
  metadata?: {
    websiteId?: string;
    domain?: string;
    articleTitle?: string;
  };
}

interface EmailStatus {
  sent: boolean;
  conversationId?: number;
  messageId?: number;
  error?: string;
  sentAt?: Date;
}

export class WorkflowEmailService {
  /**
   * Send guest post email through Chatwoot
   */
  static async sendGuestPostEmail(params: SendGuestPostEmailParams): Promise<EmailStatus> {
    const { 
      workflowId, 
      orderId, 
      orderItemId, 
      recipientEmail, 
      recipientName,
      subject, 
      body,
      googleDocUrl,
      metadata
    } = params;

    try {
      // 1. Create or update contact in Chatwoot
      console.log('Creating/updating contact in Chatwoot:', recipientEmail);
      const contact = await ChatwootService.createOrUpdateContact({
        email: recipientEmail,
        name: recipientName || recipientEmail,
        customAttributes: {
          websiteId: metadata?.websiteId,
          domain: metadata?.domain,
          accountType: 'publisher'
        }
      });

      // 2. Create conversation with the contact
      console.log('Creating conversation for contact:', contact.id);
      const conversation = await ChatwootService.createOrderConversation({
        contactId: contact.id,
        orderId: orderId,
        orderType: 'guest_post',
        clientName: metadata?.domain || 'Guest Post',
        inboxId: params.inboxId, // Use provided inbox or default
        customAttributes: {
          orderItemId,
          workflowId,
          articleTitle: metadata?.articleTitle
        }
      });

      // 3. Send the email as a message
      console.log('Sending message in conversation:', conversation.id);
      const message = await ChatwootService.sendMessage({
        conversationId: conversation.id,
        content: this.formatEmailContent(subject, body, googleDocUrl),
        private: false
      });

      // 4. Update order item with Chatwoot conversation ID
      await pool.query(`
        UPDATE guest_post_items 
        SET chatwoot_conversation_id = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [conversation.id, orderItemId]);

      // 5. Log email in workflow_email_logs
      await pool.query(`
        INSERT INTO workflow_email_logs (
          workflow_id, 
          order_id, 
          order_item_id,
          recipient_email, 
          subject, 
          status,
          chatwoot_conversation_id,
          chatwoot_message_id,
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        workflowId, 
        orderId, 
        orderItemId,
        recipientEmail, 
        subject, 
        'sent',
        conversation.id,
        message.id
      ]);

      // 6. Log in order_communications
      await pool.query(`
        INSERT INTO order_communications (
          order_id,
          order_item_id,
          type,
          direction,
          chatwoot_conversation_id,
          chatwoot_message_id,
          content,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        orderId,
        orderItemId,
        'email_sent',
        'outgoing',
        conversation.id,
        message.id,
        body,
        JSON.stringify({
          subject,
          recipientEmail,
          googleDocUrl,
          sentVia: 'workflow'
        })
      ]);

      return {
        sent: true,
        conversationId: conversation.id,
        messageId: message.id,
        sentAt: new Date()
      };

    } catch (error: any) {
      console.error('Failed to send email via Chatwoot:', error);
      
      // Log failed attempt
      await pool.query(`
        INSERT INTO workflow_email_logs (
          workflow_id, 
          order_id, 
          order_item_id,
          recipient_email, 
          subject, 
          status,
          error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        workflowId, 
        orderId, 
        orderItemId,
        recipientEmail, 
        subject, 
        'failed',
        error.message
      ]);

      return {
        sent: false,
        error: error.message
      };
    }
  }

  /**
   * Format email content for Chatwoot message
   */
  private static formatEmailContent(subject: string, body: string, googleDocUrl?: string): string {
    let content = `**Subject:** ${subject}\n\n${body}`;
    
    if (googleDocUrl) {
      content += `\n\n**Attachment:** [Google Doc](${googleDocUrl})`;
    }
    
    return content;
  }

  /**
   * Get email status from Chatwoot
   */
  static async getEmailStatus(conversationId: number): Promise<{
    status: 'sent' | 'delivered' | 'read' | 'replied';
    lastActivity?: Date;
    hasPublisherResponse: boolean;
  }> {
    try {
      const conversation = await ChatwootService.getConversation(conversationId);
      const messages = await ChatwootService.getMessages(conversationId);
      
      // Check if publisher has responded
      const hasPublisherResponse = messages.some(msg => 
        msg.message_type === 'incoming' && !msg.private
      );

      // Update database if publisher responded
      if (hasPublisherResponse) {
        await pool.query(`
          UPDATE guest_post_items 
          SET has_publisher_response = true
          WHERE chatwoot_conversation_id = $1
        `, [conversationId]);
      }

      return {
        status: hasPublisherResponse ? 'replied' : 'sent',
        lastActivity: new Date(), // We'll use current time as last activity
        hasPublisherResponse
      };

    } catch (error) {
      console.error('Failed to get email status:', error);
      throw error;
    }
  }

  /**
   * Send a follow-up message in existing conversation
   */
  static async sendFollowUp(conversationId: number, message: string): Promise<boolean> {
    try {
      await ChatwootService.sendMessage({
        conversationId,
        content: message,
        private: false
      });
      
      return true;
    } catch (error) {
      console.error('Failed to send follow-up:', error);
      return false;
    }
  }
}