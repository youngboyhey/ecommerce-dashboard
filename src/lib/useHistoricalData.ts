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

/**
 * 從 Supabase 讀取歷史報表數據（最近 28 天）
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

      // 取得最近 28 天的 daily 報表
      const { data: reports, error: fetchError } = await supabase
        .from('reports')
        .select('start_date, cyber_revenue, meta_spend, meta_roas, cyber_order_count')
        .eq('mode', 'daily')
        .order('start_date', { ascending: true })
        .limit(28);

      if (fetchError) {
        throw new Error(`Failed to fetch historical data: ${fetchError.message}`);
      }

      if (!reports || reports.length === 0) {
        throw new Error('No historical data found');
      }

      // 轉換為前端格式，ROAS 改用 MER (實際營收/廣告花費)
      const daily: HistoricalDataPoint[] = reports.map(r => {
        const revenue = r.cyber_revenue || 0;
        const spend = r.meta_spend || 0;
        const mer = spend > 0 ? revenue / spend : 0;
        return {
          date: r.start_date,
          revenue,
          spend,
          roas: mer,  // 實際上是 MER
          orders: r.cyber_order_count || 0,
        };
      });

      setDailyData(daily);

      // 計算週匯總
      const weeks = aggregateToWeekly(daily);
      setWeeklyData(weeks);

      console.log(`✅ Loaded ${daily.length} days of historical data`);

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

/**
 * 將日數據匯總為週數據
 */
function aggregateToWeekly(dailyData: HistoricalDataPoint[]): WeeklyDataPoint[] {
  if (dailyData.length === 0) return [];

  const weeks: WeeklyDataPoint[] = [];
  let weekNum = 1;

  for (let i = 0; i < dailyData.length; i += 7) {
    const weekDays = dailyData.slice(i, Math.min(i + 7, dailyData.length));
    
    const totalRevenue = weekDays.reduce((sum, d) => sum + d.revenue, 0);
    const totalSpend = weekDays.reduce((sum, d) => sum + d.spend, 0);
    const totalOrders = weekDays.reduce((sum, d) => sum + d.orders, 0);
    
    weeks.push({
      week: `W${weekNum}`,
      revenue: totalRevenue,
      spend: totalSpend,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      orders: totalOrders,
    });

    weekNum++;
  }

  return weeks;
}
