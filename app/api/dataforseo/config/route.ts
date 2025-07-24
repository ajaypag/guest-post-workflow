import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';

export async function GET(request: NextRequest) {
  try {
    const locations = DataForSeoService.getSupportedLocations();
    const languages = DataForSeoService.getSupportedLanguages();

    return NextResponse.json({ 
      locations,
      languages,
      defaults: {
        locationCode: 2840, // United States
        languageCode: 'en'
      }
    });
  } catch (error: any) {
    console.error('Error fetching DataForSEO config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration', details: error.message },
      { status: 500 }
    );
  }
}