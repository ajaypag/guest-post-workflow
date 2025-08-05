import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { AuthServiceServer } from '@/lib/auth-server';

// Simple in-memory rate limiting
const uploadAttempts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_UPLOADS_PER_MINUTE = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(userId) || [];
  
  // Remove old attempts outside the window
  const recentAttempts = userAttempts.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentAttempts.length >= MAX_UPLOADS_PER_MINUTE) {
    return false;
  }
  
  recentAttempts.push(now);
  uploadAttempts.set(userId, recentAttempts);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    if (!checkRateLimit(session.email)) {
      return NextResponse.json({ error: 'Too many uploads. Please wait a minute.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetPath = formData.get('path') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!targetPath) {
      return NextResponse.json({ error: 'No target path provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 });
    }

    // Validate filename - only allow alphanumeric, dash, underscore
    const filename = path.basename(targetPath);
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure the images directory exists
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    // Use the already validated filename
    const publicPath = path.join(imagesDir, filename);

    // Write the file
    await writeFile(publicPath, buffer);

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      path: `/images/${filename}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};