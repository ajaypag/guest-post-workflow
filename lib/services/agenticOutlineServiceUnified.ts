import { agenticOutlineServiceV2 } from './agenticOutlineServiceV2';
import { agenticOutlineServiceV3 } from './agenticOutlineServiceV3';
import { 
  isStreamingEnabled, 
  shouldUseFallback, 
  isDebugEnabled, 
  enableStreamingForWorkflow,
  logFeatureFlags 
} from '@/lib/config/featureFlags';

// Unified service that routes between polling and streaming implementations
export class AgenticOutlineServiceUnified {
  
  constructor() {
    // Log feature flag status on initialization
    logFeatureFlags();
  }

  async startOutlineGeneration(workflowId: string, outlinePrompt: string): Promise<{
    sessionId: string;
    status: string;
    message: string;
    existingSessionId?: string;
    implementation?: 'streaming' | 'polling';
  }> {
    const useStreaming = enableStreamingForWorkflow(workflowId);
    
    if (isDebugEnabled()) {
      console.log(`🔀 Routing outline generation for workflow ${workflowId}:`, {
        useStreaming,
        globalStreamingEnabled: isStreamingEnabled(),
        fallbackEnabled: shouldUseFallback()
      });
    }

    try {
      if (useStreaming) {
        console.log(`🌊 Using streaming implementation for workflow ${workflowId}`);
        const result = await agenticOutlineServiceV3.startOutlineGeneration(workflowId, outlinePrompt);
        return {
          ...result,
          implementation: 'streaming'
        };
      } else {
        console.log(`📊 Using polling implementation for workflow ${workflowId}`);
        const result = await agenticOutlineServiceV2.startOutlineGeneration(workflowId, outlinePrompt);
        return {
          ...result,
          implementation: 'polling'
        };
      }
    } catch (error: any) {
      console.error(`❌ Error with ${useStreaming ? 'streaming' : 'polling'} implementation:`, error);
      
      // Fallback logic
      if (useStreaming && shouldUseFallback()) {
        console.log(`🔄 Falling back to polling implementation for workflow ${workflowId}`);
        try {
          const result = await agenticOutlineServiceV2.startOutlineGeneration(workflowId, outlinePrompt);
          return {
            ...result,
            implementation: 'polling',
            message: `${result.message} (Fallback from streaming)`
          };
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  async checkOutlineStatus(sessionId: string, clientSequenceNumber?: number): Promise<{
    status: string;
    outline?: string;
    citations?: any[];
    partialContent?: string;
    sequenceNumber?: number;
    connectionStatus?: string;
    progress?: string;
    error?: string;
    hasNewContent?: boolean;
    implementation?: 'streaming' | 'polling';
  }> {
    // Determine which implementation was used by checking session data
    const implementation = await this.detectImplementation(sessionId);
    
    if (isDebugEnabled()) {
      console.log(`🔍 Checking status for session ${sessionId} using ${implementation} implementation`);
    }

    try {
      if (implementation === 'streaming') {
        const result = await agenticOutlineServiceV3.getStreamStatus(sessionId, clientSequenceNumber);
        return {
          ...result,
          implementation: 'streaming'
        };
      } else {
        const result = await agenticOutlineServiceV2.checkOutlineStatus(sessionId);
        return {
          ...result,
          implementation: 'polling'
        };
      }
    } catch (error: any) {
      console.error(`❌ Error checking status with ${implementation} implementation:`, error);
      
      // Try the other implementation if fallback is enabled
      if (shouldUseFallback()) {
        const fallbackImplementation = implementation === 'streaming' ? 'polling' : 'streaming';
        console.log(`🔄 Falling back to ${fallbackImplementation} for status check`);
        
        try {
          if (fallbackImplementation === 'streaming') {
            const result = await agenticOutlineServiceV3.getStreamStatus(sessionId, clientSequenceNumber);
            return { ...result, implementation: 'streaming' };
          } else {
            const result = await agenticOutlineServiceV2.checkOutlineStatus(sessionId);
            return { ...result, implementation: 'polling' };
          }
        } catch (fallbackError) {
          console.error('❌ Fallback status check also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  async cancelOutlineGeneration(sessionId: string): Promise<{ success: boolean }> {
    const implementation = await this.detectImplementation(sessionId);
    
    if (isDebugEnabled()) {
      console.log(`🛑 Cancelling session ${sessionId} using ${implementation} implementation`);
    }

    try {
      if (implementation === 'streaming') {
        return await agenticOutlineServiceV3.cancelOutlineGeneration(sessionId);
      } else {
        return await agenticOutlineServiceV2.cancelOutlineGeneration(sessionId);
      }
    } catch (error: any) {
      console.error(`❌ Error cancelling with ${implementation} implementation:`, error);
      
      // Try the other implementation if fallback is enabled
      if (shouldUseFallback()) {
        const fallbackImplementation = implementation === 'streaming' ? 'polling' : 'streaming';
        console.log(`🔄 Falling back to ${fallbackImplementation} for cancellation`);
        
        try {
          if (fallbackImplementation === 'streaming') {
            return await agenticOutlineServiceV3.cancelOutlineGeneration(sessionId);
          } else {
            return await agenticOutlineServiceV2.cancelOutlineGeneration(sessionId);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback cancellation also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  async getLatestSession(workflowId: string): Promise<any> {
    // Try streaming implementation first if enabled, then fallback to polling
    const useStreaming = enableStreamingForWorkflow(workflowId);
    
    try {
      if (useStreaming) {
        return await agenticOutlineServiceV3.getLatestSession(workflowId);
      } else {
        return await agenticOutlineServiceV2.getLatestSession(workflowId);
      }
    } catch (error) {
      if (shouldUseFallback()) {
        console.log(`🔄 Falling back for getLatestSession for workflow ${workflowId}`);
        if (useStreaming) {
          return await agenticOutlineServiceV2.getLatestSession(workflowId);
        } else {
          return await agenticOutlineServiceV3.getLatestSession(workflowId);
        }
      }
      throw error;
    }
  }

  private async detectImplementation(sessionId: string): Promise<'streaming' | 'polling'> {
    try {
      // Try to get session data to detect which implementation was used
      // Check if session has streaming-specific fields
      const session = await agenticOutlineServiceV3.getLatestSession(sessionId);
      
      if (session && (session.connectionStatus || session.lastSequenceNumber !== undefined)) {
        return 'streaming';
      }
      
      return 'polling';
    } catch (error) {
      // If we can't determine, default to current feature flag setting
      return enableStreamingForWorkflow('') ? 'streaming' : 'polling';
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    streaming: { available: boolean; error?: string };
    polling: { available: boolean; error?: string };
    featureFlags: any;
  }> {
    const health = {
      streaming: { available: false, error: undefined as string | undefined },
      polling: { available: false, error: undefined as string | undefined },
      featureFlags: {
        streamingEnabled: isStreamingEnabled(),
        fallbackEnabled: shouldUseFallback(),
        debugEnabled: isDebugEnabled()
      }
    };

    // Test streaming implementation
    try {
      await agenticOutlineServiceV3.getLatestSession('health-check');
      health.streaming.available = true;
    } catch (error: any) {
      health.streaming.error = error.message;
    }

    // Test polling implementation
    try {
      await agenticOutlineServiceV2.getLatestSession('health-check');
      health.polling.available = true;
    } catch (error: any) {
      health.polling.error = error.message;
    }

    return health;
  }
}

// Singleton instance
export const agenticOutlineService = new AgenticOutlineServiceUnified();