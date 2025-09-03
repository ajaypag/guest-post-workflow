import { redirect } from 'next/navigation';
import { AuthServiceServer } from '@/lib/auth-server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await AuthServiceServer.getSession();
  
  // Only allow internal users to access admin pages
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }
  
  return <>{children}</>;
}