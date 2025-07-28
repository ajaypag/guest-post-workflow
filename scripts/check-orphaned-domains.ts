import { db } from '../lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '../lib/db/bulkAnalysisSchema';
import { isNull } from 'drizzle-orm';

async function checkOrphanedDomains() {
  console.log('Checking for orphaned domains...\n');
  
  try {
    // Count domains without projectId
    const orphanedDomains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(isNull(bulkAnalysisDomains.projectId));
    
    console.log(`Found ${orphanedDomains.length} orphaned domains`);
    
    if (orphanedDomains.length > 0) {
      // Group by client
      const byClient = orphanedDomains.reduce((acc, domain) => {
        if (!acc[domain.clientId]) {
          acc[domain.clientId] = [];
        }
        acc[domain.clientId].push(domain);
        return acc;
      }, {} as Record<string, typeof orphanedDomains>);
      
      console.log('\nOrphaned domains by client:');
      for (const [clientId, domains] of Object.entries(byClient)) {
        console.log(`Client ${clientId}: ${domains.length} domains`);
        console.log('  Sample domains:', domains.slice(0, 3).map(d => d.domain).join(', '));
      }
    }
    
    // Count all projects
    const projects = await db.select().from(bulkAnalysisProjects);
    console.log(`\nTotal projects: ${projects.length}`);
    
    // Show project distribution
    const projectsByClient = projects.reduce((acc, project) => {
      acc[project.clientId] = (acc[project.clientId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nProjects by client:');
    for (const [clientId, count] of Object.entries(projectsByClient)) {
      console.log(`Client ${clientId}: ${count} projects`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking orphaned domains:', error);
    process.exit(1);
  }
}

checkOrphanedDomains();