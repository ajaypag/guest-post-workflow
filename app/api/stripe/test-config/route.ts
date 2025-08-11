import { NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripeService';

export async function GET() {
  try {
    // Test Stripe configuration
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const config = {
      publishableKey: publishableKey ? `${publishableKey.substring(0, 15)}...` : 'Not configured',
      secretKey: secretKey ? `${secretKey.substring(0, 15)}...` : 'Not configured',
      webhookSecret: webhookSecret ? `${webhookSecret.substring(0, 15)}...` : 'Not configured',
      publishableKeyAccessible: !!publishableKey,
      secretKeyAccessible: !!secretKey,
      webhookSecretAccessible: !!webhookSecret,
      sdkInitialized: false as boolean,
    };

    // Test Stripe SDK initialization
    try {
      const testPublishableKey = StripeService.getPublishableKey();
      config.sdkInitialized = true;
    } catch (error) {
      config.sdkInitialized = false;
    }

    return NextResponse.json({
      success: true,
      config,
      recommendations: [
        !publishableKey && 'Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable',
        !secretKey && 'Set STRIPE_SECRET_KEY environment variable',
        !webhookSecret && 'Set STRIPE_WEBHOOK_SECRET environment variable',
        'Test with Stripe test keys first (pk_test_... and sk_test_...)',
        'Configure webhook endpoint at: /api/stripe/webhook',
      ].filter(Boolean),
    });

  } catch (error) {
    console.error('Stripe config test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Configuration test failed',
      },
      { status: 500 }
    );
  }
}