import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests, vettedRequestClients, vettedRequestProjects } from '@/lib/db/vettedSitesRequestSchema';
import { bulkAnalysisProjects, bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { accounts } from '@/lib/db/accountSchema';
import { clients, targetPages, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// GET /api/vetted-sites/claim/[token] - Get claimable analysis info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    // Find the request by share token
    const [requestData] = await db
      .select({
        id: vettedSitesRequests.id,
        targetUrls: vettedSitesRequests.targetUrls,
        clientName: vettedSitesRequests.prospectCompany, // Map prospect company to client name
        status: vettedSitesRequests.status,
        shareToken: vettedSitesRequests.shareToken,
        shareExpiresAt: vettedSitesRequests.shareExpiresAt,
        claimedByAccount: vettedSitesRequests.claimedByAccount,
        claimedAt: vettedSitesRequests.claimedAt,
        domainCount: vettedSitesRequests.domainCount,
        qualifiedDomainCount: vettedSitesRequests.qualifiedDomainCount,
        createdAt: vettedSitesRequests.createdAt,
        fulfilledAt: vettedSitesRequests.fulfilledAt,
      })
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.shareToken, token))
      .limit(1);

    if (!requestData) {
      return NextResponse.json({ error: 'Invalid share token' }, { status: 404 });
    }

    // Check if share token has expired
    if (requestData.shareExpiresAt && requestData.shareExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Check if already claimed
    if (requestData.claimedByAccount) {
      return NextResponse.json({ 
        error: 'This analysis has already been claimed',
        claimedAt: requestData.claimedAt
      }, { status: 409 });
    }

    // Return claimable analysis info (no sensitive data)
    return NextResponse.json({
      analysis: {
        id: requestData.id,
        targetUrls: requestData.targetUrls,
        clientName: requestData.clientName,
        status: requestData.status,
        domainCount: requestData.domainCount,
        qualifiedDomainCount: requestData.qualifiedDomainCount,
        createdAt: requestData.createdAt,
        fulfilledAt: requestData.fulfilledAt,
      },
      claimable: true
    });

  } catch (error) {
    console.error('Error fetching claimable analysis:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/vetted-sites/claim/[token] - Create account and claim analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { email, password, contactName } = await request.json();

    // Validate input
    if (!email || !password || !contactName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters' 
      }, { status: 400 });
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get the vetted sites request by share token
      const [vettedRequest] = await tx
        .select()
        .from(vettedSitesRequests)
        .where(eq(vettedSitesRequests.shareToken, token));
      
      if (!vettedRequest) {
        throw new Error('Invalid or expired link');
      }

      // Check if already claimed
      if (vettedRequest.claimedAt) {
        throw new Error('This link has already been claimed');
      }

      // Check if expired
      if (vettedRequest.shareExpiresAt && new Date() > new Date(vettedRequest.shareExpiresAt)) {
        throw new Error('This link has expired');
      }

      // Check if email already exists
      const [existingAccount] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.email, email));
      
      if (existingAccount) {
        throw new Error('An account with this email already exists');
      }

      // Create new account
      const accountId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [newAccount] = await tx.insert(accounts).values({
        id: accountId,
        email,
        password: hashedPassword,
        contactName,
        companyName: vettedRequest.prospectCompany || contactName + "'s Company",
        role: 'viewer', // Default role for claimed accounts
        status: 'active', // Active immediately for vetted sites
        emailVerified: true, // Skip email verification for now
        onboardingCompleted: true, // Skip onboarding
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Get an internal user to set as createdBy (required for clients table)
      const [adminUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      
      if (!adminUser) {
        throw new Error('No admin user found for client creation');
      }

      // Create client for the new account
      const clientId = uuidv4();
      await tx.insert(clients).values({
        id: clientId,
        name: vettedRequest.prospectCompany || contactName + "'s Company",
        website: 'https://example.com', // Default, user can update later
        accountId,
        createdBy: adminUser.id,
        clientType: 'client',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create bulk analysis project for the domains
      const projectId = uuidv4();
      await tx.insert(bulkAnalysisProjects).values({
        id: projectId,
        name: `Vetted Sites - ${new Date().toLocaleDateString()}`,
        clientId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Copy domains from the source request
      const sourceDomains = await tx
        .select()
        .from(bulkAnalysisDomains)
        .where(
          and(
            eq(bulkAnalysisDomains.sourceRequestId, vettedRequest.id),
            inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
          )
        );

      // Copy domains using upsert pattern to handle duplicates
      const copiedDomainIds: string[] = [];
      
      for (const domain of sourceDomains) {
        try {
          // Check if domain already exists for this client
          const [existingDomain] = await tx
            .select({ id: bulkAnalysisDomains.id })
            .from(bulkAnalysisDomains)
            .where(
              and(
                eq(bulkAnalysisDomains.clientId, clientId),
                eq(bulkAnalysisDomains.domain, domain.domain)
              )
            )
            .limit(1);

          let domainId: string;

          if (existingDomain) {
            // Update existing domain with full AI analysis data
            domainId = existingDomain.id;
            await tx.update(bulkAnalysisDomains).set({
              qualificationStatus: domain.qualificationStatus,
              projectId,
              sourceRequestId: vettedRequest.id,
              aiQualifiedAt: domain.aiQualifiedAt,
              aiQualificationReasoning: domain.aiQualificationReasoning,
              authorityDirect: domain.authorityDirect,
              authorityRelated: domain.authorityRelated,
              topicScope: domain.topicScope,
              topicReasoning: domain.topicReasoning,
              evidence: domain.evidence,
              overlapStatus: domain.overlapStatus,
              keywordCount: domain.keywordCount || 0,
              suggestedTargetUrl: domain.suggestedTargetUrl,
              targetMatchData: domain.targetMatchData,
              targetMatchedAt: domain.targetMatchedAt,
              notes: domain.notes,
              // Reset user preferences for new account
              userBookmarked: false,
              userHidden: false,
              hasWorkflow: false,
              updatedAt: new Date()
            }).where(eq(bulkAnalysisDomains.id, existingDomain.id));
          } else {
            // Create new domain record (using two-step approach)
            domainId = uuidv4();
            
            // Step 1: Create minimal domain record (only required fields)
            await tx.insert(bulkAnalysisDomains).values({
              id: domainId,
              clientId,
              domain: domain.domain,
              qualificationStatus: domain.qualificationStatus,
              projectId,
              sourceRequestId: vettedRequest.id,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            // Step 2: Update with full AI analysis data
            await tx.update(bulkAnalysisDomains).set({
              aiQualifiedAt: domain.aiQualifiedAt,
              aiQualificationReasoning: domain.aiQualificationReasoning,
              authorityDirect: domain.authorityDirect,
              authorityRelated: domain.authorityRelated,
              topicScope: domain.topicScope,
              topicReasoning: domain.topicReasoning,
              evidence: domain.evidence,
              overlapStatus: domain.overlapStatus,
              keywordCount: domain.keywordCount || 0,
              suggestedTargetUrl: domain.suggestedTargetUrl,
              targetMatchData: domain.targetMatchData,
              targetMatchedAt: domain.targetMatchedAt,
              notes: domain.notes,
              // Reset user preferences for new account
              userBookmarked: false,
              userHidden: false,
              hasWorkflow: false,
              updatedAt: new Date()
            }).where(eq(bulkAnalysisDomains.id, domainId));
          }
          
          copiedDomainIds.push(domainId);
          
        } catch (domainError) {
          console.error(`Failed to copy domain ${domain.domain}:`, domainError);
          // Continue with other domains - don't fail the entire claim
        }
      }
      
      console.log(`Successfully copied ${copiedDomainIds.length}/${sourceDomains.length} domains`);

      // Copy target pages if they exist (using upsert pattern)
      const targetUrls = Array.isArray(vettedRequest.targetUrls) ? vettedRequest.targetUrls : [];
      const copiedTargetPageIds: string[] = [];
      
      for (const url of targetUrls) {
        try {
          // Extract domain from URL
          let domain = '';
          try {
            const urlObj = new URL(url);
            domain = urlObj.hostname.replace('www.', '');
          } catch {
            domain = 'unknown';
          }
          
          // Check if target page already exists for this client
          const [existingTargetPage] = await tx
            .select({ id: targetPages.id })
            .from(targetPages)
            .where(
              and(
                eq(targetPages.clientId, clientId),
                eq(targetPages.url, url)
              )
            )
            .limit(1);

          let targetPageId: string;

          if (existingTargetPage) {
            // Use existing target page
            targetPageId = existingTargetPage.id;
          } else {
            // Create new target page
            targetPageId = uuidv4();
            await tx.insert(targetPages).values({
              id: targetPageId,
              clientId,
              url,
              domain,
              addedAt: new Date()
            });
          }
          
          copiedTargetPageIds.push(targetPageId);
          
        } catch (targetError) {
          console.error(`Failed to copy target page ${url}:`, targetError);
          // Continue with other target pages
        }
      }
      
      console.log(`Successfully copied ${copiedTargetPageIds.length}/${targetUrls.length} target pages`);

      // Mark the request as claimed
      await tx.update(vettedSitesRequests)
        .set({
          claimedByAccount: accountId,
          claimedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(vettedSitesRequests.id, vettedRequest.id));
      
      console.log(`Request ${vettedRequest.id} marked as claimed by account ${accountId}`);

      // Return the result data from the transaction
      return {
        newAccount,
        clientId,
        projectId,
        domainsCount: copiedDomainIds.length,
        totalDomains: sourceDomains.length,
        targetPagesCount: copiedTargetPageIds.length,
        totalTargetPages: targetUrls.length
      };
    });

    // Create JWT session for the new account (outside transaction)
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production';
    const authToken = jwt.sign(
      {
        userId: result.newAccount.id,
        userType: 'account',
        email: result.newAccount.email,
        name: result.newAccount.contactName,
        role: result.newAccount.role,
        accountId: result.newAccount.id,
        companyName: result.newAccount.companyName,
        status: result.newAccount.status
      },
      secret,
      { expiresIn: '7d' }
    );

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Account created and results claimed successfully',
      account: {
        id: result.newAccount.id,
        email: result.newAccount.email,
        contactName: result.newAccount.contactName
      },
      clientId: result.clientId,
      projectId: result.projectId,
      domainsCount: result.domainsCount,
      totalDomains: result.totalDomains,
      targetPagesCount: result.targetPagesCount,
      totalTargetPages: result.totalTargetPages,
      requiresVerification: false
    });

    // Set the auth cookie on the response
    response.cookies.set('auth-token-account', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Error claiming vetted sites:', error);
    
    // Return appropriate error message
    if (error.message?.includes('expired')) {
      return NextResponse.json({ error: error.message }, { status: 410 });
    }
    if (error.message?.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.message?.includes('already been claimed')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to claim results. Please try again.' },
      { status: 500 }
    );
  }
}