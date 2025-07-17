import { DiagnosticStorageService } from '@/lib/services/diagnosticStorageService';

/**
 * Comprehensive diagnostic tool for debugging agent text response issues
 * This captures all event types and provides detailed logging
 */

interface DiagnosticEvent {
  timestamp: number;
  eventType: string;
  eventName?: string;
  hasToolCalls: boolean;
  hasContent: boolean;
  contentPreview?: string;
  toolCallsCount?: number;
  toolCallNames?: string[];
  rawEvent?: any;
}

export class AgentDiagnostics {
  private events: DiagnosticEvent[] = [];
  private sessionId: string;
  private startTime: number;
  private retryAttempts: any[] = [];
  private successfulTools: any[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }

  logEvent(event: any): void {
    const diagnostic: DiagnosticEvent = {
      timestamp: Date.now() - this.startTime,
      eventType: event.type,
      eventName: event.name,
      hasToolCalls: false,
      hasContent: false
    };

    // Analyze different event types
    if (event.type === 'run_item_stream_event') {
      if (event.name === 'message_output_created') {
        diagnostic.hasToolCalls = !!(event.item?.tool_calls?.length);
        diagnostic.toolCallsCount = event.item?.tool_calls?.length || 0;
        diagnostic.toolCallNames = event.item?.tool_calls ? event.item.tool_calls.map((tc: any) => tc.function?.name) : [];
        diagnostic.hasContent = !!(event.item?.content);
        diagnostic.contentPreview = event.item?.content?.substring(0, 200);
      } else if (event.name === 'tool_called') {
        // Track successful tool calls
        const toolCall = event.item as any;
        this.successfulTools.push({
          timestamp: Date.now() - this.startTime,
          name: toolCall.name,
          args: toolCall.args
        });
      }
    } else if (event.type === 'raw_model_stream_event') {
      if (event.data.type === 'output_text_delta') {
        diagnostic.hasContent = !!(event.data.delta);
        diagnostic.contentPreview = event.data.delta?.substring(0, 200);
      } else if (event.data.type === 'response_done') {
        const message = event.data.response?.choices?.[0]?.message;
        diagnostic.hasToolCalls = !!(message?.tool_calls?.length);
        diagnostic.toolCallsCount = message?.tool_calls?.length || 0;
        diagnostic.toolCallNames = message?.tool_calls ? message.tool_calls.map((tc: any) => tc.function?.name) : [];
        diagnostic.hasContent = !!(message?.content);
        diagnostic.contentPreview = message?.content?.substring(0, 200);
      }
    }

    // Store raw event for detailed analysis
    diagnostic.rawEvent = JSON.parse(JSON.stringify(event));
    this.events.push(diagnostic);

    // Log critical events immediately
    if (this.shouldHighlightEvent(diagnostic)) {
      console.log('🔍 DIAGNOSTIC EVENT:', {
        sessionId: this.sessionId,
        timestamp: diagnostic.timestamp,
        type: diagnostic.eventType,
        name: diagnostic.eventName,
        hasToolCalls: diagnostic.hasToolCalls,
        hasContent: diagnostic.hasContent,
        contentPreview: diagnostic.contentPreview,
        toolCalls: diagnostic.toolCallNames
      });

      // Store live event for real-time monitoring
      DiagnosticStorageService.addLiveEvent(this.sessionId, {
        timestamp: diagnostic.timestamp,
        type: 'TEXT_DETECTED',
        category: 'text',
        message: 'Agent outputted text instead of using tools',
        details: { content: diagnostic.contentPreview }
      });
    }
  }

  logRetryAttempt(attempt: number, maxRetries: number, nudgeType: string): void {
    const retryEvent = {
      timestamp: Date.now() - this.startTime,
      attempt,
      maxRetries,
      nudgeType
    };
    this.retryAttempts.push(retryEvent);

    // Store live event
    DiagnosticStorageService.addLiveEvent(this.sessionId, {
      timestamp: retryEvent.timestamp,
      type: 'RETRY_ATTEMPT',
      category: 'retry',
      message: `Retry attempt ${attempt}/${maxRetries}`,
      details: { nudgeType }
    });
  }

  private shouldHighlightEvent(diagnostic: DiagnosticEvent): boolean {
    // Highlight events that could be problematic
    return (
      // Text without tool calls
      (diagnostic.hasContent && !diagnostic.hasToolCalls) ||
      // Tool calls with content (mixed output)
      (diagnostic.hasContent && diagnostic.hasToolCalls) ||
      // Response done events
      (diagnostic.eventType === 'raw_model_stream_event' && diagnostic.rawEvent?.data?.type === 'response_done')
    );
  }

  getReport(): any {
    const textOnlyEvents = this.events.filter(e => e.hasContent && !e.hasToolCalls);
    const mixedEvents = this.events.filter(e => e.hasContent && e.hasToolCalls);
    const toolOnlyEvents = this.events.filter(e => e.hasToolCalls && !e.hasContent);

    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      duration: Date.now() - this.startTime,
      summary: {
        textOnlyEvents: textOnlyEvents.length,
        mixedEvents: mixedEvents.length,
        toolOnlyEvents: toolOnlyEvents.length
      },
      problematicEvents: {
        textOnly: textOnlyEvents.map(e => ({
          timestamp: e.timestamp,
          type: e.eventType,
          name: e.eventName,
          content: e.contentPreview
        })),
        mixed: mixedEvents.map(e => ({
          timestamp: e.timestamp,
          type: e.eventType,
          name: e.eventName,
          content: e.contentPreview,
          toolCalls: e.toolCallNames
        }))
      },
      retryAttempts: this.retryAttempts,
      successfulTools: this.successfulTools,
      retryCount: this.retryAttempts.length,
      allEvents: this.events
    };
  }

  saveReport(agentType: string = 'unknown'): void {
    const report = this.getReport();
    console.log('📊 AGENT DIAGNOSTICS REPORT:', JSON.stringify(report, null, 2));
    
    // Store the report for later retrieval
    DiagnosticStorageService.storeDiagnosticReport(this.sessionId, report, agentType);
  }
}

/**
 * Enhanced detection function with comprehensive logging
 */
export function assistantSentPlainTextEnhanced(event: any, diagnostics: AgentDiagnostics): boolean {
  // Log every event for analysis
  diagnostics.logEvent(event);

  // Check 1: message_output_created without tool calls (including empty responses)
  if (event.type === 'run_item_stream_event' && 
      event.name === 'message_output_created' &&
      (!event.item.tool_calls?.length ||   // no tool calls
       !event.item.content ||              // null / undefined  
       (Array.isArray(event.item.content) && event.item.content.every((c: any) =>       // or every chunk is empty / whitespace
         c.type === 'output_text' && !c.text?.trim()))
      )) {
    
    // Analyze content for logging
    const content = event.item.content;
    const contentText = Array.isArray(content) 
      ? content.map((c: any) => c.text || '').join('').trim()
      : (content || '').toString().trim();
    
    console.log('🚨 DETECTED NON-TOOL RESPONSE (message_output_created):', {
      content: contentText.substring(0, 200) + '...',
      isEmpty: contentText.length === 0,
      hasToolCalls: !!event.item.tool_calls?.length,
      contentStructure: Array.isArray(content) ? content.map((c: any) => ({ type: c.type, hasText: !!c.text?.trim() })) : 'not_array',
      timestamp: Date.now()
    });
    return true;
  }

  // Check 2: output_text_delta (per ChatGPT suggestion)
  if (event.type === 'raw_model_stream_event' &&
      event.data.type === 'output_text_delta' &&
      event.data.delta &&
      event.data.delta.trim().length > 0) {
    console.log('🚨 DETECTED TEXT DELTA:', {
      delta: event.data.delta.substring(0, 100) + '...',
      timestamp: Date.now()
    });
    return true;
  }

  // Check 3: response_done with text content but no tool calls
  if (event.type === 'raw_model_stream_event' &&
      event.data.type === 'response_done' &&
      event.data.response?.choices?.[0]?.message?.content &&
      !event.data.response?.choices?.[0]?.message?.tool_calls?.length) {
    console.log('🚨 DETECTED COMPLETE TEXT RESPONSE (response_done):', {
      content: event.data.response.choices[0].message.content.substring(0, 200) + '...',
      hasToolCalls: false,
      timestamp: Date.now()
    });
    return true;
  }

  // Check 4: Malformed tool calls (per ChatGPT suggestion)
  if (event.type === 'run_item_stream_event' && 
      event.name === 'message_output_created' &&
      event.item.tool_calls?.length) {
    try {
      // Try to parse each tool call
      for (const toolCall of event.item.tool_calls) {
        if (toolCall.function?.arguments) {
          JSON.parse(toolCall.function.arguments);
        }
      }
    } catch (error) {
      console.log('🚨 DETECTED MALFORMED TOOL CALL:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        toolCalls: event.item.tool_calls,
        timestamp: Date.now()
      });
      return true;
    }
  }

  return false;
}