import { NextRequest, NextResponse } from 'next/server';
import { DiagnosticStorageService } from '@/lib/services/diagnosticStorageService';

/**
 * GET /api/admin/agent-diagnostics/sessions
 * Returns recent diagnostic sessions for the admin UI
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const sessions = DiagnosticStorageService.getRecentSessions(limit);

    return NextResponse.json({
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('Error fetching diagnostic sessions:', error);
    return NextResponse.json({
      error: 'Failed to fetch diagnostic sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}