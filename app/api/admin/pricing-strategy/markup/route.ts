import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// Configuration file path
const CONFIG_FILE_PATH = path.join(process.cwd(), 'lib', 'config', 'pricing.ts');

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.role === 'admin' || (session as any).role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Read the current markup from the config file
    const configContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const markupMatch = configContent.match(/standard:\s*(\d+),\s*\/\/\s*\$(\d+)/);
    
    if (markupMatch) {
      const markupCents = parseInt(markupMatch[1]);
      const markupDollars = markupCents / 100;
      
      return NextResponse.json({
        markup: markupDollars,
        markupCents: markupCents
      });
    }

    // Default to $125 if not found
    return NextResponse.json({
      markup: 125,
      markupCents: 12500
    });

  } catch (error) {
    console.error('Error getting markup:', error);
    return NextResponse.json(
      { error: 'Failed to get markup' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.role === 'admin' || (session as any).role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { markup } = await request.json();

    if (typeof markup !== 'number' || markup < 0) {
      return NextResponse.json({ error: 'Invalid markup value' }, { status: 400 });
    }

    const markupCents = Math.round(markup * 100);

    // Read the current config file
    let configContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');

    // Update the standard service fee
    configContent = configContent.replace(
      /standard:\s*\d+,\s*\/\/\s*\$\d+/,
      `standard: ${markupCents}, // $${markup}`
    );

    // Update the SERVICE_FEE_CENTS export
    configContent = configContent.replace(
      /export const SERVICE_FEE_CENTS = PRICING_CONFIG\.serviceFee\.standard;/,
      `export const SERVICE_FEE_CENTS = PRICING_CONFIG.serviceFee.standard;`
    );

    // Write the updated config back
    await fs.writeFile(CONFIG_FILE_PATH, configContent, 'utf-8');

    // Log the change for audit purposes
    console.log(`Market markup updated to $${markup} (${markupCents} cents) by user ${session.userId}`);

    return NextResponse.json({
      success: true,
      markup: markup,
      markupCents: markupCents,
      message: `Market markup updated to $${markup}`
    });

  } catch (error) {
    console.error('Error updating markup:', error);
    return NextResponse.json(
      { error: 'Failed to update markup' },
      { status: 500 }
    );
  }
}