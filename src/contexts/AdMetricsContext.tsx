'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * AdMetricsContext - 統一的廣告成效數據來源
 * 
 * 解決問題：
 * - TargetingAnalysis, CreativeAnalysis, CopyAnalysis 各自讀取不同表
 * - 導致 CTR, CVR 等數據不一致
 * 
 * 解決方案：
 * - 從 ad_creatives 表讀取廣告成效（Single Source of Truth）
 * - 提供 useAdMetrics hook 供所有組件使用
 * - 確保所有區塊顯示一致的數據
 */

// 統一的廣告成效數據結構
export interface AdMetrics {
  adId: string;
  adName: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  convValue: number;
  // 計算指標
  roas: number;
  ctr: number;  // 百分比，例如 1.41
  cvr: number;  // 百分比，例如 0.77
  cpa: number;
}

// Context 提供的值
interface AdMetricsContextValue {
  // 所有廣告的 metrics map (key = adId)
  metricsMap: Map<string, AdMetrics>;
  // 獲取單一廣告的 metrics
  getAdMetrics: (adId: string) => AdMetrics | null;
  // 獲取所有廣告的 metrics 列表
  getAllMetrics: () => AdMetrics[];
  // 狀態
  isLoading: boolean;
  error: string | null;
  // 刷新數據
  refresh: () => Promise<void>;
}

// 創建 Context
const AdMetricsContext = createContext<AdMetricsContextValue | null>(null);

// Provider Props
interface AdMetricsProviderProps {
  children: ReactNode;
  reportDate?: string;
}

/**
 * 計算衍生指標的統一函數
 */
export function calculateDerivedMetrics(raw: {
  spend?: number;
  impressions?: number;
  clicks?: number;
  purchases?: number;
  convValue?: number;
  conv_value?: number;
  roas?: number;
}): {
  roas: number;
  ctr: number;
  cvr: number;
  cpa: number;
} {
  const spend = raw.spend || 0;
  const impressions = raw.impressions || 0;
  const clicks = raw.clicks || 0;
  const purchases = raw.purchases || 0;
  const convValue = raw.convValue || raw.conv_value || 0;

  return {
    // ROAS = 轉換價值 / 花費（如果 raw 已有 roas 且 > 0 則使用）
    roas: raw.roas && raw.roas > 0 ? raw.roas : (spend > 0 ? convValue / spend : 0),
    // CTR = 點擊 / 曝光 * 100
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    // CVR = 購買 / 點擊 * 100 ⬅️ 這是正確的 CVR 計算
    cvr: clicks > 0 ? (purchases / clicks) * 100 : 0,
    // CPA = 花費 / 購買
    cpa: purchases > 0 ? spend / purchases : 0,
  };
}

/**
 * AdMetrics Provider 組件
 */
export function AdMetricsProvider({ children, reportDate }: AdMetricsProviderProps) {
  const [metricsMap, setMetricsMap] = useState<Map<string, AdMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use week_start instead of report_date
      // If reportDate provided, use it as week_start; otherwise get latest week
      const weekFilter = reportDate || null;

      // 從 ad_creatives 表獲取所有廣告素材數據
      // 這是 Single Source of Truth - 包含完整的 metrics
      const { data, error: fetchError } = weekFilter
        ? await supabase
            .from('ad_creatives')
            .select('*')
            .eq('week_start', weekFilter)
        : await supabase
            .from('ad_creatives')
            .select('*')
            .order('week_start', { ascending: false })
            .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      // 按 original_ad_id 分組，彙總 metrics
      const metricsById = new Map<string, AdMetrics>();
      
      (data || []).forEach((row: Record<string, unknown>) => {
        // 從 tags 中提取 original_ad_id（處理輪播圖的情況）
        const tags = row.tags as string[] | null;
        const originalAdIdTag = tags?.find((t: string) => t.startsWith('original_ad_id:'));
        const adId = originalAdIdTag 
          ? originalAdIdTag.replace('original_ad_id:', '') 
          : (row.ad_id as string || row.id as string);

        // 如果這個 adId 已存在，跳過（輪播圖的 metrics 是相同的）
        if (metricsById.has(adId)) return;

        // 解析 metrics JSON
        let rawMetrics = row.metrics;
        if (typeof rawMetrics === 'string') {
          try {
            rawMetrics = JSON.parse(rawMetrics);
          } catch {
            rawMetrics = {};
          }
        }
        const metrics = (rawMetrics || {}) as Record<string, number>;

        // 取得原始數據
        const spend = metrics.spend || 0;
        const impressions = metrics.impressions || 0;
        const clicks = metrics.clicks || 0;
        // 優先使用 purchases，fallback 到 conversions
        const purchases = metrics.purchases ?? metrics.conversions ?? 0;
        const convValue = metrics.conv_value || 0;

        // 計算衍生指標
        const derived = calculateDerivedMetrics({
          spend,
          impressions,
          clicks,
          purchases,
          convValue,
          roas: metrics.roas,
        });

        // 清理廣告名稱（移除 [x/y] 後綴）
        const adName = (row.creative_name as string || '')
          .replace(/\s*\[\d+\/\d+\]\s*$/, '')
          .trim() || '未命名廣告';

        metricsById.set(adId, {
          adId,
          adName,
          campaignName: row.campaign_name as string || '',
          spend,
          impressions,
          clicks,
          purchases,
          convValue,
          ...derived,
        });
      });

      setMetricsMap(metricsById);
    } catch (err) {
      console.error('Error in AdMetricsProvider:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [reportDate]);

  // 初始加載
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 獲取單一廣告的 metrics
  const getAdMetrics = useCallback((adId: string): AdMetrics | null => {
    return metricsMap.get(adId) || null;
  }, [metricsMap]);

  // 獲取所有廣告的 metrics 列表
  const getAllMetrics = useCallback((): AdMetrics[] => {
    return Array.from(metricsMap.values());
  }, [metricsMap]);

  // Context value
  const value = useMemo<AdMetricsContextValue>(() => ({
    metricsMap,
    getAdMetrics,
    getAllMetrics,
    isLoading,
    error,
    refresh: fetchData,
  }), [metricsMap, getAdMetrics, getAllMetrics, isLoading, error, fetchData]);

  return (
    <AdMetricsContext.Provider value={value}>
      {children}
    </AdMetricsContext.Provider>
  );
}

/**
 * useAdMetrics Hook - 獲取統一的廣告成效數據
 */
export function useAdMetrics(): AdMetricsContextValue {
  const context = useContext(AdMetricsContext);
  
  if (!context) {
    throw new Error('useAdMetrics must be used within an AdMetricsProvider');
  }
  
  return context;
}

/**
 * 格式化顯示函數
 */
export function formatMetric(value: number, type: 'currency' | 'percent' | 'number' | 'roas'): string {
  switch (type) {
    case 'currency':
      return `NT$${value.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`;
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'roas':
      return value.toFixed(2);
    case 'number':
    default:
      return value.toLocaleString('zh-TW');
  }
}
