import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string }>;
}

// Redirect from /vetted-sites/results/[token] to /vetted-sites/claim/[token]
// The claim page is the actual implementation
export default async function PublicResultsPage({ params }: PageProps) {
  const { token } = await params;
  redirect(`/vetted-sites/claim/${token}`);
}