/**
 * Revenue Analytics
 * Track and analyze revenue metrics
 */

import { createClient } from '@/lib/supabase/server';

export interface RevenueMetric {
  period: string;
  totalRevenue: number;
  subscriptionRevenue: number;
  transactionRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  newSubscribers: number;
  churned: number;
  netSubscribers: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
}

export interface RevenueBySource {
  source: string;
  revenue: number;
  percentage: number;
  transactions: number;
}

export interface RevenueByPlan {
  plan: string;
  subscribers: number;
  revenue: number;
  percentage: number;
  churnRate: number;
}

export interface CustomerLifetimeValue {
  segment: string;
  averageLTV: number;
  averageLifespan: number; // in months
  customerCount: number;
}

export interface RevenueGrowth {
  period: string;
  revenue: number;
  growth: number; // percentage
  growthType: 'positive' | 'negative' | 'neutral';
}

export interface RevenueOverview {
  current: RevenueMetric;
  previous: RevenueMetric;
  bySource: RevenueBySource[];
  byPlan: RevenueByPlan[];
  growth: RevenueGrowth[];
  ltv: CustomerLifetimeValue[];
}

/**
 * Get revenue metrics for a period
 */
export async function getRevenueMetrics(startDate: Date, endDate: Date): Promise<RevenueMetric> {
  const supabase = await createClient();

  // In a real implementation, these would be actual database queries
  // This is a placeholder that returns mock data structure

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .or(`created_at.gte.${startDate.toISOString()},cancelled_at.gte.${startDate.toISOString()}`);

  // Calculate metrics
  const transactionList = transactions || [];
  const subscriptionList = subscriptions || [];

  const subscriptionRevenue = subscriptionList
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const transactionRevenue = transactionList.reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalRevenue = subscriptionRevenue + transactionRevenue;
  const transactionCount = transactionList.length;
  const averageTransactionValue = transactionCount > 0 ? transactionRevenue / transactionCount : 0;

  const newSubscribers = subscriptionList.filter(
    (s) => new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate
  ).length;

  const churned = subscriptionList.filter(
    (s) =>
      s.cancelled_at && new Date(s.cancelled_at) >= startDate && new Date(s.cancelled_at) <= endDate
  ).length;

  const activeSubscriptions = subscriptionList.filter((s) => s.status === 'active');
  const mrr = activeSubscriptions.reduce((sum, s) => {
    const monthlyAmount = s.interval === 'year' ? (s.amount || 0) / 12 : s.amount || 0;
    return sum + monthlyAmount;
  }, 0);

  return {
    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    totalRevenue,
    subscriptionRevenue,
    transactionRevenue,
    transactionCount,
    averageTransactionValue,
    newSubscribers,
    churned,
    netSubscribers: newSubscribers - churned,
    mrr,
    arr: mrr * 12,
  };
}

/**
 * Get revenue breakdown by source
 */
export async function getRevenueBySource(
  startDate: Date,
  endDate: Date
): Promise<RevenueBySource[]> {
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('source, amount')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (!transactions || transactions.length === 0) {
    return [];
  }

  const bySource = transactions.reduce(
    (acc, t) => {
      const source = t.source || 'unknown';
      if (!acc[source]) {
        acc[source] = { revenue: 0, transactions: 0 };
      }
      acc[source].revenue += t.amount || 0;
      acc[source].transactions += 1;
      return acc;
    },
    {} as Record<string, { revenue: number; transactions: number }>
  );

  const totalRevenue = Object.values(bySource).reduce((sum, s) => sum + s.revenue, 0);

  return Object.entries(bySource).map(([source, data]) => ({
    source,
    revenue: data.revenue,
    percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    transactions: data.transactions,
  }));
}

/**
 * Get revenue breakdown by subscription plan
 */
export async function getRevenueByPlan(startDate: Date, endDate: Date): Promise<RevenueByPlan[]> {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('plan, amount, status, cancelled_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  const byPlan = subscriptions.reduce(
    (acc, s) => {
      const plan = s.plan || 'unknown';
      if (!acc[plan]) {
        acc[plan] = { subscribers: 0, revenue: 0, churned: 0, total: 0 };
      }
      acc[plan].total += 1;
      if (s.status === 'active') {
        acc[plan].subscribers += 1;
        acc[plan].revenue += s.amount || 0;
      }
      if (s.cancelled_at) {
        acc[plan].churned += 1;
      }
      return acc;
    },
    {} as Record<string, { subscribers: number; revenue: number; churned: number; total: number }>
  );

  const totalRevenue = Object.values(byPlan).reduce((sum, p) => sum + p.revenue, 0);

  return Object.entries(byPlan).map(([plan, data]) => ({
    plan,
    subscribers: data.subscribers,
    revenue: data.revenue,
    percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    churnRate: data.total > 0 ? (data.churned / data.total) * 100 : 0,
  }));
}

/**
 * Calculate customer lifetime value
 */
export async function calculateLTV(): Promise<CustomerLifetimeValue[]> {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('subscriptions')
    .select('user_id, plan, amount, created_at, cancelled_at');

  if (!customers || customers.length === 0) {
    return [];
  }

  const bySegment = customers.reduce(
    (acc, c) => {
      const segment = c.plan || 'free';
      if (!acc[segment]) {
        acc[segment] = { totalRevenue: 0, totalMonths: 0, count: 0 };
      }

      const startDate = new Date(c.created_at);
      const endDate = c.cancelled_at ? new Date(c.cancelled_at) : new Date();
      const months = Math.max(
        1,
        Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
      );

      acc[segment].totalRevenue += (c.amount || 0) * months;
      acc[segment].totalMonths += months;
      acc[segment].count += 1;

      return acc;
    },
    {} as Record<string, { totalRevenue: number; totalMonths: number; count: number }>
  );

  return Object.entries(bySegment).map(([segment, data]) => ({
    segment,
    averageLTV: data.count > 0 ? data.totalRevenue / data.count : 0,
    averageLifespan: data.count > 0 ? data.totalMonths / data.count : 0,
    customerCount: data.count,
  }));
}

/**
 * Get revenue growth over time
 */
export async function getRevenueGrowth(
  periods: number = 12,
  periodType: 'month' | 'week' | 'day' = 'month'
): Promise<RevenueGrowth[]> {
  const results: RevenueGrowth[] = [];
  const now = new Date();

  for (let i = periods - 1; i >= 0; i--) {
    const periodStart = new Date(now);
    const periodEnd = new Date(now);

    switch (periodType) {
      case 'month':
        periodStart.setMonth(now.getMonth() - i - 1);
        periodEnd.setMonth(now.getMonth() - i);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - (i + 1) * 7);
        periodEnd.setDate(now.getDate() - i * 7);
        break;
      case 'day':
        periodStart.setDate(now.getDate() - i - 1);
        periodEnd.setDate(now.getDate() - i);
        break;
    }

    const metrics = await getRevenueMetrics(periodStart, periodEnd);
    const previousRevenue = results.length > 0 ? results[results.length - 1].revenue : 0;
    const growth =
      previousRevenue > 0 ? ((metrics.totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    results.push({
      period: periodEnd.toISOString().split('T')[0],
      revenue: metrics.totalRevenue,
      growth,
      growthType: growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral',
    });
  }

  return results;
}

/**
 * Get comprehensive revenue overview
 */
export async function getRevenueOverview(): Promise<RevenueOverview> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [current, previous, bySource, byPlan, growth, ltv] = await Promise.all([
    getRevenueMetrics(startOfMonth, now),
    getRevenueMetrics(startOfPreviousMonth, endOfPreviousMonth),
    getRevenueBySource(startOfMonth, now),
    getRevenueByPlan(startOfMonth, now),
    getRevenueGrowth(12, 'month'),
    calculateLTV(),
  ]);

  return {
    current,
    previous,
    bySource,
    byPlan,
    growth,
    ltv,
  };
}

/**
 * Calculate key revenue KPIs
 */
export function calculateRevenueKPIs(
  current: RevenueMetric,
  previous: RevenueMetric
): Record<string, { value: number; change: number; trend: 'up' | 'down' | 'stable' }> {
  const calculateChange = (
    curr: number,
    prev: number
  ): { change: number; trend: 'up' | 'down' | 'stable' } => {
    if (prev === 0) return { change: 0, trend: 'stable' };
    const change = ((curr - prev) / prev) * 100;
    return {
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  };

  return {
    totalRevenue: {
      value: current.totalRevenue,
      ...calculateChange(current.totalRevenue, previous.totalRevenue),
    },
    mrr: {
      value: current.mrr,
      ...calculateChange(current.mrr, previous.mrr),
    },
    averageOrderValue: {
      value: current.averageTransactionValue,
      ...calculateChange(current.averageTransactionValue, previous.averageTransactionValue),
    },
    newSubscribers: {
      value: current.newSubscribers,
      ...calculateChange(current.newSubscribers, previous.newSubscribers),
    },
    churnRate: {
      value: current.churned,
      ...calculateChange(current.churned, previous.churned),
    },
    netGrowth: {
      value: current.netSubscribers,
      ...calculateChange(current.netSubscribers, previous.netSubscribers),
    },
  };
}

/**
 * Forecast revenue based on historical data
 */
export async function forecastRevenue(
  months: number = 3
): Promise<Array<{ month: string; forecast: number; confidence: number }>> {
  const historicalGrowth = await getRevenueGrowth(6, 'month');

  if (historicalGrowth.length === 0) {
    return [];
  }

  // Calculate average growth rate
  const growthRates = historicalGrowth.filter((g) => g.growth !== 0).map((g) => g.growth);

  const avgGrowthRate =
    growthRates.length > 0 ? growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length : 0;

  const lastRevenue = historicalGrowth[historicalGrowth.length - 1].revenue;
  const forecasts: Array<{ month: string; forecast: number; confidence: number }> = [];

  for (let i = 1; i <= months; i++) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i);

    // Simple linear forecast with decreasing confidence
    const forecast = lastRevenue * Math.pow(1 + avgGrowthRate / 100, i);
    const confidence = Math.max(50, 90 - i * 10); // Confidence decreases over time

    forecasts.push({
      month: futureDate.toISOString().split('T')[0].substring(0, 7),
      forecast: Math.round(forecast * 100) / 100,
      confidence,
    });
  }

  return forecasts;
}
