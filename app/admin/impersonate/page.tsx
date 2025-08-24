import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getSessionPool } from '@/lib/db/sessionPool';
import { ImpersonationService } from '@/lib/services/impersonationService';
import ImpersonationUI from '@/components/impersonation/ImpersonationUI';

const pool = getSessionPool();

interface SearchParams {
  search?: string;
  type?: string;
  page?: string;
}

export default async function ImpersonatePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Await searchParams in Next.js 15
  const params = await searchParams;
  // Get session state (not just AuthSession)
  const sessionState = await AuthServiceServer.getSessionState();
  
  if (!sessionState) {
    redirect('/login');
  }
  
  // Only admins can access this page
  if (sessionState.currentUser.userType !== 'internal' || 
      sessionState.currentUser.role !== 'admin') {
    redirect('/');
  }

  // If already impersonating, show message
  if (sessionState.impersonation?.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Already Impersonating</h2>
          <p className="text-gray-600 mb-4">
            You are currently impersonating <strong>{sessionState.impersonation.targetUser.name}</strong>.
            Please end the current session before starting a new one.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const search = params.search || '';
  const userType = params.type || 'account';
  const page = parseInt(params.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  let users: any[] = [];
  let totalCount = 0;

  if (userType === 'account') {
    // Search account users
    const searchCondition = search
      ? `AND (
          LOWER(email) LIKE LOWER('%${search.replace(/'/g, "''")}%') OR 
          LOWER(contact_name) LIKE LOWER('%${search.replace(/'/g, "''")}%') OR 
          LOWER(company_name) LIKE LOWER('%${search.replace(/'/g, "''")}%')
        )`
      : '';

    const [usersResult, countResult] = await Promise.all([
      pool.query(`
        SELECT 
          id, email, contact_name as name, company_name, 
          status, last_login_at as last_login, created_at
        FROM accounts
        WHERE status = 'active' ${searchCondition}
        ORDER BY last_login_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `),
      
      pool.query(`
        SELECT COUNT(*) as count
        FROM accounts
        WHERE status = 'active' ${searchCondition}
      `)
    ]);

    users = usersResult.rows.map(u => ({
      ...u,
      userType: 'account' as const
    }));
    totalCount = parseInt((countResult.rows[0] as any).count);

  } else if (userType === 'publisher') {
    // Search publisher users
    const searchCondition = search
      ? `AND (
          LOWER(email) LIKE LOWER('%${search.replace(/'/g, "''")}%') OR 
          LOWER(first_name) LIKE LOWER('%${search.replace(/'/g, "''")}%') OR 
          LOWER(last_name) LIKE LOWER('%${search.replace(/'/g, "''")}%') OR 
          LOWER(company_name) LIKE LOWER('%${search.replace(/'/g, "''")}%')
        )`
      : '';

    const [usersResult, countResult] = await Promise.all([
      pool.query(`
        SELECT 
          id, email, 
          COALESCE(first_name || ' ' || last_name, company_name) as name,
          company_name, status, last_login_at as last_login, created_at
        FROM publishers
        WHERE status = 'active' ${searchCondition}
        ORDER BY last_login_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `),
      
      pool.query(`
        SELECT COUNT(*) as count
        FROM publishers
        WHERE status = 'active' ${searchCondition}
      `)
    ]);

    users = usersResult.rows.map(u => ({
      ...u,
      userType: 'publisher' as const
    }));
    totalCount = parseInt((countResult.rows[0] as any).count);
  }

  // Get recent impersonation logs for this admin
  const recentLogs = await ImpersonationService.getRecentLogs(
    sessionState.currentUser.userId,
    10
  );

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <ImpersonationUI
      users={users}
      recentLogs={recentLogs}
      currentPage={page}
      totalPages={totalPages}
      searchQuery={search}
      userType={userType}
      adminSession={sessionState}
    />
  );
}