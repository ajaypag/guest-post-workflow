import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // List of all expected images
    const expectedImages = [
      '/images/resource-page-link-building-process.png',
      '/images/google-search-operators.png',
      '/images/email-outreach-templates.png',
      '/images/link-building-tools.png',
      '/images/types-of-resource-pages.png'
    ];

    // Check which images exist
    const uploadStatus: Record<string, boolean> = {};
    
    // Map image paths to IDs used in the admin portal
    const imageIdMap: Record<string, string> = {
      '/images/resource-page-link-building-process.png': 'resource-process',
      '/images/google-search-operators.png': 'google-operators',
      '/images/email-outreach-templates.png': 'email-templates',
      '/images/link-building-tools.png': 'link-tools',
      '/images/types-of-resource-pages.png': 'types-resource-pages'
    };
    
    for (const [imagePath, imageId] of Object.entries(imageIdMap)) {
      const fullPath = path.join(process.cwd(), 'public', imagePath);
      uploadStatus[imageId] = existsSync(fullPath);
    }

    return NextResponse.json(uploadStatus);
  } catch (error) {
    console.error('Error checking images:', error);
    return NextResponse.json({}, { status: 500 });
  }
}