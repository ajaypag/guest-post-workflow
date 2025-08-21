import { NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { EmailParserService } from '@/lib/services/emailParserService';
import { EmailParserServiceV2 } from '@/lib/services/emailParserServiceV2';
import { emailQualificationService } from '@/lib/services/emailQualificationService';

export async function POST(request: Request) {
  try {
    // Check auth
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      emailId,
      emailContent, 
      emailFrom, 
      emailSubject,
      testType 
    } = await request.json();

    if (!emailContent || !emailFrom) {
      return NextResponse.json(
        { error: 'Email content and from address required' },
        { status: 400 }
      );
    }

    const results: any = {};

    // Run Parser V1 Test (Original)
    if (testType === 'parserV1' || testType === 'both-parsers' || testType === 'all') {
      const startTime = Date.now();
      try {
        const parserService = new EmailParserService();
        const parserResult = await parserService.parseEmail({
          subject: emailSubject || '',
          body: emailContent,
          from: emailFrom
        });
        
        results.parserV1 = {
          sender: parserResult.sender,
          websites: parserResult.websites,
          offerings: parserResult.offerings,
          overallConfidence: parserResult.overallConfidence,
          missingFields: parserResult.missingFields,
          duration: Date.now() - startTime
        };
      } catch (error) {
        results.parserV1 = {
          error: error instanceof Error ? error.message : 'Parser V1 failed',
          duration: Date.now() - startTime
        };
      }
    }

    // Run Parser V2 Test (New)
    if (testType === 'parserV2' || testType === 'both-parsers' || testType === 'all') {
      const startTime = Date.now();
      try {
        const parserService = new EmailParserServiceV2();
        const parserResult = await parserService.parseEmail(
          emailContent, 
          emailFrom, 
          emailSubject
        );
        
        results.parserV2 = {
          publisher: parserResult.publisher,
          offerings: parserResult.offerings,
          pricingRules: parserResult.pricingRules,
          confidence: parserResult.confidence,
          extractionNotes: parserResult.extractionNotes,
          duration: Date.now() - startTime
        };
      } catch (error) {
        results.parserV2 = {
          error: error instanceof Error ? error.message : 'Parser failed',
          duration: Date.now() - startTime
        };
      }
    }

    // Run Qualification Test
    if (testType === 'qualification' || testType === 'all') {
      const startTime = Date.now();
      try {
        // First parse the email if we haven't already
        let parsedData = results.parserV2;
        if (!parsedData || parsedData.error) {
          const parserService = new EmailParserServiceV2();
          parsedData = await parserService.parseEmail(
            emailContent, 
            emailFrom, 
            emailSubject
          );
        }

        const qualificationResult = await emailQualificationService.qualifyEmail(
          emailContent,
          parsedData,
          emailFrom
        );
        
        results.qualification = {
          isQualified: qualificationResult.isQualified,
          status: qualificationResult.status,
          reason: qualificationResult.reason,
          notes: qualificationResult.notes,
          duration: Date.now() - startTime
        };
      } catch (error) {
        results.qualification = {
          error: error instanceof Error ? error.message : 'Qualification failed',
          duration: Date.now() - startTime
        };
      }
    }

    return NextResponse.json({ 
      success: true,
      emailId,
      results 
    });
    
  } catch (error) {
    console.error('Test execution failed:', error);
    return NextResponse.json(
      { error: 'Test execution failed' },
      { status: 500 }
    );
  }
}