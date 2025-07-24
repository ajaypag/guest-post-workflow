import BulkAnalysisPage from '@/components/BulkAnalysisPage';

export default async function ClientBulkAnalysis({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  // Pass the client ID from route params
  return <BulkAnalysisPage initialClientId={id} />;
}