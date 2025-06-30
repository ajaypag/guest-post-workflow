'use client';

import { useEffect } from 'react';
import { debugStorage } from '@/lib/debug-storage';

export default function DebugLoader() {
  useEffect(() => {
    // Make debug utilities available in console
    if (typeof window !== 'undefined') {
      (window as any).debugStorage = debugStorage;
      console.log('Debug utilities loaded. Available commands:');
      console.log('- debugStorage.checkLocalStorage()');
      console.log('- debugStorage.getRawData()');
      console.log('- debugStorage.validateStoredData()');
      console.log('- debugStorage.fixCorruptedData()');
      console.log('- debugStorage.clearAll()');
    }
  }, []);

  return null;
}