import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const data = await request.json();

    // Remove id and date fields from data to prevent updating them
    const { 
      id: _id, 
      createdAt, 
      updatedAt, 
      airtableCreatedAt, 
      airtableUpdatedAt,
      lastSyncedAt,
      lastCampaignDate,
      ...updateData 
    } = data;

    // Convert date strings back to Date objects if they exist
    if (data.lastCampaignDate) {
      updateData.lastCampaignDate = new Date(data.lastCampaignDate);
    }

    // Update the website
    const [updatedWebsite] = await db
      .update(websites)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, id))
      .returning();

    if (!updatedWebsite) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      website: updatedWebsite,
    });
  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Delete the website
    const [deletedWebsite] = await db
      .delete(websites)
      .where(eq(websites.id, id))
      .returning();

    if (!deletedWebsite) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Failed to delete website' },
      { status: 500 }
    );
  }
}