'use client';

import Script from 'next/script';
import { RECAPTCHA_SITE_KEY } from '@/lib/utils/recaptcha';

export default function RecaptchaProvider() {
  if (!RECAPTCHA_SITE_KEY) {
    return null; // Don't load if not configured
  }

  return (
    <Script 
      src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
      strategy="afterInteractive"
    />
  );
}

export async function executeRecaptcha(action: string): Promise<string | null> {
  if (!RECAPTCHA_SITE_KEY || typeof window === 'undefined' || !window.grecaptcha) {
    return null;
  }

  try {
    const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
    return token;
  } catch (error) {
    console.error('Failed to execute reCAPTCHA:', error);
    return null;
  }
}

// Add type declaration for grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      ready: (callback: () => void) => void;
    };
  }
}