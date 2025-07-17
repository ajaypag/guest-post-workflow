import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db/connection';
import { clients, targetPages, clientAssignments } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { generateKeywords } from '@/lib/services/keywordGenerationService';
import { generateDescription } from '@/lib/services/descriptionGenerationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, website, description, initialUrls = [] } = await request.json();

    if (!name || !website) {
      return NextResponse.json({ error: 'Name and website are required' }, { status: 400 });
    }

    // Validate website URL
    try {
      new URL(website);
    } catch {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    // Create client
    const clientId = uuidv4();
    const newClient = {
      id: clientId,
      name,
      website,
      description: description || '',
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(clients).values(newClient);

    // Create client assignment for the creator
    await db.insert(clientAssignments).values({
      id: uuidv4(),
      clientId,
      userId: session.user.id,
      createdAt: new Date(),
    });

    // Process initial URLs if provided
    let addedUrls = 0;
    if (initialUrls.length > 0) {
      const urlsWithData = await Promise.all(
        initialUrls.map(async (url: string) => {
          try {
            const [keywords, description] = await Promise.all([
              generateKeywords(url),
              generateDescription(url)
            ]);

            return {
              id: uuidv4(),
              clientId,
              url,
              domain: new URL(url).hostname,
              status: 'active' as const,
              keywords: keywords.keywords.join(', '),
              description: description.description,
              sourceType: 'bulk_import' as const,
              createdInWorkflow: false,
              addedAt: new Date(),
              updatedAt: new Date(),
            };
          } catch (error) {
            console.error(`Failed to process URL ${url}:`, error);
            return null;
          }
        })
      );

      const validUrls = urlsWithData.filter(u => u !== null);
      if (validUrls.length > 0) {
        await db.insert(targetPages).values(validUrls);
        addedUrls = validUrls.length;
      }
    }

    return NextResponse.json({
      client: newClient,
      addedUrls,
      success: true
    });

  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}