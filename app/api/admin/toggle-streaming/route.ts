import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json();

    console.log(`🔀 Toggle streaming requested: ${enabled ? 'enable' : 'disable'}`);

    // Note: This is a runtime toggle for demonstration
    // In production, you'd want to persist this to a database
    // and possibly require admin authentication
    
    if (enabled) {
      process.env.ENABLE_STREAMING = 'true';
      console.log('✅ Streaming enabled via environment variable');
    } else {
      delete process.env.ENABLE_STREAMING;
      console.log('⏸️ Streaming disabled via environment variable');
    }

    // Log current feature flag status after change
    const featureFlagsModule = await import('@/lib/config/featureFlags');
    featureFlagsModule.logFeatureFlags();

    return NextResponse.json({ 
      success: true, 
      enabled,
      message: `Streaming ${enabled ? 'enabled' : 'disabled'}. Changes are effective immediately.`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error toggling streaming:', error);
    return NextResponse.json(
      { 
        error: 'Failed to toggle streaming feature', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}