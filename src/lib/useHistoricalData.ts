'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface HistoricalDataPoint {
  date: string;
  revenue: number;
  spend: number;
  roas: number;
  orders: number;
}

export interface WeeklyDataPoint {
  week: string;
  revenue: number;
  spend: number;
  roas: number;
  orders: number;
}

interface UseHistoricalDataResult {
  dailyData: HistoricalDataPoint[];
  weeklyData: WeeklyDataPoint[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface WeeklyReport {
  start_date: string;
  end_date: string;
  cyber_revenue: number | null;
  cyber_order_count: number | null;
  meta_spend: number | null;
  meta_roas: number | null;
}

/**
 * 使用 seeded random 確保同一日期產生一致的隨機數
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * 根據日期字串生成 seed
 */
function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 將週數據拆解為日數據，加入合理的每日變化
 * - 使用固定 seed 確保數據一致性
 * - 週末流量稍低（0.7-0.9 倍）
 * - 每日有 ±15% 的隨機波動
 */
function expandWeeklyToDaily(weeklyReports: WeeklyReport[]): HistoricalDataPoint[] {
  const dailyData: HistoricalDataPoint[] = [];

  // 按日期排序（升序）
  const sortedReports = [...weeklyReports].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  for (const report of sortedReports) {
    const startDate = new Date(report.start_date);
    const endDate = new Date(report.end_date);
    
    // 計算這週的天數
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 週總數據
    const weekRevenue = report.cyber_revenue || 0;
    const weekSpend = report.meta_spend || 0;
    const weekOrders = report.cyber_order_count || 0;

    // 生成每日權重（模擬真實流量分佈）
    const weights: number[] = [];
    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 6=Saturday
      
      // 週末權重稍低
      let baseWeight = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0;
      
      // 加入 ±15% 隨機波動（使用固定 seed）
      const dateStr = currentDate.toISOString().split('T')[0];
      const randomFactor = 0.85 + seededRandom(dateToSeed(dateStr)) * 0.3; // 0.85 ~ 1.15
      baseWeight *= randomFactor;
      
      weights.push(baseWeight);
    }

    // 計算權重總和並分配每日數據
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const ratio = weights[i] / totalWeight;
      const dayRevenue = Math.round(weekRevenue * ratio);
      const daySpend = Math.round(weekSpend * ratio * 100) / 100;
      const dayOrders = Math.max(0, Math.round(weekOrders * ratio));
      
      // MER = 營收 / 廣告花費（加入獨立的每日波動）
      // 基準 MER（週平均）
      const weekMer = weekSpend > 0 ? weekRevenue / weekSpend : 0;
      // 為 MER 添加獨立的 ±15% 隨機波動（使用不同的 seed）
      const merRandomFactor = 0.85 + seededRandom(dateToSeed(dateStr + '_mer')) * 0.3;
      const mer = weekMer * merRandomFactor;

      dailyData.push({
        date: dateStr,
        revenue: dayRevenue,
        spend: daySpend,
        roas: Math.round(mer * 100) / 100,
        orders: dayOrders,
      });
    }
  }

  return dailyData;
}

/**
 * 從 Supabase 讀取歷史報表數據
 * 使用 weekly 數據並拆解為每日數據顯示
 */
export function useHistoricalData(): UseHistoricalDataResult {
  const [dailyData, setDailyData] = useState<HistoricalDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      console.warn('Supabase not configured');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 取得最近 4 週的 weekly 報表
      const { data: reports, error: fetchError } = await supabase
        .from('reports')
        .select('start_date, end_date, cyber_revenue, meta_spend, meta_roas, cyber_order_count')
        .eq('mode', 'weekly')
        .order('start_date', { ascending: true })
        .limit(4);

      if (fetchError) {
        throw new Error(`Failed to fetch historical data: ${fetchError.message}`);
      }

      if (!reports || reports.length === 0) {
        throw new Error('No historical data found');
      }

      // 將週數據拆解為日數據
      const daily = expandWeeklyToDaily(reports as WeeklyReport[]);
      setDailyData(daily);

      // 直接使用週數據作為 weeklyData
      const weekly: WeeklyDataPoint[] = (reports as WeeklyReport[]).map((r, index) => {
        const revenue = r.cyber_revenue || 0;
        const spend = r.meta_spend || 0;
        const mer = spend > 0 ? revenue / spend : 0;
        return {
          week: `W${index + 1}`,
          revenue,
          spend,
          roas: Math.round(mer * 100) / 100,
          orders: r.cyber_order_count || 0,
        };
      });
      setWeeklyData(weekly);

      console.log(`✅ Loaded ${weekly.length} weeks → expanded to ${daily.length} days of historical data`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`⚠️ Historical data fetch failed: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    dailyData,
    weeklyData,
    isLoading,
    error,
    refresh: fetchData,
  };
}
