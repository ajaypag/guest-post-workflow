// Test script to verify the expanded component receives data correctly
const testData = {
  domain: {
    domain: 'tekedia.com',
    qualificationStatus: 'high_quality',
    aiQualificationReasoning: 'Tekedia ranks mid-SERP for eight niche keywords central to AIApply\'s funnel, such as the entire "programming language(s) in resume" cluster (31-34) and "ai practice interview" (70).',
    overlapStatus: 'both',
    authorityDirect: 'moderate', 
    authorityRelated: 'weak',
    topicScope: 'long_tail',
    keywordCount: 43,
    dataForSeoResultsCount: 165,
    evidence: {
      direct_count: 8,
      direct_median_position: 34,
      related_count: 27,
      related_median_position: 78
    }
  },
  metadata: {
    domainRating: 62,
    traffic: 5696,
    targetPageUrl: 'https://aiapply.co/resume-builder'
  }
};

console.log('Test data structure for ExpandedDomainDetails:');
console.log('- Has AI reasoning:', testData.domain.aiQualificationReasoning ? 'YES' : 'NO');
console.log('- Has evidence:', testData.domain.evidence ? 'YES' : 'NO');
console.log('- Direct keywords:', testData.domain.evidence.direct_count);
console.log('- Related keywords:', testData.domain.evidence.related_count);
console.log('- Has target URL:', testData.metadata.targetPageUrl ? 'YES' : 'NO');

// This is the exact structure the component should receive