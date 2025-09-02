import { NextRequest, NextResponse } from 'next/server';
import { ManyReachApiKeyService } from '@/lib/services/manyreachApiKeyService';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const workspaces = await ManyReachApiKeyService.listWorkspaces();
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error listing workspaces:', error);
    return NextResponse.json({ error: 'Failed to list workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'store': {
        const { workspace, apiKey, workspaceId } = body;
        await ManyReachApiKeyService.storeApiKeyWithDisplayName(workspace, apiKey, workspaceId);
        return NextResponse.json({ success: true });
      }

      case 'bulk': {
        const { keys } = body;
        await ManyReachApiKeyService.bulkImport(keys);
        return NextResponse.json({ success: true, imported: keys.length });
      }

      case 'rotate': {
        const { workspace, newApiKey } = body;
        await ManyReachApiKeyService.rotateApiKey(workspace, newApiKey);
        return NextResponse.json({ success: true });
      }

      case 'rename': {
        const { oldName, newName } = body;
        
        if (!oldName || !newName) {
          return NextResponse.json({ error: 'Both old and new names required' }, { status: 400 });
        }
        
        // Check if new name already exists
        const existing = await ManyReachApiKeyService.listWorkspaces();
        if (existing.some(ws => ws.workspace_name === newName)) {
          return NextResponse.json({ error: 'Workspace name already exists' }, { status: 400 });
        }
        
        // Update the workspace name
        await db.execute(sql`
          UPDATE manyreach_api_keys
          SET workspace_name = ${newName}
          WHERE workspace_name = ${oldName}
        `);
        
        return NextResponse.json({ success: true });
      }

      case 'deactivate': {
        const { workspace } = body;
        await ManyReachApiKeyService.deactivateWorkspace(workspace);
        return NextResponse.json({ success: true });
      }


      case 'suggest-name': {
        const { apiKey } = body;
        
        if (!apiKey) {
          return NextResponse.json({ error: 'API key required' }, { status: 400 });
        }

        const displayName = await ManyReachApiKeyService.extractDisplayName(apiKey);
        return NextResponse.json({ displayName });
      }

      case 'test': {
        const { workspace } = body;
        const apiKey = await ManyReachApiKeyService.getApiKey(workspace);
        
        if (!apiKey) {
          return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        // Test the API key with ManyReach - they use query param, not header
        const testResponse = await fetch(`https://app.manyreach.com/api/campaigns?apikey=${apiKey}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Check if we got a successful response
        let message = '';
        if (testResponse.ok) {
          try {
            const data = await testResponse.json();
            if (data && data.code === 1) {
              message = `Found ${data.data?.length || 0} campaigns`;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        return NextResponse.json({ 
          success: testResponse.ok,
          status: testResponse.status,
          workspace,
          message 
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in ManyReach keys API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Operation failed' 
    }, { status: 500 });
  }
}