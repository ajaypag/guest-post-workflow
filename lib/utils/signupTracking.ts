// Store recent signup attempts in memory (in production, use Redis or database)
interface SignupAttempt {
  email: string;
  ip: string;
  timestamp: Date;
  blocked: boolean;
  reason?: string;
}

// Simple in-memory store for demo purposes
const recentAttempts: SignupAttempt[] = [];

// Function to log signup attempts (call this from signup route)
export function logSignupAttempt(attempt: SignupAttempt) {
  recentAttempts.unshift(attempt);
  // Keep only last 100 attempts
  if (recentAttempts.length > 100) {
    recentAttempts.pop();
  }
}

// Export for use in both signup route and stats endpoint
export function getRecentAttempts() {
  return recentAttempts;
}

export function trackSignupAttempt(attempt: SignupAttempt) {
  logSignupAttempt(attempt);
}