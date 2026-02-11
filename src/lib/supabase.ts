import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 驗證環境變數
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not configured');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface ReportRow {
  id: string;
  mode: 'daily' | 'weekly';
  start_date: string;
  end_date: string;
  generated_at: string;
  
  // Meta Ads
  meta_spend: number;
  meta_ctr: number;
  meta_clicks: number;
  meta_roas: number;
  meta_purchases: number;
  meta_atc: number;
  meta_conv_value: number;
  meta_cpa: number;
  
  // GA4
  ga4_active_users: number;
  ga4_sessions: number;
  ga4_atc: number;
  ga4_purchases: number;
  ga4_revenue: number;
  ga4_overall_conversion: number;
  
  // Cyberbiz
  cyber_order_count: number;
  cyber_revenue: number;
  cyber_aov: number;
  cyber_new_members: number;
  
  // Calculated
  mer: number;
  
  // Raw JSON
  raw_data: Record<string, unknown>;
}

export interface CampaignRow {
  id: string;
  report_id: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  ctr: number;
  clicks: number;
  roas: number;
  purchases: number;
  atc: number;
  conv_value: number;
  cpa: number;
}

export interface AudienceAgeRow {
  id: string;
  report_id: string;
  age_range: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface AudienceGenderRow {
  id: string;
  report_id: string;
  gender: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface ProductRankingRow {
  id: string;
  report_id: string;
  product_name: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
  rank: number;
}

export interface GA4ChannelRow {
  id: string;
  report_id: string;
  source: string;
  sessions: number;
  atc: number;
  purchases: number;
  session_to_atc_rate: number;
}
