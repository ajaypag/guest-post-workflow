import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { sql } from 'drizzle-orm';

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

export async function GET() {
  try {
    // Calculate stats from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get real signup counts from database
    const recentSignups = await db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(accounts)
      .where(sql`${accounts.createdAt} > ${twentyFourHoursAgo}`)
      .execute();
    
    const totalSignups = recentSignups[0]?.count || 0;
    
    // Calculate stats from in-memory attempts
    const last24HourAttempts = recentAttempts.filter(
      a => a.timestamp > twentyFourHoursAgo
    );
    
    const blockedAttempts = last24HourAttempts.filter(a => a.blocked).length;
    const uniqueIPs = new Set(last24HourAttempts.map(a => a.ip)).size;
    const suspiciousEmails = last24HourAttempts.filter(
      a => a.reason?.includes('suspicious') || a.reason?.includes('disposable')
    ).length;
    
    return NextResponse.json({
      stats: {
        totalAttempts: last24HourAttempts.length,
        blockedAttempts,
        uniqueIPs,
        suspiciousEmails,
        successfulSignups: totalSignups
      },
      recentAttempts: recentAttempts.slice(0, 50) // Return last 50 attempts
    });
  } catch (error) {
    console.error('Failed to fetch signup stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// Export the logging function for use in signup route
export { logSignupAttempt as trackSignupAttempt };