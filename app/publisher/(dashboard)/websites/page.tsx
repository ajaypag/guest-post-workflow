import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PublisherWebsitesList from '@/components/publisher/PublisherWebsitesList';
import { publisherOfferingsService } from '@/lib/services/publisherOfferingsService';

export default async function PublisherWebsitesPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  // Validate publisher ID exists
  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
    redirect('/publisher/login');
  }

  // Get publisher's websites
  const websites = await publisherOfferingsService.getPublisherWebsites(session.publisherId);

  return <PublisherWebsitesList websites={websites} />;
}