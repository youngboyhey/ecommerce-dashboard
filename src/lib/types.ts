// 電商 Dashboard 數據類型定義

export interface MetaTotal {
  name: string;
  spend: number;
  ctr: number;
  clicks: number;
  roas: number;
  purchases: number;
  atc: number;
  ic: number;
  vc: number;
  conv_value: number;
  cpa: number;
  cp_atc: number;
}

export interface MetaCampaign extends MetaTotal {
  campaign_id: string;
}

export interface AgeData {
  age_range: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface GenderData {
  gender: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface RegionData {
  region: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface MetaAudience {
  age: AgeData[];
  gender: GenderData[];
  region: RegionData[];
}

export interface GA4Data {
  active_users: number;
  sessions: number;
  atc: number;
  ic: number;
  purchases: number;
  ecommerce_purchases: number;
  purchase_revenue: number;
  funnel_rates: {
    session_to_atc: number;
    atc_to_checkout: number;
    checkout_to_purchase: number;
    overall_conversion: number;
    atc_drop_off: number;
    checkout_drop_off: number;
    purchase_drop_off: number;
  };
}

export interface GA4Channel {
  source: string;
  sessions: number;
  atc: number;
  ic: number;
  purchases: number;
  session_to_atc_rate: number;
  atc_to_purchase_rate: number;
}

export interface ProductRanking {
  product_name: string;
  variant: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
}

export interface CyberbizData {
  order_count: number;
  total_revenue: number;
  aov: number;
  new_members: number;
  product_ranking: ProductRanking[];
}

export interface WoWData {
  meta_roas_change: number;
  cyber_revenue_change: number;
  cyber_aov_change: number;
  prev_meta: MetaTotal;
  prev_cyber: CyberbizData;
}

export interface Summary {
  total_spend: number;
  total_revenue: number;
  mer: number;
  roas: number;
  order_count: number;
  aov: number;
  new_members: number;
  ga4_sessions: number;
  ga4_overall_conversion: number;
  top_audience_segment: string;
  top_product: string;
}

export interface ReportData {
  mode: 'daily' | 'weekly';
  start_date: string;
  end_date: string;
  generated_at: string;
  meta: {
    total: MetaTotal;
    campaigns: MetaCampaign[];
  };
  meta_audience: MetaAudience;
  ga4: GA4Data;
  ga4_channels: GA4Channel[];
  cyberbiz: CyberbizData;
  mer: number;
  wow: WoWData | null;
  summary: Summary;
}
