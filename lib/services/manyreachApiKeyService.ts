import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

// Single master key in env (much simpler than 30 API keys)
const ENCRYPTION_KEY = process.env.MANYREACH_ENCRYPTION_KEY || 'dev-key-32-chars-long-for-testing';
const ALGORITHM = 'aes-256-gcm';

export class ManyReachApiKeyService {
  /**
   * Encrypts an API key for storage
   */
  private static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(64);
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Combine salt, iv, authTag, and encrypted data
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypts an API key from storage
   */
  private static decrypt(encryptedData: string): string {
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.slice(0, 64);
    const iv = combined.slice(64, 80);
    const authTag = combined.slice(80, 96);
    const encrypted = combined.slice(96);
    
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Store a new API key for a workspace
   */
  static async storeApiKey(
    workspaceName: string, 
    apiKey: string,
    workspaceId?: string,
    displayName?: string
  ): Promise<void> {
    const encrypted = this.encrypt(apiKey);
    
    await db.execute(sql`
      INSERT INTO manyreach_api_keys (workspace_name, workspace_id, api_key_encrypted, display_name)
      VALUES (${workspaceName}, ${workspaceId || null}, ${encrypted}, ${displayName || null})
      ON CONFLICT (workspace_name) 
      DO UPDATE SET 
        api_key_encrypted = ${encrypted},
        workspace_id = COALESCE(${workspaceId || null}, manyreach_api_keys.workspace_id),
        display_name = COALESCE(${displayName || null}, manyreach_api_keys.display_name),
        updated_at = NOW()
    `);
  }

  /**
   * Retrieve and decrypt an API key for a workspace
   */
  static async getApiKey(workspaceName: string): Promise<string | null> {
    const result = await db.execute(sql`
      UPDATE manyreach_api_keys 
      SET 
        last_used_at = NOW(),
        usage_count = usage_count + 1
      WHERE workspace_name = ${workspaceName} AND is_active = true
      RETURNING api_key_encrypted
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    
    const encrypted = (result.rows[0] as any).api_key_encrypted;
    return this.decrypt(encrypted);
  }

  /**
   * List all configured workspaces (without exposing keys)
   */
  static async listWorkspaces(): Promise<Array<{
    workspace_name: string;
    workspace_id: string | null;
    display_name: string | null;
    is_active: boolean;
    last_used_at: Date | null;
    usage_count: number;
  }>> {
    const result = await db.execute(sql`
      SELECT 
        workspace_name,
        workspace_id,
        display_name,
        is_active,
        last_used_at,
        usage_count
      FROM manyreach_api_keys
      ORDER BY workspace_name
    `);
    
    return result.rows as any;
  }

  /**
   * Rotate an API key (update with new key)
   */
  static async rotateApiKey(workspaceName: string, newApiKey: string): Promise<void> {
    const encrypted = this.encrypt(newApiKey);
    
    const result = await db.execute(sql`
      UPDATE manyreach_api_keys
      SET 
        api_key_encrypted = ${encrypted},
        updated_at = NOW()
      WHERE workspace_name = ${workspaceName}
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Workspace '${workspaceName}' not found`);
    }
  }

  /**
   * Deactivate a workspace's API key
   */
  static async deactivateWorkspace(workspaceName: string): Promise<void> {
    await db.execute(sql`
      UPDATE manyreach_api_keys
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE workspace_name = ${workspaceName}
    `);
  }

  /**
   * Extract display name from ManyReach API
   */
  static async extractDisplayName(apiKey: string): Promise<string | null> {
    try {
      const response = await fetch(`https://app.manyreach.com/api/campaigns?apikey=${apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Try to extract account/workspace name from response
      if (data.account?.name) {
        return data.account.name;
      }
      if (data.workspace?.name) {
        return data.workspace.name;
      }
      if (data.user?.company) {
        return data.user.company;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract display name:', error);
      return null;
    }
  }

  /**
   * Store API key with extracted display name
   */
  static async storeApiKeyWithDisplayName(
    workspaceName: string,
    apiKey: string,
    workspaceId?: string
  ): Promise<void> {
    const displayName = await this.extractDisplayName(apiKey);
    await this.storeApiKey(workspaceName, apiKey, workspaceId, displayName || undefined);
  }

  /**
   * Bulk import API keys (useful for initial setup)
   */
  static async bulkImport(keys: Array<{ workspace: string; apiKey: string; workspaceId?: string }>) {
    for (const { workspace, apiKey, workspaceId } of keys) {
      await this.storeApiKeyWithDisplayName(workspace, apiKey, workspaceId);
    }
  }
}