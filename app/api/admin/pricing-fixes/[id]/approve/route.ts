import { NextResponse } from 'next/server';

// Store approved fixes in memory (in production, use database)
const approvedFixes = new Map();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Mark as approved (in production, update database)
    approvedFixes.set(id, { status: 'approved', timestamp: new Date() });
    
    return NextResponse.json({ success: true, id, status: 'approved' });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve fix' },
      { status: 500 }
    );
  }
}

// approvedFixes is available for internal use within this module