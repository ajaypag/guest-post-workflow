import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { targetPages, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    console.log('Looking for target page with URL:', url);

    // Find target page by URL
    const targetPage = await db.query.targetPages.findFirst({
      where: eq(targetPages.url, url),
      with: {
        client: true
      }
    });

    if (targetPage) {
      console.log('Found existing target page:', targetPage.id);
      return NextResponse.json({ targetPage });
    }

    // If target page doesn't exist, we need to create it
    // First, parse the domain from the URL to find or create a client
    let domain: string;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace('www.', '');
    } catch (error) {
      console.error('Invalid URL:', url);
      return NextResponse.json({ targetPage: null });
    }

    console.log('Target page not found, checking for client with domain:', domain);

    // Try to find a client with this domain (checking website field)
    const existingClient = await db.query.clients.findFirst({
      where: eq(clients.website, `https://${domain}`)
    });

    let clientId: string;
    let clientName: string;

    if (existingClient) {
      console.log('Found existing client:', existingClient.name);
      clientId = existingClient.id;
      clientName = existingClient.name;
    } else {
      // Create a new client for this domain
      console.log('Creating new client for domain:', domain);
      
      // Generate a client name from the domain
      const nameParts = domain.split('.');
      const baseName = nameParts[0];
      // Capitalize first letter
      clientName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      
      clientId = uuidv4();
      
      await db.insert(clients).values({
        id: clientId,
        name: clientName,
        website: `https://${domain}`,
        createdBy: session.userId, // Assign to current internal user
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('Created new client:', clientName);
    }

    // Now create the target page
    const targetPageId = uuidv4();
    
    await db.insert(targetPages).values({
      id: targetPageId,
      clientId: clientId,
      url: url,
      domain: domain,
      addedAt: new Date()
    });

    console.log('Created new target page:', targetPageId);

    // Fetch the newly created target page with client info
    const newTargetPage = await db.query.targetPages.findFirst({
      where: eq(targetPages.id, targetPageId),
      with: {
        client: true
      }
    });

    return NextResponse.json({ targetPage: newTargetPage });
    
  } catch (error) {
    console.error('Error in target-pages/by-url:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}