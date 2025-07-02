import { User, Client, TargetPage, AuthSession } from '@/types/user';
import { UserService } from './db/userService';
import { ClientService } from './db/clientService';
import { AuthService } from './auth';

// Safe UUID generator that works in all environments
function generateUUID(): string {
  // Try crypto.randomUUID first if available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback to manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// User Management
export const userStorage = {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    if (typeof window === 'undefined') return [];
    try {
      return await UserService.getAllUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  },

  // Get user by ID
  async getUser(id: string): Promise<User | null> {
    try {
      return await UserService.getUser(id);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await UserService.getUserByEmail(email);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  // Create new user
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      return await UserService.createUser({
        ...userData,
        password: userData.password,
        isActive: userData.isActive ?? true
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      return await UserService.updateUser(id, updates);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    try {
      await UserService.deleteUser(id);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  // Initialize with admin user if no users exist
  async initializeAdmin(): Promise<void> {
    try {
      const users = await UserService.getAllUsers();
      if (users.length === 0) {
        await UserService.createUser({
          email: 'admin@example.com',
          name: 'Admin User',
          password: 'admin123',
          role: 'admin',
          isActive: true
        });
        console.log('Admin user created: admin@example.com');
      }
    } catch (error) {
      console.error('Error initializing admin:', error);
    }
  }
};

// Session Management - Delegated to AuthService
export const sessionStorage = {
  // Set current session
  setSession(user: User): void {
    AuthService.setSession(user);
  },

  // Get current session
  getSession(): AuthSession | null {
    return AuthService.getSession();
  },

  // Clear session (logout)
  clearSession(): void {
    AuthService.clearSession();
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    return AuthService.isLoggedIn();
  },

  // Check if user is admin
  isAdmin(): boolean {
    return AuthService.isAdmin();
  }
};

// Client Management
export const clientStorage = {
  // Get all clients
  async getAllClients(): Promise<Client[]> {
    if (typeof window === 'undefined') return [];
    try {
      return await ClientService.getAllClients();
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  },

  // Get clients for current user
  async getUserClients(userId: string): Promise<Client[]> {
    try {
      return await ClientService.getUserClients(userId);
    } catch (error) {
      console.error('Error loading user clients:', error);
      return [];
    }
  },

  // Get client by ID
  async getClient(id: string): Promise<Client | null> {
    try {
      return await ClientService.getClient(id);
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  },

  // Create new client
  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    try {
      return await ClientService.createClient(clientData);
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  // Update client
  async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    try {
      return await ClientService.updateClient(id, updates);
    } catch (error) {
      console.error('Error updating client:', error);
      return null;
    }
  },

  // Delete client
  async deleteClient(id: string): Promise<boolean> {
    try {
      await ClientService.deleteClient(id);
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  },

  // Add target pages to client
  async addTargetPages(clientId: string, urls: string[]): Promise<boolean> {
    try {
      const client = await this.getClient(clientId);
      if (!client) return false;

      const newPages: TargetPage[] = urls.map(url => ({
        id: generateUUID(),
        url,
        domain: new URL(url).hostname,
        status: 'active',
        addedAt: new Date()
      }));

      return (await this.updateClient(clientId, {
        targetPages: [...client.targetPages, ...newPages]
      })) !== null;
    } catch (error) {
      console.error('Error adding target pages:', error);
      return false;
    }
  },

  // Update target page status (bulk operation)
  async updateTargetPageStatus(clientId: string, pageIds: string[], status: TargetPage['status']): Promise<boolean> {
    try {
      const client = await this.getClient(clientId);
      if (!client) return false;

      const updatedPages = client.targetPages.map(page => {
        if (pageIds.includes(page.id)) {
          return {
            ...page,
            status,
            completedAt: status === 'completed' ? new Date() : undefined
          };
        }
        return page;
      });

      return (await this.updateClient(clientId, {
        targetPages: updatedPages
      })) !== null;
    } catch (error) {
      console.error('Error updating target page status:', error);
      return false;
    }
  },

  // Remove target pages (bulk operation)
  async removeTargetPages(clientId: string, pageIds: string[]): Promise<boolean> {
    try {
      const client = await this.getClient(clientId);
      if (!client) return false;

      const filteredPages = client.targetPages.filter(page => 
        !pageIds.includes(page.id)
      );

      return (await this.updateClient(clientId, {
        targetPages: filteredPages
      })) !== null;
    } catch (error) {
      console.error('Error removing target pages:', error);
      return false;
    }
  }
};

// Initialize admin user on first load
if (typeof window !== 'undefined') {
  userStorage.initializeAdmin().catch(console.error);
}