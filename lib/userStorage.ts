import { User, Client, TargetPage } from '@/types/user';
import { AuthService, type AuthSession } from './auth';

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
      const response = await fetch('/api/users');
      if (!response.ok) return [];
      
      const { users } = await response.json();
      return users;
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  },

  // Get user by ID
  async getUser(id: string): Promise<User | null> {
    try {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) return null;
      
      const { user } = await response.json();
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.email === email) || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  // Create new user
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          isActive: userData.isActive ?? true
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const { user } = await response.json();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) return null;

      const { user } = await response.json();
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  // Initialize with admin user if no users exist
  async initializeAdmin(): Promise<void> {
    try {
      const users = await this.getAllUsers();
      if (users.length === 0) {
        await this.createUser({
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
  setSession(user: any): void {
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

// Client Management - Temporarily simplified for initial deployment
export const clientStorage = {
  // Get all clients
  async getAllClients(): Promise<Client[]> {
    if (typeof window === 'undefined') return [];
    try {
      // TODO: Implement with API routes
      return [];
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  },

  // Get clients for current user - TODO: Implement with API routes
  async getUserClients(userId: string): Promise<Client[]> {
    return [];
  },

  // Get client by ID - TODO: Implement with API routes
  async getClient(id: string): Promise<Client | null> {
    return null;
  },

  // Create new client - TODO: Implement with API routes
  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    throw new Error('Client creation not implemented yet');
  },

  // Update client - TODO: Implement with API routes
  async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    return null;
  },

  // Delete client - TODO: Implement with API routes
  async deleteClient(id: string): Promise<boolean> {
    return false;
  },

  // Add target pages to client - TODO: Implement with API routes
  async addTargetPages(clientId: string, urls: string[]): Promise<boolean> {
    return false;
  },

  // Update target page status - TODO: Implement with API routes
  async updateTargetPageStatus(clientId: string, pageIds: string[], status: TargetPage['status']): Promise<boolean> {
    return false;
  },

  // Remove target pages - TODO: Implement with API routes
  async removeTargetPages(clientId: string, pageIds: string[]): Promise<boolean> {
    return false;
  }
};

// Initialize admin user on first load
if (typeof window !== 'undefined') {
  userStorage.initializeAdmin().catch(console.error);
}