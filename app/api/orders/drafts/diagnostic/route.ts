import { NextRequest, NextResponse } from 'next/server';

// Global counter to track API calls
let callCount = 0;
let lastReset = Date.now();
const callLog: { timestamp: number; count: number; userAgent?: string }[] = [];

export async function GET(request: NextRequest) {
  callCount++;
  const now = Date.now();
  
  // Log the call
  console.log(`[DRAFTS API DIAGNOSTIC] Call #${callCount} at ${new Date().toISOString()}`);
  console.log(`[DRAFTS API DIAGNOSTIC] Time since last reset: ${(now - lastReset) / 1000}s`);
  console.log(`[DRAFTS API DIAGNOSTIC] User-Agent:`, request.headers.get('user-agent'));
  console.log(`[DRAFTS API DIAGNOSTIC] Referer:`, request.headers.get('referer'));
  
  callLog.push({
    timestamp: now,
    count: callCount,
    userAgent: request.headers.get('user-agent') || undefined
  });
  
  // Keep only last 100 entries
  if (callLog.length > 100) {
    callLog.shift();
  }
  
  // Calculate call rate
  const recentCalls = callLog.filter(log => now - log.timestamp < 10000); // Last 10 seconds
  const callRate = recentCalls.length / 10; // Calls per second
  
  console.log(`[DRAFTS API DIAGNOSTIC] Call rate: ${callRate.toFixed(2)} calls/second`);
  
  if (callRate > 1) {
    console.error(`[DRAFTS API DIAGNOSTIC] ⚠️ HIGH CALL RATE DETECTED: ${callRate.toFixed(2)} calls/second`);
  }
  
  // Reset counter every hour
  if (now - lastReset > 3600000) {
    console.log(`[DRAFTS API DIAGNOSTIC] Resetting counter after 1 hour`);
    callCount = 0;
    lastReset = now;
  }
  
  return NextResponse.json({
    diagnostic: {
      totalCalls: callCount,
      callRate: `${callRate.toFixed(2)} calls/second`,
      recentCalls: recentCalls.length,
      timeSinceReset: `${((now - lastReset) / 1000).toFixed(0)}s`
    }
  });
}