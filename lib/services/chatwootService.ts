import { Pool } from 'pg';
import { db } from '@/lib/db/connection';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

interface ChatwootConfig {
  apiUrl: string;
  apiKey: string;
  accountId: string;
  inboxId: string;
}

interface ChatwootContact {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  custom_attributes?: Record<string, any>;
}

interface ChatwootConversation {
  id: number;
  account_id: number;
  inbox_id: number;
  contact_id: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  custom_attributes?: Record<string, any>;
  messages?: ChatwootMessage[];
}

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing' | 'activity' | 'template';
  private: boolean;
  created_at: string;
  attachments?: any[];
}

export class ChatwootService {
  private static config: ChatwootConfig = {
    apiUrl: process.env.CHATWOOT_API_URL || '',
    apiKey: process.env.CHATWOOT_API_KEY || '',
    accountId: process.env.CHATWOOT_ACCOUNT_ID || '',
    inboxId: process.env.CHATWOOT_INBOX_ID || ''
  };

  private static getHeaders() {
    return {
      'api_access_token': this.config.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create or update a contact in Chatwoot
   */
  static async createOrUpdateContact(data: {
    email: string;
    name: string;
    customAttributes?: {
      postflowId?: string;
      clientId?: string;
      websiteId?: string;
      accountType?: 'advertiser' | 'publisher';
      domain?: string;
      has_paid_guest_post?: boolean;
      guest_post_cost?: number;
      requirement?: string;
      companyName?: string;
      totalOrders?: number;
    };
  }): Promise<ChatwootContact> {
    try {
      // First try to find existing contact by email
      const searchUrl = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/contacts/search?q=${encodeURIComponent(data.email)}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: this.getHeaders()
      });

      if (searchResponse.ok) {
        const { payload } = await searchResponse.json();
        if (payload && payload.length > 0) {
          // Update existing contact
          const contact = payload[0];
          const updateUrl = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/contacts/${contact.id}`;
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
              name: data.name,
              custom_attributes: {
                ...contact.custom_attributes,
                ...data.customAttributes
              }
            })
          });

          if (updateResponse.ok) {
            return await updateResponse.json();
          }
        }
      }

      // Create new contact
      const createUrl = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/contacts`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          custom_attributes: data.customAttributes
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create contact: ${createResponse.statusText}`);
      }

      return await createResponse.json();
    } catch (error) {
      console.error('Error creating/updating Chatwoot contact:', error);
      throw error;
    }
  }

  /**
   * Create a conversation for an order
   */
  static async createOrderConversation(data: {
    contactId: number;
    orderId: string;
    orderType: string;
    clientName: string;
    assignedUserId?: string;
    customAttributes?: Record<string, any>;
  }): Promise<ChatwootConversation> {
    try {
      const url = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/conversations`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          inbox_id: this.config.inboxId,
          contact_id: data.contactId,
          custom_attributes: {
            order_id: data.orderId,
            order_type: data.orderType,
            client_name: data.clientName,
            assigned_to: data.assignedUserId,
            postflow_type: 'order',
            ...data.customAttributes
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Chatwoot conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(data: {
    conversationId: number;
    content: string;
    private?: boolean;
    attachments?: Array<{
      file: Buffer;
      filename: string;
      contentType: string;
    }>;
  }): Promise<ChatwootMessage> {
    try {
      const url = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/conversations/${data.conversationId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          content: data.content,
          private: data.private || false,
          message_type: 'outgoing'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending Chatwoot message:', error);
      throw error;
    }
  }

  /**
   * Get conversation details
   */
  static async getConversation(conversationId: number): Promise<ChatwootConversation> {
    try {
      const url = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/conversations/${conversationId}`;
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Chatwoot conversation:', error);
      throw error;
    }
  }

  /**
   * Get messages in a conversation
   */
  static async getMessages(conversationId: number): Promise<ChatwootMessage[]> {
    try {
      const url = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/conversations/${conversationId}/messages`;
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.payload || [];
    } catch (error) {
      console.error('Error getting Chatwoot messages:', error);
      throw error;
    }
  }

  /**
   * Update conversation custom attributes
   */
  static async updateConversationAttributes(
    conversationId: number,
    attributes: Record<string, any>
  ): Promise<ChatwootConversation> {
    try {
      const url = `${this.config.apiUrl}/api/v1/accounts/${this.config.accountId}/conversations/${conversationId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          custom_attributes: attributes
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Chatwoot conversation:', error);
      throw error;
    }
  }

  /**
   * Sync website contact to Chatwoot
   */
  static async syncWebsiteContact(websiteId: string): Promise<ChatwootContact | null> {
    try {
      // Get website and primary contact from database
      const query = `
        SELECT 
          w.id,
          w.domain,
          w.airtable_id,
          wc.email,
          wc.is_primary,
          wc.has_paid_guest_post,
          wc.guest_post_cost,
          wc.requirement
        FROM websites w
        LEFT JOIN website_contacts wc ON w.id = wc.website_id AND wc.is_primary = true
        WHERE w.id = $1
        LIMIT 1
      `;

      const result = await pool.query(query, [websiteId]);
      
      if (result.rows.length === 0 || !result.rows[0].email) {
        return null;
      }

      const website = result.rows[0];

      // Create or update contact in Chatwoot
      return await this.createOrUpdateContact({
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
    } catch (error) {
      console.error('Error syncing website contact:', error);
      throw error;
    }
  }

  /**
   * Send outreach email through Chatwoot
   */
  static async sendOutreachEmail(data: {
    orderId: string;
    orderItemId: string;
    websiteId: string;
    emailContent: string;
    subject: string;
  }): Promise<{ conversation: ChatwootConversation; message: ChatwootMessage }> {
    try {
      // Sync website contact first
      const contact = await this.syncWebsiteContact(data.websiteId);
      
      if (!contact) {
        throw new Error('No contact found for website');
      }

      // Get order details
      const orderQuery = `
        SELECT 
          o.id,
          o.account_id,
          o.assigned_to,
          a.name as account_name,
          oi.domain,
          oi.workflow_id
        FROM orders o
        JOIN accounts a ON o.account_id = a.id
        JOIN guest_post_items oi ON oi.order_id = o.id
        WHERE o.id = $1 AND oi.id = $2
        LIMIT 1
      `;

      const orderResult = await pool.query(orderQuery, [data.orderId, data.orderItemId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Create conversation
      const conversation = await this.createOrderConversation({
        contactId: contact.id,
        orderId: data.orderId,
        orderType: 'guest_post',
        clientName: order.account_name,
        assignedUserId: order.assigned_to,
        customAttributes: {
          order_item_id: data.orderItemId,
          workflow_id: order.workflow_id,
          email_subject: data.subject,
          outreach_type: 'initial'
        }
      });

      // Send the email content as a message
      const message = await this.sendMessage({
        conversationId: conversation.id,
        content: `**Subject: ${data.subject}**\n\n${data.emailContent}`,
        private: false
      });

      // Update order item with Chatwoot conversation ID
      await pool.query(`
        UPDATE guest_post_items 
        SET chatwoot_conversation_id = $1
        WHERE id = $2
      `, [conversation.id, data.orderItemId]);

      return { conversation, message };
    } catch (error) {
      console.error('Error sending outreach email:', error);
      throw error;
    }
  }

  /**
   * Handle webhook from Chatwoot
   */
  static async handleWebhook(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case 'conversation_status_changed':
          await this.handleConversationStatusChange(data);
          break;
        
        case 'message_created':
          await this.handleMessageCreated(data);
          break;
        
        case 'conversation_resolved':
          await this.handleConversationResolved(data);
          break;
        
        default:
          console.log(`Unhandled Chatwoot webhook event: ${event}`);
      }
    } catch (error) {
      console.error('Error handling Chatwoot webhook:', error);
      throw error;
    }
  }

  private static async handleConversationStatusChange(data: any) {
    const { conversation, changed_attributes } = data;
    
    if (conversation.custom_attributes?.order_item_id) {
      // Update order item status based on conversation status
      let newStatus = 'in_progress';
      
      if (conversation.status === 'resolved') {
        newStatus = 'completed';
      } else if (conversation.status === 'snoozed') {
        newStatus = 'follow_up_scheduled';
      }

      await pool.query(`
        UPDATE guest_post_items 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [newStatus, conversation.custom_attributes.order_item_id]);
    }
  }

  private static async handleMessageCreated(data: any) {
    const { conversation, message } = data;
    
    // Only process incoming messages
    if (message.message_type !== 'incoming') {
      return;
    }

    if (conversation.custom_attributes?.order_item_id) {
      // Log reply received
      await pool.query(`
        INSERT INTO order_communications (
          order_id, order_item_id, type, direction, 
          chatwoot_message_id, content, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        conversation.custom_attributes.order_id,
        conversation.custom_attributes.order_item_id,
        'email_reply',
        'incoming',
        message.id,
        message.content
      ]);

      // Update order item to indicate reply received
      await pool.query(`
        UPDATE guest_post_items 
        SET has_publisher_response = true, updated_at = NOW()
        WHERE id = $1
      `, [conversation.custom_attributes.order_item_id]);
    }
  }

  private static async handleConversationResolved(data: any) {
    const { conversation } = data;
    
    if (conversation.custom_attributes?.order_item_id) {
      // Mark the order item as published/completed
      await pool.query(`
        UPDATE guest_post_items 
        SET status = 'published', publication_verified = true, published_at = NOW()
        WHERE id = $1
      `, [conversation.custom_attributes.order_item_id]);
    }
  }
}