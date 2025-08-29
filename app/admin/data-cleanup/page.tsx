'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface OrphanedData {
  targetPages: {
    count: number;
    items: Array<{
      id: string;
      url: string;
      client_name: string;
    }>;
  };
  projects: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      client_name: string;
    }>;
  };
  clients?: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      normalized_domain: string;
      created_at: string;
      account_name?: string;
    }>;
  };
}

export default function DataCleanupPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrphanedData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedTargetPages, setSelectedTargetPages] = useState<Set<string>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<{
    targetPages?: { deleted: number; errors: string[] };
    projects?: { deleted: number; errors: string[] };
    clients?: { deleted: number; errors: string[] };
  }>({});

  useEffect(() => {
    fetchOrphanedData();
  }, []);

  const fetchOrphanedData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/data-cleanup/analyze');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching orphaned data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTargetPages = async () => {
    if (selectedTargetPages.size === 0) {
      alert('Please select at least one target page to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedTargetPages.size} selected target page(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const targetPageIds = Array.from(selectedTargetPages);
      const response = await fetch('/api/admin/data-cleanup/target-pages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetPageIds }),
      });
      const result = await response.json();
      setResults(prev => ({ ...prev, targetPages: result }));
      setSelectedTargetPages(new Set()); // Clear selection
      await fetchOrphanedData(); // Refresh data
    } catch (error) {
      console.error('Error deleting target pages:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleTargetPageSelection = (pageId: string) => {
    const newSelection = new Set(selectedTargetPages);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedTargetPages(newSelection);
  };

  const selectAllTargetPages = () => {
    if (data?.targetPages?.items) {
      setSelectedTargetPages(new Set(data.targetPages.items.map(tp => tp.id)));
    }
  };

  const selectNoneTargetPages = () => {
    setSelectedTargetPages(new Set());
  };

  const handleDeleteProjects = async () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedProjects.size} selected project(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const projectIds = Array.from(selectedProjects);
      const response = await fetch('/api/admin/data-cleanup/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectIds }),
      });
      const result = await response.json();
      setResults(prev => ({ ...prev, projects: result }));
      setSelectedProjects(new Set()); // Clear selection
      await fetchOrphanedData(); // Refresh data
    } catch (error) {
      console.error('Error deleting projects:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const selectAllProjects = () => {
    if (data?.projects?.items) {
      setSelectedProjects(new Set(data.projects.items.map(p => p.id)));
    }
  };

  const selectNoneProjects = () => {
    setSelectedProjects(new Set());
  };

  const handleDeleteClients = async () => {
    if (selectedClients.size === 0) {
      alert('Please select at least one client to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedClients.size} selected client(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const clientIds = Array.from(selectedClients);
      const response = await fetch('/api/admin/data-cleanup/clients', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientIds }),
      });
      const result = await response.json();
      setResults(prev => ({ ...prev, clients: result }));
      setSelectedClients(new Set()); // Clear selection
      await fetchOrphanedData(); // Refresh data
    } catch (error) {
      console.error('Error deleting clients:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    const newSelection = new Set(selectedClients);
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId);
    } else {
      newSelection.add(clientId);
    }
    setSelectedClients(newSelection);
  };

  const selectAllClients = () => {
    if (data?.clients?.items) {
      setSelectedClients(new Set(data.clients.items.map(c => c.id)));
    }
  };

  const selectNoneClients = () => {
    setSelectedClients(new Set());
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading orphaned data analysis...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Data Cleanup Admin</h1>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          This page allows you to permanently delete orphaned data from the database. 
          Only delete data that you are certain is not needed. All deletions are permanent and cannot be undone.
        </AlertDescription>
      </Alert>

      {/* Results Display */}
      {(results.targetPages || results.projects || results.clients) && (
        <div className="mb-6 space-y-4">
          {results.targetPages && (
            <Alert className={results.targetPages.errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Target Pages Cleanup Results</AlertTitle>
              <AlertDescription>
                Deleted {results.targetPages.deleted} target pages.
                {results.targetPages.errors.length > 0 && (
                  <div className="mt-2">
                    Errors: {results.targetPages.errors.join(', ')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          {results.projects && (
            <Alert className={results.projects.errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Projects Cleanup Results</AlertTitle>
              <AlertDescription>
                Deleted {results.projects.deleted} projects.
                {results.projects.errors.length > 0 && (
                  <div className="mt-2">
                    Errors: {results.projects.errors.join(', ')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          {results.clients && (
            <Alert className={results.clients.errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Clients Cleanup Results</AlertTitle>
              <AlertDescription>
                Deleted {results.clients.deleted} clients.
                {results.clients.errors.length > 0 && (
                  <div className="mt-2">
                    Errors: {results.clients.errors.join(', ')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orphaned Target Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Target Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold text-red-600">
                  {data?.targetPages?.count || 0} pages found
                </div>
                {selectedTargetPages.size > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedTargetPages.size} selected
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Criteria for deletion:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>No associated order line items</li>
                  <li>No target page intelligence</li>
                  <li>No generation logs</li>
                  <li>No connected workflows</li>
                  <li>Empty keywords and description</li>
                </ul>
              </div>

              {data?.targetPages.items && data.targetPages.items.length > 0 && (
                <>
                  <div className="flex gap-2">
                    <Button
                      onClick={selectAllTargetPages}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={selectNoneTargetPages}
                      variant="outline"
                      size="sm"
                    >
                      Select None
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {data.targetPages.items.map((item) => (
                        <div key={item.id} className="flex items-start space-x-2 p-2 hover:bg-gray-100 rounded">
                          <Checkbox
                            checked={selectedTargetPages.has(item.id)}
                            onCheckedChange={() => toggleTargetPageSelection(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 text-xs">
                            <div className="font-medium text-gray-900 truncate">{item.url}</div>
                            <div className="text-gray-500">Client: {item.client_name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={handleDeleteTargetPages}
                disabled={deleting || selectedTargetPages.size === 0}
                className="w-full"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedTargetPages.size > 0 ? `${selectedTargetPages.size} Selected` : 'Selected'} Target Page{selectedTargetPages.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orphaned Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Bulk Analysis Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold text-red-600">
                  {data?.projects?.count || 0} projects found
                </div>
                {selectedProjects.size > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedProjects.size} selected
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Criteria for deletion:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>No associated domains</li>
                  <li>No order associations</li>
                  <li>No website associations</li>
                  <li>No vetted request links</li>
                  <li>No qualifications</li>
                  <li>No order groups</li>
                  <li>Only has client connection</li>
                </ul>
              </div>

              {data?.projects.items && data.projects.items.length > 0 && (
                <>
                  <div className="flex gap-2">
                    <Button
                      onClick={selectAllProjects}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={selectNoneProjects}
                      variant="outline"
                      size="sm"
                    >
                      Select None
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {data.projects.items.map((item) => (
                        <div key={item.id} className="flex items-start space-x-2 p-2 hover:bg-gray-100 rounded">
                          <Checkbox
                            checked={selectedProjects.has(item.id)}
                            onCheckedChange={() => toggleProjectSelection(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 text-xs">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-gray-500">Client: {item.client_name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={handleDeleteProjects}
                disabled={deleting || selectedProjects.size === 0}
                className="w-full"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedProjects.size > 0 ? `${selectedProjects.size} Selected` : 'Selected'} Project{selectedProjects.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orphaned Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold text-red-600">
                  {data?.clients?.count || 0} clients found
                </div>
                {selectedClients.size > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedClients.size} selected
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Criteria for deletion:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>No target pages</li>
                  <li>No bulk analysis projects</li>
                  <li>No orders</li>
                  <li>No vetted sites requests</li>
                  <li>Completely unused client records</li>
                </ul>
              </div>

              {data?.clients?.items && data.clients.items.length > 0 && (
                <>
                  <div className="flex gap-2">
                    <Button
                      onClick={selectAllClients}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={selectNoneClients}
                      variant="outline"
                      size="sm"
                    >
                      Select None
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {data.clients.items.map((item) => (
                        <div key={item.id} className="flex items-start space-x-2 p-2 hover:bg-gray-100 rounded">
                          <Checkbox
                            checked={selectedClients.has(item.id)}
                            onCheckedChange={() => toggleClientSelection(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 text-xs">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-gray-500">
                              {item.normalized_domain} • Created: {new Date(item.created_at).toLocaleDateString()}
                              {item.account_name && ` • Account: ${item.account_name}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={handleDeleteClients}
                disabled={deleting || selectedClients.size === 0}
                className="w-full"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedClients.size > 0 ? `${selectedClients.size} Selected` : 'Selected'} Client{selectedClients.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Safety Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>All deletions use CASCADE where appropriate to clean up related records</li>
              <li>Foreign key constraints prevent deletion of data that is still referenced</li>
              <li>Always backup your database before running cleanup operations</li>
              <li>Consider running in a staging environment first</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}