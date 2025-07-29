import crypto from 'crypto';

export function generateShareToken(): string {
  // Generate a URL-safe random token
  return crypto.randomBytes(32).toString('base64url');
}

export function generateInviteToken(): string {
  // Generate a URL-safe random token for invitations
  return crypto.randomBytes(24).toString('base64url');
}

export function generateSessionToken(): string {
  // Generate a secure session token
  return crypto.randomBytes(48).toString('base64url');
}