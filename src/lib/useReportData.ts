'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, ReportRow, CampaignRow, AudienceAgeRow, AudienceGenderRow, ProductRankingRow, GA4ChannelRow } from './supabase';
import { ReportData } from './types';
import { mockReportData } from './mockData';

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
 */
export function useReportData(mode: 'daily' | 'weekly' = 'weekly'): UseReportDataResult {
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

      // 1. 取得最新的報表
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('mode', mode)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (reportError) {
        throw new Error(`Failed to fetch report: ${reportError.message}`);
      }

      if (!reportData) {
        throw new Error('No report data found');
      }

      const report = reportData as ReportRow;

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
  }, [mode]);

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

    summary: {
      total_spend: report.meta_spend,
      total_revenue: report.cyber_revenue,
      mer: report.mer,
      roas: report.meta_roas,
      order_count: report.cyber_order_count,
      aov: report.cyber_aov,
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
