/**
 * ManyReach Workspace Manager
 * Handles multiple workspaces with different API keys
 * Now integrated with database-based API key storage
 */

import { ManyReachApiKeyService } from '../manyreachApiKeyService';

export interface ManyReachWorkspace {
  id: string;
  name: string;
  apiKey?: string; // Now optional, fetched from DB
  description?: string;
  isDefault?: boolean;
}

// Generate workspace definitions dynamically for all workspace IDs
// These map database workspace names to internal IDs
export const LEGACY_WORKSPACES: ManyReachWorkspace[] = [
  // Main workspace
  {
    id: 'workspace-1',
    name: 'main',
    description: 'Main production workspace',
    isDefault: true
  },
  // Generate workspace-2 through workspace-32 (or more)
  ...Array.from({ length: 50 }, (_, i) => ({
    id: `workspace-${i + 2}`,
    name: `workspace-${i + 2}`,
    description: `Workspace ${i + 2}`
  }))
];

export class WorkspaceManager {
  private workspaces: Map<string, ManyReachWorkspace>;
  private apiKeyCache: Map<string, string> = new Map();
  
  constructor() {
    this.workspaces = new Map();
    LEGACY_WORKSPACES.forEach(ws => {
      this.workspaces.set(ws.id, ws);
    });
  }
  
  getWorkspace(workspaceId: string): ManyReachWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }
  
  getDefaultWorkspace(): ManyReachWorkspace | undefined {
    return Array.from(this.workspaces.values()).find(ws => ws.isDefault);
  }
  
  getAllWorkspaces(): ManyReachWorkspace[] {
    return Array.from(this.workspaces.values());
  }
  
  addWorkspace(workspace: ManyReachWorkspace): void {
    this.workspaces.set(workspace.id, workspace);
  }
  
  /**
   * Get API key from database or cache
   */
  async getApiKey(workspaceId: string): Promise<string | undefined> {
    // Check cache first
    if (this.apiKeyCache.has(workspaceId)) {
      return this.apiKeyCache.get(workspaceId);
    }
    
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;
    
    try {
      // Try to get from database using workspace name
      const apiKey = await ManyReachApiKeyService.getApiKey(workspace.name);
      
      if (apiKey) {
        // Cache for this session
        this.apiKeyCache.set(workspaceId, apiKey);
        return apiKey;
      }
      
      // Fallback to environment variable for backward compatibility
      if (workspace.name === 'main') {
        const envKey = process.env.MANYREACH_API_KEY;
        if (envKey) {
          // Optionally store in DB for future use
          await ManyReachApiKeyService.storeApiKey('main', envKey, workspaceId);
          this.apiKeyCache.set(workspaceId, envKey);
          return envKey;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error(`Failed to get API key for workspace ${workspaceId}:`, error);
      // Fallback to env var if DB fails
      return workspace.name === 'main' ? process.env.MANYREACH_API_KEY : undefined;
    }
  }
}