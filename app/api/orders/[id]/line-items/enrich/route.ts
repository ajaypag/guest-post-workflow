import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { websites } from '@/lib/db/websiteSchema';
import { clients } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Enrich line items with domain data from bulk analysis and websites
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get order to check permissions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    if (session.userType === 'account' && order.accountId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all line items for this order
    const lineItems = await db.query.orderLineItems.findMany({
      where: eq(orderLineItems.orderId, orderId)
    });

    // Enrich each line item with domain data
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (lineItem) => {
        let domainData: any = null;

        // If we have an assigned domain ID, fetch from bulk analysis
        if (lineItem.assignedDomainId) {
          const bulkDomain = await db.query.bulkAnalysisDomains.findFirst({
            where: eq(bulkAnalysisDomains.id, lineItem.assignedDomainId)
          });

          if (bulkDomain) {
            // Also try to get website data for DR and traffic
            const domainString = typeof lineItem.assignedDomain === 'string' 
              ? lineItem.assignedDomain 
              : (lineItem.assignedDomain as any)?.domain;
            
            let websiteData = null;
            if (domainString) {
              websiteData = await db.query.websites.findFirst({
                where: or(
                  eq(websites.domain, domainString),
                  eq(websites.domain, `www.${domainString}`),
                  eq(websites.domain, domainString.replace('www.', ''))
                )
              });
            }

            // Check for AI content indicators
            const hasAiContent = bulkDomain.notes?.toLowerCase().includes('ai') ||
                                bulkDomain.aiQualificationReasoning?.toLowerCase().includes('ai content') ||
                                bulkDomain.aiQualificationReasoning?.toLowerCase().includes('ai-generated');

            const aiContentTags = [];
            if (bulkDomain.notes?.toLowerCase().includes('ai')) {
              aiContentTags.push('AI Content Detected');
            }
            if (bulkDomain.aiQualificationReasoning?.toLowerCase().includes('high quality ai')) {
              aiContentTags.push('High Quality AI');
            }
            if (bulkDomain.aiQualificationReasoning?.toLowerCase().includes('low quality ai')) {
              aiContentTags.push('Low Quality AI');
            }

            domainData = {
              domainRating: websiteData?.domainRating || null,
              totalTraffic: websiteData?.totalTraffic || null,
              categories: websiteData?.categories || [],
              niche: websiteData?.niche || [],
              overallQuality: websiteData?.overallQuality || null,
              qualificationStatus: bulkDomain.qualificationStatus,
              aiQualificationReasoning: bulkDomain.aiQualificationReasoning,
              overlapStatus: bulkDomain.overlapStatus,
              authorityDirect: bulkDomain.authorityDirect,
              authorityRelated: bulkDomain.authorityRelated,
              topicScope: bulkDomain.topicScope,
              topicReasoning: bulkDomain.topicReasoning,
              evidence: bulkDomain.evidence as any,
              hasAiContent,
              aiContentTags,
              notes: bulkDomain.notes
            };
          }
        } else if (lineItem.assignedDomain) {
          // If we don't have a domain ID but have a domain name, try to find website data
          const domainString = typeof lineItem.assignedDomain === 'string' 
            ? lineItem.assignedDomain 
            : (lineItem.assignedDomain as any)?.domain;
          
          if (domainString) {
            const websiteData = await db.query.websites.findFirst({
              where: or(
                eq(websites.domain, domainString),
                eq(websites.domain, `www.${domainString}`),
                eq(websites.domain, domainString.replace('www.', ''))
              )
            });

            if (websiteData) {
              domainData = {
                domainRating: websiteData.domainRating || null,
                totalTraffic: websiteData.totalTraffic || null,
                categories: websiteData.categories || [],
                niche: websiteData.niche || [],
                overallQuality: websiteData.overallQuality || null,
                qualificationStatus: null,
                aiQualificationReasoning: null,
                overlapStatus: null,
                authorityDirect: null,
                authorityRelated: null,
                topicScope: null,
                topicReasoning: null,
                evidence: null,
                hasAiContent: false,
                aiContentTags: [],
                notes: null
              };
            }
          }
        }

        // Fetch client data if needed
        let clientData = null;
        if (lineItem.clientId) {
          try {
            clientData = await db.query.clients.findFirst({
              where: eq(clients.id, lineItem.clientId)
            });
          } catch (err) {
            console.log('Could not fetch client data:', err);
          }
        }

        return {
          ...lineItem,
          client: clientData,
          domainData
        };
      })
    );

    return NextResponse.json({
      success: true,
      lineItems: enrichedLineItems
    });

  } catch (error: any) {
    console.error('Error enriching line items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich line items' },
      { status: 500 }
    );
  }
}