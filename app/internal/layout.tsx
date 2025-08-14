import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import InternalLayout from '@/components/internal/InternalLayout';

export default async function InternalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await AuthServiceServer.getSession();

  // Only internal users can access this section
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  return (
    <InternalLayout session={session}>
      {children}
    </InternalLayout>
  );
}