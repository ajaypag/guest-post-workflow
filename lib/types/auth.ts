export type UserType = 'internal' | 'account' | 'publisher';
export type UserRole = 'admin' | 'user' | 'viewer' | 'editor';
export type AccountRole = 'viewer' | 'editor' | 'admin';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  userType: UserType;
  accountId?: string; // For account users, this is their account ID
  clientId?: string | null; // For account users, their primary client
  companyName?: string; // For account users, their company name
}