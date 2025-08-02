import { type User } from './db/schema';
import { AuthSession as AuthSessionType } from './types/auth';

// Re-export for backward compatibility
export type AuthSession = AuthSessionType;

export class AuthService {
  private static SESSION_KEY = 'guest_post_session';

  // Set current session
  static setSession(user: any): void {
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userType: user.userType || 'internal'
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
      console.log('🔐 AuthService.login - Starting login request');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email, password }),
      });

      console.log('🔐 Login response status:', response.status);
      console.log('🔐 Response headers:', {
        'set-cookie': response.headers.get('set-cookie'),
        'content-type': response.headers.get('content-type'),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔐 Login failed:', errorData);
        return null;
      }

      const { user } = await response.json();
      console.log('🔐 User data received:', user ? 'Yes' : 'No');
      
      if (user) {
        this.setSession(user);
        console.log('🔐 Session set in localStorage');
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
        credentials: 'include', // Include cookies
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
    
    // For account users, we already have the user data in the session
    if (session.userType === 'account') {
      return {
        id: session.userId,
        email: session.email,
        name: session.name || session.email,
        role: session.role || 'viewer',
        userType: 'account'
      } as any as User;
    }
    
    // For internal users, fetch from the users API
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