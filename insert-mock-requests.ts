import { db } from './lib/db/connection';
import { vettedSitesRequests } from './lib/db/vettedSitesRequestSchema';

async function insertMockRequests() {
  console.log('Inserting mock vetted sites requests...');
  
  const mockRequests = [
    {
      targetUrls: ['https://techcrunch.com/category/startups', 'https://techcrunch.com/category/apps'],
      notes: 'Looking for tech and startup focused sites for our SaaS product launch',
      status: 'submitted' as const,
      createdByUser: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc' // Your user ID
    },
    {
      targetUrls: ['https://www.healthline.com/health/fitness', 'https://www.webmd.com/fitness-exercise'],
      notes: 'Need health and fitness related sites for our wellness app',
      status: 'reviewing' as const,
      createdByUser: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc'
    },
    {
      targetUrls: ['https://www.foodnetwork.com/recipes', 'https://www.allrecipes.com/recipes'],
      notes: 'Food and recipe sites for our cooking platform',
      status: 'approved' as const,
      createdByUser: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc'
    },
    {
      targetUrls: ['https://www.travelandleisure.com/travel-tips', 'https://www.lonelyplanet.com'],
      notes: 'Travel blogs and sites for our booking platform',
      status: 'submitted' as const,
      createdByUser: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc'
    },
    {
      targetUrls: ['https://www.entrepreneur.com/topic/marketing', 'https://blog.hubspot.com/marketing'],
      notes: 'Marketing and business sites for our B2B tool',
      status: 'reviewing' as const,
      createdByUser: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc'
    }
  ];
  
  try {
    for (let i = 0; i < mockRequests.length; i++) {
      const request = mockRequests[i];
      console.log(`Creating request ${i + 1}: ${request.notes.substring(0, 50)}...`);
      
      const [insertedRequest] = await db
        .insert(vettedSitesRequests)
        .values({
          targetUrls: request.targetUrls,
          notes: request.notes,
          status: request.status,
          createdByUser: request.createdByUser,
          filters: { topics: [], keywords: [] },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: vettedSitesRequests.id });
      
      console.log(`✅ Created request: ${insertedRequest.id}`);
    }
    
    console.log('\n✅ Successfully created 5 mock requests!');
    console.log('🌐 Go to http://localhost:3003/internal/vetted-sites/requests to see them');
    console.log('📧 Test email notifications by clicking status buttons');
    
  } catch (error) {
    console.error('Error creating mock requests:', error);
  } finally {
    process.exit(0);
  }
}

insertMockRequests();