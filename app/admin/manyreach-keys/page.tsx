'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Key, Trash2, Plus, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface Workspace {
  workspace_name: string;
  workspace_id: string | null;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
}

export default function ManyReachKeysPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newKeys, setNewKeys] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadWorkspaces = async () => {
    const res = await fetch('/api/admin/manyreach-keys');
    const data = await res.json();
    setWorkspaces(data.workspaces || []);
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleAddKeys = async () => {
    if (!newKeys.trim()) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      // Parse the input - each line is workspace:apikey
      const lines = newKeys.trim().split('\n');
      const keys: Array<{workspace: string, apiKey: string}> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        
        // Handle two formats:
        // 1. workspace:apikey
        // 2. just apikey (auto-generate workspace name)
        
        if (trimmed.includes(':')) {
          const [workspace, apiKey] = trimmed.split(':').map(s => s.trim());
          if (workspace && apiKey) {
            keys.push({ workspace, apiKey });
          }
        } else {
          // Just an API key - try to get a smart name from the API
          try {
            const suggestRes = await fetch('/api/admin/manyreach-keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'suggest-name',
                apiKey: trimmed
              })
            });
            
            if (suggestRes.ok) {
              const data = await suggestRes.json();
              if (data.suggestions && data.suggestions.length > 0) {
                // Use first suggestion, but add number if already exists
                let baseName = data.suggestions[0];
                let finalName = baseName;
                let counter = 1;
                
                while (workspaces.some(ws => ws.workspace_name === finalName) || 
                       keys.some(k => k.workspace === finalName)) {
                  finalName = `${baseName}-${counter}`;
                  counter++;
                }
                
                keys.push({ 
                  workspace: finalName,
                  apiKey: trimmed 
                });
                continue;
              }
            }
          } catch (e) {
            // Ignore suggestion errors
          }
          
          // Fallback to generic name
          const workspaceNum: number = workspaces.length + keys.length + 1;
          keys.push({ 
            workspace: `workspace-${workspaceNum}`, 
            apiKey: trimmed 
          });
        }
      }
      
      if (keys.length === 0) {
        setMessage({ type: 'error', text: 'No valid keys found. Use format: workspace:apikey or just paste API keys' });
        setLoading(false);
        return;
      }
      
      // Send to API
      const res = await fetch('/api/admin/manyreach-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk',
          keys
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: `Successfully imported ${data.imported} API keys` });
        setNewKeys('');
        await loadWorkspaces();
      } else {
        throw new Error('Failed to import keys');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import keys. Check the format and try again.' });
    }
    
    setLoading(false);
  };

  const handleDelete = async (workspace: string) => {
    if (!confirm(`Are you sure you want to remove the API key for "${workspace}"?`)) return;
    
    await fetch('/api/admin/manyreach-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deactivate',
        workspace
      })
    });
    
    await loadWorkspaces();
  };

  const handleTestKey = async (workspace: string) => {
    setMessage(null);
    const res = await fetch('/api/admin/manyreach-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        workspace
      })
    });
    
    const data = await res.json();
    if (data.success) {
      const extra = data.message ? ` (${data.message})` : '';
      setMessage({ type: 'success', text: `✅ API key for "${workspace}" is working!${extra}` });
    } else {
      const errorMsg = data.error || (data.status === 401 ? 'Invalid API key' : `HTTP ${data.status}`);
      setMessage({ type: 'error', text: `❌ API key for "${workspace}" failed: ${errorMsg}` });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">ManyReach API Keys</h1>
        <span className="ml-auto text-lg text-gray-600">
          {workspaces.filter(w => w.is_active).length} Active / {workspaces.length} Total
        </span>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Add Keys Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 mb-2">
            Paste API keys below. Format: <code className="bg-gray-100 px-1">workspace_name:api_key</code> (one per line)
            <br />Or just paste API keys and workspace names will be auto-generated.
          </div>
          <div className="relative">
            <textarea
              className="w-full h-40 p-3 border rounded-lg font-mono text-sm"
              placeholder={`Example:
main:2a88c29a-87c0-4420-b286-ab11f134c525
client-acme:900b0cdf-5769-4df2-84d8-00714914d79f
client-xyz:3c88d29a-98d1-5531-95e7-12824314e636

Or just paste API keys:
2a88c29a-87c0-4420-b286-ab11f134c525
900b0cdf-5769-4df2-84d8-00714914d79f`}
              value={newKeys}
              onChange={(e) => setNewKeys(e.target.value)}
              style={{ display: showKeys ? 'block' : 'none' }}
            />
            {!showKeys && (
              <textarea
                className="w-full h-40 p-3 border rounded-lg font-mono text-sm"
                placeholder="Paste API keys here..."
                value={newKeys.split('\n').map(line => {
                  if (line.includes(':')) {
                    const [ws, key] = line.split(':');
                    return `${ws}:${'•'.repeat(20)}`;
                  }
                  return line ? '•'.repeat(20) : '';
                }).join('\n')}
                readOnly
                onClick={() => setShowKeys(true)}
              />
            )}
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="absolute right-3 top-3 p-1"
            >
              {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button 
            onClick={handleAddKeys} 
            disabled={loading || !newKeys.trim()} 
            className="w-full"
          >
            {loading ? 'Adding...' : `Add ${newKeys.trim().split('\n').filter(l => l.trim()).length} API Key(s)`}
          </Button>
        </CardContent>
      </Card>

      {/* Workspace List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No API keys configured yet. Add some above!
            </div>
          ) : (
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <div 
                  key={ws.workspace_name} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    ws.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Key className={`h-4 w-4 ${ws.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="font-mono font-medium">{ws.workspace_name}</span>
                      {ws.last_used_at && (
                        <span className="ml-3 text-sm text-gray-500">
                          Used {ws.usage_count} times • Last: {new Date(ws.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTestKey(ws.workspace_name)}
                      disabled={!ws.is_active}
                    >
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(ws.workspace_name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. <strong>Add keys:</strong> Paste one or more API keys in the text area above</p>
          <p>2. <strong>Format:</strong> Use <code className="bg-white px-1">workspace:apikey</code> or just paste the API key</p>
          <p>3. <strong>Test:</strong> Click "Test" to verify an API key is working</p>
          <p>4. <strong>Remove:</strong> Click the trash icon to deactivate a key</p>
          <p className="pt-2 text-gray-600">
            Keys are encrypted before storage. Only one master encryption key needs to be set in production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}