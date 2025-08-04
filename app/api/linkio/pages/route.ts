import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { linkioPages } from '@/lib/db/linkioSchema';
import { eq, desc, and, sql } from 'drizzle-orm';

// GET all pages or filtered
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageType = searchParams.get('pageType');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    
    const conditions = [];
    if (pageType) conditions.push(eq(linkioPages.pageType, pageType as any));
    if (status) conditions.push(eq(linkioPages.recreationStatus, status as any));
    if (priority !== null) conditions.push(eq(linkioPages.priority, parseInt(priority)));
    
    let pages;
    if (conditions.length > 0) {
      pages = await db
        .select()
        .from(linkioPages)
        .where(and(...conditions))
        .orderBy(desc(linkioPages.priority), desc(linkioPages.createdAt));
    } else {
      pages = await db
        .select()
        .from(linkioPages)
        .orderBy(desc(linkioPages.priority), desc(linkioPages.createdAt));
    }
    
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error fetching Linkio pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

// POST - Add new page to track
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const newPage = await db.insert(linkioPages).values({
      originalUrl: data.originalUrl,
      originalTitle: data.originalTitle,
      originalMetaDescription: data.originalMetaDescription,
      pageType: data.pageType || 'other',
      category: data.category,
      priority: data.priority || 0,
      notes: data.notes,
    }).returning();
    
    return NextResponse.json({ page: newPage[0] });
  } catch (error) {
    console.error('Error creating Linkio page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

// PATCH - Update page status/details
export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
    }
    
    // Add timestamps for status changes
    if (updateData.recreationStatus) {
      switch (updateData.recreationStatus) {
        case 'analyzed':
          updateData.analyzedAt = new Date();
          break;
        case 'completed':
          updateData.completedAt = new Date();
          break;
        case 'published':
          updateData.publishedAt = new Date();
          break;
      }
    }
    
    updateData.updatedAt = new Date();
    
    const updated = await db.update(linkioPages)
      .set(updateData)
      .where(eq(linkioPages.id, id))
      .returning();
    
    return NextResponse.json({ page: updated[0] });
  } catch (error) {
    console.error('Error updating Linkio page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}