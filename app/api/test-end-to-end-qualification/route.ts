import { NextResponse } from 'next/server';
import { emailQualificationService } from '@/lib/services/emailQualificationService';
import { emailParserV2 } from '@/lib/services/emailParserServiceV2';

export async function POST() {
  try {
    console.log('Testing end-to-end qualification system...');
    
    const testCases = [
      {
        name: 'Qualified Email - Clear Pricing',
        email: 'editor@testsite.com',
        content: `Hi there,

Yes, we accept guest posts on our website testsite.com.

Our rates are:
- Standard guest post: $300
- Finance content: $500 (higher rate due to demand)
- 2-3 day turnaround
- Dofollow links included

Let me know if you'd like to proceed.

Best,
John`,
        expectedQualified: true
      },
      {
        name: 'Disqualified - Link Swap',
        email: 'sarah@magazine.com', 
        content: `Hi,

Thanks for reaching out! We'd be happy to add your resource to our article.

In return, we'd appreciate a link back to our site from one of your high DR websites.

Let me know what you think!

Best,
Sarah`,
        expectedQualified: false,
        expectedReason: 'link_swap'
      },
      {
        name: 'Disqualified - Rejection',
        email: 'admin@newsblog.com',
        content: `Hi,

Thanks for your email but we're not interested in this collaboration.

We'll pass on this opportunity.

Best regards,
Admin Team`,
        expectedQualified: false,
        expectedReason: 'rejection'
      },
      {
        name: 'Disqualified - Vague Interest',
        email: 'contact@agency.com',
        content: `Hi,

Yes, we'd be interested in collaborating! This sounds like a great opportunity.

How would you like to proceed? Tell me more about what you had in mind.

Thanks!`,
        expectedQualified: false,
        expectedReason: 'no_offerings'
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        // Parse email first
        const parsedData = await emailParserV2.parseEmail(
          testCase.content, 
          testCase.email,
          'Re: Collaboration'
        );

        // Test qualification 
        const qualification = await emailQualificationService.qualifyEmail(
          testCase.content,
          parsedData,
          testCase.email
        );

        const passed = qualification.isQualified === testCase.expectedQualified &&
                      (!testCase.expectedReason || qualification.reason === testCase.expectedReason);

        results.push({
          testCase: testCase.name,
          passed,
          expected: {
            qualified: testCase.expectedQualified,
            reason: testCase.expectedReason
          },
          actual: {
            qualified: qualification.isQualified,
            reason: qualification.reason,
            notes: qualification.notes
          },
          parsedOfferings: parsedData.offerings?.length || 0
        });

      } catch (error) {
        results.push({
          testCase: testCase.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;

    return NextResponse.json({
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: `${Math.round((passedTests / totalTests) * 100)}%`
      },
      results,
      message: 'End-to-end qualification test completed'
    });

  } catch (error) {
    console.error('Failed to run end-to-end test:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}