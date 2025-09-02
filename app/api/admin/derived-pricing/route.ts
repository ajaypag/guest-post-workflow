import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import DerivedPricingService from '@/lib/services/derivedPricingService';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.role === 'admin' || (session as any).role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get URL search params for filtering
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter') as 'match' | 'mismatch' | 'derived_null' | null;

    // Fetch statistics and comparisons
    const [stats, comparisons] = await Promise.all([
      DerivedPricingService.getDerivedPricingStats(),
      DerivedPricingService.getAllPricingComparisons(filter || undefined),
    ]);

    return NextResponse.json({
      stats,
      comparisons,
      metadata: {
        phase: '6B',
        mode: 'shadow',
        timestamp: new Date().toISOString(),
        filter: filter || 'all',
      }
    });
    
  } catch (error) {
    console.error('Error fetching derived pricing data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch derived pricing data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}