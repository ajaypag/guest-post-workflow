import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPages } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { normalizeUrl } from '@/lib/utils/urlUtils';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get all target pages without normalized URLs
        const pages = await db
          .select()
          .from(targetPages)
          .where(isNull(targetPages.normalizedUrl));

        if (pages.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ complete: true, processed: 0 })}\n\n`));
          controller.close();
          return;
        }

        console.log(`Starting normalized URL migration for ${pages.length} pages`);
        
        let processed = 0;
        const batchSize = 50;

        // Process in batches
        for (let i = 0; i < pages.length; i += batchSize) {
          const batch = pages.slice(i, i + batchSize);

          try {
            // Update each page in the batch
            await Promise.all(
              batch.map(async (page) => {
                const normalized = normalizeUrl(page.url);
                
                await db
                  .update(targetPages)
                  .set({ normalizedUrl: normalized })
                  .where(eq(targetPages.id, page.id));
              })
            );

            processed += batch.length;

            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ processed })}\n\n`));

          } catch (error) {
            console.error('Error processing batch:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              error: `Failed to process batch at index ${i}: ${error}` 
            })}\n\n`));
          }
        }

        // Send completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          complete: true, 
          processed 
        })}\n\n`));

        console.log(`Migration completed. Processed ${processed} pages.`);

      } catch (error) {
        console.error('Migration error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          error: `Migration failed: ${error}` 
        })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}