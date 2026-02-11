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
      const [campaignsRes, ageRes, genderRes, productsRes, channelsRes] = await Promise.all([
        supabase.from('meta_campaigns').select('*').eq('report_id', report.id),
        supabase.from('meta_audience_age').select('*').eq('report_id', report.id),
        supabase.from('meta_audience_gender').select('*').eq('report_id', report.id),
        supabase.from('product_rankings').select('*').eq('report_id', report.id).order('rank'),
        supabase.from('ga4_channels').select('*').eq('report_id', report.id),
      ]);

      const campaigns = (campaignsRes.data || []) as CampaignRow[];
      const ageData = (ageRes.data || []) as AudienceAgeRow[];
      const genderData = (genderRes.data || []) as AudienceGenderRow[];
      const products = (productsRes.data || []) as ProductRankingRow[];
      const channels = (channelsRes.data || []) as GA4ChannelRow[];

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
  const topGender = genderData.reduce((best, current) => {
    const currentRate = current.spend > 0 ? current.purchases / current.spend : 0;
    const bestRate = best && best.spend > 0 ? best.purchases / best.spend : 0;
    return currentRate > bestRate ? current : best;
  }, genderData[0]);

  // 找出購買轉換率最高的年齡層
  const topAge = ageData.reduce((best, current) => {
    const currentRate = current.spend > 0 ? current.purchases / current.spend : 0;
    const bestRate = best && best.spend > 0 ? best.purchases / best.spend : 0;
    return currentRate > bestRate ? current : best;
  }, ageData[0]);

  if (topGender && topAge) {
    return `${topGender.gender} ${topAge.age_range}`;
  }
  
  return null;
}

/**
 * 將多個 daily 報表聚合為一個 weekly 報表格式
 */
function aggregateDailyReports(dailyReports: ReportRow[], dateRange: DateRange): ReportRow {
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
    raw_data: latestReport.raw_data || {},
  };
}
