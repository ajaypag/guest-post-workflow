import { Suspense } from 'react';
import BulkAnalysisPage from '@/components/BulkAnalysisPage';

export default async function ClientBulkAnalysis({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  // Pass the client ID from route params
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BulkAnalysisPage initialClientId={id} />
    </Suspense>
  );
}