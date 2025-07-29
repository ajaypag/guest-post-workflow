import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth system is implemented

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as any;
    const status = searchParams.get('status') as any;
    const recipient = searchParams.get('recipient');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filters
    const filters: any = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (recipient) filters.recipient = recipient;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Get logs
    const result = await EmailService.getEmailLogs(filters, limit, offset);

    return NextResponse.json({
      success: true,
      logs: result.logs,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    });
  } catch (error: any) {
    console.error('Email logs API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}