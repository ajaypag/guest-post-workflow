import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    const config = {
      hasSecretKey: !!secretKey,
      hasPublishableKey: !!publishableKey,
      secretKeyType: secretKey ? {
        startsWithSk: secretKey.startsWith('sk_'),
        startsWithPk: secretKey.startsWith('pk_'),
        isTest: secretKey.startsWith('sk_test_'),
        isLive: secretKey.startsWith('sk_live_'),
        length: secretKey.length,
        prefix: secretKey.substring(0, 7) + '...'
      } : null,
      publishableKeyType: publishableKey ? {
        startsWithPk: publishableKey.startsWith('pk_'),
        startsWithSk: publishableKey.startsWith('sk_'),
        isTest: publishableKey.startsWith('pk_test_'),
        isLive: publishableKey.startsWith('pk_live_'),
        length: publishableKey.length,
        prefix: publishableKey.substring(0, 7) + '...'
      } : null,
      issues: [] as string[]
    };
    
    // Check for common configuration issues
    if (!secretKey) {
      config.issues.push('STRIPE_SECRET_KEY is not set');
    } else if (!secretKey.startsWith('sk_')) {
      config.issues.push('STRIPE_SECRET_KEY does not start with "sk_" - might be using publishable key');
    }
    
    if (!publishableKey) {
      config.issues.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    } else if (!publishableKey.startsWith('pk_')) {
      config.issues.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY does not start with "pk_" - might be using secret key');
    }
    
    if (secretKey && publishableKey) {
      // Check if keys are swapped
      if (secretKey.startsWith('pk_') && publishableKey.startsWith('sk_')) {
        config.issues.push('CRITICAL: Keys appear to be swapped! Secret key starts with "pk_" and publishable key starts with "sk_"');
      }
      
      // Check if both are test or both are live
      const secretIsTest = secretKey.includes('test');
      const publishableIsTest = publishableKey.includes('test');
      if (secretIsTest !== publishableIsTest) {
        config.issues.push('Key environment mismatch: One key is test, the other is live');
      }
    }
    
    return NextResponse.json({
      config,
      isValid: config.issues.length === 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error checking Stripe config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Stripe configuration' },
      { status: 500 }
    );
  }
}