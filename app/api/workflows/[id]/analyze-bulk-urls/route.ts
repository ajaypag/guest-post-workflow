import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db/connection';
import { targetPages, clients } from '@/lib/db/schema';
import { eq, inArray, and, or, isNull } from 'drizzle-orm';
import { generateKeywords } from '@/lib/services/keywordGenerationService';
import { generateDescription } from '@/lib/services/descriptionGenerationService';

interface AnalyzedUrl {
  url: string;
  domain: string;
  status: 'existing' | 'new' | 'duplicate';
  existingData?: {
    id: string;
    clientId?: string;
    clientName?: string;
    keywords?: string;
    description?: string;
  };
  matchedClient?: {
    id: string;
    name: string;
    website: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

// Smart client matching logic
async function findMatchingClient(url: string, userId: string) {
  try {
    const urlObj = new URL(url);
    const urlDomain = urlObj.hostname.replace('www.', '');
    
    // Get all clients accessible by user
    const allClients = await db.query.clients.findMany({
      where: eq(clients.createdBy, userId),
    });
    
    // Exact domain match
    const exactMatch = allClients.find(client => {
      try {
        const clientDomain = new URL(client.website).hostname.replace('www.', '');
        return clientDomain === urlDomain;
      } catch {
        return false;
      }
    });
    
    if (exactMatch) {
      return {
        id: exactMatch.id,
        name: exactMatch.name,
        website: exactMatch.website,
        confidence: 'high' as const
      };
    }
    
    // Subdomain/parent domain matching
    const partialMatches = allClients.filter(client => {
      try {
        const clientDomain = new URL(client.website).hostname.replace('www.', '');
        return urlDomain.includes(clientDomain) || clientDomain.includes(urlDomain);
      } catch {
        return false;
      }
    });
    
    if (partialMatches.length === 1) {
      return {
        id: partialMatches[0].id,
        name: partialMatches[0].name,
        website: partialMatches[0].website,
        confidence: 'medium' as const
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error matching client:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { urls, autoMatch = true } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // Limit to prevent abuse
    if (urls.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 URLs allowed' }, { status: 400 });
    }

    // Validate URLs
    const validUrls: string[] = [];
    for (const url of urls) {
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        // Skip invalid URLs
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json({ error: 'No valid URLs provided' }, { status: 400 });
    }

    // Check for existing URLs in database
    const existingUrls = await db.query.targetPages.findMany({
      where: or(
        inArray(targetPages.url, validUrls),
        and(
          inArray(targetPages.url, validUrls),
          eq(targetPages.ownerUserId, session.user.id),
          isNull(targetPages.clientId)
        )
      ),
      with: {
        client: true
      }
    });

    // Create a map for quick lookup
    const existingUrlMap = new Map(
      existingUrls.map(page => [page.url, page])
    );

    // Analyze each URL
    const analyzedUrls: AnalyzedUrl[] = await Promise.all(
      validUrls.map(async (url) => {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        const existing = existingUrlMap.get(url);
        
        if (existing) {
          // URL already exists
          return {
            url,
            domain,
            status: 'existing' as const,
            existingData: {
              id: existing.id,
              clientId: existing.clientId || undefined,
              clientName: existing.client?.name,
              keywords: existing.keywords || undefined,
              description: existing.description || undefined,
            }
          };
        }
        
        // New URL - find matching client if autoMatch is enabled
        const matchedClient = autoMatch ? await findMatchingClient(url, session.user.id) : null;
        
        return {
          url,
          domain,
          status: 'new' as const,
          matchedClient
        };
      })
    );

    // Group by domain for better UI presentation
    const groupedByDomain = analyzedUrls.reduce((acc, url) => {
      if (!acc[url.domain]) {
        acc[url.domain] = [];
      }
      acc[url.domain].push(url);
      return acc;
    }, {} as Record<string, AnalyzedUrl[]>);

    return NextResponse.json({
      analyzedUrls,
      groupedByDomain,
      summary: {
        total: analyzedUrls.length,
        existing: analyzedUrls.filter(u => u.status === 'existing').length,
        new: analyzedUrls.filter(u => u.status === 'new').length,
        matched: analyzedUrls.filter(u => u.matchedClient).length,
      }
    });

  } catch (error) {
    console.error('Error analyzing bulk URLs:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URLs' },
      { status: 500 }
    );
  }
}