/**
 * Service for storing and retrieving agent diagnostic data
 * This persists diagnostic reports for debugging agent issues
 */

interface StoredDiagnosticSession {
  sessionId: string;
  workflowId: string;
  agentType: 'semantic_audit' | 'article_writing' | 'formatting_qa' | 'final_polish';
  status: 'running' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
  events: {
    textOnly: number;
    toolCalls: number;
    retries: number;
    errors: number;
  };
}

interface StoredDiagnosticEvent {
  timestamp: number;
  type: string;
  category: 'text' | 'tool' | 'retry' | 'error' | 'success';
  message: string;
  details?: any;
}

// In-memory storage for diagnostics (in production, this would be database-backed)
const diagnosticSessions = new Map<string, StoredDiagnosticSession>();
const diagnosticEvents = new Map<string, StoredDiagnosticEvent[]>();

export class DiagnosticStorageService {
  static storeDiagnosticReport(sessionId: string, report: any, agentType: string): void {
    // Extract summary data
    const session: StoredDiagnosticSession = {
      sessionId,
      workflowId: report.workflowId || sessionId,
      agentType: agentType as any,
      status: 'completed',
      startTime: new Date(Date.now() - report.duration).toISOString(),
      endTime: new Date().toISOString(),
      events: {
        textOnly: report.summary?.textOnlyEvents || 0,
        toolCalls: report.summary?.toolOnlyEvents || 0,
        retries: report.retryCount || 0,
        errors: report.errors?.length || 0
      }
    };

    diagnosticSessions.set(sessionId, session);

    // Convert report events to stored format
    const events: StoredDiagnosticEvent[] = [];

    // Add text-only events
    if (report.problematicEvents?.textOnly) {
      report.problematicEvents.textOnly.forEach((event: any) => {
        events.push({
          timestamp: event.timestamp,
          type: 'TEXT_DETECTED',
          category: 'text',
          message: 'Agent outputted text instead of using tools',
          details: { content: event.content }
        });
      });
    }

    // Add retry events
    if (report.retryAttempts) {
      report.retryAttempts.forEach((retry: any) => {
        events.push({
          timestamp: retry.timestamp,
          type: 'RETRY_ATTEMPT',
          category: 'retry',
          message: `Retry attempt ${retry.attempt}/${retry.maxRetries}`,
          details: { nudgeType: retry.nudgeType }
        });
      });
    }

    // Add tool call events
    if (report.successfulTools) {
      report.successfulTools.forEach((tool: any) => {
        events.push({
          timestamp: tool.timestamp,
          type: 'TOOL_CALL',
          category: 'success',
          message: `Successfully called ${tool.name} tool`,
          details: { toolName: tool.name, args: tool.args }
        });
      });
    }

    diagnosticEvents.set(sessionId, events);
    console.log(`📊 Stored diagnostic report for session ${sessionId}`);
  }

  static getRecentSessions(limit: number = 10): StoredDiagnosticSession[] {
    const sessions = Array.from(diagnosticSessions.values());
    return sessions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  static getSessionEvents(sessionId: string): StoredDiagnosticEvent[] {
    return diagnosticEvents.get(sessionId) || [];
  }

  static getSessionDetails(sessionId: string): { session?: StoredDiagnosticSession; events: StoredDiagnosticEvent[] } {
    return {
      session: diagnosticSessions.get(sessionId),
      events: diagnosticEvents.get(sessionId) || []
    };
  }

  static addLiveEvent(sessionId: string, event: StoredDiagnosticEvent): void {
    const events = diagnosticEvents.get(sessionId) || [];
    events.push(event);
    diagnosticEvents.set(sessionId, events);

    // Update session counters
    const session = diagnosticSessions.get(sessionId);
    if (session) {
      switch (event.category) {
        case 'text':
          session.events.textOnly++;
          break;
        case 'tool':
        case 'success':
          session.events.toolCalls++;
          break;
        case 'retry':
          session.events.retries++;
          break;
        case 'error':
          session.events.errors++;
          break;
      }
    }
  }

  static createSession(sessionId: string, workflowId: string, agentType: string): void {
    const session: StoredDiagnosticSession = {
      sessionId,
      workflowId,
      agentType: agentType as any,
      status: 'running',
      startTime: new Date().toISOString(),
      events: {
        textOnly: 0,
        toolCalls: 0,
        retries: 0,
        errors: 0
      }
    };
    diagnosticSessions.set(sessionId, session);
    diagnosticEvents.set(sessionId, []);
  }

  static updateSessionStatus(sessionId: string, status: 'completed' | 'error'): void {
    const session = diagnosticSessions.get(sessionId);
    if (session) {
      session.status = status;
      session.endTime = new Date().toISOString();
    }
  }
}