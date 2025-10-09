'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ToolboxHeader from '@/components/ToolboxHeader';
import {
  Users,
  DollarSign,
  Activity,
  Zap,
  TrendingUp,
  Coins,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardData {
  heroMetrics: {
    totalUsers: number;
    mrr: number;
    activeUsers: number;
    totalAIOperations: number;
    totalTokensUsed: number;
    arpu: number;
  };
  revenue: {
    totalRevenue: number;
    totalCoinsPurchased: number;
    totalCoinsSpent: number;
    profitMargin: string;
    topCustomers: Array<{
      email: string;
      name: string;
      coinsSpent: number;
      revenue: number;
    }>;
  };
  users: Array<{
    id: number;
    email: string;
    name: string;
    coinBalance: number;
    totalOperations: number;
    totalCoinsSpent: number;
    totalTokensUsed: number;
    createdAt: string;
    lastLogin: string | null;
  }>;
  toolUsage: Array<{
    name: string;
    count: number;
    tokens: number;
    revenue: number;
  }>;
  aiAnalytics: {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    successRate: number;
    totalTokensUsed: number;
    averageTokensPerOperation: number;
  };
  recentActivity: Array<{
    type: string;
    user: string;
    timestamp: string;
    details: string;
    amount?: number;
    tokens?: number;
  }>;
  coinEconomy: {
    totalCoinsInCirculation: number;
    totalCoinsPurchased: number;
    totalCoinsSpent: number;
    coinBurnRate: string;
    averageUserBalance: number;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      const user = session?.user as any;
      if (user?.role !== 'admin') {
        router.push('/');
        return;
      }

      fetchDashboardData();
    }
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <ToolboxHeader />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !dashboardData) {
    return (
      <>
        <ToolboxHeader />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error || 'Failed to load dashboard'}</p>
          </div>
        </div>
      </>
    );
  }

  const { heroMetrics, revenue, users, toolUsage, aiAnalytics, recentActivity, coinEconomy } = dashboardData;

  return (
    <>
      <ToolboxHeader />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Platform analytics and user management</p>
          </div>

          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              icon={<Users className="w-6 h-6 text-blue-600" />}
              label="Total Users"
              value={heroMetrics.totalUsers.toLocaleString()}
              subtitle={`${heroMetrics.activeUsers} active`}
              bgColor="bg-blue-50"
            />
            <MetricCard
              icon={<DollarSign className="w-6 h-6 text-green-600" />}
              label="MRR"
              value={`$${heroMetrics.mrr.toLocaleString()}`}
              subtitle={`$${heroMetrics.arpu.toFixed(2)} ARPU`}
              bgColor="bg-green-50"
            />
            <MetricCard
              icon={<Zap className="w-6 h-6 text-yellow-600" />}
              label="AI Operations"
              value={heroMetrics.totalAIOperations.toLocaleString()}
              subtitle={`${heroMetrics.totalTokensUsed.toLocaleString()} tokens`}
              bgColor="bg-yellow-50"
            />
          </div>

          {/* Revenue and Coin Economy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${revenue.totalRevenue.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Coins Purchased</span>
                  <span className="text-lg font-semibold">
                    {revenue.totalCoinsPurchased.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Coins Spent</span>
                  <span className="text-lg font-semibold">
                    {revenue.totalCoinsSpent.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-gray-600">Profit Margin</span>
                  <span className="text-lg font-semibold text-purple-600">
                    {revenue.profitMargin}%
                  </span>
                </div>
              </div>

              {revenue.topCustomers.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Top Customers</h3>
                  <div className="space-y-2">
                    {revenue.topCustomers.map((customer, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 truncate flex-1">
                          {customer.name || customer.email}
                        </span>
                        <span className="font-semibold text-green-600 ml-2">
                          ${customer.revenue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Coin Economy Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Coin Economy</h2>
                <Coins className="w-6 h-6 text-yellow-600" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">In Circulation</span>
                  <span className="text-2xl font-bold text-yellow-600">
                    {coinEconomy.totalCoinsInCirculation.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Purchased</span>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-semibold">
                      {coinEconomy.totalCoinsPurchased.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Spent</span>
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="text-lg font-semibold">
                      {coinEconomy.totalCoinsSpent.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-gray-600">Burn Rate</span>
                  <span className="text-lg font-semibold text-orange-600">
                    {coinEconomy.coinBurnRate}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg User Balance</span>
                  <span className="text-lg font-semibold">
                    {coinEconomy.averageUserBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analytics and Tool Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* AI Analytics */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">AI Operations</h2>
                <Activity className="w-6 h-6 text-purple-600" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Operations</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {aiAnalytics.totalOperations.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-600">Completed</div>
                      <div className="font-semibold">{aiAnalytics.completedOperations}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-sm text-gray-600">Failed</div>
                      <div className="font-semibold">{aiAnalytics.failedOperations}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="text-lg font-semibold text-green-600">
                    {aiAnalytics.successRate}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Tokens</span>
                  <span className="text-lg font-semibold">
                    {aiAnalytics.totalTokensUsed.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Tokens/Op</span>
                  <span className="text-lg font-semibold">
                    {aiAnalytics.averageTokensPerOperation.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tool Usage */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Tool Usage</h2>
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>

              {toolUsage.length > 0 ? (
                <div className="space-y-3">
                  {toolUsage
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((tool, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{tool.name}</div>
                          <div className="text-sm text-gray-500">
                            {tool.count} operations • {tool.tokens.toLocaleString()} tokens
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-green-600">
                            ${tool.revenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No tool usage data yet
                </div>
              )}
            </div>
          </div>

          {/* User Management Table */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              <Users className="w-6 h-6 text-blue-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Coins</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Operations</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Spent</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tokens</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {user.coinBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.totalOperations}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600">
                        {user.totalCoinsSpent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.totalTokensUsed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <Clock className="w-6 h-6 text-gray-600" />
            </div>

            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'signup' ? 'bg-blue-500' :
                    activity.type === 'purchase' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{activity.user}</div>
                    <div className="text-sm text-gray-600">{activity.details}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  bgColor
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
    </div>
  );
}
