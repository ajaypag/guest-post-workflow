import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    
    // DataForSEO doesn't provide a way to retrieve the original request payload after the fact
    // We would need to implement request tracking in our database to store this information
    
    const payload = {
      note: "DataForSEO API does not provide endpoints to retrieve original request payloads after submission.",
      recommendation: "To track request payloads, we need to implement logging when making API calls.",
      taskId: taskId,
      suggestion: "Consider adding a 'dataforseo_api_requests' table to log all API calls with their payloads, task IDs, and responses."
    };

    return NextResponse.json({ 
      taskId,
      payload
    });

  } catch (error: any) {
    console.error('Task details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task details', details: error.message },
      { status: 500 }
    );
  }
}