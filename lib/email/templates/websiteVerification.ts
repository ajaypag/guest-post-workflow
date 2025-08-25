import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_key_here');

interface VerificationEmailData {
  publisherName: string;
  websiteDomain: string;
  verificationToken: string;
  verificationUrl: string;
  publisherId: string;
  websiteId: string;
}

export async function sendWebsiteVerificationEmail(
  toEmail: string,
  data: VerificationEmailData
) {
  const { 
    publisherName, 
    websiteDomain, 
    verificationToken, 
    verificationUrl,
    publisherId,
    websiteId
  } = data;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Website Ownership</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Website Verification Required</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; margin-top: -1px;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${publisherName},</p>
          
          <p style="font-size: 16px;">
            You've requested to verify ownership of <strong>${websiteDomain}</strong> on the Guest Post Workflow platform.
          </p>
          
          <p style="font-size: 16px;">
            Please click the button below to complete the verification process:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Verify Website Ownership
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #111827; font-size: 16px;">🔒 Verification Details</h3>
            <ul style="color: #4b5563; margin: 10px 0; padding-left: 20px;">
              <li><strong>Website:</strong> ${websiteDomain}</li>
              <li><strong>Verification Token:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-size: 14px;">${verificationToken}</code></li>
              <li><strong>Valid for:</strong> 24 hours</li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>⚠️ Important:</strong> This verification link will expire in 24 hours. 
              If you didn't request this verification, please ignore this email.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If the button above doesn't work, you can copy and paste this link into your browser:
          </p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">
            ${verificationUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px;">
            <h4 style="margin-top: 0; color: #374151; font-size: 14px;">Alternative Verification Methods</h4>
            <p style="color: #6b7280; font-size: 13px; margin: 5px 0;">
              If email verification doesn't work for you, you can also verify ownership via:
            </p>
            <ul style="color: #6b7280; font-size: 13px; margin: 5px 0; padding-left: 20px;">
              <li>DNS TXT Record</li>
              <li>HTML Meta Tag</li>
              <li>HTML File Upload</li>
            </ul>
            <p style="color: #6b7280; font-size: 13px; margin: 5px 0;">
              Visit your publisher dashboard to use these alternative methods.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; margin-bottom: 0;">
            Guest Post Workflow System<br>
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'info@linkio.com',
      to: toEmail,
      subject: `Verify Your Website: ${websiteDomain}`,
      html: emailHtml,
      headers: {
        'X-Publisher-ID': publisherId,
        'X-Website-ID': websiteId,
        'X-Verification-Token': verificationToken,
      }
    });

    console.log('✅ Website verification email sent:', {
      to: toEmail,
      website: websiteDomain,
      messageId: result.data?.id
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw error;
  }
}

// Function to handle verification link click
export async function handleVerificationClick(
  token: string,
  publisherId: string,
  websiteId: string
) {
  // This would be called from a verification endpoint when user clicks the link
  // Update the database to mark as verified
  const { db } = await import('@/lib/db/connection');
  const { publisherEmailClaims, publisherOfferingRelationships } = await import('@/lib/db/publisherSchemaActual');
  const { eq, and } = await import('drizzle-orm');
  
  // Update email claim
  await db.update(publisherEmailClaims)
    .set({
      verifiedAt: new Date(),
      status: 'verified',
      updatedAt: new Date()
    })
    .where(and(
      eq(publisherEmailClaims.publisherId, publisherId),
      eq(publisherEmailClaims.websiteId, websiteId),
      eq(publisherEmailClaims.verificationToken, token)
    ));
  
  // Update relationship status
  await db.update(publisherOfferingRelationships)
    .set({
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(
      eq(publisherOfferingRelationships.publisherId, publisherId),
      eq(publisherOfferingRelationships.websiteId, websiteId)
    ));
  
  return { success: true };
}