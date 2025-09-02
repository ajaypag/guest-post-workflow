import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import DerivedPricingService from '@/lib/services/derivedPricingService';

export async function POST(request: NextRequest) {
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

    console.log('Starting bulk derived price update...');
    const startTime = Date.now();
    
    // Perform bulk update
    const result = await DerivedPricingService.updateAllDerivedPrices();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Bulk update completed in ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      result,
      metadata: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        phase: '6B',
        mode: 'shadow',
      }
    });
    
  } catch (error) {
    console.error('Error during bulk derived price update:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update derived prices', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}