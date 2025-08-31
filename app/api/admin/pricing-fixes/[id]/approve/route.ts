import { NextResponse } from 'next/server';

// Store approved fixes in memory (in production, use database)
const approvedFixes = new Map();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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

export { approvedFixes };