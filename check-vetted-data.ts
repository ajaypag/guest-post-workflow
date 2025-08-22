import { db } from './lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects, clients } from './lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function checkData() {
  try {
    console.log('1. Checking bulk_analysis_domains table...');
    const domains = await db.query.bulkAnalysisDomains.findMany({
      limit: 5,
      with: {
        client: true,
        project: true
      }
    });
    
    console.log(`Found ${domains.length} domains in bulk_analysis_domains`);
    if (domains.length > 0) {
      console.log('Sample domain:', {
        domain: domains[0].domain,
        qualificationStatus: domains[0].qualificationStatus,
        clientId: domains[0].clientId,
        projectId: domains[0].projectId,
        userBookmarked: domains[0].userBookmarked,
        userHidden: domains[0].userHidden
      });
    }

    console.log('\n2. Checking qualified domains...');
    const qualifiedDomains = await db.query.bulkAnalysisDomains.findMany({
      where: inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality']),
      limit: 5
    });
    console.log(`Found ${qualifiedDomains.length} qualified domains (high_quality or good_quality)`);

    console.log('\n3. Checking bulk_analysis_projects...');
    const projects = await db.query.bulkAnalysisProjects.findMany({
      limit: 5
    });
    console.log(`Found ${projects.length} projects`);
    if (projects.length > 0) {
      console.log('Sample project:', {
        id: projects[0].id,
        name: projects[0].name,
        clientId: projects[0].clientId
      });
    }

    console.log('\n4. Checking clients...');
    const clientList = await db.query.clients.findMany({
      limit: 5
    });
    console.log(`Found ${clientList.length} clients`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();