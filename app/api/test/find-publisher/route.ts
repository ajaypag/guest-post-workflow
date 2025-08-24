import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Find publisher by email
    const [publisher] = await db
      .select({ id: publishers.id, email: publishers.email, name: publishers.contactName })
      .from(publishers)
      .where(eq(publishers.email, email))
      .limit(1);
    
    if (!publisher) {
      return NextResponse.json({
        publisherId: null,
        message: 'No publisher found with this email'
      });
    }
    
    return NextResponse.json({
      publisherId: publisher.id,
      email: publisher.email,
      name: publisher.name
    });
    
  } catch (error) {
    console.error('Failed to find publisher:', error);
    return NextResponse.json(
      { error: 'Failed to find publisher' },
      { status: 500 }
    );
  }
}