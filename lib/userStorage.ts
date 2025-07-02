import { User, Client, TargetPage, AuthSession } from '@/types/user';

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

const USERS_KEY = 'guest_post_users';
const CLIENTS_KEY = 'guest_post_clients';
const SESSION_KEY = 'guest_post_session';

// User Management
export const userStorage = {
  // Get all users (admin only)
  getAllUsers(): User[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  },

  // Get user by ID
  getUser(id: string): User | null {
    const users = this.getAllUsers();
    return users.find(user => user.id === id) || null;
  },

  // Get user by email
  getUserByEmail(email: string): User | null {
    const users = this.getAllUsers();
    return users.find(user => user.email === email) || null;
  },

  // Create new user
  createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getAllUsers();
    const newUser: User = {
      ...userData,
      id: generateUUID(),
      createdAt: new Date(),
    };
    
    // Check if email already exists
    if (users.some(user => user.email === userData.email)) {
      throw new Error('User with this email already exists');
    }

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  // Update user
  updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getAllUsers();
    const index = users.findIndex(user => user.id === id);
    
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users[index];
  },

  // Delete user
  deleteUser(id: string): boolean {
    const users = this.getAllUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    
    if (filteredUsers.length === users.length) return false;
    
    localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
    return true;
  },

  // Initialize with admin user if no users exist
  initializeAdmin(): void {
    const users = this.getAllUsers();
    if (users.length === 0) {
      this.createUser({
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'admin123', // Default password
        role: 'admin',
        isActive: true
      });
      console.log('Admin user created: admin@example.com');
    }
  }
};

// Session Management
export const sessionStorage = {
  // Set current session
  setSession(user: User): void {
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    // Update last login
    userStorage.updateUser(user.id, { lastLogin: new Date() });
  },

  // Get current session
  getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  },

  // Clear session (logout)
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.getSession() !== null;
  },

  // Check if user is admin
  isAdmin(): boolean {
    const session = this.getSession();
    return session?.role === 'admin';
  }
};

// Client Management
export const clientStorage = {
  // Get all clients
  getAllClients(): Client[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CLIENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  },

  // Get clients for current user
  getUserClients(userId: string): Client[] {
    const clients = this.getAllClients();
    return clients.filter(client => 
      client.assignedUsers.includes(userId) || client.createdBy === userId
    );
  },

  // Get client by ID
  getClient(id: string): Client | null {
    const clients = this.getAllClients();
    return clients.find(client => client.id === id) || null;
  },

  // Create new client
  createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
    const clients = this.getAllClients();
    const newClient: Client = {
      ...clientData,
      id: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    clients.push(newClient);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    return newClient;
  },

  // Update client
  updateClient(id: string, updates: Partial<Client>): Client | null {
    const clients = this.getAllClients();
    const index = clients.findIndex(client => client.id === id);
    
    if (index === -1) return null;
    
    clients[index] = { 
      ...clients[index], 
      ...updates, 
      updatedAt: new Date() 
    };
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    return clients[index];
  },

  // Delete client
  deleteClient(id: string): boolean {
    const clients = this.getAllClients();
    const filteredClients = clients.filter(client => client.id !== id);
    
    if (filteredClients.length === clients.length) return false;
    
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(filteredClients));
    return true;
  },

  // Add target pages to client
  addTargetPages(clientId: string, urls: string[]): boolean {
    const client = this.getClient(clientId);
    if (!client) return false;

    const newPages: TargetPage[] = urls.map(url => ({
      id: generateUUID(),
      url,
      domain: new URL(url).hostname,
      status: 'active',
      addedAt: new Date()
    }));

    return this.updateClient(clientId, {
      targetPages: [...client.targetPages, ...newPages]
    }) !== null;
  },

  // Update target page status (bulk operation)
  updateTargetPageStatus(clientId: string, pageIds: string[], status: TargetPage['status']): boolean {
    const client = this.getClient(clientId);
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

    return this.updateClient(clientId, {
      targetPages: updatedPages
    }) !== null;
  },

  // Remove target pages (bulk operation)
  removeTargetPages(clientId: string, pageIds: string[]): boolean {
    const client = this.getClient(clientId);
    if (!client) return false;

    const filteredPages = client.targetPages.filter(page => 
      !pageIds.includes(page.id)
    );

    return this.updateClient(clientId, {
      targetPages: filteredPages
    }) !== null;
  }
};

// Initialize admin user on first load
if (typeof window !== 'undefined') {
  userStorage.initializeAdmin();
}