import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { outlineSessions } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    console.log('🧪 Testing outline generation insert with AI-like data...');

    // Create test data that mimics what the AI might generate
    const testData = {
      id: uuidv4(),
      workflowId: uuidv4(), // Fake workflow ID for testing
      version: 1,
      status: 'completed' as const,
      outlinePrompt: `Create a comprehensive research outline for an article about "The Impact of Artificial Intelligence on Modern Healthcare Systems". 

This outline should cover:
1. Current applications of AI in healthcare (diagnosis, treatment planning, drug discovery)
2. Benefits and challenges of AI adoption in medical settings
3. Ethical considerations and patient privacy concerns
4. Future trends and emerging technologies
5. Case studies of successful AI implementations

The target audience is healthcare professionals and technology decision-makers. The tone should be informative yet accessible, balancing technical accuracy with readability. Include relevant statistics, expert opinions, and real-world examples where appropriate.`,
      
      clarificationQuestions: [
        "What specific healthcare domains should the article focus on (e.g., radiology, pathology, general practice)?",
        "Should the article include regulatory and compliance aspects of AI in healthcare?",
        "What geographic regions should be covered (US-focused, global perspective, specific countries)?",
        "How technical should the content be regarding AI algorithms and methodologies?",
        "Should cost-benefit analysis and ROI considerations be included?"
      ],
      
      clarificationAnswers: `1. Focus primarily on radiology, pathology, and diagnostic imaging as these have the most mature AI implementations.
2. Yes, include a section on regulatory frameworks including FDA approvals and HIPAA compliance.
3. Take a global perspective but emphasize US and EU markets with specific examples.
4. Keep technical details at a high level - explain concepts but avoid deep mathematical formulations.
5. Yes, include a dedicated section on economic impact and ROI metrics.`,
      
      agentState: {
        currentAgent: 'ResearchAgent',
        messageHistory: ['triage', 'clarification', 'instruction', 'research'],
        context: { domain: 'healthcare', focusAreas: ['diagnostics', 'treatment'] }
      },
      
      finalOutline: `# The Impact of Artificial Intelligence on Modern Healthcare Systems

## I. Introduction
- Definition of AI in healthcare context
- Brief history and evolution
- Thesis: AI is fundamentally transforming healthcare delivery, diagnosis, and patient outcomes

## II. Current Applications of AI in Healthcare

### A. Diagnostic Imaging and Radiology
- Computer vision for X-rays, MRIs, and CT scans
- Case study: Google's diabetic retinopathy detection
- FDA-approved AI diagnostic tools

### B. Pathology and Laboratory Medicine
- Digital pathology and slide analysis
- Automated cell counting and classification
- Integration with laboratory information systems

### C. Drug Discovery and Development
- Molecular modeling and protein folding (AlphaFold)
- Clinical trial optimization
- Pharmacovigilance and adverse event prediction

## III. Benefits of AI Adoption

### A. Improved Diagnostic Accuracy
- Reduction in human error rates
- Early disease detection capabilities
- Quantitative metrics and success stories

### B. Operational Efficiency
- Workflow automation
- Resource optimization
- Cost reduction analysis

### C. Personalized Medicine
- Genomic analysis and treatment planning
- Precision dosing algorithms
- Patient risk stratification

## IV. Challenges and Limitations

### A. Technical Challenges
- Data quality and standardization issues
- Interoperability between systems
- Algorithm bias and fairness

### B. Implementation Barriers
- High initial investment costs
- Staff training requirements
- Change management in clinical settings

### C. Ethical and Legal Considerations
- Patient privacy and data security
- Liability and malpractice concerns
- Transparency and explainability requirements

## V. Regulatory Landscape

### A. FDA Regulations
- Software as Medical Device (SaMD) framework
- 510(k) clearance process
- Post-market surveillance requirements

### B. International Standards
- EU Medical Device Regulation (MDR)
- ISO standards for AI in healthcare
- Country-specific guidelines

## VI. Future Trends and Emerging Technologies

### A. Next-Generation Applications
- Quantum computing in drug discovery
- Augmented reality in surgery
- Digital twins for patient modeling

### B. Integration Trends
- AI-powered electronic health records
- Voice-enabled clinical documentation
- Predictive analytics for population health

## VII. Economic Impact and ROI Analysis

### A. Cost-Benefit Analysis
- Investment requirements vs. savings
- Productivity gains quantification
- Revenue generation opportunities

### B. Market Analysis
- Current market size and growth projections
- Key players and competitive landscape
- Investment trends and funding patterns

## VIII. Case Studies

### A. Mayo Clinic's AI Implementation
- Cardiac screening program
- Outcomes and lessons learned

### B. NHS AI Lab Initiatives
- National-scale deployment challenges
- Success metrics and impact

### C. Stanford Medicine's AI Programs
- Research to clinical translation
- Partnership models

## IX. Best Practices for Implementation

### A. Strategic Planning
- Needs assessment methodology
- Stakeholder engagement strategies
- Phased rollout approaches

### B. Technical Considerations
- Infrastructure requirements
- Data governance frameworks
- Security and compliance protocols

## X. Conclusion
- Summary of key findings
- Future outlook
- Call to action for healthcare leaders

## References and Further Reading
[Comprehensive list of academic sources, industry reports, and expert interviews]`,
      
      citations: [
        { type: 'url', value: 'https://www.nejm.org/doi/full/10.1056/NEJMra2034954' },
        { type: 'url', value: 'https://www.nature.com/articles/s41591-021-01614-0' },
        { type: 'reference', value: 'Topol, E. (2019). Deep Medicine: How Artificial Intelligence Can Make Healthcare Human Again' },
        { type: 'url', value: 'https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices' }
      ],
      
      errorMessage: null,
      sessionMetadata: {
        keyword: 'AI healthcare systems',
        postTitle: 'The Impact of Artificial Intelligence on Modern Healthcare Systems',
        clientTargetUrl: 'https://example-health-tech-blog.com/ai-insights'
      },
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Attempt to insert
    try {
      await db.insert(outlineSessions).values(testData);
      
      console.log('✅ Test insert successful');
      
      // Verify the insert
      const verification = await db.query.outlineSessions.findFirst({
        where: sql`id = ${testData.id}`
      });
      
      return NextResponse.json({
        success: true,
        sessionId: testData.id,
        message: 'Test data inserted successfully',
        verification: !!verification
      });
      
    } catch (insertError: any) {
      console.error('❌ Insert failed:', insertError);
      
      // Extract PostgreSQL error details
      const postgresError = {
        code: insertError.code,
        detail: insertError.detail,
        hint: insertError.hint,
        message: insertError.message,
        severity: insertError.severity,
        column: insertError.column,
        constraint: insertError.constraint
      };
      
      return NextResponse.json({
        success: false,
        error: insertError.message,
        postgresError,
        testData: {
          promptLength: testData.outlinePrompt.length,
          answersLength: testData.clarificationAnswers.length,
          outlineLength: testData.finalOutline.length
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}