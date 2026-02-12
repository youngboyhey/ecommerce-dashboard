/**
 * useAdMetrics - 統一的廣告成效數據 Hook
 * 
 * 這個 hook 確保所有分析區塊（受眾分析、素材分析、文案分析）
 * 使用相同的成效數據來源和計算邏輯。
 * 
 * 資料來源：ad_creatives 表的 metrics 欄位 (Single Source of Truth)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';

// 標準化的成效數據結構
export interface AdMetrics {
  adId: string;
  adName: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  convValue: number;
  // 計算欄位
  roas: number;
  ctr: number;
  cvr: number;
  cpa: number;
}

// 計算衍生指標的統一函數
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
    // ROAS = 轉換價值 / 花費
    roas: spend > 0 ? (raw.roas || convValue / spend) : 0,
    // CTR = 點擊 / 曝光 * 100
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    // CVR = 購買 / 點擊 * 100 ⬅️ 這是正確的 CVR 計算
    cvr: clicks > 0 ? (purchases / clicks) * 100 : 0,
    // CPA = 花費 / 購買
    cpa: purchases > 0 ? spend / purchases : 0,
  };
}

// 格式化顯示函數
export function formatMetric(value: number, type: 'currency' | 'percent' | 'number' | 'roas'): string {
  switch (type) {
    case 'currency':
      return `$${value.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`;
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'roas':
      return value.toFixed(2);
    case 'number':
    default:
      return value.toLocaleString('zh-TW');
  }
}

interface UseAdMetricsResult {
  metricsMap: Map<string, AdMetrics>;
  getMetrics: (adId: string) => AdMetrics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * 主要 Hook：從 ad_creatives 表獲取統一的成效數據
 */
export function useAdMetrics(reportDate?: string): UseAdMetricsResult {
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
      const dateFilter = reportDate || new Date().toISOString().split('T')[0];

      // 從 ad_creatives 表獲取資料（以 ad_id 分組的原始資料）
      const { data, error: fetchError } = await supabase
        .from('ad_creatives')
        .select('*')
        .eq('report_date', dateFilter);

      if (fetchError) {
        throw fetchError;
      }

      // 按 ad_id 分組並彙總 metrics
      const metricsById = new Map<string, AdMetrics>();
      
      (data || []).forEach((row: Record<string, unknown>) => {
        // 從 tags 中提取 original_ad_id
        const tags = row.tags as string[] | null;
        const originalAdIdTag = tags?.find((t: string) => t.startsWith('original_ad_id:'));
        const adId = originalAdIdTag 
          ? originalAdIdTag.replace('original_ad_id:', '') 
          : (row.ad_id as string || row.id as string);

        // 如果已存在，跳過（只取第一筆，因為同一廣告只有一組 metrics）
        if (metricsById.has(adId)) return;

        // 解析 metrics
        let rawMetrics = row.metrics;
        if (typeof rawMetrics === 'string') {
          try {
            rawMetrics = JSON.parse(rawMetrics);
          } catch {
            rawMetrics = {};
          }
        }
        const metrics = (rawMetrics || {}) as Record<string, number>;

        // 計算衍生指標
        const derived = calculateDerivedMetrics({
          spend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          purchases: metrics.purchases,
          convValue: metrics.conv_value,
          roas: metrics.roas,
        });

        metricsById.set(adId, {
          adId,
          adName: (row.creative_name as string || '').replace(/\s*\[\d+\/\d+\]\s*$/, '').trim() || '未命名廣告',
          campaignName: row.campaign_name as string || '',
          spend: metrics.spend || 0,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          purchases: metrics.purchases || 0,
          convValue: metrics.conv_value || 0,
          ...derived,
        });
      });

      setMetricsMap(metricsById);
    } catch (err) {
      console.error('Error in useAdMetrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [reportDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getMetrics = useCallback((adId: string): AdMetrics | null => {
    return metricsMap.get(adId) || null;
  }, [metricsMap]);

  return {
    metricsMap,
    getMetrics,
    isLoading,
    error,
    refresh: fetchData,
  };
}

// 導出計算函數供其他地方使用
export { calculateDerivedMetrics as calculateCVR };
