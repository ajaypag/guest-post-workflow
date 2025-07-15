import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { auditSessions, auditSections } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    console.log('Testing audit table insert...');
    
    // First, try to insert a test audit session
    const sessionId = uuidv4();
    const workflowId = 'bc645a39-bcd9-404a-99e7-42baa8a072fc'; // Use the workflow ID from the error
    const now = new Date();
    
    console.log('Inserting test audit session...');
    await db.insert(auditSessions).values({
      id: sessionId,
      workflowId,
      version: 1,
      stepId: 'final-polish',
      auditType: 'final_polish',
      status: 'pending',
      originalArticle: 'Test article',
      researchOutline: 'Test outline',
      totalSections: 1,
      completedSections: 0,
      totalProceedSteps: 1,
      completedProceedSteps: 0,
      totalCleanupSteps: 1,
      completedCleanupSteps: 0,
      auditMetadata: { test: true },
      startedAt: now,
      createdAt: now,
      updatedAt: now
    });
    
    console.log('Audit session inserted successfully, now testing section insert...');
    
    // Now try to insert a test audit section
    const sectionId = uuidv4();
    await db.insert(auditSections).values({
      id: sectionId,
      auditSessionId: sessionId,
      workflowId,
      version: 1,
      sectionNumber: 1,
      title: 'Test Section',
      originalContent: 'Original test content',
      strengths: 'Test strengths',
      weaknesses: 'Test weaknesses',
      editingPattern: 'test_pattern',
      proceedContent: 'Test proceed content',
      proceedStatus: 'completed',
      cleanupStatus: 'pending',
      brandComplianceScore: 8,
      status: 'auditing',
      auditMetadata: { test: true },
      createdAt: now,
      updatedAt: now
    });
    
    console.log('Section inserted successfully!');
    
    // Clean up test data
    await db.delete(auditSections).where(auditSections.id.eq(sectionId));
    await db.delete(auditSessions).where(auditSessions.id.eq(sessionId));
    
    return NextResponse.json({
      success: true,
      message: 'Test insert successful - both audit_sessions and audit_sections work correctly'
    });
    
  } catch (error) {
    console.error('Test insert failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : error
    }, { status: 500 });
  }
}