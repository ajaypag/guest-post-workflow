import { NextResponse } from 'next/server';
import { EMAIL_CONFIG } from '@/lib/services/emailService';

export async function GET() {
  console.log('[Email Test Config] Checking email configuration...');
  
  const config = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 7) || 'not set',
    fromEmail: EMAIL_CONFIG.FROM_EMAIL,
    fromEmailEnv: process.env.EMAIL_FROM || 'not set',
    fromName: EMAIL_CONFIG.FROM_NAME,
    replyTo: EMAIL_CONFIG.REPLY_TO,
    nodeEnv: process.env.NODE_ENV,
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