import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { targetPages } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/admin/fix-line-item-target-pages
 * Fix existing line items that have target_page_url but no target_page_id
 * This finds or creates the corresponding target pages and links them
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth - only internal users
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all line items with URLs but no page IDs
    const brokenItems = await db.query.orderLineItems.findMany({
      where: and(
        isNull(orderLineItems.targetPageId),
        // Can't use isNotNull directly, so we'll filter in code
      ),
      with: {
        client: true
      }
    });

    // Filter for items that have URLs
    const itemsToFix = brokenItems.filter(item => item.targetPageUrl && item.clientId);

    console.log(`Found ${itemsToFix.length} line items to fix`);

    const results = {
      fixed: 0,
      created: 0,
      errors: [] as any[]
    };

    // Fix each item in a transaction
    await db.transaction(async (tx) => {
      for (const item of itemsToFix) {
        try {
          if (!item.targetPageUrl || !item.clientId) {
            continue;
          }

          // Find existing target page for this client and URL
          const existingPage = await tx.query.targetPages.findFirst({
            where: and(
              eq(targetPages.clientId, item.clientId),
              eq(targetPages.url, item.targetPageUrl)
            )
          });

          let targetPageId: string;

          if (existingPage) {
            targetPageId = existingPage.id;
          } else {
            // Create new target page with proper normalization
            const urlWithProtocol = item.targetPageUrl.startsWith('http') 
              ? item.targetPageUrl 
              : `https://${item.targetPageUrl}`;
            
            // Extract and normalize domain
            let normalizedDomainInfo;
            try {
              normalizedDomainInfo = normalizeDomain(urlWithProtocol);
            } catch (error) {
              console.error('Failed to normalize domain for URL:', item.targetPageUrl, error);
              // Fall back to basic normalization
              normalizedDomainInfo = {
                domain: new URL(urlWithProtocol).hostname.replace(/^www\./, '').toLowerCase()
              };
            }
            
            const normalizedUrl = item.targetPageUrl
              .toLowerCase()
              .replace(/^https?:\/\//, '')
              .replace(/\/$/, '');
            
            const [newPage] = await tx.insert(targetPages)
              .values({
                id: uuidv4(),
                clientId: item.clientId,
                url: item.targetPageUrl,
                normalizedUrl: normalizedUrl,
                domain: normalizedDomainInfo.domain,
                status: 'pending',
                addedAt: new Date(),
                keywords: null
              })
              .returning();
            
            targetPageId = newPage.id;
            results.created++;
            
            console.log('Created target page during fix:', {
              id: newPage.id,
              clientId: item.clientId,
              url: item.targetPageUrl,
              normalizedUrl: normalizedUrl,
              domain: normalizedDomainInfo.domain
            });
          }

          // Update the line item with the target page ID
          await tx.update(orderLineItems)
            .set({ 
              targetPageId,
              modifiedAt: new Date() 
            })
            .where(eq(orderLineItems.id, item.id));

          results.fixed++;
        } catch (error) {
          console.error(`Error fixing line item ${item.id}:`, error);
          results.errors.push({
            lineItemId: item.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    return NextResponse.json({
      message: `Fixed ${results.fixed} line items, created ${results.created} new target pages`,
      ...results
    });

  } catch (error) {
    console.error('Error fixing line item target pages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}