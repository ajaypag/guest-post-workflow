import { NextRequest, NextResponse } from 'next/server';
import { generateKeywords, formatKeywordsForStorage } from '@/lib/services/keywordGenerationService';
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
    const pageResult = await db
      .select({
        targetPage: targetPages,
        client: clients
      })
      .from(targetPages)
      .innerJoin(clients, eq(targetPages.clientId, clients.id))
      .where(eq(targetPages.id, targetPageId));
      
    if (pageResult.length === 0) {
      return NextResponse.json({ error: 'Target page not found' }, { status: 404 });
    }
    
    const { targetPage, client } = pageResult[0];
    
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

    console.log('🟢 Starting keyword generation for target page:', { targetPageId, targetUrl });

    // Generate keywords using OpenAI
    const result = await generateKeywords(targetUrl);

    if (!result.success) {
      console.error('🔴 Keyword generation failed:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to generate keywords', 
          details: result.error 
        },
        { status: 500 }
      );
    }

    // Format keywords for storage
    const keywordsString = formatKeywordsForStorage(result.keywords);

    // Update the target page with generated keywords
    const updateSuccess = await ClientService.updateTargetPageKeywords(targetPageId, keywordsString);

    if (!updateSuccess) {
      console.error('🔴 Failed to save keywords to database');
      return NextResponse.json(
        { error: 'Failed to save keywords to database' },
        { status: 500 }
      );
    }

    console.log('🟢 Keywords generated and saved successfully:', {
      targetPageId,
      keywordCount: result.keywords.length,
      keywords: result.keywords
    });

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      keywordsString,
      promptId: result.promptId,
      conversationId: result.conversationId,
      targetPageId
    });

  } catch (error: any) {
    console.error('🔴 Error in target page keyword generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}