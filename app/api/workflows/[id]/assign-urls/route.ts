import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPages, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateKeywords } from '@/lib/services/keywordGenerationService';
import { generateDescription } from '@/lib/services/descriptionGenerationService';
import { v4 as uuidv4 } from 'uuid';

interface UrlAssignment {
  urls: string[];
  action: 'ADD_TO_EXISTING' | 'CREATE_NEW_CLIENT' | 'TEMPORARY';
  clientId?: string;
  newClientData?: {
    name: string;
    website: string;
    description: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const { assignments, userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!assignments || !Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Invalid assignments data' }, { status: 400 });
    }

    const results = {
      processed: 0,
      created: { clients: 0, urls: 0 },
      errors: [] as any[],
    };

    // Process each assignment group
    for (const assignment of assignments as UrlAssignment[]) {
      try {
        if (assignment.action === 'ADD_TO_EXISTING') {
          // Add URLs to existing client
          if (!assignment.clientId) {
            throw new Error('Client ID required for ADD_TO_EXISTING action');
          }

          // Generate keywords and descriptions for new URLs
          const urlsWithData = await Promise.all(
            assignment.urls.map(async (url) => {
              const [keywords, description] = await Promise.all([
                generateKeywords(url),
                generateDescription(url)
              ]);

              return {
                id: uuidv4(),
                clientId: assignment.clientId,
                url,
                domain: new URL(url).hostname,
                status: 'active' as const,
                keywords: keywords.keywords.join(', '),
                description: description.description,
                sourceType: 'bulk_import' as const,
                createdInWorkflow: true,
                workflowId: workflowId,
                addedAt: new Date(),
                updatedAt: new Date(),
              };
            })
          );

          // Insert URLs
          await db.insert(targetPages).values(urlsWithData);
          results.created.urls += urlsWithData.length;
          results.processed += assignment.urls.length;

        } else if (assignment.action === 'CREATE_NEW_CLIENT') {
          // Create new client and add URLs
          if (!assignment.newClientData) {
            throw new Error('Client data required for CREATE_NEW_CLIENT action');
          }

          // Create client
          const newClientId = uuidv4();
          await db.insert(clients).values({
            id: newClientId,
            name: assignment.newClientData.name,
            website: assignment.newClientData.website,
            description: assignment.newClientData.description || '',
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          results.created.clients += 1;

          // Generate keywords and descriptions for URLs
          const urlsWithData = await Promise.all(
            assignment.urls.map(async (url) => {
              const [keywords, description] = await Promise.all([
                generateKeywords(url),
                generateDescription(url)
              ]);

              return {
                id: uuidv4(),
                clientId: newClientId,
                url,
                domain: new URL(url).hostname,
                status: 'active' as const,
                keywords: keywords.keywords.join(', '),
                description: description.description,
                sourceType: 'bulk_import' as const,
                createdInWorkflow: true,
                workflowId: workflowId,
                addedAt: new Date(),
                updatedAt: new Date(),
              };
            })
          );

          // Insert URLs
          await db.insert(targetPages).values(urlsWithData);
          results.created.urls += urlsWithData.length;
          results.processed += assignment.urls.length;

        } else if (assignment.action === 'TEMPORARY') {
          // Add as temporary URLs (no client association)
          const urlsWithData = await Promise.all(
            assignment.urls.map(async (url) => {
              const [keywords, description] = await Promise.all([
                generateKeywords(url),
                generateDescription(url)
              ]);

              return {
                id: uuidv4(),
                clientId: null,
                url,
                domain: new URL(url).hostname,
                status: 'active' as const,
                keywords: keywords.keywords.join(', '),
                description: description.description,
                ownerUserId: userId,
                workflowId: workflowId,
                sourceType: 'workflow_temporary' as const,
                createdInWorkflow: true,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                addedAt: new Date(),
                updatedAt: new Date(),
              };
            })
          );

          // Insert temporary URLs
          await db.insert(targetPages).values(urlsWithData);
          results.created.urls += urlsWithData.length;
          results.processed += assignment.urls.length;
        }
      } catch (error) {
        console.error('Error processing assignment:', error);
        results.errors.push({
          assignment,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error assigning URLs:', error);
    return NextResponse.json(
      { error: 'Failed to assign URLs' },
      { status: 500 }
    );
  }
}