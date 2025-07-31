import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Registration is now disabled - system is invite-only
  console.log('[Registration] Attempted registration blocked - system is invite-only');
  
  return NextResponse.json(
    { 
      error: 'Registration is disabled. This system is invite-only. Contact your administrator for access.',
      code: 'REGISTRATION_DISABLED'
    },
    { status: 403 }
  );
}