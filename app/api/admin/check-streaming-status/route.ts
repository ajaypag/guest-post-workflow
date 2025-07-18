import { NextResponse } from 'next/server';
import { isStreamingEnabled, logFeatureFlags } from '@/lib/config/featureFlags';

export async function GET() {
  try {
    // Log current feature flags
    logFeatureFlags();
    
    // Check if streaming is enabled
    const streamingEnabled = isStreamingEnabled();
    const enableStreamingEnv = process.env.ENABLE_STREAMING;
    
    // Check if the streaming service files exist by trying to import them
    let v3ServiceExists = false;
    let unifiedServiceExists = false;
    
    try {
      const { agenticOutlineServiceV3 } = await import('@/lib/services/agenticOutlineServiceV3');
      v3ServiceExists = !!agenticOutlineServiceV3;
    } catch (error) {
      console.error('V3 service not found:', error);
    }
    
    try {
      const { agenticOutlineService } = await import('@/lib/services/agenticOutlineServiceUnified');
      unifiedServiceExists = !!agenticOutlineService;
    } catch (error) {
      console.error('Unified service not found:', error);
    }
    
    return NextResponse.json({
      status: 'ok',
      streamingEnabled,
      environment: {
        ENABLE_STREAMING: enableStreamingEnv,
        NODE_ENV: process.env.NODE_ENV
      },
      services: {
        v3ServiceExists,
        unifiedServiceExists
      },
      diagnosis: {
        streamingActive: streamingEnabled && v3ServiceExists && unifiedServiceExists,
        issues: [
          !streamingEnabled && 'Streaming is not enabled (set ENABLE_STREAMING=true)',
          !v3ServiceExists && 'V3 streaming service file is missing',
          !unifiedServiceExists && 'Unified service file is missing'
        ].filter(Boolean)
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}