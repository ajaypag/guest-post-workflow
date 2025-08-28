import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import WebsiteEditsClient from './WebsiteEditsClient';

export default async function WebsiteEditsPage() {
  const session = await AuthServiceServer.getSession();

  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  return <WebsiteEditsClient session={session} />;
}