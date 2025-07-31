import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { AuthServiceServer } from '@/lib/auth-server';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { stepId, completed } = data;

    if (!stepId || typeof completed !== 'boolean') {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get current account
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.userId)
    });

    if (!account) {
      return NextResponse.json({ 
        error: 'Account not found' 
      }, { status: 404 });
    }

    // Parse current onboarding steps
    let onboardingSteps: Record<string, boolean> = {};
    try {
      onboardingSteps = account.onboardingSteps ? JSON.parse(account.onboardingSteps) : {};
    } catch (e) {
      onboardingSteps = {};
    }

    // Update the specific step
    onboardingSteps[stepId] = completed;

    // Check if all required steps are completed
    const requiredSteps = [
      'complete_profile',
      'add_client',
      'create_first_order',
      'review_domains',
      'read_guidelines',
      'configure_preferences'
    ];

    const allCompleted = requiredSteps.every(step => onboardingSteps[step] === true);

    // Update account
    await db.update(accounts)
      .set({
        onboardingSteps: JSON.stringify(onboardingSteps),
        onboardingCompleted: allCompleted,
        onboardingCompletedAt: allCompleted && !account.onboardingCompleted 
          ? new Date() 
          : account.onboardingCompletedAt,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, session.userId));

    return NextResponse.json({
      success: true,
      stepId,
      completed,
      allCompleted
    });

  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current account
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.userId)
    });

    if (!account) {
      return NextResponse.json({ 
        error: 'Account not found' 
      }, { status: 404 });
    }

    // Parse onboarding steps
    let onboardingSteps: Record<string, boolean> = {};
    try {
      onboardingSteps = account.onboardingSteps ? JSON.parse(account.onboardingSteps) : {};
    } catch (e) {
      onboardingSteps = {};
    }

    return NextResponse.json({
      onboardingCompleted: account.onboardingCompleted,
      onboardingSteps,
      onboardingCompletedAt: account.onboardingCompletedAt
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}