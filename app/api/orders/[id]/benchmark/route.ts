import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { 
  getLatestBenchmark, 
  getBenchmarkHistory, 
  compareToBenchmark,
  getLatestComparison,
  createOrderBenchmark
} from '@/lib/orders/benchmarkUtils';

/**
 * GET - Get benchmark data for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const includeComparison = searchParams.get('comparison') === 'true';

    // Get latest benchmark
    const benchmark = await getLatestBenchmark(orderId);

    if (!benchmark) {
      return NextResponse.json({ 
        error: 'No benchmark found for this order',
        hasBenchmark: false 
      }, { status: 404 });
    }

    const response: any = {
      benchmark,
      hasBenchmark: true,
    };

    // Optionally include history
    if (includeHistory) {
      response.history = await getBenchmarkHistory(orderId);
    }

    // Optionally include latest comparison
    if (includeComparison) {
      response.comparison = await getLatestComparison(orderId);
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching benchmark:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch benchmark' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new benchmark or comparison
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ 
        error: 'Only internal users can create benchmarks' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { action = 'compare', reason } = body;

    if (action === 'create') {
      // Create a new benchmark (manual update)
      const benchmark = await createOrderBenchmark(
        orderId,
        session.userId,
        reason || 'manual_update'
      );

      return NextResponse.json({
        success: true,
        message: 'Benchmark created successfully',
        benchmark
      });

    } else if (action === 'compare') {
      // Create a comparison against current benchmark
      const comparison = await compareToBenchmark(orderId, session.userId);

      return NextResponse.json({
        success: true,
        message: 'Comparison created successfully',
        comparison
      });

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "create" or "compare"' 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error creating benchmark/comparison:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create benchmark/comparison' },
      { status: 500 }
    );
  }
}