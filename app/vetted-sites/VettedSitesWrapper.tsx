'use client';

import React from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

interface VettedSitesWrapperProps {
  children: React.ReactNode;
}

export default function VettedSitesWrapper({ children }: VettedSitesWrapperProps) {
  return (
    <AuthWrapper>
      <Header />
      {children}
    </AuthWrapper>
  );
}