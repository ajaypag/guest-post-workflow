import { Suspense } from 'react';
import BulkAnalysisPage from '@/components/BulkAnalysisPage';

export default function StandaloneBulkAnalysis() {
  // No initial client ID - user can select from dropdown
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BulkAnalysisPage />
    </Suspense>
  );
}