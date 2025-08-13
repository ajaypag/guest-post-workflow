// Common disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Common disposable email services
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc',
  'getairmail.com',
  'fakeinbox.com',
  'trashmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'mailnesia.com',
  'tempinbox.com',
  'temp-mail.org',
  'getnada.com',
  'burnermail.io',
  'inboxkitten.com',
  'mailsac.com',
  'mohmal.com',
  // Add more as needed
]);

// Suspicious patterns in email addresses
const SUSPICIOUS_PATTERNS = [
  /^test/i,
  /^spam/i,
  /^fake/i,
  /^temp/i,
  /^throwaway/i,
  /^disposable/i,
  /\+\d{5,}/i, // Emails with long numeric suffixes (e.g., user+12345678@gmail.com)
  /^[a-z0-9]{1,3}@/i, // Very short usernames (less than 4 chars)
  /^[0-9]+@/i, // Only numbers in username
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function isSuspiciousEmail(email: string): boolean {
  const [username] = email.split('@');
  if (!username) return false;
  
  // Check for suspicious patterns
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(username));
}

export function validateEmailQuality(email: string): {
  valid: boolean;
  reason?: string;
} {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  
  // Check for disposable domains
  if (isDisposableEmail(email)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed' };
  }
  
  // Check for suspicious patterns
  if (isSuspiciousEmail(email)) {
    return { valid: false, reason: 'This email address appears suspicious. Please use a valid business email.' };
  }
  
  return { valid: true };
}