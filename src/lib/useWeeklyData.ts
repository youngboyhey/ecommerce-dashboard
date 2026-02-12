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

interface WeeklyReport {
  start_date: string;
  end_date: string;
  cyber_revenue: number;
  cyber_order_count: number;
  cyber_aov: number;
  cyber_new_members: number;
  meta_spend: number;
  meta_roas: number;
  meta_conv_value: number;
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
 * 從 weekly 數據讀取週報，支持週報切換和 WoW 比較
 * 直接使用 Supabase 中 mode='weekly' 的彙總數據
 */
export function useWeeklyData(): UseWeeklyDataResult {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 獲取所有 weekly 數據
  const fetchData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('start_date, end_date, cyber_revenue, cyber_order_count, cyber_aov, cyber_new_members, meta_spend, meta_roas, meta_conv_value, ga4_sessions, ga4_overall_conversion')
        .eq('mode', 'weekly')
        .order('start_date', { ascending: false })
        .limit(5); // 最近 5 週

      if (fetchError) throw new Error(fetchError.message);
      setWeeklyReports((data || []) as WeeklyReport[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 從 weekly reports 直接生成週選項
  const weekOptions = useMemo(() => {
    if (weeklyReports.length === 0) return [];

    return weeklyReports.map(report => ({
      label: `${report.start_date.slice(5)} ~ ${report.end_date.slice(5)}`,
      startDate: report.start_date,
      endDate: report.end_date,
    }));
  }, [weeklyReports]);

  // 從 weekly report 轉換為 WeeklySummary
  const reportToSummary = useCallback((report: WeeklyReport): WeeklySummary => {
    const revenue = report.cyber_revenue || 0;
    const orders = report.cyber_order_count || 0;
    const adSpend = report.meta_spend || 0;
    const convValue = report.meta_conv_value || 0;

    return {
      revenue,
      orders,
      adSpend,
      mer: adSpend > 0 ? revenue / adSpend : 0,
      roas: adSpend > 0 ? convValue / adSpend : 0,
      newMembers: report.cyber_new_members || 0,
      aov: report.cyber_aov || (orders > 0 ? revenue / orders : 0),
      sessions: report.ga4_sessions || 0,
      conversion: report.ga4_overall_conversion || 0,
    };
  }, []);

  // 計算比較數據（直接使用 weekly 數據，無需再彙總）
  const comparisonData = useMemo((): WeeklyComparisonData | null => {
    if (weeklyReports.length === 0) return null;

    const currentReport = weeklyReports[selectedWeekIndex];
    const previousReport = weeklyReports[selectedWeekIndex + 1] || null;

    if (!currentReport) return null;

    const current = reportToSummary(currentReport);
    const previous = previousReport ? reportToSummary(previousReport) : null;

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
  }, [weeklyReports, selectedWeekIndex, reportToSummary]);

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
