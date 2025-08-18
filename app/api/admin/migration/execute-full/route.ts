import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { updateMigrationState, getMigrationState } from '../status/route';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal admin users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if migration is already in progress
    const currentState = getMigrationState();
    if (currentState.phase === 'in-progress') {
      return NextResponse.json({ error: 'Migration already in progress' }, { status: 400 });
    }

    // Allow re-running if there's an error or if specifically requested
    if (currentState.phase === 'completed' && !request.headers.get('x-force-rerun')) {
      return NextResponse.json({ 
        error: 'Migration appears complete. Click "Force Clear & Re-run Migration" to override.', 
        needsForce: true 
      }, { status: 400 });
    }

    // Initialize migration state
    updateMigrationState({
      phase: 'in-progress',
      currentStep: 'Starting full migration',
      progress: 0,
      errors: [],
      startedAt: new Date().toISOString(),
      completedAt: null
    });

    // Execute migration steps sequentially
    await executeMigrationSequence();

    return NextResponse.json({
      success: true,
      message: 'Full migration started successfully',
      status: getMigrationState()
    });
  } catch (error: any) {
    console.error('Full migration execution error:', error);
    
    updateMigrationState({
      phase: 'failed',
      currentStep: `Full migration failed: ${error.message}`,
      errors: [error.message]
    });

    return NextResponse.json(
      { error: error.message || 'Full migration failed' },
      { status: 500 }
    );
  }
}

async function executeMigrationSequence() {
  const steps = [
    { name: 'preflight-check', description: 'Pre-flight Checks' },
    // Removed backup step - not needed and causes issues
    { name: 'apply-migrations', description: 'Schema Updates' },
    { name: 'migrate-data', description: 'Data Migration' },
    { name: 'update-bulk-analysis', description: 'Bulk Analysis Fix' },
    { name: 'validate-migration', description: 'Validation' }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const baseProgress = (i / steps.length) * 100;
    const stepProgress = 100 / steps.length;

    try {
      updateMigrationState({
        currentStep: `${step.description} (${i + 1}/${steps.length})`,
        progress: Math.round(baseProgress)
      });

      // Execute the step by calling the execute endpoint internally
      const stepResult = await executeStep(step.name);
      
      if (!stepResult.success) {
        throw new Error(stepResult.error || `Step ${step.name} failed`);
      }

      // Update progress after successful step
      updateMigrationState({
        currentStep: `${step.description} completed`,
        progress: Math.round(baseProgress + stepProgress)
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error && 'cause' in error ? 
        (error as any).cause : undefined;
      
      // Build detailed error information
      const fullErrorMessage = errorDetails ? 
        `${errorMessage}\nDetails: ${JSON.stringify(errorDetails, null, 2)}` : 
        errorMessage;
      
      updateMigrationState({
        phase: 'failed',
        currentStep: `${step.description} failed`,
        errors: [fullErrorMessage],
        progress: Math.round(baseProgress)
      });
      
      console.error(`Migration step ${step.name} failed:`, {
        step: step.name,
        error: errorMessage,
        details: errorDetails
      });
      
      throw new Error(`${step.description} failed: ${errorMessage}`);
    }
  }

  // Final completion state
  updateMigrationState({
    phase: 'completed',
    currentStep: 'Full migration completed successfully',
    progress: 100,
    completedAt: new Date().toISOString(),
    canRollback: true
  });
}

async function executeStep(stepName: string) {
  try {
    // Import and execute the step logic from the execute route
    const { POST: executePost } = await import('../execute/route');
    
    // Create a mock request for the step with internal flag
    const mockRequest = {
      json: async () => ({ step: stepName, _internal: true })
    } as NextRequest;

    const response = await executePost(mockRequest);
    const result = await response.json();
    
    return {
      success: response.ok,
      result,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Step execution failed'
    };
  }
}