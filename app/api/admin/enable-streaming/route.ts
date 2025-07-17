import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🚀 Enabling streaming feature...');
    
    // Set the environment variable
    process.env.ENABLE_STREAMING = 'true';
    
    console.log('✅ Streaming feature enabled');

    return NextResponse.json({
      success: true,
      message: 'Streaming feature enabled successfully',
      note: 'Environment variable ENABLE_STREAMING has been set to true. This change may require an application restart to take full effect in production.',
      environmentVariable: 'ENABLE_STREAMING=true'
    });

  } catch (error: any) {
    console.error('❌ Failed to enable streaming:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to enable streaming: ${error.message}`,
      details: error
    }, { status: 500 });
  }
}