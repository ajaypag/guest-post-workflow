import { db } from './lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects, clients } from './lib/db/schema';
import { eq, inArray, or, isNull } from 'drizzle-orm';

async function checkQualifiedDomains() {
  try {
    console.log('Checking for qualified domains with default filters...\n');

    // Check domains with default filters (high_quality or good_quality, not hidden)
    const qualifiedDomains = await db.query.bulkAnalysisDomains.findMany({
      where: or(
        eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
        eq(bulkAnalysisDomains.qualificationStatus, 'good_quality')
      ),
      with: {
        client: true,
        project: true
      },
      limit: 10
    });

    console.log(`Found ${qualifiedDomains.length} qualified domains (high_quality or good_quality)`);
    
    if (qualifiedDomains.length > 0) {
      console.log('\nSample domains:');
      qualifiedDomains.slice(0, 5).forEach(domain => {
        console.log(`- ${domain.domain}`);
        console.log(`  Status: ${domain.qualificationStatus}`);
        console.log(`  Client: ${domain.client?.name || 'N/A'}`);
        console.log(`  Project: ${domain.project?.name || 'N/A'}`);
        console.log(`  Hidden: ${domain.userHidden || false}`);
        console.log(`  Bookmarked: ${domain.userBookmarked || false}`);
        console.log('');
      });
    }

    // Check how many are not hidden
    const notHiddenCount = qualifiedDomains.filter(d => !d.userHidden).length;
    console.log(`\nDomains not hidden: ${notHiddenCount} out of ${qualifiedDomains.length}`);

    // Check all qualification statuses
    const allStatuses = await db
      .selectDistinct({ status: bulkAnalysisDomains.qualificationStatus })
      .from(bulkAnalysisDomains);
    
    console.log('\nAll qualification statuses in database:');
    allStatuses.forEach(s => console.log(`- ${s.status}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkQualifiedDomains();