import { NextRequest, NextResponse } from 'next/server';
import { featureFlags, isStreamingEnabled, shouldUseFallback, isDebugEnabled, getStreamingTimeout } from '@/lib/config/featureFlags';

export async function GET() {
  try {
    const flags = {
      streamingEnabled: isStreamingEnabled(),
      fallbackEnabled: shouldUseFallback(),
      debugEnabled: isDebugEnabled(),
      streamingTimeout: getStreamingTimeout(),
      environment: process.env.NODE_ENV,
      // Raw feature flags for debugging
      raw: featureFlags
    };

    return NextResponse.json(flags);
  } catch (error) {
    console.error('Error getting feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to get feature flags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { flag, value } = await request.json();

    // Note: This is a simplified implementation
    // In production, you'd want to persist flag changes to a database
    // and possibly require admin authentication
    
    if (flag === 'streamingEnabled') {
      // Update environment variable (requires restart to take effect)
      if (value) {
        process.env.ENABLE_STREAMING = 'true';
      } else {
        delete process.env.ENABLE_STREAMING;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Feature flag ${flag} updated. May require restart to take effect.` 
    });

  } catch (error) {
    console.error('Error updating feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flags' },
      { status: 500 }
    );
  }
}