'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Users, 
  Link2,
  Mail,
  Building,
  Globe,
  ArrowRight,
  UserPlus
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  website: string;
  description: string;
  createdAt: string;
  targetPageCount: number;
}

interface Account {
  id: string;
  name: string;
  email: string;
}

export default function OrphanedClientsPage() {
  return (
    <AuthWrapper>
      <Header />
      <OrphanedClientsContent />
    </AuthWrapper>
  );
}

function OrphanedClientsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orphanedClients, setOrphanedClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [actionType, setActionType] = useState<'assign' | 'invite' | 'share' | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load orphaned clients
      const clientsRes = await fetch('/api/admin/orphaned-clients');
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setOrphanedClients(data.clients || []);
      }

      // Load accounts
      const accountsRes = await fetch('/api/accounts');
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    if (selectedClients.length === orphanedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(orphanedClients.map(c => c.id));
    }
  };

  const handleAssignToAccount = async () => {
    if (!selectedAccountId || selectedClients.length === 0) {
      setMessage({ type: 'error', text: 'Please select an account and at least one client' });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/orphaned-clients/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedClients,
          accountId: selectedAccountId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Successfully assigned ${data.assigned} clients to account` });
        setSelectedClients([]);
        setActionType(null);
        loadData();
      } else {
        throw new Error('Failed to assign clients');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to assign clients to account' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || selectedClients.length === 0) {
      setMessage({ type: 'error', text: 'Please enter an email and select at least one client' });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/orphaned-clients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedClients,
          email: inviteEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
        setSelectedClients([]);
        setInviteEmail('');
        setActionType(null);
      } else {
        throw new Error('Failed to send invitation');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateShareLinks = async () => {
    if (selectedClients.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one client' });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/orphaned-clients/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedClients
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Generated share links for ${data.generated} clients` });
        // Could show the links in a modal here
        console.log('Share links:', data.shareLinks);
        setSelectedClients([]);
        setActionType(null);
        loadData();
      } else {
        throw new Error('Failed to generate share links');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate share links' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Orphaned Clients Management</h1>
        <p className="text-gray-600">
          Manage clients that are not yet associated with any account. 
          Found {orphanedClients.length} orphaned clients.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {orphanedClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">All clients are assigned!</h2>
          <p className="text-gray-600">There are no orphaned clients in the system.</p>
        </div>
      ) : (
        <>
          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Bulk Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setActionType('assign')}
                disabled={selectedClients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users className="h-4 w-4" />
                Assign to Account ({selectedClients.length})
              </button>
              
              <button
                onClick={() => setActionType('invite')}
                disabled={selectedClients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4" />
                Send Invitation ({selectedClients.length})
              </button>
              
              <button
                onClick={() => setActionType('share')}
                disabled={selectedClients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Link2 className="h-4 w-4" />
                Generate Share Links ({selectedClients.length})
              </button>
            </div>
          </div>

          {/* Action Forms */}
          {actionType && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              {actionType === 'assign' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Assign to Existing Account</h3>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                  >
                    <option value="">Select an account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.email})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-4">
                    <button
                      onClick={handleAssignToAccount}
                      disabled={!selectedAccountId || processing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processing ? 'Assigning...' : 'Assign Clients'}
                    </button>
                    <button
                      onClick={() => setActionType(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'invite' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Send Account Invitation</h3>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address..."
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={handleSendInvitation}
                      disabled={!inviteEmail || processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing ? 'Sending...' : 'Send Invitation'}
                    </button>
                    <button
                      onClick={() => setActionType(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'share' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Generate Share Links</h3>
                  <p className="text-gray-600 mb-4">
                    This will generate unique share links for the selected clients. 
                    Anyone with the link can claim the client by creating an account.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleGenerateShareLinks}
                      disabled={processing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {processing ? 'Generating...' : 'Generate Links'}
                    </button>
                    <button
                      onClick={() => setActionType(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Orphaned Clients</h2>
              <button
                onClick={selectAllClients}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedClients.length === orphanedClients.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="divide-y">
              {orphanedClients.map(client => (
                <label
                  key={client.id}
                  className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.id)}
                    onChange={() => toggleClientSelection(client.id)}
                    className="mr-4 h-4 w-4 text-blue-600 rounded"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        Unclaimed
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {client.website}
                      </div>
                      {client.targetPageCount > 0 && (
                        <span>{client.targetPageCount} target pages</span>
                      )}
                      <span>Created {new Date(client.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {client.description && (
                      <p className="text-sm text-gray-500 mt-1">{client.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}