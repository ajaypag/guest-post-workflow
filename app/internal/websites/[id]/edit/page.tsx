import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq } from 'drizzle-orm';
import WebsiteEditForm from '@/components/internal/WebsiteEditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InternalWebsiteEditPage({ params }: PageProps) {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch the website
  const website = await db.query.websites.findFirst({
    where: eq(websites.id, id),
  });

  if (!website) {
    redirect('/internal/websites');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Website</h1>
          <p className="text-gray-600 mt-2">Update website information and settings</p>
        </div>

        <WebsiteEditForm website={website} />
      </div>
    </div>
  );
}