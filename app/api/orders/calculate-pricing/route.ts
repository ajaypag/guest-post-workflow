import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required to view pricing information.' }, { status: 401 });
    }

    const { itemCount, includesClientReview, rushDelivery } = await request.json();

    // Base pricing: $300 per link (30000 cents)
    const basePrice = itemCount * 30000;
    
    // Calculate volume discount
    let discountPercent = 0;
    if (itemCount >= 50) {
      discountPercent = 20;
    } else if (itemCount >= 25) {
      discountPercent = 15;
    } else if (itemCount >= 10) {
      discountPercent = 10;
    } else if (itemCount >= 5) {
      discountPercent = 5;
    }
    
    const discountAmount = Math.round(basePrice * (discountPercent / 100));
    const subtotal = basePrice - discountAmount;
    
    // Additional fees
    const clientReviewFee = includesClientReview ? 50000 : 0; // $500
    const rushFee = rushDelivery ? 100000 : 0; // $1000
    
    // Calculate total
    const total = subtotal + clientReviewFee + rushFee;
    
    // Estimated profit margin (40%)
    const profitMargin = Math.round(total * 0.4);

    return NextResponse.json({
      subtotal: basePrice,
      discountPercent,
      discountAmount,
      clientReviewFee,
      rushFee,
      total,
      profitMargin
    });
  } catch (error: any) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}