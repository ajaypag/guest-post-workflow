export type UserType = 'internal' | 'account' | 'publisher';
export type UserRole = 'admin' | 'user';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  userType: UserType;
}