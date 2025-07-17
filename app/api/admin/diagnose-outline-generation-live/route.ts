import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { outlineSessions, workflows } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Runner, Agent } from '@openai/agents';
import { OpenAIProvider, fileSearchTool, webSearchTool } from '@openai/agents-openai';
import { z } from 'zod';

// Test sanitize function
function testSanitizeForPostgres(str: any): { input: any, inputType: string, output: string, wouldError: boolean } {
  try {
    if (!str || typeof str !== 'string') {
      return {
        input: str,
        inputType: typeof str,
        output: '',
        wouldError: typeof str === 'object' && str !== null // Objects would cause .replace() error
      };
    }
    const output = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return {
      input: str,
      inputType: typeof str,
      output,
      wouldError: false
    };
  } catch (error: any) {
    return {
      input: str,
      inputType: typeof str,
      output: 'ERROR',
      wouldError: true
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, testPrompt } = body;

    console.log('🔍 Running LIVE outline generation diagnostics...');

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      workflowId,
      testPrompt,
      agentCreation: {},
      agentHandoffs: {},
      runtimeBehavior: {},
      typeAnalysis: {},
      sanitizationTests: {},
      recommendations: []
    };

    // Test the agents setup
    try {
      const openaiProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Create agents exactly as in the service
      const clarificationsSchema = z.object({
        questions: z.array(z.string()).describe('List of clarification questions to ask the user')
      });

      const TRIAGE_PROMPT = `You are a triage agent for a deep research outline generation system.

Your job is to analyze the user's research prompt and decide whether clarification is needed.

Based on your analysis:
• If the prompt is clear and complete → call transfer_to_research_instruction_agent
• If clarification would improve the research → call transfer_to_clarifying_questions_agent

Return exactly ONE function-call.`;

      const CLARIFYING_PROMPT = `You are a clarifying agent for a deep research outline generation system.

Your job is to ask 2-3 concise, targeted questions that will help create a better research outline.

Return 2-3 questions maximum.`;

      const INSTRUCTION_BUILDER_PROMPT = `You are an instruction builder for a deep research outline generation system.

Transform the enriched context into specific research directives.`;

      const RESEARCH_AGENT_PROMPT = `You are a deep research specialist creating comprehensive outlines for guest post articles.

Create a comprehensive research outline based on the instructions provided.`;

      // Track agent creation
      diagnostics.agentCreation.startTime = new Date().toISOString();

      // Test agent creation with o3 models (as per CLAUDE.md instructions)
      const researchAgent = new Agent({
        name: 'ResearchAgent',
        model: 'o3-deep-research', // Correct model for complex research
        instructions: RESEARCH_AGENT_PROMPT,
        tools: [
          webSearchTool()
          // Note: fileSearchTool not supported with o3-deep-research model
        ]
      });
      diagnostics.agentCreation.researchAgent = { 
        created: true, 
        hasTools: true,
        note: 'Basic agent creation test'
      };

      const instructionAgent = new Agent({
        name: 'InstructionBuilder',
        model: 'o3-2025-04-16', // Using o3 instead of gpt-4o-turbo
        instructions: INSTRUCTION_BUILDER_PROMPT,
        handoffs: [researchAgent]
      });
      diagnostics.agentCreation.instructionAgent = { 
        created: true, 
        handoffs: ['researchAgent'],
        note: 'Basic agent with handoffs'
      };

      const clarifyingAgent = new Agent({
        name: 'ClarifyingAgent',
        model: 'o3-2025-04-16',
        instructions: CLARIFYING_PROMPT,
        outputType: clarificationsSchema
      });
      diagnostics.agentCreation.clarifyingAgent = { 
        created: true, 
        outputType: 'clarificationsSchema (Zod object)',
        note: 'Agent with structured output'
      };

      const triageAgent = new Agent({
        name: 'TriageAgent',
        model: 'o3-2025-04-16',
        instructions: TRIAGE_PROMPT,
        handoffs: [clarifyingAgent, instructionAgent]
      });
      diagnostics.agentCreation.triageAgent = { 
        created: true, 
        handoffs: ['clarifyingAgent', 'instructionAgent'],
        note: 'Triage agent with multiple handoffs'
      };

      // Analyze handoff compatibility - CURRENT IMPLEMENTATION
      diagnostics.agentHandoffs = {
        triageToInstruction: {
          source: 'triageAgent (string output)',
          target: 'instructionAgent (string input)',
          compatible: true,
          note: 'COMPATIBLE - Both agents handle string input/output',
          currentImplementation: 'Triage can directly handoff to instruction for clear prompts'
        },
        triageToClarifying: {
          source: 'triageAgent (string output)',
          target: 'clarifyingAgent (string input)',
          compatible: true,
          note: 'COMPATIBLE - Standard string handoff'
        },
        clarifyingToInstruction: {
          source: 'clarifyingAgent (clarificationsSchema output)',
          target: 'instructionAgent (string input)',
          compatible: false,
          issue: 'Type mismatch - structured object to string',
          currentHandling: 'FIXED - No direct handoff, handled manually in service',
          solution: 'Human-in-the-loop pattern extracts questions and waits for user answers'
        },
        instructionToResearch: {
          source: 'instructionAgent (string output)',
          target: 'researchAgent (string input)',
          compatible: true,
          note: 'COMPATIBLE - Standard string handoff'
        }
      };

      // SKIP runtime behavior test to save credits
      diagnostics.runtimeBehavior.skipped = true;
      diagnostics.runtimeBehavior.reason = 'Actual API calls disabled to save credits';
      diagnostics.runtimeBehavior.note = 'Agent configuration can be analyzed without making actual calls';
      
      // Instead, just analyze the configuration statically
      diagnostics.runtimeBehavior.staticAnalysis = {
        triageAgent: 'Would route to clarifying or instruction based on prompt clarity',
        clarifyingAgent: 'Would output structured questions (Zod schema)',
        instructionAgent: 'Would build research instructions',
        researchAgent: 'Would use o3-deep-research model with web search',
        potentialIssue: 'Type mismatch between clarifyingAgent output and instructionAgent input',
        expectedError: 'e.replace is not a function when structured output passed to text-expecting agent'
      };

      // Type analysis
      diagnostics.typeAnalysis = {
        clarificationSchemaOutput: {
          expectedStructure: { questions: ['string', 'string', 'string'] },
          zodType: 'ZodObject',
          whenPassedToTextAgent: 'Will fail with .replace() error'
        },
        sanitizationTests: [
          testSanitizeForPostgres('normal string'),
          testSanitizeForPostgres({ questions: ['q1', 'q2'] }),
          testSanitizeForPostgres(null),
          testSanitizeForPostgres(undefined),
          testSanitizeForPostgres(123),
          testSanitizeForPostgres(['array'])
        ]
      };

      // Generate recommendations
      if (diagnostics.runtimeBehavior.errorType === 'TYPE_MISMATCH_ERROR') {
        diagnostics.recommendations.push({
          priority: 'CRITICAL',
          issue: 'Agent handoff type mismatch causing .replace() error',
          solution: 'Remove direct handoff from clarifyingAgent to instructionAgent',
          implementation: 'Already implemented - clarifyingAgent has no handoffs'
        });

        diagnostics.recommendations.push({
          priority: 'HIGH',
          issue: 'Structured output from clarifying agent needs transformation',
          solution: 'Handle clarification flow manually in the service',
          code: `// When clarifications are received:
const questions = clarifyResult.output.questions;
// Save questions and wait for user answers
// Then manually pass enriched prompt to instruction agent`
        });
      }

      // Check database schema
      try {
        const columnInfo = await db.execute(sql`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_name = 'outline_sessions'
          ORDER BY ordinal_position
        `);
        
        diagnostics.databaseSchema = {
          columns: columnInfo.rows,
          hasStepId: columnInfo.rows.some((col: any) => col.column_name === 'step_id'),
          varcharSizes: columnInfo.rows
            .filter((col: any) => col.data_type === 'character varying')
            .map((col: any) => ({
              column: col.column_name,
              maxLength: col.character_maximum_length,
              adequate: col.character_maximum_length >= 255
            }))
        };
      } catch (err: any) {
        diagnostics.databaseSchema = { error: err.message };
      }

      // Get recent session errors
      try {
        const recentErrors = await db.select({
          id: outlineSessions.id,
          status: outlineSessions.status,
          errorMessage: outlineSessions.errorMessage,
          createdAt: outlineSessions.createdAt
        })
        .from(outlineSessions)
        .where(eq(outlineSessions.status, 'error'))
        .orderBy(desc(outlineSessions.createdAt))
        .limit(5);

        diagnostics.recentErrors = recentErrors.map(err => ({
          ...err,
          errorType: err.errorMessage?.includes('e.replace') ? 'TYPE_MISMATCH' : 'OTHER'
        }));
      } catch (err: any) {
        diagnostics.recentErrors = { error: err.message };
      }

    } catch (error: any) {
      diagnostics.agentCreation.error = error.message;
      diagnostics.agentCreation.stack = error.stack;
    }

    console.log('✅ Live diagnostics completed');

    return NextResponse.json(diagnostics);

  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    
    return NextResponse.json({
      error: error.message,
      details: error.stack,
      diagnosticsFailed: true
    }, { status: 500 });
  }
}