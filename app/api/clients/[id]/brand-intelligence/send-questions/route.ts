import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clientBrandIntelligence, clients } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/clients/[id]/brand-intelligence/send-questions
 * 
 * Sends brand intelligence questions to the client via email
 * with a link to submit their answers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    
    // Authenticate user - only internal users can send questions
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get client details
    const clientResults = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (clientResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    const client = clientResults[0];

    // Get account email for the client
    let recipientEmail = 'info@linkio.com'; // Fallback
    if (client.accountId) {
      const accountResults = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, client.accountId))
        .limit(1);
      
      if (accountResults.length > 0 && accountResults[0].email) {
        recipientEmail = accountResults[0].email;
      }
    }

    // Get brand intelligence session with research output
    const brandIntelligenceResults = await db
      .select()
      .from(clientBrandIntelligence)
      .where(eq(clientBrandIntelligence.clientId, clientId))
      .limit(1);

    if (brandIntelligenceResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No brand intelligence research found for this client' },
        { status: 404 }
      );
    }

    const brandIntelligence = brandIntelligenceResults[0];
    const researchOutput = brandIntelligence.researchOutput as any;

    if (!researchOutput?.gaps || researchOutput.gaps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions found to send' },
        { status: 400 }
      );
    }

    // Generate a secure token for the answer submission link
    const answerToken = crypto.randomUUID();
    
    // Store the token in the database (we'll use the existing session structure)
    await db
      .update(clientBrandIntelligence)
      .set({
        metadata: {
          ...((brandIntelligence.metadata as any) || {}),
          answerToken: answerToken,
          questionsSentAt: new Date().toISOString()
        }
      })
      .where(eq(clientBrandIntelligence.id, brandIntelligence.id));

    // Create the answer submission URL
    const answerUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/brand-intelligence/answer/${answerToken}`;

    // Prepare email content
    const questionsHtml = researchOutput.gaps.map((gap: any, index: number) => `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 6px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="background-color: #fcd34d; color: #92400e; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
            ${gap.importance || 'MEDIUM'}
          </span>
          <span style="margin-left: 8px; font-weight: 600; color: #1f2937;">
            ${gap.category || 'General'}
          </span>
        </div>
        <p style="color: #374151; margin: 0; font-size: 14px;">
          <strong>Question ${index + 1}:</strong> ${gap.question || 'Question not available'}
        </p>
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Brand Intelligence Questions - ${client.name}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Brand Intelligence Questions</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Help us create the perfect brand brief for ${client.name}</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-top: 0;">What This Is About</h2>
            <p>Our AI research has analyzed your business and identified some key questions that will help us create a comprehensive brand brief. Your answers will ensure all future content accurately represents your company.</p>
            <p><strong>Time needed:</strong> About 5-10 minutes</p>
          </div>

          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Questions for You</h2>
          
          ${questionsHtml}

          <div style="text-align: center; margin: 40px 0;">
            <a href="${answerUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
              Submit Your Answers
            </a>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fbbf24; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Important:</strong> This link is unique to your business and will expire in 30 days. Please submit your answers at your earliest convenience.
            </p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Best regards,<br>The Linkio Team</p>
            <p style="margin-top: 20px;">
              <a href="mailto:info@linkio.com" style="color: #6366f1;">info@linkio.com</a>
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    console.log(`Sending brand intelligence questions to: ${recipientEmail} (Client: ${client.name}, Account ID: ${client.accountId || 'none'})`);
    
    const emailResult = await resend.emails.send({
      from: 'info@linkio.com',
      to: [recipientEmail],
      subject: `Brand Intelligence Questions - ${client.name}`,
      html: emailHtml,
      replyTo: 'info@linkio.com'
    });

    console.log('Brand intelligence questions email sent:', emailResult);

    return NextResponse.json({
      success: true,
      message: 'Questions sent successfully to client',
      emailId: emailResult.data?.id,
      answerUrl: answerUrl
    });

  } catch (error: any) {
    console.error('Error sending brand intelligence questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send questions to client',
        details: error.message
      },
      { status: 500 }
    );
  }
}