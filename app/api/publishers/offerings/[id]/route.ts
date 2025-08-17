import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherOfferingsService } from '@/lib/services/publisherOfferingsService';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// PATCH /api/publishers/offerings/[id] - Update offering
const updateOfferingSchema = z.object({
  offeringName: z.string().optional(),
  basePrice: z.number().positive().optional(),
  currency: z.string().optional(),
  priceType: z.enum(['fixed', 'starting_at', 'negotiable', 'contact']).optional(),
  turnaroundDays: z.number().positive().optional(),
  expressAvailable: z.boolean().optional(),
  expressDays: z.number().positive().optional(),
  expressPrice: z.number().positive().optional(),
  linkType: z.enum(['dofollow', 'nofollow', 'both', 'sponsored']).optional(),
  linkDuration: z.enum(['permanent', '12_months', '6_months', '3_months', 'custom']).optional(),
  maxLinksPerPost: z.number().positive().optional(),
  attributes: z.record(z.any()).optional(),
  monthlyCapacity: z.number().positive().optional(),
  currentAvailability: z.enum(['available', 'limited', 'booked', 'paused']).optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    const { id } = await params;
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized - Publisher access required' },
        { status: 401 }
      );
    }
    
    const offeringId = id;
    const body = await request.json();
    const validatedData = updateOfferingSchema.parse(body);
    
    // Verify the publisher owns this offering
    const [offering] = await db
      .select()
      .from(publisherOfferings)
      .where(eq(publisherOfferings.id, offeringId))
      .limit(1);
    
    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }
    
    const publisherId = session.userId;
    if (offering.publisherId !== publisherId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this offering' },
        { status: 403 }
      );
    }
    
    // Prepare update data
    const updateData: any = { ...validatedData };
    if (validatedData.basePrice !== undefined) {
      updateData.basePrice = validatedData.basePrice.toString();
    }
    if (validatedData.expressPrice !== undefined) {
      updateData.expressPrice = validatedData.expressPrice.toString();
    }
    
    // Update the offering
    const updated = await publisherOfferingsService.updateOffering(
      offeringId,
      updateData
    );
    
    return NextResponse.json({
      success: true,
      data: updated
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating offering:', error);
    return NextResponse.json(
      { error: 'Failed to update offering' },
      { status: 500 }
    );
  }
}

// DELETE /api/publishers/offerings/[id] - Delete offering (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    const { id } = await params;
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized - Publisher access required' },
        { status: 401 }
      );
    }
    
    const offeringId = id;
    
    // Verify the publisher owns this offering
    const [offering] = await db
      .select()
      .from(publisherOfferings)
      .where(eq(publisherOfferings.id, offeringId))
      .limit(1);
    
    if (!offering) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }
    
    const publisherId = session.userId;
    if (offering.publisherId !== publisherId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this offering' },
        { status: 403 }
      );
    }
    
    // Soft delete by setting isActive to false
    await publisherOfferingsService.updateOffering(offeringId, {
      isActive: false
    });
    
    return NextResponse.json({
      success: true,
      message: 'Offering deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting offering:', error);
    return NextResponse.json(
      { error: 'Failed to delete offering' },
      { status: 500 }
    );
  }
}