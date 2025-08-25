'use client';

import { Suspense } from 'react';
import Header from '@/components/Header';
import NewVettedSitesRequestClient from './NewVettedSitesRequestClient';

function NewVettedSitesRequestContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <NewVettedSitesRequestClient />
    </div>
  );
}

export default function NewVettedSitesRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewVettedSitesRequestContent />
    </Suspense>
  );
}