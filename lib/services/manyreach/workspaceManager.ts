/**
 * ManyReach Workspace Manager
 * Handles multiple workspaces with different API keys
 */

export interface ManyReachWorkspace {
  id: string;
  name: string;
  apiKey: string;
  description?: string;
  isDefault?: boolean;
}

// Define your workspaces here
export const MANYREACH_WORKSPACES: ManyReachWorkspace[] = [
  {
    id: 'workspace-1',
    name: 'Primary Workspace',
    apiKey: process.env.MANYREACH_API_KEY || '2a88c29a-87c0-4420-b286-ab11f134c525',
    description: 'Main production workspace',
    isDefault: true
  },
  {
    id: 'workspace-2', 
    name: 'Secondary Workspace',
    apiKey: '900b0cdf-5769-4df2-84d8-00714914d79f',
    description: 'Testing and development workspace'
  },
  // Add more workspaces as needed
];

export class WorkspaceManager {
  private workspaces: Map<string, ManyReachWorkspace>;
  
  constructor() {
    this.workspaces = new Map();
    MANYREACH_WORKSPACES.forEach(ws => {
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
  
  getApiKey(workspaceId: string): string | undefined {
    return this.workspaces.get(workspaceId)?.apiKey;
  }
}