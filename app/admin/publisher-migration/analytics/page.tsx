'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminHeader from '@/components/AdminHeader';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  Users,
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Target,
  RefreshCw
} from 'lucide-react';

interface MigrationAnalytics {
  shadowPublishers: number;
  activePublishers: number;
  invitationsSent: number;
  accountsClaimed: number;
  avgClaimDays: number;
  claimRatePercentage: number;
}

interface TimeSeriesData {
  date: string;
  publishers: number;
  invitations: number;
  claims: number;
  claimRate: number;
}

interface PublisherSegment {
  name: string;
  count: number;
  percentage: number;
  avgValue: number;
  color: string;
}

interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
  dropoff: number;
}

export default function PublisherMigrationAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<MigrationAnalytics>({
    shadowPublishers: 0,
    activePublishers: 0,
    invitationsSent: 0,
    accountsClaimed: 0,
    avgClaimDays: 0,
    claimRatePercentage: 0
  });

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [publisherSegments, setPublisherSegments] = useState<PublisherSegment[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load main analytics
      const analyticsResponse = await fetch('/api/admin/publisher-migration/analytics');
      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json();
        setAnalytics(data);
      }

      // Load time series data
      const timeSeriesResponse = await fetch('/api/admin/publisher-migration/analytics/time-series');
      if (timeSeriesResponse.ok) {
        const data = await timeSeriesResponse.json();
        setTimeSeriesData(data);
      }

      // Load publisher segments
      const segmentsResponse = await fetch('/api/admin/publisher-migration/analytics/segments');
      if (segmentsResponse.ok) {
        const data = await segmentsResponse.json();
        setPublisherSegments(data);
      }

      // Generate conversion funnel data
      generateConversionFunnel();

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateConversionFunnel = () => {
    const totalEligible = analytics.shadowPublishers + analytics.activePublishers;
    
    const funnel: ConversionFunnel[] = [
      {
        stage: 'Eligible Publishers',
        count: totalEligible,
        percentage: 100,
        dropoff: 0
      },
      {
        stage: 'Invitations Sent',
        count: analytics.invitationsSent,
        percentage: totalEligible > 0 ? (analytics.invitationsSent / totalEligible) * 100 : 0,
        dropoff: totalEligible - analytics.invitationsSent
      },
      {
        stage: 'Accounts Claimed',
        count: analytics.accountsClaimed,
        percentage: analytics.invitationsSent > 0 ? (analytics.accountsClaimed / analytics.invitationsSent) * 100 : 0,
        dropoff: analytics.invitationsSent - analytics.accountsClaimed
      },
      {
        stage: 'Active Publishers',
        count: analytics.activePublishers,
        percentage: analytics.accountsClaimed > 0 ? (analytics.activePublishers / analytics.accountsClaimed) * 100 : 0,
        dropoff: analytics.accountsClaimed - analytics.activePublishers
      }
    ];
    
    setConversionFunnel(funnel);
  };

  // Generate sample time series data (in production, this would come from API)
  const generateSampleTimeSeriesData = (): TimeSeriesData[] => {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        publishers: Math.floor(Math.random() * 10) + (i * 2),
        invitations: Math.floor(Math.random() * 8) + (i * 1.5),
        claims: Math.floor(Math.random() * 5) + (i * 0.8),
        claimRate: Math.min(((Math.random() * 30) + 40), 100)
      });
    }
    
    return data;
  };

  // Generate sample publisher segments
  const generateSampleSegments = (): PublisherSegment[] => [
    { name: 'High Value', count: 15, percentage: 25, avgValue: 2500, color: '#10b981' },
    { name: 'Medium Value', count: 30, percentage: 50, avgValue: 1200, color: '#3b82f6' },
    { name: 'New Publishers', count: 12, percentage: 20, avgValue: 600, color: '#f59e0b' },
    { name: 'Inactive', count: 3, percentage: 5, avgValue: 0, color: '#ef4444' }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="p-6">
        <AdminHeader />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <AdminHeader />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Migration Analytics</h1>
          <p className="text-gray-600 mt-1">
            Detailed metrics and insights for publisher migration
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={loadAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Publishers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.shadowPublishers + analytics.activePublishers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Invitations Sent</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.invitationsSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accounts Claimed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.accountsClaimed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Claim Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.claimRatePercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="funnel">Conversion</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Publisher Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Publisher Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of publisher account statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Shadow', value: analytics.shadowPublishers, fill: '#f59e0b' },
                        { name: 'Active', value: analytics.activePublishers, fill: '#10b981' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {[
                        { name: 'Shadow', value: analytics.shadowPublishers, fill: '#f59e0b' },
                        { name: 'Active', value: analytics.activePublishers, fill: '#10b981' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Indicators</CardTitle>
                <CardDescription>
                  Key metrics for migration success
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Claim Time</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="font-medium">{analytics.avgClaimDays} days</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Claim Rate</span>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="font-medium">{analytics.claimRatePercentage.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Invitations</span>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="font-medium">{analytics.invitationsSent}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Claims</span>
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="font-medium">
                      {analytics.invitationsSent - analytics.accountsClaimed}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Migration Progress Over Time</CardTitle>
              <CardDescription>
                Daily progress of publisher migration activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={generateSampleTimeSeriesData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="publishers" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="invitations" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="claims" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim Rate Trend</CardTitle>
              <CardDescription>
                How the claim rate has changed over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateSampleTimeSeriesData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="claimRate" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Publisher Segments</CardTitle>
                <CardDescription>
                  Publishers categorized by value and activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={generateSampleSegments()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                    >
                      {generateSampleSegments().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segment Details</CardTitle>
                <CardDescription>
                  Detailed breakdown by segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generateSampleSegments().map((segment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium">{segment.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{segment.count} publishers</div>
                        <div className="text-sm text-gray-500">${segment.avgValue} avg value</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Segment Performance</CardTitle>
              <CardDescription>
                Average value and count by segment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generateSampleSegments()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                Step-by-step conversion rates through the migration process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversionFunnel.map((stage, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{stage.count} publishers</span>
                        <Badge variant={stage.percentage > 50 ? 'success' : 'secondary'}>
                          {stage.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                    {index < conversionFunnel.length - 1 && stage.dropoff > 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        -{stage.dropoff} dropped off
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.claimRatePercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Conversion Rate</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.avgClaimDays}
                  </div>
                  <div className="text-sm text-gray-600">Days to Claim</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.invitationsSent - analytics.accountsClaimed}
                  </div>
                  <div className="text-sm text-gray-600">Pending Claims</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}