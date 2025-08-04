import { eq, and, isNull } from 'drizzle-orm';
import * as crypto from 'crypto';
import { db } from './connection';
import { clients, clientAssignments, targetPages, type Client, type NewClient, type TargetPage, type NewTargetPage } from './schema';
import { normalizeUrl, extractNormalizedDomain } from '@/lib/utils/urlUtils';

export class ClientService {
  // Get all clients (excluding archived)
  static async getAllClients(includeArchived: boolean = false): Promise<Client[]> {
    try {
      const query = db.select().from(clients);
      
      // Filter out archived clients by default
      const clientList = includeArchived 
        ? await query
        : await query.where(isNull(clients.archivedAt));
      
      // Add target pages to each client
      const clientsWithPages = await Promise.all(
        clientList.map(async (client) => {
          const pages = await this.getTargetPages(client.id);
          return { ...client, targetPages: pages } as any;
        })
      );
      
      return clientsWithPages;
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  }

  // Get clients for a specific user
  static async getUserClients(userId: string): Promise<Client[]> {
    try {
      const result = await db
        .select({
          id: clients.id,
          name: clients.name,
          website: clients.website,
          description: clients.description,
          createdBy: clients.createdBy,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        })
        .from(clients)
        .leftJoin(clientAssignments, eq(clients.id, clientAssignments.clientId))
        .where(
          and(
            eq(clientAssignments.userId, userId)
          )
        );

      // Also get clients created by this user
      const ownedClients = await db
        .select()
        .from(clients)
        .where(eq(clients.createdBy, userId));

      // Combine and deduplicate
      const allClients = [...result, ...ownedClients];
      const uniqueClients = allClients.filter((client, index, self) => 
        index === self.findIndex(c => c.id === client.id)
      );

      // Add target pages to each client
      const clientsWithPages = await Promise.all(
        uniqueClients.map(async (client) => {
          const pages = await this.getTargetPages(client.id);
          return { ...client, targetPages: pages } as any;
        })
      );

      return clientsWithPages;
    } catch (error) {
      console.error('Error loading user clients:', error);
      return [];
    }
  }

  // Get client by ID
  static async getClient(id: string): Promise<Client | null> {
    try {
      const result = await db.select().from(clients).where(eq(clients.id, id));
      const client = result[0];
      
      if (!client) return null;
      
      // Add target pages to the client
      const pages = await this.getTargetPages(client.id);
      return { ...client, targetPages: pages } as any;
    } catch (error) {
      console.error('Error loading client:', error);
      return null;
    }
  }

  // Create new client
  static async createClient(clientData: Omit<NewClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    try {
      const now = new Date();
      const insertData: any = {
        id: crypto.randomUUID(),
        ...clientData,
        // Default to 'client' type if not specified
        clientType: clientData.clientType || 'client',
        createdAt: now,
        updatedAt: now
      };
      
      // Handle optional fields that might be passed in
      if ('accountId' in clientData) {
        insertData.accountId = clientData.accountId;
      }
      if ('shareToken' in clientData) {
        insertData.shareToken = clientData.shareToken;
      }
      if ('invitationId' in clientData) {
        insertData.invitationId = clientData.invitationId;
      }
      
      const result = await db.insert(clients).values(insertData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  // Update client
  static async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    try {
      console.log('🟨 ClientService.updateClient - Raw updates:', updates);
      
      // Clean the updates object - remove fields that shouldn't be updated directly
      const { id: updateId, createdAt, targetPages, ...cleanUpdates } = updates as any;
      
      // Ensure dates are proper Date objects
      const updateData = {
        ...cleanUpdates,
        updatedAt: new Date(),
      };
      
      // Convert any string dates to Date objects
      if (updateData.createdAt && typeof updateData.createdAt === 'string') {
        updateData.createdAt = new Date(updateData.createdAt);
      }

      console.log('🟨 ClientService.updateClient - Clean update data:', updateData);

      const result = await db
        .update(clients)
        .set(updateData)
        .where(eq(clients.id, id))
        .returning();

      console.log('🟨 ClientService.updateClient - DB result:', result);
      return result[0] || null;
    } catch (error) {
      console.error('🟨 Error updating client in ClientService:', error);
      return null;
    }
  }

  // Delete client
  static async deleteClient(id: string): Promise<boolean> {
    try {
      const result = await db.delete(clients).where(eq(clients.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }

  // Target pages methods
  static async getTargetPages(clientId: string): Promise<TargetPage[]> {
    try {
      return await db.select().from(targetPages).where(eq(targetPages.clientId, clientId));
    } catch (error) {
      console.error('Error loading target pages:', error);
      return [];
    }
  }

  // Add target pages to client
  static async addTargetPages(clientId: string, urls: string[]): Promise<{success: boolean, added: number, duplicates: number}> {
    try {
      // Get existing normalized URLs for this client to avoid duplicates
      const existingPages = await db
        .select({ normalizedUrl: targetPages.normalizedUrl })
        .from(targetPages)
        .where(eq(targetPages.clientId, clientId));
      
      // Create set of existing normalized URLs (filter out nulls)
      const existingNormalizedUrls = new Set(
        existingPages
          .map(p => p.normalizedUrl)
          .filter(url => url !== null) as string[]
      );
      
      // Filter out duplicate URLs using normalized comparison
      const uniqueUrls = urls.filter(url => !existingNormalizedUrls.has(normalizeUrl(url)));
      
      const duplicatesCount = urls.length - uniqueUrls.length;
      
      if (uniqueUrls.length === 0) {
        console.log('No new URLs to add - all URLs already exist');
        return { success: true, added: 0, duplicates: duplicatesCount };
      }

      const now = new Date();
      const newPages: NewTargetPage[] = uniqueUrls.map(url => {
        const normalized = normalizeUrl(url);
        return {
          id: crypto.randomUUID(),
          clientId,
          url,
          normalizedUrl: normalized,
          domain: extractNormalizedDomain(url),
          status: 'active',
          addedAt: now,
        };
      });

      await db.insert(targetPages).values(newPages);
      console.log(`Added ${uniqueUrls.length} new target pages (${duplicatesCount} duplicates skipped)`);
      return { success: true, added: uniqueUrls.length, duplicates: duplicatesCount };
    } catch (error) {
      console.error('Error adding target pages:', error);
      return { success: false, added: 0, duplicates: 0 };
    }
  }

  // Update target page status (bulk operation)
  static async updateTargetPageStatus(clientId: string, pageIds: string[], status: TargetPage['status']): Promise<boolean> {
    try {
      for (const pageId of pageIds) {
        const updateData: any = { status };
        if (status === 'completed') {
          updateData.completedAt = new Date();
        }

        await db
          .update(targetPages)
          .set(updateData)
          .where(
            and(
              eq(targetPages.id, pageId),
              eq(targetPages.clientId, clientId)
            )
          );
      }
      return true;
    } catch (error) {
      console.error('Error updating target page status:', error);
      return false;
    }
  }

  // Remove target pages (bulk operation)
  static async removeTargetPages(clientId: string, pageIds: string[]): Promise<boolean> {
    try {
      for (const pageId of pageIds) {
        await db
          .delete(targetPages)
          .where(
            and(
              eq(targetPages.id, pageId),
              eq(targetPages.clientId, clientId)
            )
          );
      }
      return true;
    } catch (error) {
      console.error('Error removing target pages:', error);
      return false;
    }
  }

  // Client assignment methods
  static async assignUserToClient(clientId: string, userId: string): Promise<boolean> {
    try {
      await db.insert(clientAssignments).values({
        id: crypto.randomUUID(),
        clientId,
        userId,
        createdAt: new Date()
      });
      return true;
    } catch (error) {
      // Ignore duplicate assignments
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return true; // User already assigned
      }
      console.error('Error assigning user to client:', error);
      return false;
    }
  }

  static async removeUserFromClient(clientId: string, userId: string): Promise<boolean> {
    try {
      await db
        .delete(clientAssignments)
        .where(
          and(
            eq(clientAssignments.clientId, clientId),
            eq(clientAssignments.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error removing user from client:', error);
      return false;
    }
  }

  // Update target page keywords (separate method - doesn't affect existing functionality)
  static async updateTargetPageKeywords(pageId: string, keywords: string): Promise<boolean> {
    try {
      const result = await db
        .update(targetPages)
        .set({ keywords })
        .where(eq(targetPages.id, pageId))
        .returning();

      console.log('🟢 Keywords updated for target page:', {
        pageId,
        keywordsLength: keywords.length,
        success: result.length > 0
      });

      return result.length > 0;
    } catch (error) {
      console.error('🔴 Error updating target page keywords:', error);
      return false;
    }
  }

  // Update target page description (separate method - doesn't affect existing functionality)
  static async updateTargetPageDescription(pageId: string, description: string): Promise<boolean> {
    try {
      const result = await db
        .update(targetPages)
        .set({ description })
        .where(eq(targetPages.id, pageId))
        .returning();

      console.log('🟢 Description updated for target page:', {
        pageId,
        descriptionLength: description.length,
        success: result.length > 0
      });

      return result.length > 0;
    } catch (error) {
      console.error('🔴 Error updating target page description:', error);
      return false;
    }
  }

  // Get prospects only
  static async getProspects(): Promise<Client[]> {
    try {
      const prospects = await db
        .select()
        .from(clients)
        .where(eq(clients.clientType, 'prospect'));
      
      // Add target pages to each prospect
      const prospectsWithPages = await Promise.all(
        prospects.map(async (prospect) => {
          const pages = await this.getTargetPages(prospect.id);
          return { ...prospect, targetPages: pages } as any;
        })
      );
      
      return prospectsWithPages;
    } catch (error) {
      console.error('Error loading prospects:', error);
      return [];
    }
  }

  // Get clients only (excluding prospects)
  static async getClientsOnly(): Promise<Client[]> {
    try {
      const clientList = await db
        .select()
        .from(clients)
        .where(eq(clients.clientType, 'client'));
      
      // Add target pages to each client
      const clientsWithPages = await Promise.all(
        clientList.map(async (client) => {
          const pages = await this.getTargetPages(client.id);
          return { ...client, targetPages: pages } as any;
        })
      );
      
      return clientsWithPages;
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  }

  // Convert prospect to client
  static async convertProspectToClient(prospectId: string, conversionNotes?: string): Promise<Client | null> {
    try {
      const updateData = {
        clientType: 'client' as const,
        convertedFromProspectAt: new Date(),
        conversionNotes: conversionNotes || null,
        updatedAt: new Date()
      };

      const result = await db
        .update(clients)
        .set(updateData)
        .where(eq(clients.id, prospectId))
        .returning();

      console.log('🟢 Prospect converted to client:', {
        prospectId,
        hasNotes: !!conversionNotes
      });

      return result[0] || null;
    } catch (error) {
      console.error('🔴 Error converting prospect to client:', error);
      return null;
    }
  }

  // Get clients by account ID
  static async getClientsByAccount(accountId: string, includeArchived: boolean = false): Promise<Client[]> {
    try {
      // Filter out archived clients by default
      const clientList = includeArchived 
        ? await db
            .select()
            .from(clients)
            .where(eq(clients.accountId as any, accountId))
        : await db
            .select()
            .from(clients)
            .where(and(
              eq(clients.accountId as any, accountId),
              isNull(clients.archivedAt)
            ));
      
      // Add target pages to each client
      const clientsWithPages = await Promise.all(
        clientList.map(async (client) => {
          const pages = await this.getTargetPages(client.id);
          return { ...client, targetPages: pages } as any;
        })
      );
      
      return clientsWithPages;
    } catch (error) {
      console.error('Error loading account clients:', error);
      return [];
    }
  }

  // Get client by share token
  static async getClientByShareToken(shareToken: string): Promise<Client | null> {
    try {
      const result = await db
        .select()
        .from(clients)
        .where(eq(clients.shareToken as any, shareToken));
      
      const client = result[0];
      if (!client) return null;
      
      // Add target pages to the client
      const pages = await this.getTargetPages(client.id);
      return { ...client, targetPages: pages } as any;
    } catch (error) {
      console.error('Error loading client by share token:', error);
      return null;
    }
  }
}