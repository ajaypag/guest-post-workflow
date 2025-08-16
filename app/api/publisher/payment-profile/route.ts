import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields based on payment method
    const requiredFields = ['preferredMethod'];
    
    if (data.preferredMethod === 'bank_transfer') {
      requiredFields.push('bankName', 'bankAccountHolder', 'bankAccountNumber', 'bankRoutingNumber');
    } else if (data.preferredMethod === 'paypal') {
      requiredFields.push('paypalEmail');
    } else if (data.preferredMethod === 'check') {
      requiredFields.push('mailingAddress', 'mailingCity', 'mailingState', 'mailingZip');
    }

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if profile exists
    const existingProfile = await db.execute(sql`
      SELECT id FROM publisher_payment_profiles WHERE publisher_id = ${session.publisherId}
    `);

    const now = new Date().toISOString();

    if (existingProfile.rows.length > 0) {
      // Update existing profile
      await db.execute(sql`
        UPDATE publisher_payment_profiles SET
          preferred_method = ${data.preferredMethod},
          bank_name = ${data.bankName || null},
          bank_account_holder = ${data.bankAccountHolder || null},
          bank_account_number = ${data.bankAccountNumber || null},
          bank_routing_number = ${data.bankRoutingNumber || null},
          bank_swift_code = ${data.bankSwiftCode || null},
          bank_address = ${data.bankAddress || null},
          paypal_email = ${data.paypalEmail || null},
          mailing_address = ${data.mailingAddress || null},
          mailing_city = ${data.mailingCity || null},
          mailing_state = ${data.mailingState || null},
          mailing_zip = ${data.mailingZip || null},
          mailing_country = ${data.mailingCountry || 'US'},
          tax_id = ${data.taxId || null},
          tax_form_type = ${data.taxFormType || 'W9'},
          is_business = ${data.isBusiness || false},
          business_name = ${data.businessName || null},
          minimum_payout_amount = ${data.minimumPayoutAmount || 5000},
          payment_frequency = ${data.paymentFrequency || 'monthly'},
          preferred_payment_day = ${data.preferredPaymentDay || 1},
          updated_at = ${now}
        WHERE publisher_id = ${session.publisherId}
      `);
    } else {
      // Create new profile
      await db.execute(sql`
        INSERT INTO publisher_payment_profiles (
          id, publisher_id, preferred_method, bank_name, bank_account_holder,
          bank_account_number, bank_routing_number, bank_swift_code, bank_address,
          paypal_email, mailing_address, mailing_city, mailing_state, mailing_zip,
          mailing_country, tax_id, tax_form_type, is_business, business_name,
          minimum_payout_amount, payment_frequency, preferred_payment_day,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${session.publisherId}, ${data.preferredMethod}, ${data.bankName || null}, ${data.bankAccountHolder || null},
          ${data.bankAccountNumber || null}, ${data.bankRoutingNumber || null}, ${data.bankSwiftCode || null}, ${data.bankAddress || null},
          ${data.paypalEmail || null}, ${data.mailingAddress || null}, ${data.mailingCity || null}, ${data.mailingState || null}, ${data.mailingZip || null},
          ${data.mailingCountry || 'US'}, ${data.taxId || null}, ${data.taxFormType || 'W9'}, ${data.isBusiness || false}, ${data.businessName || null},
          ${data.minimumPayoutAmount || 5000}, ${data.paymentFrequency || 'monthly'}, ${data.preferredPaymentDay || 1},
          ${now}, ${now}
        )
      `);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment profile saved successfully'
    });

  } catch (error) {
    console.error('Error saving payment profile:', error);
    return NextResponse.json(
      { error: 'Failed to save payment profile' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'publisher' || !session.publisherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.execute(sql`
      SELECT * FROM publisher_payment_profiles WHERE publisher_id = ${session.publisherId} LIMIT 1
    `);

    return NextResponse.json({
      profile: profile.rows[0] || null
    });

  } catch (error) {
    console.error('Error fetching payment profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment profile' },
      { status: 500 }
    );
  }
}