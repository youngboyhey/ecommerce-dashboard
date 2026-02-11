'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, ReportRow, CampaignRow, AudienceAgeRow, AudienceGenderRow, ProductRankingRow, GA4ChannelRow } from './supabase';
import { ReportData } from './types';
import { mockReportData } from './mockData';

export interface DateRange {
  start: string;
  end: string;
}

interface UseReportDataResult {
  data: ReportData;
  isLoading: boolean;
  error: string | null;
  isLive: boolean;  // true if data is from Supabase
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * 從 Supabase 讀取報表數據，如果失敗則 fallback 到 mock data
 * @param mode - 'daily' | 'weekly'
 * @param dateRange - 可選的日期範圍，指定時會查詢該範圍的報表
 */
export function useReportData(
  mode: 'daily' | 'weekly' = 'weekly',
  dateRange?: DateRange
): UseReportDataResult {
  const [data, setData] = useState<ReportData>(mockReportData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      console.warn('Supabase not configured, using mock data');
      setIsLoading(false);
      setIsLive(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let reportData: ReportRow | null = null;
      let reportError: { message: string } | null = null;

      if (dateRange) {
        // 當有指定日期範圍時，查詢該範圍的 weekly 報表
        // 先嘗試找完全匹配的 weekly 報表
        const { data: weeklyReport, error: weeklyError } = await supabase
          .from('reports')
          .select('*')
          .eq('mode', 'weekly')
          .eq('start_date', dateRange.start)
          .limit(1)
          .single();

        if (weeklyReport && !weeklyError) {
          reportData = weeklyReport as ReportRow;
        } else {
          // 如果沒有完全匹配的 weekly 報表，從 daily 數據聚合
          const { data: dailyReports, error: dailyError } = await supabase
            .from('reports')
            .select('*')
            .eq('mode', 'daily')
            .gte('start_date', dateRange.start)
            .lte('start_date', dateRange.end)
            .order('start_date', { ascending: true });

          if (dailyError) {
            reportError = dailyError;
          } else if (dailyReports && dailyReports.length > 0) {
            // 聚合 daily 數據為 weekly 格式
            reportData = aggregateDailyReports(dailyReports as ReportRow[], dateRange);
          } else {
            reportError = { message: `No reports found for date range ${dateRange.start} ~ ${dateRange.end}` };
          }
        }
      } else {
        // 沒有指定日期範圍時，取得最新的報表
        const { data: latestReport, error: latestError } = await supabase
          .from('reports')
          .select('*')
          .eq('mode', mode)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();
        
        reportData = latestReport as ReportRow;
        reportError = latestError;
      }

      if (reportError) {
        throw new Error(`Failed to fetch report: ${reportError.message}`);
      }

      if (!reportData) {
        throw new Error('No report data found');
      }

      const report = reportData;

      // 2. 取得關聯數據
      // 🔧 修復：聚合模式下使用所有 daily 報表的 ID 查詢關聯數據
      let campaigns: CampaignRow[] = [];
      let ageData: AudienceAgeRow[] = [];
      let genderData: AudienceGenderRow[] = [];
      let products: ProductRankingRow[] = [];
      let channels: GA4ChannelRow[] = [];

      // 檢查是否為聚合模式（ID 以 'aggregated-' 開頭）
      const isAggregatedMode = report.id.startsWith('aggregated-') || report.id.startsWith('empty-');

      if (isAggregatedMode && dateRange) {
        // 聚合模式：查詢日期範圍內所有 daily 報表的關聯數據
        const { data: dailyReportsForIds } = await supabase
          .from('reports')
          .select('id')
          .eq('mode', 'daily')
          .gte('start_date', dateRange.start)
          .lte('start_date', dateRange.end);

        const dailyIds = (dailyReportsForIds || []).map(r => r.id);

        if (dailyIds.length > 0) {
          const [campaignsRes, ageRes, genderRes, productsRes, channelsRes] = await Promise.all([
            supabase.from('meta_campaigns').select('*').in('report_id', dailyIds),
            supabase.from('meta_audience_age').select('*').in('report_id', dailyIds),
            supabase.from('meta_audience_gender').select('*').in('report_id', dailyIds),
            supabase.from('product_rankings').select('*').in('report_id', dailyIds),
            supabase.from('ga4_channels').select('*').in('report_id', dailyIds),
          ]);

          // 聚合關聯數據
          campaigns = aggregateCampaigns((campaignsRes.data || []) as CampaignRow[]);
          ageData = aggregateAudienceAge((ageRes.data || []) as AudienceAgeRow[]);
          genderData = aggregateAudienceGender((genderRes.data || []) as AudienceGenderRow[]);
          products = aggregateProductRankings((productsRes.data || []) as ProductRankingRow[]);
          channels = aggregateChannels((channelsRes.data || []) as GA4ChannelRow[]);
        }
      } else {
        // 單一報表模式：直接用 report.id 查詢
        const [campaignsRes, ageRes, genderRes, productsRes, channelsRes] = await Promise.all([
          supabase.from('meta_campaigns').select('*').eq('report_id', report.id),
          supabase.from('meta_audience_age').select('*').eq('report_id', report.id),
          supabase.from('meta_audience_gender').select('*').eq('report_id', report.id),
          supabase.from('product_rankings').select('*').eq('report_id', report.id).order('rank'),
          supabase.from('ga4_channels').select('*').eq('report_id', report.id),
        ]);

        campaigns = (campaignsRes.data || []) as CampaignRow[];
        ageData = (ageRes.data || []) as AudienceAgeRow[];
        genderData = (genderRes.data || []) as AudienceGenderRow[];
        products = (productsRes.data || []) as ProductRankingRow[];
        channels = (channelsRes.data || []) as GA4ChannelRow[];
      }

      // 3. 轉換為前端格式
      const transformedData: ReportData = transformToReportData(
        report,
        campaigns,
        ageData,
        genderData,
        products,
        channels
      );

      setData(transformedData);
      setIsLive(true);
      setLastUpdated(new Date(report.generated_at));
      console.log('✅ Loaded live data from Supabase');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`⚠️ Supabase fetch failed: ${errorMessage}, using mock data`);
      setError(errorMessage);
      setIsLive(false);
      // Keep using mock data (already set as initial state)
    } finally {
      setIsLoading(false);
    }
  }, [mode, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isLive,
    lastUpdated,
    refresh: fetchData,
  };
}

/**
 * 將 Supabase 資料轉換為前端 ReportData 格式
 */
function transformToReportData(
  report: ReportRow,
  campaigns: CampaignRow[],
  ageData: AudienceAgeRow[],
  genderData: AudienceGenderRow[],
  products: ProductRankingRow[],
  channels: GA4ChannelRow[]
): ReportData {
  // 嘗試從 raw_data 讀取完整數據（如果有的話）
  const rawData = report.raw_data as Partial<ReportData> | undefined;

  // 找出最佳受眾 segment
  const topAudienceSegment = findTopAudienceSegment(ageData, genderData);
  
  // 找出熱銷商品
  const topProduct = products.length > 0 ? products[0].product_name : null;

  return {
    mode: report.mode,
    start_date: report.start_date,
    end_date: report.end_date,
    generated_at: report.generated_at,

    meta: {
      total: {
        name: 'Account Total',
        spend: report.meta_spend,
        ctr: report.meta_ctr,
        clicks: report.meta_clicks,
        roas: report.meta_roas,
        purchases: report.meta_purchases,
        atc: report.meta_atc,
        ic: rawData?.meta?.total?.ic || 0,
        vc: rawData?.meta?.total?.vc || 0,
        conv_value: report.meta_conv_value,
        cpa: report.meta_cpa,
        cp_atc: rawData?.meta?.total?.cp_atc || 0,
      },
      campaigns: campaigns.map(c => ({
        name: c.campaign_name,
        campaign_id: c.campaign_id,
        spend: c.spend,
        ctr: c.ctr,
        clicks: c.clicks,
        roas: c.roas,
        purchases: c.purchases,
        atc: c.atc,
        ic: 0,
        vc: 0,
        conv_value: c.conv_value,
        cpa: c.cpa,
        cp_atc: 0,
      })),
    },

    meta_audience: {
      age: ageData.map(a => ({
        age_range: a.age_range,
        spend: a.spend,
        impressions: a.impressions,
        clicks: a.clicks,
        purchases: a.purchases,
      })),
      gender: genderData.map(g => ({
        gender: g.gender,
        spend: g.spend,
        impressions: g.impressions,
        clicks: g.clicks,
        purchases: g.purchases,
      })),
      region: rawData?.meta_audience?.region || [],
    },

    ga4: {
      active_users: report.ga4_active_users,
      sessions: report.ga4_sessions,
      atc: report.ga4_atc,
      ic: rawData?.ga4?.ic || 0,
      purchases: report.ga4_purchases,
      ecommerce_purchases: rawData?.ga4?.ecommerce_purchases || report.ga4_purchases,
      purchase_revenue: report.ga4_revenue,
      funnel_rates: rawData?.ga4?.funnel_rates || {
        session_to_atc: report.ga4_sessions > 0 ? (report.ga4_atc / report.ga4_sessions) * 100 : 0,
        atc_to_checkout: 0,
        checkout_to_purchase: 0,
        overall_conversion: report.ga4_overall_conversion,
        atc_drop_off: 0,
        checkout_drop_off: 0,
        purchase_drop_off: 0,
      },
    },

    ga4_channels: channels.map(c => ({
      source: c.source,
      sessions: c.sessions,
      atc: c.atc,
      ic: 0,
      purchases: c.purchases,
      session_to_atc_rate: c.session_to_atc_rate,
      atc_to_purchase_rate: c.atc > 0 ? (c.purchases / c.atc) * 100 : 0,
    })),

    // GA4 裝置數據
    ga4_devices: (rawData?.ga4_devices || []).map((d: { device: string; users: number; sessions: number; session_pct: number; transactions: number; conv_rate: number; revenue: number }) => ({
      device: d.device as 'mobile' | 'desktop' | 'tablet',
      users: d.users || 0,
      sessions: d.sessions || 0,
      session_pct: d.session_pct || 0,
      transactions: d.transactions || 0,
      conv_rate: d.conv_rate || 0,
      revenue: d.revenue || 0,
    })),

    cyberbiz: {
      order_count: report.cyber_order_count,
      total_revenue: report.cyber_revenue,
      aov: report.cyber_aov,
      new_members: report.cyber_new_members || 0,
      product_ranking: products.map(p => ({
        product_name: p.product_name,
        variant: '',
        sku: p.sku,
        total_quantity: p.total_quantity,
        total_revenue: p.total_revenue,
      })),
    },

    mer: report.mer,
    wow: rawData?.wow || null,
    gsc: rawData?.gsc || null,

    summary: {
      total_spend: report.meta_spend,
      total_revenue: report.cyber_revenue,
      mer: report.mer,
      roas: report.meta_roas,
      order_count: report.cyber_order_count,
      aov: report.cyber_aov,
      new_members: report.cyber_new_members || 0,
      ga4_sessions: report.ga4_sessions,
      ga4_overall_conversion: report.ga4_overall_conversion,
      top_audience_segment: topAudienceSegment || 'N/A',
      top_product: topProduct || 'N/A',
    },
  };
}

/**
 * 從受眾數據找出最佳 segment
 */
function findTopAudienceSegment(
  ageData: AudienceAgeRow[],
  genderData: AudienceGenderRow[]
): string | null {
  // 找出購買轉換率最高的性別
  // 🛡️ 空數組保護：防止 reduce 在空數組時 crash
  const topGender = genderData.length > 0 
    ? genderData.reduce((best, current) => {
        const currentRate = current.spend > 0 ? current.purchases / current.spend : 0;
        const bestRate = best && best.spend > 0 ? best.purchases / best.spend : 0;
        return currentRate > bestRate ? current : best;
      }, genderData[0])
    : null;

  // 找出購買轉換率最高的年齡層
  // 🛡️ 空數組保護：防止 reduce 在空數組時 crash
  const topAge = ageData.length > 0
    ? ageData.reduce((best, current) => {
        const currentRate = current.spend > 0 ? current.purchases / current.spend : 0;
        const bestRate = best && best.spend > 0 ? best.purchases / best.spend : 0;
        return currentRate > bestRate ? current : best;
      }, ageData[0])
    : null;

  if (topGender && topAge) {
    return `${topGender.gender} ${topAge.age_range}`;
  }
  
  return null;
}

/**
 * 將多個 daily 報表聚合為一個 weekly 報表格式
 */
function aggregateDailyReports(dailyReports: ReportRow[], dateRange: DateRange): ReportRow {
  // 🛡️ 空數組保護：防止 undefined 存取導致 crash
  if (dailyReports.length === 0) {
    return {
      id: `empty-${dateRange.start}-${dateRange.end}`,
      mode: 'weekly',
      start_date: dateRange.start,
      end_date: dateRange.end,
      generated_at: new Date().toISOString(),
      meta_spend: 0,
      meta_ctr: 0,
      meta_clicks: 0,
      meta_roas: 0,
      meta_purchases: 0,
      meta_atc: 0,
      meta_conv_value: 0,
      meta_cpa: 0,
      ga4_active_users: 0,
      ga4_sessions: 0,
      ga4_atc: 0,
      ga4_purchases: 0,
      ga4_revenue: 0,
      ga4_overall_conversion: 0,
      cyber_order_count: 0,
      cyber_revenue: 0,
      cyber_aov: 0,
      cyber_new_members: 0,
      mer: 0,
      raw_data: {},
    };
  }

  const count = dailyReports.length;
  
  // 累加值
  const metaSpend = dailyReports.reduce((sum, r) => sum + (r.meta_spend || 0), 0);
  const metaClicks = dailyReports.reduce((sum, r) => sum + (r.meta_clicks || 0), 0);
  const metaPurchases = dailyReports.reduce((sum, r) => sum + (r.meta_purchases || 0), 0);
  const metaAtc = dailyReports.reduce((sum, r) => sum + (r.meta_atc || 0), 0);
  const metaConvValue = dailyReports.reduce((sum, r) => sum + (r.meta_conv_value || 0), 0);
  
  const ga4ActiveUsers = dailyReports.reduce((sum, r) => sum + (r.ga4_active_users || 0), 0);
  const ga4Sessions = dailyReports.reduce((sum, r) => sum + (r.ga4_sessions || 0), 0);
  const ga4Atc = dailyReports.reduce((sum, r) => sum + (r.ga4_atc || 0), 0);
  const ga4Purchases = dailyReports.reduce((sum, r) => sum + (r.ga4_purchases || 0), 0);
  const ga4Revenue = dailyReports.reduce((sum, r) => sum + (r.ga4_revenue || 0), 0);
  
  const cyberOrderCount = dailyReports.reduce((sum, r) => sum + (r.cyber_order_count || 0), 0);
  const cyberRevenue = dailyReports.reduce((sum, r) => sum + (r.cyber_revenue || 0), 0);
  const cyberNewMembers = dailyReports.reduce((sum, r) => sum + (r.cyber_new_members || 0), 0);

  // 計算平均值
  const avgCtr = count > 0 
    ? dailyReports.reduce((sum, r) => sum + (r.meta_ctr || 0), 0) / count 
    : 0;
  const avgConversion = count > 0
    ? dailyReports.reduce((sum, r) => sum + (r.ga4_overall_conversion || 0), 0) / count
    : 0;

  // 計算衍生值
  const metaRoas = metaSpend > 0 ? metaConvValue / metaSpend : 0;
  const metaCpa = metaPurchases > 0 ? metaSpend / metaPurchases : 0;
  const cyberAov = cyberOrderCount > 0 ? cyberRevenue / cyberOrderCount : 0;
  const mer = metaSpend > 0 ? cyberRevenue / metaSpend : 0;

  // 使用最新的 daily 報表作為基礎
  const latestReport = dailyReports[dailyReports.length - 1];
  
  // 🔧 聚合 raw_data 裡的關鍵數據（修復：原本只取最後一天的數據）
  const aggregatedRawData = (() => {
    // 聚合 GA4 漏斗數據
    const ga4Ic = dailyReports.reduce((sum, r) => {
      const raw = r.raw_data as Record<string, unknown> | undefined;
      const ga4 = raw?.ga4 as Record<string, unknown> | undefined;
      return sum + (Number(ga4?.ic) || 0);
    }, 0);
    
    const ga4EcommercePurchases = dailyReports.reduce((sum, r) => {
      const raw = r.raw_data as Record<string, unknown> | undefined;
      const ga4 = raw?.ga4 as Record<string, unknown> | undefined;
      return sum + (Number(ga4?.ecommerce_purchases) || 0);
    }, 0);

    // 聚合 GA4 設備數據（按 device 類型合併）
    type DeviceRow = { device: string; users: number; sessions: number; session_pct: number; transactions: number; conv_rate: number; revenue: number };
    const deviceMap = new Map<string, DeviceRow>();
    for (const r of dailyReports) {
      const raw = r.raw_data as Record<string, unknown> | undefined;
      const devices = (raw?.ga4_devices || []) as DeviceRow[];
      for (const d of devices) {
        const existing = deviceMap.get(d.device);
        if (existing) {
          existing.users += d.users || 0;
          existing.sessions += d.sessions || 0;
          existing.transactions += d.transactions || 0;
          existing.revenue += d.revenue || 0;
        } else {
          deviceMap.set(d.device, { ...d });
        }
      }
    }
    // 重新計算設備百分比和轉換率
    const totalDeviceSessions = Array.from(deviceMap.values()).reduce((sum, d) => sum + d.sessions, 0);
    const aggregatedDevices = Array.from(deviceMap.values()).map(d => ({
      ...d,
      session_pct: totalDeviceSessions > 0 ? (d.sessions / totalDeviceSessions) * 100 : 0,
      conv_rate: d.sessions > 0 ? (d.transactions / d.sessions) * 100 : 0,
    }));

    // 聚合 GSC 數據
    type GscData = { clicks: number; impressions: number; ctr: number; position: number };
    const gscAggregated = dailyReports.reduce((acc, r) => {
      const raw = r.raw_data as Record<string, unknown> | undefined;
      const gsc = raw?.gsc as GscData | undefined;
      if (gsc) {
        acc.clicks += gsc.clicks || 0;
        acc.impressions += gsc.impressions || 0;
        acc.count += 1;
        acc.positionSum += gsc.position || 0;
      }
      return acc;
    }, { clicks: 0, impressions: 0, count: 0, positionSum: 0 });
    
    // 🔧 修復：GSC 數據必須符合 GSCData 類型格式（包含 total, top_queries, top_pages）
    const aggregatedGsc = gscAggregated.count > 0 ? {
      total: {
        clicks: gscAggregated.clicks,
        impressions: gscAggregated.impressions,
        ctr: gscAggregated.impressions > 0 ? (gscAggregated.clicks / gscAggregated.impressions) * 100 : 0,
        position: gscAggregated.positionSum / gscAggregated.count, // 平均排名
      },
      top_queries: [], // 聚合模式下不提供關鍵字明細
      top_pages: [],   // 聚合模式下不提供頁面明細
    } : null;

    // 計算聚合後的漏斗比率
    const aggregatedFunnelRates = {
      session_to_atc: ga4Sessions > 0 ? (ga4Atc / ga4Sessions) * 100 : 0,
      atc_to_checkout: ga4Atc > 0 ? (ga4Ic / ga4Atc) * 100 : 0,
      checkout_to_purchase: ga4Ic > 0 ? (ga4Purchases / ga4Ic) * 100 : 0,
      overall_conversion: ga4Sessions > 0 ? (ga4Purchases / ga4Sessions) * 100 : 0,
      atc_drop_off: ga4Atc > 0 ? ((ga4Atc - ga4Ic) / ga4Atc) * 100 : 0,
      checkout_drop_off: ga4Ic > 0 ? ((ga4Ic - ga4Purchases) / ga4Ic) * 100 : 0,
      purchase_drop_off: 0,
    };

    // 使用最新報表的 meta_audience（這個不需要數值聚合，保持原樣）
    const latestRaw = latestReport.raw_data as Record<string, unknown> | undefined;

    return {
      ga4: {
        ic: ga4Ic,
        ecommerce_purchases: ga4EcommercePurchases,
        funnel_rates: aggregatedFunnelRates,
      },
      ga4_devices: aggregatedDevices,
      gsc: aggregatedGsc,
      meta_audience: latestRaw?.meta_audience || null,
    };
  })();

  return {
    id: `aggregated-${dateRange.start}-${dateRange.end}`,
    mode: 'weekly',
    start_date: dateRange.start,
    end_date: dateRange.end,
    generated_at: latestReport.generated_at,
    
    meta_spend: metaSpend,
    meta_ctr: avgCtr,
    meta_clicks: metaClicks,
    meta_roas: metaRoas,
    meta_purchases: metaPurchases,
    meta_atc: metaAtc,
    meta_conv_value: metaConvValue,
    meta_cpa: metaCpa,
    
    ga4_active_users: ga4ActiveUsers,
    ga4_sessions: ga4Sessions,
    ga4_atc: ga4Atc,
    ga4_purchases: ga4Purchases,
    ga4_revenue: ga4Revenue,
    ga4_overall_conversion: avgConversion,
    
    cyber_order_count: cyberOrderCount,
    cyber_revenue: cyberRevenue,
    cyber_aov: cyberAov,
    cyber_new_members: cyberNewMembers,
    
    mer: mer,
    raw_data: aggregatedRawData,
  };
}

/**
 * 聚合多個 daily 報表的 campaigns 數據
 * 按 campaign_id 合併，累加數值指標
 */
function aggregateCampaigns(campaigns: CampaignRow[]): CampaignRow[] {
  if (campaigns.length === 0) return [];

  const campaignMap = new Map<string, CampaignRow>();

  for (const c of campaigns) {
    const existing = campaignMap.get(c.campaign_id);
    if (existing) {
      // 累加數值
      existing.spend += c.spend || 0;
      existing.clicks += c.clicks || 0;
      existing.purchases += c.purchases || 0;
      existing.atc += c.atc || 0;
      existing.conv_value += c.conv_value || 0;
      // CTR 和 ROAS 稍後重新計算
    } else {
      campaignMap.set(c.campaign_id, { ...c });
    }
  }

  // 重新計算衍生指標
  return Array.from(campaignMap.values()).map(c => ({
    ...c,
    ctr: c.clicks > 0 && c.spend > 0 ? (c.clicks / c.spend) * 100 : 0, // 簡化計算
    roas: c.spend > 0 ? c.conv_value / c.spend : 0,
    cpa: c.purchases > 0 ? c.spend / c.purchases : 0,
  }));
}

/**
 * 聚合多個 daily 報表的年齡受眾數據
 * 按 age_range 合併
 */
function aggregateAudienceAge(ageData: AudienceAgeRow[]): AudienceAgeRow[] {
  if (ageData.length === 0) return [];

  const ageMap = new Map<string, AudienceAgeRow>();

  for (const a of ageData) {
    const existing = ageMap.get(a.age_range);
    if (existing) {
      existing.spend += a.spend || 0;
      existing.impressions += a.impressions || 0;
      existing.clicks += a.clicks || 0;
      existing.purchases += a.purchases || 0;
    } else {
      ageMap.set(a.age_range, { ...a });
    }
  }

  return Array.from(ageMap.values());
}

/**
 * 聚合多個 daily 報表的性別受眾數據
 * 按 gender 合併
 */
function aggregateAudienceGender(genderData: AudienceGenderRow[]): AudienceGenderRow[] {
  if (genderData.length === 0) return [];

  const genderMap = new Map<string, AudienceGenderRow>();

  for (const g of genderData) {
    const existing = genderMap.get(g.gender);
    if (existing) {
      existing.spend += g.spend || 0;
      existing.impressions += g.impressions || 0;
      existing.clicks += g.clicks || 0;
      existing.purchases += g.purchases || 0;
    } else {
      genderMap.set(g.gender, { ...g });
    }
  }

  return Array.from(genderMap.values());
}

/**
 * 聚合多個 daily 報表的商品排名數據
 * 按 sku 合併，重新計算排名
 */
function aggregateProductRankings(products: ProductRankingRow[]): ProductRankingRow[] {
  if (products.length === 0) return [];

  const productMap = new Map<string, ProductRankingRow>();

  for (const p of products) {
    const key = p.sku || p.product_name; // 優先用 SKU，沒有則用商品名
    const existing = productMap.get(key);
    if (existing) {
      existing.total_quantity += p.total_quantity || 0;
      existing.total_revenue += p.total_revenue || 0;
    } else {
      productMap.set(key, { ...p });
    }
  }

  // 按總營收排序並重新分配排名
  return Array.from(productMap.values())
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .map((p, index) => ({ ...p, rank: index + 1 }));
}

/**
 * 聚合多個 daily 報表的 GA4 渠道數據
 * 按 source 合併
 */
function aggregateChannels(channels: GA4ChannelRow[]): GA4ChannelRow[] {
  if (channels.length === 0) return [];

  const channelMap = new Map<string, GA4ChannelRow>();

  for (const c of channels) {
    const existing = channelMap.get(c.source);
    if (existing) {
      existing.sessions += c.sessions || 0;
      existing.atc += c.atc || 0;
      existing.purchases += c.purchases || 0;
    } else {
      channelMap.set(c.source, { ...c });
    }
  }

  // 重新計算轉換率
  return Array.from(channelMap.values()).map(c => ({
    ...c,
    session_to_atc_rate: c.sessions > 0 ? (c.atc / c.sessions) * 100 : 0,
  }));
}
