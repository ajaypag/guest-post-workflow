import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth system is implemented

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get statistics
    const stats = await EmailService.getStatistics(start, end);

    return NextResponse.json({
      success: true,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      statistics: stats,
    });
  } catch (error: any) {
    console.error('Email stats API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}