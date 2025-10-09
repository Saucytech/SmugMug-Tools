import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Check admin role
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all platform statistics
    const platformStats = await db.getPlatformStats();
    const usersWithStats = await db.getUsersWithStats(100); // Get top 100 users
    const recentOperations = await db.getAllAIOperations(50); // Last 50 operations
    const recentTransactions = await db.getAllUserTransactions(50); // Last 50 transactions

    // Calculate derived metrics
    const totalUsers = Number(platformStats.total_users) || 0;
    const totalCoinsInPlatform = Number(platformStats.total_coins_in_platform) || 0;
    const totalCoinsPurchased = Math.abs(Number(platformStats.total_coins_purchased) || 0);
    const totalCoinsSpent = Math.abs(Number(platformStats.total_coins_spent) || 0);
    const totalAIOperations = Number(platformStats.total_ai_operations) || 0;
    const completedOperations = Number(platformStats.completed_operations) || 0;
    const failedOperations = Number(platformStats.failed_operations) || 0;
    const totalTokensUsed = Number(platformStats.total_tokens_used) || 0;

    // Calculate MRR (Monthly Recurring Revenue) - assuming 1000 coins = $10
    const coinsToUSD = (coins: number) => (coins / 1000) * 10;
    const totalRevenue = coinsToUSD(totalCoinsPurchased);
    const mrr = totalRevenue; // For now, treat all purchases as monthly

    // Calculate ARPU (Average Revenue Per User)
    const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    // Count active users (users who have performed operations)
    const activeUsers = usersWithStats.filter((u: any) => Number(u.total_operations) > 0).length;

    // Calculate success rate
    const successRate = totalAIOperations > 0
      ? ((completedOperations / totalAIOperations) * 100).toFixed(1)
      : '0';

    // Tool usage breakdown
    const toolUsageMap: Record<string, { count: number; tokens: number; revenue: number }> = {};
    recentOperations.forEach((op: any) => {
      const tool = op.tool_name || 'Unknown';
      if (!toolUsageMap[tool]) {
        toolUsageMap[tool] = { count: 0, tokens: 0, revenue: 0 };
      }
      toolUsageMap[tool].count++;
      toolUsageMap[tool].tokens += Number(op.total_tokens) || 0;
      toolUsageMap[tool].revenue += coinsToUSD(Number(op.coins_spent) || 0);
    });

    const toolUsage = Object.entries(toolUsageMap).map(([name, stats]) => ({
      name,
      ...stats
    }));

    // Recent activity feed (combine signups, purchases, operations)
    const recentActivity: any[] = [];

    // Add recent signups
    usersWithStats.slice(0, 10).forEach((user: any) => {
      recentActivity.push({
        type: 'signup',
        user: user.email,
        timestamp: user.created_at,
        details: `${user.name || 'New user'} joined the platform`
      });
    });

    // Add recent purchases
    recentTransactions
      .filter((t: any) => t.type === 'purchase')
      .slice(0, 10)
      .forEach((tx: any) => {
        recentActivity.push({
          type: 'purchase',
          user: tx.email,
          timestamp: tx.created_at,
          details: `Purchased ${Math.abs(tx.amount).toLocaleString()} coins`,
          amount: coinsToUSD(Math.abs(tx.amount))
        });
      });

    // Add recent AI operations
    recentOperations.slice(0, 10).forEach((op: any) => {
      recentActivity.push({
        type: 'operation',
        user: op.email,
        timestamp: op.started_at,
        details: `Used ${op.tool_name} - ${op.status}`,
        tokens: op.total_tokens
      });
    });

    // Sort activity by timestamp (most recent first)
    recentActivity.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Prepare response data
    const dashboardData = {
      // Hero Metrics
      heroMetrics: {
        totalUsers,
        mrr: Math.round(mrr),
        activeUsers,
        totalAIOperations,
        totalTokensUsed,
        arpu: Math.round(arpu * 100) / 100
      },

      // Revenue Analytics
      revenue: {
        totalRevenue: Math.round(totalRevenue),
        totalCoinsPurchased,
        totalCoinsSpent,
        profitMargin: totalCoinsPurchased > 0
          ? ((totalCoinsSpent / totalCoinsPurchased) * 100).toFixed(1)
          : '0',
        topCustomers: usersWithStats
          .filter((u: any) => Number(u.total_coins_spent) > 0)
          .sort((a: any, b: any) => Number(b.total_coins_spent) - Number(a.total_coins_spent))
          .slice(0, 5)
          .map((u: any) => ({
            email: u.email,
            name: u.name,
            coinsSpent: Number(u.total_coins_spent) || 0,
            revenue: Math.round(coinsToUSD(Number(u.total_coins_spent) || 0) * 100) / 100
          }))
      },

      // User Management
      users: usersWithStats.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        coinBalance: Number(u.coin_balance) || 0,
        totalOperations: Number(u.total_operations) || 0,
        totalCoinsSpent: Number(u.total_coins_spent) || 0,
        totalTokensUsed: Number(u.total_tokens_used) || 0,
        createdAt: u.created_at,
        lastLogin: u.last_login
      })),

      // Tool Usage
      toolUsage,

      // AI Operations Analytics
      aiAnalytics: {
        totalOperations: totalAIOperations,
        completedOperations,
        failedOperations,
        successRate: Number(successRate),
        totalTokensUsed,
        averageTokensPerOperation: totalAIOperations > 0
          ? Math.round(totalTokensUsed / totalAIOperations)
          : 0
      },

      // Recent Activity
      recentActivity: recentActivity.slice(0, 20),

      // Coin Economy Health
      coinEconomy: {
        totalCoinsInCirculation: totalCoinsInPlatform,
        totalCoinsPurchased,
        totalCoinsSpent,
        coinBurnRate: totalCoinsInPlatform > 0
          ? ((totalCoinsSpent / totalCoinsInPlatform) * 100).toFixed(1)
          : '0',
        averageUserBalance: totalUsers > 0
          ? Math.round(totalCoinsInPlatform / totalUsers)
          : 0
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
