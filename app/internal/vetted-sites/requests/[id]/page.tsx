import { Suspense } from 'react';
import InternalVettedSitesRequestDetailV3 from './InternalVettedSitesRequestDetailV3';

export default async function InternalVettedSitesRequestDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <InternalVettedSitesRequestDetailV3 requestId={resolvedParams.id} />
    </Suspense>
  );
}