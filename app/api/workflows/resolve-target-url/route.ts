import { NextRequest, NextResponse } from 'next/server';
import { resolveTargetUrl } from '@/lib/utils/workflowUtils';
import { GuestPostWorkflow } from '@/types/workflow';

export async function POST(req: NextRequest) {
  try {
    const { workflow } = await req.json();
    
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow data required' }, { status: 400 });
    }
    
    // Use the server-side helper to resolve the URL
    const targetUrl = await resolveTargetUrl(workflow as GuestPostWorkflow);
    
    return NextResponse.json({ targetUrl });
  } catch (error) {
    console.error('Error resolving target URL:', error);
    return NextResponse.json({ error: 'Failed to resolve target URL' }, { status: 500 });
  }
}