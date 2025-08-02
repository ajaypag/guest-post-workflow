import { NextRequest, NextResponse } from 'next/server';
import { generateDescription } from '@/lib/services/descriptionGenerationService';
import { ClientService } from '@/lib/db/clientService';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { targetPages, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: targetPageId } = await params;
    const { targetUrl } = await request.json();

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Target URL is required' }, 
        { status: 400 }
      );
    }
    
    // Get the target page with client info for permission check
    const result = await db
      .select({
        targetPage: targetPages,
        client: clients
      })
      .from(targetPages)
      .innerJoin(clients, eq(targetPages.clientId, clients.id))
      .where(eq(targetPages.id, targetPageId));
      
    if (result.length === 0) {
      return NextResponse.json({ error: 'Target page not found' }, { status: 404 });
    }
    
    const { targetPage, client } = result[0];
    
    // Check permissions based on user type
    if (session.userType === 'internal') {
      // Internal users: Can access any target page
    } else if (session.userType === 'account') {
      // Account users: Can only access target pages from their own clients
      if (client.accountId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
    }

    console.log('🟢 Generating description for target page:', { targetPageId, targetUrl });

    // Generate description using OpenAI
    const descResult = await generateDescription(targetUrl);

    if (!descResult.success) {
      console.error('🔴 Description generation failed:', descResult.error);
      return NextResponse.json(
        { error: descResult.error || 'Description generation failed' },
        { status: 500 }
      );
    }

    console.log('🟢 Description generated successfully:', { 
      descriptionLength: descResult.description.length,
      promptId: descResult.promptId 
    });

    // Update the target page with the generated description
    const updateSuccess = await ClientService.updateTargetPageDescription(targetPageId, descResult.description);

    if (!updateSuccess) {
      console.error('🔴 Failed to save description to database');
      return NextResponse.json(
        { error: 'Failed to save description to database' },
        { status: 500 }
      );
    }

    console.log('✅ Description saved to database successfully');

    return NextResponse.json({
      success: true,
      description: descResult.description,
      promptId: descResult.promptId,
      conversationId: descResult.conversationId,
      targetPageId
    });

  } catch (error: any) {
    console.error('🔴 Error in description generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}