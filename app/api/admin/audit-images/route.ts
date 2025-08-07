import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization (you should add proper auth here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the audit script
    const { stdout, stderr } = await execAsync('npm run audit:images');
    
    // Parse the output to return structured data
    const lines = stdout.split('\n');
    const brokenImages: any[] = [];
    let currentFile = '';
    
    for (const line of lines) {
      if (line.includes('📄')) {
        currentFile = line.replace('📄', '').trim().replace(':', '');
      } else if (line.includes('Line')) {
        const match = line.match(/Line (\d+): ([^\s]+) \(([^)]+)\)/);
        if (match) {
          brokenImages.push({
            file: currentFile,
            line: parseInt(match[1]),
            url: match[2],
            type: match[3],
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      brokenImagesCount: brokenImages.length,
      brokenImages,
      rawOutput: stdout,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to run audit',
        details: error.message,
        output: error.stdout || '',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the action from request body
    const body = await request.json();
    const { fix = false } = body;

    // Run the appropriate script
    const command = fix ? 'npm run audit:images:fix' : 'npm run audit:images';
    const { stdout, stderr } = await execAsync(command);
    
    return NextResponse.json({
      success: true,
      action: fix ? 'fixed' : 'audited',
      output: stdout,
      error: stderr,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to run audit',
        details: error.message,
        output: error.stdout || '',
      },
      { status: 500 }
    );
  }
}