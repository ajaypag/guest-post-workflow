import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/emailProcessingSchema';
import { desc } from 'drizzle-orm';

export default async function EmailProcessingLogsPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  // Get recent email processing logs
  const logs = await db
    .select({
      id: emailProcessingLogs.id,
      emailFrom: emailProcessingLogs.emailFrom,
      campaignName: emailProcessingLogs.campaignName,
      status: emailProcessingLogs.status,
      qualificationStatus: emailProcessingLogs.qualificationStatus,
      disqualificationReason: emailProcessingLogs.disqualificationReason,
      rawContent: emailProcessingLogs.rawContent,
      createdAt: emailProcessingLogs.createdAt,
    })
    .from(emailProcessingLogs)
    .orderBy(desc(emailProcessingLogs.createdAt))
    .limit(100);

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Email Processing Logs</h1>
        
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Campaign</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Qualification</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Content Preview</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                      {log.emailFrom}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.campaignName || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.status === 'parsed' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.qualificationStatus === 'qualified' ? 'bg-green-100 text-green-800' :
                        log.qualificationStatus === 'disqualified' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.qualificationStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.disqualificationReason || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                      {log.rawContent ? log.rawContent.substring(0, 100) + '...' : 'No content'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Legend</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p><strong>Status:</strong></p>
              <ul className="ml-4 list-disc">
                <li>parsed - Successfully processed</li>
                <li>failed - Processing error</li>
                <li>pending - Awaiting processing</li>
              </ul>
            </div>
            <div>
              <p><strong>Qualification:</strong></p>
              <ul className="ml-4 list-disc">
                <li>qualified - Has paid offerings</li>
                <li>disqualified - Filtered out (link swap, rejection, no pricing)</li>
                <li>pending - Not yet qualified</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}