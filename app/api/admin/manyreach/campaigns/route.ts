import { NextRequest, NextResponse } from 'next/server';
import { ManyReachImportV3 } from '@/lib/services/manyReachImportV3';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing

    const importer = new ManyReachImportV3();
    const stats = await importer.getImportStats();
    
    return NextResponse.json({ campaigns: stats });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}