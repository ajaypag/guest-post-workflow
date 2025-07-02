import { type User } from './db/schema';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  private static SESSION_KEY = 'guest_post_session';

  // Set current session
  static setSession(user: any): void {
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    }
  }

  // Get current session
  static getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  // Clear session (logout)
  static clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
    }
  }

  // Check if user is logged in
  static isLoggedIn(): boolean {
    return this.getSession() !== null;
  }

  // Check if user is admin
  static isAdmin(): boolean {
    const session = this.getSession();
    return session?.role === 'admin';
  }

  // Login with email and password
  static async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return null;
      }

      const { user } = await response.json();
      if (user) {
        this.setSession(user);
      }
      return user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  // Register new user
  static async register(userData: {
    email: string;
    name: string;
    password: string;
    role?: string;
  }): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const { user } = await response.json();
      if (user) {
        this.setSession(user);
      }
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Get current user from database
  static async getCurrentUser(): Promise<User | null> {
    const session = this.getSession();
    if (!session) return null;
    
    try {
      const response = await fetch(`/api/users/${session.userId}`);
      if (!response.ok) return null;
      
      const { user } = await response.json();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}