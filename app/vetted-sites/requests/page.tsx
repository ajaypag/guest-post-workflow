'use client';

import { Suspense } from 'react';
import Header from '@/components/Header';
import VettedSitesRequestsClient from './components/VettedSitesRequestsClient';

function VettedSitesRequestsContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <VettedSitesRequestsClient />
    </div>
  );
}

export default function VettedSitesRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VettedSitesRequestsContent />
    </Suspense>
  );
}