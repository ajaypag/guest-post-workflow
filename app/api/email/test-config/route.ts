import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_CONFIG } from '@/lib/services/emailService';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  console.log('[Email Test Config] Checking email configuration...');
  
  // Block access in production or require auth
  if (process.env.NODE_ENV === 'production') {
    // In production, require internal user authentication
    const session = await requireInternalUser(request);
    if (session instanceof NextResponse) {
      return session;
    }
  }
  
  const config = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    // Don't expose key details in production
    resendKeyLength: process.env.NODE_ENV !== 'production' ? (process.env.RESEND_API_KEY?.length || 0) : 'hidden',
    resendKeyPrefix: process.env.NODE_ENV !== 'production' ? (process.env.RESEND_API_KEY?.substring(0, 7) || 'not set') : 'hidden',
    fromEmail: EMAIL_CONFIG.FROM_EMAIL,
    fromEmailEnv: process.env.NODE_ENV !== 'production' ? (process.env.EMAIL_FROM || 'not set') : 'hidden',
    fromName: EMAIL_CONFIG.FROM_NAME,
    replyTo: EMAIL_CONFIG.REPLY_TO,
    nodeEnv: process.env.NODE_ENV !== 'production' ? process.env.NODE_ENV : 'production',
  };
  
  console.log('[Email Test Config] Configuration:', config);
  
  return NextResponse.json({
    config,
    advice: {
      resendKey: config.hasResendKey ? 
        'API key is set' : 
        'RESEND_API_KEY is missing - emails will fail',
      fromEmail: config.fromEmail === 'onboarding@resend.dev' ? 
        'Using Resend test email (OK for testing)' : 
        `Using custom email: ${config.fromEmail} (must be verified in Resend)`,
    }
  });
}