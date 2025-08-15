import { redirect } from 'next/navigation';
import { AuthServiceServer } from '@/lib/auth-server';
import PublisherLayout from '@/components/publisher/PublisherLayout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const session = await AuthServiceServer.getSession();

  if (!session) {
    redirect('/publisher/login');
  }

  if (session.userType !== 'publisher') {
    // Redirect to appropriate portal based on user type
    if (session.userType === 'internal') {
      redirect('/');
    } else if (session.userType === 'account') {
      redirect('/account');
    } else {
      redirect('/publisher/login');
    }
  }

  return <PublisherLayout session={session}>{children}</PublisherLayout>;
}