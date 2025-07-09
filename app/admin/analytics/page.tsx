'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Calendar, Clock, Target, Award, Activity, Users, FileText, CheckCircle } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { User as UserType } from '@/types/user';
import { type AuthSession } from '@/lib/auth';
import { userStorage, sessionStorage } from '@/lib/userStorage';
import { storage } from '@/lib/storage';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

interface UserAnalytics {
  userId: string;
  user: UserType;
  totalWorkflows: number;
  completedWorkflows: number;
  activeWorkflows: number;
  weeklyWorkflows: number;
  monthlyWorkflows: number;
  avgCompletionTime: number; // days
  lastActivity: Date | null;
  completionRate: number; // percentage
  productivityScore: number; // calculated score
  streakDays: number;
  workflowsPerWeek: { week: string; count: number; completed: number }[];
  workflowsPerMonth: { month: string; count: number; completed: number }[];
}

export default function Analytics() {
  const router = useRouter();
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('me'); // 'me', 'all', or specific userId

  useEffect(() => {
    const session = sessionStorage.getSession();
    setCurrentSession(session);
    
    if (!session || session.role !== 'admin') {
      router.push('/');
      return;
    }
    
    calculateAnalytics();
  }, [router, timeRange, selectedUser]);

  const calculateAnalytics = async () => {
    try {
      const users = await userStorage.getAllUsers();
      const workflows = await storage.getAllWorkflows();
      
      // Store all users for the filter dropdown
      setAllUsers(users);
      
      // Filter users based on selection
      const filteredUsers = selectedUser === 'all' 
        ? users 
        : selectedUser === 'me' 
          ? users.filter(u => u.email === currentSession?.email)
          : users.filter(u => u.id === selectedUser);
      
      const analytics: UserAnalytics[] = filteredUsers.map(user => {
      const userWorkflows = workflows.filter(w => w.createdByEmail === user.email);
      
      // Time range calculations
      const now = new Date();
      const rangeStart = timeRange === '7d' ? subDays(now, 7) :
                        timeRange === '30d' ? subDays(now, 30) :
                        subDays(now, 90);
      
      const recentWorkflows = userWorkflows.filter(w => new Date(w.createdAt) >= rangeStart);
      const weeklyWorkflows = userWorkflows.filter(w => new Date(w.createdAt) >= subWeeks(now, 1));
      const monthlyWorkflows = userWorkflows.filter(w => new Date(w.createdAt) >= subMonths(now, 1));
      
      // Completion metrics
      const completedWorkflows = userWorkflows.filter(w => {
        const completedSteps = w.steps.filter(s => s.status === 'completed').length;
        return completedSteps === w.steps.length;
      });
      
      const activeWorkflows = userWorkflows.filter(w => {
        const completedSteps = w.steps.filter(s => s.status === 'completed').length;
        return completedSteps > 0 && completedSteps < w.steps.length;
      });
      
      // Average completion time
      const avgCompletionTime = completedWorkflows.length > 0 
        ? completedWorkflows.reduce((sum, w) => {
            const created = new Date(w.createdAt);
            const updated = new Date(w.updatedAt);
            return sum + (updated.getTime() - created.getTime());
          }, 0) / (completedWorkflows.length * 24 * 60 * 60 * 1000) // Convert to days
        : 0;
      
      // Last activity
      const lastActivity = userWorkflows.length > 0 
        ? new Date(Math.max(...userWorkflows.map(w => new Date(w.updatedAt).getTime())))
        : null;
      
      // Completion rate
      const completionRate = userWorkflows.length > 0 
        ? (completedWorkflows.length / userWorkflows.length) * 100 
        : 0;
      
      // Streak calculation (consecutive days with activity)
      const streakDays = calculateStreak(userWorkflows);
      
      // Productivity score (0-100)
      const productivityScore = calculateProductivityScore({
        totalWorkflows: userWorkflows.length,
        completionRate,
        avgCompletionTime,
        recentActivity: lastActivity ? (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000) : 999,
        streakDays
      });
      
      // Weekly breakdown
      const workflowsPerWeek = getWeeklyBreakdown(userWorkflows, 8);
      
      // Monthly breakdown
      const workflowsPerMonth = getMonthlyBreakdown(userWorkflows, 6);
      
      return {
        userId: user.id,
        user,
        totalWorkflows: userWorkflows.length,
        completedWorkflows: completedWorkflows.length,
        activeWorkflows: activeWorkflows.length,
        weeklyWorkflows: weeklyWorkflows.length,
        monthlyWorkflows: monthlyWorkflows.length,
        avgCompletionTime,
        lastActivity,
        completionRate,
        productivityScore,
        streakDays,
        workflowsPerWeek,
        workflowsPerMonth
      };
    });
    
      setUserAnalytics(analytics.sort((a, b) => b.productivityScore - a.productivityScore));
    } catch (error) {
      console.error('Error calculating analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (workflows: any[]) => {
    if (workflows.length === 0) return 0;
    
    const now = new Date();
    const workflowDates = workflows
      .map(w => format(new Date(w.updatedAt), 'yyyy-MM-dd'))
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort()
      .reverse();
    
    let streak = 0;
    let currentDate = format(now, 'yyyy-MM-dd');
    
    for (const date of workflowDates) {
      if (date === currentDate || date === format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd')) {
        streak++;
        currentDate = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd');
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateProductivityScore = (metrics: {
    totalWorkflows: number;
    completionRate: number;
    avgCompletionTime: number;
    recentActivity: number;
    streakDays: number;
  }) => {
    let score = 0;
    
    // Volume score (0-25)
    score += Math.min(metrics.totalWorkflows * 2, 25);
    
    // Completion rate score (0-30)
    score += (metrics.completionRate / 100) * 30;
    
    // Speed score (0-20) - lower completion time is better
    if (metrics.avgCompletionTime > 0) {
      score += Math.max(20 - metrics.avgCompletionTime, 0);
    }
    
    // Recency score (0-15) - recent activity is better
    if (metrics.recentActivity <= 1) score += 15;
    else if (metrics.recentActivity <= 7) score += 10;
    else if (metrics.recentActivity <= 30) score += 5;
    
    // Consistency score (0-10)
    score += Math.min(metrics.streakDays, 10);
    
    return Math.round(Math.min(score, 100));
  };

  const getWeeklyBreakdown = (workflows: any[], weeksBack: number) => {
    const now = new Date();
    const weeks = [];
    
    for (let i = 0; i < weeksBack; i++) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = endOfWeek(subWeeks(now, i));
      
      const weekWorkflows = workflows.filter(w => {
        const created = new Date(w.createdAt);
        return created >= weekStart && created <= weekEnd;
      });
      
      const completed = weekWorkflows.filter(w => {
        const completedSteps = w.steps.filter((s: any) => s.status === 'completed').length;
        return completedSteps === w.steps.length;
      });
      
      weeks.unshift({
        week: format(weekStart, 'MMM d'),
        count: weekWorkflows.length,
        completed: completed.length
      });
    }
    
    return weeks;
  };

  const getMonthlyBreakdown = (workflows: any[], monthsBack: number) => {
    const now = new Date();
    const months = [];
    
    for (let i = 0; i < monthsBack; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthWorkflows = workflows.filter(w => {
        const created = new Date(w.createdAt);
        return created >= monthStart && created <= monthEnd;
      });
      
      const completed = monthWorkflows.filter(w => {
        const completedSteps = w.steps.filter((s: any) => s.status === 'completed').length;
        return completedSteps === w.steps.length;
      });
      
      months.unshift({
        month: format(monthStart, 'MMM yyyy'),
        count: monthWorkflows.length,
        completed: completed.length
      });
    }
    
    return months;
  };

  const getProductivityBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 60) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 40) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const getActivityStatus = (lastActivity: Date | null) => {
    if (!lastActivity) return { label: 'No Activity', color: 'bg-gray-100 text-gray-800' };
    
    const daysSince = (new Date().getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);
    
    if (daysSince <= 1) return { label: 'Active Today', color: 'bg-green-100 text-green-800' };
    if (daysSince <= 7) return { label: 'Active This Week', color: 'bg-blue-100 text-blue-800' };
    if (daysSince <= 30) return { label: 'Active This Month', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Inactive', color: 'bg-red-100 text-red-800' };
  };

  if (!currentSession || currentSession.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading analytics...</div>;
  }

  // Overall stats
  const totalWorkflows = userAnalytics.reduce((sum, u) => sum + u.totalWorkflows, 0);
  const totalCompleted = userAnalytics.reduce((sum, u) => sum + u.completedWorkflows, 0);
  const totalActive = userAnalytics.reduce((sum, u) => sum + u.activeWorkflows, 0);
  const avgProductivity = userAnalytics.length > 0 
    ? userAnalytics.reduce((sum, u) => sum + u.productivityScore, 0) / userAnalytics.length 
    : 0;

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/users"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Users
              </Link>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="me">My Workflows</option>
                  <option value="all">All Users</option>
                  <optgroup label="Specific Users">
                    {allUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Time Range:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  <TrendingUp className="w-8 h-8 mr-3" />
                  User Analytics
                </h1>
                <p className="text-blue-100">Team productivity and efficiency insights</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{Math.round(avgProductivity)}</div>
                <div className="text-blue-100">Avg Productivity Score</div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalWorkflows}</div>
                  <div className="text-gray-600 text-sm">Total Workflows</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
                  <div className="text-gray-600 text-sm">Completed</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                  <Activity className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalActive}</div>
                  <div className="text-gray-600 text-sm">In Progress</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {totalWorkflows > 0 ? Math.round((totalCompleted / totalWorkflows) * 100) : 0}%
                  </div>
                  <div className="text-gray-600 text-sm">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* User Analytics Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">User Performance Dashboard</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productivity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflows</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Streak</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userAnalytics.map((analytics) => {
                    const productivityBadge = getProductivityBadge(analytics.productivityScore);
                    const activityStatus = getActivityStatus(analytics.lastActivity);
                    
                    return (
                      <tr key={analytics.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{analytics.user.name}</div>
                              <div className="text-sm text-gray-500">{analytics.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-lg font-bold text-gray-900 mr-2">{analytics.productivityScore}</div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${productivityBadge.color}`}>
                              {productivityBadge.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>Total: {analytics.totalWorkflows}</div>
                            <div className="text-gray-500">
                              Week: {analytics.weeklyWorkflows} | Month: {analytics.monthlyWorkflows}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>{analytics.completedWorkflows} completed</div>
                            <div className="text-gray-500">{Math.round(analytics.completionRate)}% rate</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {analytics.avgCompletionTime > 0 
                              ? `${Math.round(analytics.avgCompletionTime)} days avg`
                              : 'No data'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activityStatus.color}`}>
                            {activityStatus.label}
                          </span>
                          {analytics.lastActivity && (
                            <div className="text-xs text-gray-500 mt-1">
                              {format(analytics.lastActivity, 'MMM d, h:mm a')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Award className="w-4 h-4 text-yellow-500 mr-1" />
                            <span className="text-sm font-medium text-gray-900">{analytics.streakDays}</span>
                            <span className="text-xs text-gray-500 ml-1">days</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual User Trends - Show top 3 performers */}
          {userAnalytics.slice(0, 3).map((analytics) => (
            <div key={analytics.userId} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {analytics.user.name} - Detailed Analytics
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Trend */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Activity (Last 8 weeks)</h4>
                  <div className="space-y-2">
                    {analytics.workflowsPerWeek.map((week, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{week.week}</span>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{week.count} created</div>
                          <div className="text-sm text-green-600">{week.completed} completed</div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${Math.min((week.count / 5) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Monthly Trend */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Activity (Last 6 months)</h4>
                  <div className="space-y-2">
                    {analytics.workflowsPerMonth.map((month, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{month.month}</span>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{month.count} created</div>
                          <div className="text-sm text-green-600">{month.completed} completed</div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${Math.min((month.count / 20) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AuthWrapper>
  );
}