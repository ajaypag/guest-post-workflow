import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, isNull, or } from 'drizzle-orm';

// Sample AI qualification data for demonstration
const sampleEnrichments = [
  {
    qualificationStatus: 'qualified',
    overlapStatus: 'direct' as const,
    authorityDirect: 'strong' as const,
    authorityRelated: 'moderate' as const,
    topicScope: 'short_tail' as const,
    topicReasoning: 'This domain shows strong topical relevance with short-tail keywords. Focus on comprehensive guides and authoritative content to match the domain\'s existing authority profile.',
    aiQualificationReasoning: 'Domain exhibits excellent authority metrics with DR 72 and consistent ranking patterns across target keywords. The site maintains high-quality editorial standards and shows strong topical relevance in the target niche. Content velocity is moderate with regular publishing schedule.',
    evidence: {
      direct_count: 45,
      direct_median_position: 12,
      related_count: 128,
      related_median_position: 18
    }
  },
  {
    qualificationStatus: 'high_quality',
    overlapStatus: 'both' as const,
    authorityDirect: 'moderate' as const,
    authorityRelated: 'strong' as const,
    topicScope: 'long_tail' as const,
    topicReasoning: 'Domain excels in long-tail keyword targeting. Recommend focusing on detailed, specific topics that align with their content strategy.',
    aiQualificationReasoning: 'High-quality domain with DR 65+ showing strong performance in related keywords. The site has established authority in adjacent topics and maintains consistent content quality. Some AI-generated content detected but well-edited and integrated.',
    evidence: {
      direct_count: 23,
      direct_median_position: 25,
      related_count: 89,
      related_median_position: 8
    }
  },
  {
    qualificationStatus: 'good_quality',
    overlapStatus: 'related' as const,
    authorityDirect: 'weak' as const,
    authorityRelated: 'moderate' as const,
    topicScope: 'ultra_long_tail' as const,
    topicReasoning: 'Best suited for ultra-specific, niche topics. Target low-competition keywords with high commercial intent.',
    aiQualificationReasoning: 'Good quality domain with emerging authority. DR 45-60 range with improving metrics. Site shows potential for growth in specific niches. Mixed content quality with some sections showing AI content patterns.',
    evidence: {
      direct_count: 8,
      direct_median_position: 45,
      related_count: 34,
      related_median_position: 22
    }
  },
  {
    qualificationStatus: 'marginal_quality',
    overlapStatus: 'none' as const,
    authorityDirect: 'n/a' as const,
    authorityRelated: 'weak' as const,
    topicScope: 'ultra_long_tail' as const,
    topicReasoning: 'Limited topical overlap. Consider only for highly specific, low-competition opportunities.',
    aiQualificationReasoning: 'Marginal quality with DR below 40. Site shows inconsistent content quality and possible AI content issues. Limited ranking visibility in target keywords. Consider for budget-conscious campaigns only.',
    evidence: {
      direct_count: 2,
      direct_median_position: null,
      related_count: 12,
      related_median_position: 38
    }
  }
];

async function enrichBulkDomains() {
  console.log('Starting bulk domain enrichment...');
  
  try {
    // Get domains that need enrichment (those without AI qualification data)
    const domainsToEnrich = await db.query.bulkAnalysisDomains.findMany({
      where: or(
        isNull(bulkAnalysisDomains.overlapStatus),
        isNull(bulkAnalysisDomains.aiQualificationReasoning)
      ),
      limit: 20 // Enrich up to 20 domains for demo
    });

    console.log(`Found ${domainsToEnrich.length} domains to enrich`);

    let enrichedCount = 0;
    for (const domain of domainsToEnrich) {
      // Select a random enrichment pattern
      const enrichmentData = sampleEnrichments[enrichedCount % sampleEnrichments.length];
      
      // Add some variation to the data
      const variation = Math.random();
      const adjustedEvidence = {
        ...enrichmentData.evidence,
        direct_count: Math.floor(enrichmentData.evidence.direct_count * (0.8 + variation * 0.4)),
        related_count: Math.floor(enrichmentData.evidence.related_count * (0.8 + variation * 0.4))
      };

      // Update the domain with enrichment data
      await db.update(bulkAnalysisDomains)
        .set({
          qualificationStatus: enrichmentData.qualificationStatus,
          overlapStatus: enrichmentData.overlapStatus,
          authorityDirect: enrichmentData.authorityDirect,
          authorityRelated: enrichmentData.authorityRelated,
          topicScope: enrichmentData.topicScope,
          topicReasoning: enrichmentData.topicReasoning,
          aiQualificationReasoning: enrichmentData.aiQualificationReasoning,
          evidence: adjustedEvidence,
          aiQualifiedAt: new Date(),
          wasManuallyQualified: false,
          updatedAt: new Date()
        })
        .where(eq(bulkAnalysisDomains.id, domain.id));

      enrichedCount++;
      console.log(`Enriched domain ${enrichedCount}: ${domain.domain} with ${enrichmentData.qualificationStatus} status`);
    }

    console.log(`\n✅ Successfully enriched ${enrichedCount} domains with AI qualification data`);
    console.log('The LineItemsTable should now display rich AI analysis information!');
    
  } catch (error) {
    console.error('Error enriching domains:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the enrichment
enrichBulkDomains();