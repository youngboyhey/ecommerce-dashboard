'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';

export interface WeekOption {
  label: string;
  startDate: string;
  endDate: string;
}

export interface WeeklySummary {
  revenue: number;
  orders: number;
  adSpend: number;
  mer: number;
  roas: number;
  newMembers: number;
  aov: number;
  sessions: number;
  conversion: number;
}

export interface WeeklyComparisonData {
  current: WeeklySummary;
  previous: WeeklySummary | null;
  changes: {
    revenue: number | null;
    orders: number | null;
    adSpend: number | null;
    mer: number | null;
    roas: number | null;
    newMembers: number | null;
    aov: number | null;
    sessions: number | null;
    conversion: number | null;
  };
}

interface DailyReport {
  start_date: string;
  cyber_revenue: number;
  cyber_order_count: number;
  cyber_aov: number;
  cyber_new_members: number;
  meta_spend: number;
  meta_roas: number;
  ga4_sessions: number;
  ga4_overall_conversion: number;
}

interface UseWeeklyDataResult {
  weekOptions: WeekOption[];
  selectedWeek: WeekOption | null;
  setSelectedWeek: (week: WeekOption) => void;
  comparisonData: WeeklyComparisonData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 從 daily 數據計算週報彙總，支持週報切換和 WoW 比較
 */
export function useWeeklyData(): UseWeeklyDataResult {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 獲取所有 daily 數據
  const fetchData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('start_date, cyber_revenue, cyber_order_count, cyber_aov, cyber_new_members, meta_spend, meta_roas, ga4_sessions, ga4_overall_conversion')
        .eq('mode', 'daily')
        .order('start_date', { ascending: false })
        .limit(35); // 5 週數據

      if (fetchError) throw new Error(fetchError.message);
      setDailyReports((data || []) as DailyReport[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 計算週選項（最近 4 週）
  const weekOptions = useMemo(() => {
    if (dailyReports.length === 0) return [];

    const options: WeekOption[] = [];
    const sortedDates = [...dailyReports].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    // 找到最新日期，然後往回推算週
    const latestDate = new Date(sortedDates[0]?.start_date);
    
    for (let i = 0; i < 4; i++) {
      const endDate = new Date(latestDate);
      endDate.setDate(endDate.getDate() - (i * 7));
      
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      options.push({
        label: `${startStr.slice(5)} ~ ${endStr.slice(5)}`,
        startDate: startStr,
        endDate: endStr,
      });
    }

    return options;
  }, [dailyReports]);

  // 計算週彙總
  const calculateWeekSummary = useCallback((startDate: string, endDate: string): WeeklySummary => {
    const weekData = dailyReports.filter(r => 
      r.start_date >= startDate && r.start_date <= endDate
    );

    const revenue = weekData.reduce((sum, d) => sum + (d.cyber_revenue || 0), 0);
    const orders = weekData.reduce((sum, d) => sum + (d.cyber_order_count || 0), 0);
    const adSpend = weekData.reduce((sum, d) => sum + (d.meta_spend || 0), 0);
    const newMembers = weekData.reduce((sum, d) => sum + (d.cyber_new_members || 0), 0);
    const sessions = weekData.reduce((sum, d) => sum + (d.ga4_sessions || 0), 0);
    
    // 平均值
    const avgConversion = weekData.length > 0 
      ? weekData.reduce((sum, d) => sum + (d.ga4_overall_conversion || 0), 0) / weekData.length 
      : 0;

    return {
      revenue,
      orders,
      adSpend,
      mer: adSpend > 0 ? revenue / adSpend : 0,
      roas: adSpend > 0 ? revenue / adSpend : 0, // 簡化，實際應用 Meta conv_value
      newMembers,
      aov: orders > 0 ? revenue / orders : 0,
      sessions,
      conversion: avgConversion,
    };
  }, [dailyReports]);

  // 計算比較數據
  const comparisonData = useMemo((): WeeklyComparisonData | null => {
    if (weekOptions.length === 0) return null;

    const currentWeek = weekOptions[selectedWeekIndex];
    const previousWeek = weekOptions[selectedWeekIndex + 1] || null;

    const current = calculateWeekSummary(currentWeek.startDate, currentWeek.endDate);
    const previous = previousWeek 
      ? calculateWeekSummary(previousWeek.startDate, previousWeek.endDate)
      : null;

    const calcChange = (curr: number, prev: number | null) => {
      if (prev === null || prev === 0) return null;
      return ((curr - prev) / prev) * 100;
    };

    return {
      current,
      previous,
      changes: {
        revenue: previous ? calcChange(current.revenue, previous.revenue) : null,
        orders: previous ? calcChange(current.orders, previous.orders) : null,
        adSpend: previous ? calcChange(current.adSpend, previous.adSpend) : null,
        mer: previous ? calcChange(current.mer, previous.mer) : null,
        roas: previous ? calcChange(current.roas, previous.roas) : null,
        newMembers: previous ? calcChange(current.newMembers, previous.newMembers) : null,
        aov: previous ? calcChange(current.aov, previous.aov) : null,
        sessions: previous ? calcChange(current.sessions, previous.sessions) : null,
        conversion: previous ? calcChange(current.conversion, previous.conversion) : null,
      },
    };
  }, [weekOptions, selectedWeekIndex, calculateWeekSummary]);

  const selectedWeek = weekOptions[selectedWeekIndex] || null;

  const setSelectedWeek = useCallback((week: WeekOption) => {
    const index = weekOptions.findIndex(w => w.startDate === week.startDate);
    if (index >= 0) setSelectedWeekIndex(index);
  }, [weekOptions]);

  return {
    weekOptions,
    selectedWeek,
    setSelectedWeek,
    comparisonData,
    isLoading,
    error,
  };
}
