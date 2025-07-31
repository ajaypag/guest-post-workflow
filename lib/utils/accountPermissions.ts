import { AccountRole } from '@/lib/types/auth';

// Define permissions for each role
export const rolePermissions = {
  viewer: {
    canViewOrders: true,
    canViewDashboard: true,
    canEditOrders: false,
    canCreateOrders: false,
    canManageUsers: false,
    canEditAccountSettings: false,
  },
  editor: {
    canViewOrders: true,
    canViewDashboard: true,
    canEditOrders: true,
    canCreateOrders: true,
    canManageUsers: false,
    canEditAccountSettings: true,
  },
  admin: {
    canViewOrders: true,
    canViewDashboard: true,
    canEditOrders: true,
    canCreateOrders: true,
    canManageUsers: true,
    canEditAccountSettings: true,
  },
} as const;

export function hasPermission(role: AccountRole, permission: keyof typeof rolePermissions.viewer): boolean {
  const permissions = rolePermissions[role];
  return permissions ? permissions[permission] : false;
}

export function requirePermission(role: AccountRole, permission: keyof typeof rolePermissions.viewer): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Insufficient permissions. Required: ${permission}`);
  }
}