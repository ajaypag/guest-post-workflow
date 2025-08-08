import { NextRequest } from 'next/server';
import { agenticSEOAuditorService } from '@/lib/services/agenticSEOAuditorService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { 
      websiteUrl, 
      focusKeywords, 
      includeCompetitorAnalysis, 
      industryContext, 
      auditDepth 
    } = await request.json();

    if (!websiteUrl) {
      return Response.json({ 
        error: 'Website URL is required' 
      }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch (error) {
      return Response.json({
        error: 'Invalid website URL format'
      }, { status: 400 });
    }

    // Start SEO audit session
    const sessionId = await agenticSEOAuditorService.startAuditSession(
      workflowId,
      {
        websiteUrl,
        focusKeywords: focusKeywords || [],
        includeCompetitorAnalysis: includeCompetitorAnalysis || false,
        industryContext: industryContext || '',
        auditDepth: auditDepth || 'comprehensive'
      }
    );

    // Run audit in background (non-blocking)
    agenticSEOAuditorService.performSEOAudit(sessionId)
      .catch(error => {
        console.error('SEO audit failed:', error);
      });

    return Response.json({
      success: true,
      sessionId,
      message: 'SEO audit started',
      websiteUrl
    });

  } catch (error) {
    console.error('Error starting SEO audit:', error);
    return Response.json({ 
      error: 'Failed to start SEO audit',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}