import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './connection';
import { users, clients, clientAssignments, type User, type NewUser } from './schema';

export class UserService {
  // Get all users (admin only)
  static async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  // Get user by ID
  static async getUser(id: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0] || null;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0] || null;
    } catch (error) {
      console.error('Error loading user by email:', error);
      return null;
    }
  }

  // Create new user
  static async createUser(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string }): Promise<User> {
    try {
      // Check if email already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      const now = new Date();
      const newUserData: NewUser = {
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role || 'user',
        userType: (userData as any).userType || 'internal',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.insert(users).values(newUserData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Delete user
  static async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Verify password
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      // Update last login
      await this.updateUser(user.id, { lastLogin: new Date() });

      return user;
    } catch (error) {
      console.error('Error verifying password:', error);
      return null;
    }
  }

  // Initialize admin user if no users exist
  static async initializeAdmin(): Promise<void> {
    try {
      const allUsers = await this.getAllUsers();
      if (allUsers.length === 0) {
        await this.createUser({
          email: 'admin@example.com',
          name: 'Admin User',
          password: 'admin123', // Default password
          role: 'admin',
          isActive: true,
        });
        console.log('Admin user created: admin@example.com');
      }
    } catch (error) {
      console.error('Error initializing admin:', error);
    }
  }

  // Get users assigned to a client
  static async getUsersForClient(clientId: string): Promise<User[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          userType: users.userType,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .innerJoin(clientAssignments, eq(users.id, clientAssignments.userId))
        .where(eq(clientAssignments.clientId, clientId));

      return result;
    } catch (error) {
      console.error('Error loading users for client:', error);
      return [];
    }
  }

  // Assign user to client
  static async assignUserToClient(userId: string, clientId: string): Promise<boolean> {
    try {
      await db.insert(clientAssignments).values({
        id: crypto.randomUUID(),
        userId,
        clientId,
        createdAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error assigning user to client:', error);
      return false;
    }
  }

  // Remove user from client
  static async removeUserFromClient(userId: string, clientId: string): Promise<boolean> {
    try {
      await db
        .delete(clientAssignments)
        .where(
          and(
            eq(clientAssignments.userId, userId),
            eq(clientAssignments.clientId, clientId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error removing user from client:', error);
      return false;
    }
  }
}