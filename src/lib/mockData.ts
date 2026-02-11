import { ReportData } from './types';

// 模擬數據 - 基於實際的 report_data.json 結構
export const mockReportData: ReportData = {
  mode: 'weekly',
  start_date: '2026-02-04',
  end_date: '2026-02-10',
  generated_at: '2026-02-11T10:40:13.279577',
  meta: {
    total: {
      name: 'Account Total',
      spend: 6501.0,
      ctr: 1.363139,
      clicks: 469,
      roas: 0.887556,
      purchases: 9,
      atc: 55,
      ic: 42,
      vc: 562,
      conv_value: 5770.0,
      cpa: 722.33,
      cp_atc: 118.2
    },
    campaigns: [
      {
        name: '260129_LM香氛磚組合(涵)',
        spend: 3293.0,
        ctr: 1.439877,
        clicks: 244,
        roas: 0.92317,
        purchases: 4,
        atc: 24,
        ic: 23,
        vc: 242,
        conv_value: 3040.0,
        cpa: 823.25,
        cp_atc: 137.21,
        campaign_id: '120238815887440142'
      },
      {
        name: '260130_LM芳香磚廣告(J)',
        spend: 3208.0,
        ctr: 1.264143,
        clicks: 225,
        roas: 0.850998,
        purchases: 5,
        atc: 31,
        ic: 19,
        vc: 320,
        conv_value: 2730.0,
        cpa: 641.6,
        cp_atc: 103.48,
        campaign_id: '120238855887140142'
      }
    ]
  },
  meta_audience: {
    age: [
      { age_range: '18-24', spend: 155.0, impressions: 2940, clicks: 35, purchases: 0 },
      { age_range: '25-34', spend: 1476.0, impressions: 17595, clicks: 212, purchases: 2 },
      { age_range: '35-44', spend: 2303.0, impressions: 23424, clicks: 315, purchases: 5 },
      { age_range: '45-54', spend: 1933.0, impressions: 14835, clicks: 225, purchases: 1 },
      { age_range: '55-64', spend: 533.0, impressions: 2968, clicks: 55, purchases: 1 },
      { age_range: '65+', spend: 101.0, impressions: 374, clicks: 5, purchases: 0 }
    ],
    gender: [
      { gender: 'female', spend: 153.0, impressions: 1018, clicks: 13, purchases: 0 },
      { gender: 'male', spend: 6326.0, impressions: 60786, clicks: 833, purchases: 9 },
      { gender: 'unknown', spend: 22.0, impressions: 332, clicks: 1, purchases: 0 }
    ],
    region: [
      { region: 'New Taipei City', spend: 1498.0, impressions: 12980, clicks: 192, purchases: 0 },
      { region: 'Taoyuan City', spend: 811.0, impressions: 6964, clicks: 82, purchases: 0 },
      { region: 'Taichung', spend: 782.0, impressions: 8033, clicks: 106, purchases: 0 },
      { region: 'Taipei', spend: 728.0, impressions: 6940, clicks: 97, purchases: 0 },
      { region: 'Kaohsiung', spend: 701.0, impressions: 7752, clicks: 89, purchases: 0 },
      { region: 'Tainan', spend: 505.0, impressions: 5901, clicks: 85, purchases: 0 }
    ]
  },
  ga4: {
    active_users: 600,
    sessions: 715,
    atc: 61,
    ic: 51,
    purchases: 7,
    ecommerce_purchases: 7,
    purchase_revenue: 4865.0,
    funnel_rates: {
      session_to_atc: 8.53,
      atc_to_checkout: 83.61,
      checkout_to_purchase: 13.73,
      overall_conversion: 0.98,
      atc_drop_off: 91.47,
      checkout_drop_off: 16.39,
      purchase_drop_off: 86.27
    }
  },
  ga4_channels: [
    { source: 'fb / paid', sessions: 155, atc: 27, ic: 19, purchases: 2, session_to_atc_rate: 17.42, atc_to_purchase_rate: 7.41 },
    { source: 'm.facebook.com / referral', sessions: 108, atc: 16, ic: 11, purchases: 1, session_to_atc_rate: 14.81, atc_to_purchase_rate: 6.25 },
    { source: 'google / organic', sessions: 37, atc: 4, ic: 5, purchases: 1, session_to_atc_rate: 10.81, atc_to_purchase_rate: 25.0 },
    { source: '(direct) / (none)', sessions: 106, atc: 0, ic: 1, purchases: 0, session_to_atc_rate: 0.0, atc_to_purchase_rate: 0 },
    { source: 'ig / paid', sessions: 97, atc: 9, ic: 4, purchases: 0, session_to_atc_rate: 9.28, atc_to_purchase_rate: 0.0 }
  ],
  ga4_devices: [
    { device: 'mobile', users: 515, sessions: 545, session_pct: 76.2, transactions: 5, conv_rate: 0.92, revenue: 3680 },
    { device: 'desktop', users: 150, sessions: 155, session_pct: 21.7, transactions: 2, conv_rate: 1.29, revenue: 1185 },
    { device: 'tablet', users: 15, sessions: 15, session_pct: 2.1, transactions: 0, conv_rate: 0, revenue: 0 }
  ],
  cyberbiz: {
    order_count: 34,
    total_revenue: 5600.0,
    aov: 164.71,
    new_members: 0,
    product_ranking: [
      { product_name: '【任選3入】LIQUI MOLY 車用香氛磚', variant: '', sku: 'air-freshener-3pack', total_quantity: 4, total_revenue: 2880.0 },
      { product_name: '【全系列6入】LIQUI MOLY 車用香氛磚', variant: '', sku: 'air-freshener-6pack-fixed', total_quantity: 1, total_revenue: 1350.0 },
      { product_name: 'LIQUI MOLY 防鼠貂保護噴劑', variant: '', sku: 'LM1515', total_quantity: 1, total_revenue: 550.0 },
      { product_name: 'LIQUI MOLY 車用香氛磚-新車清香', variant: '', sku: 'LM21831', total_quantity: 2, total_revenue: 500.0 },
      { product_name: '2026 新年公關賀禮', variant: '', sku: '2026newyear', total_quantity: 26, total_revenue: 0.0 }
    ]
  },
  mer: 0.86,
  gsc: null,
  wow: {
    meta_roas_change: 90.46,
    cyber_revenue_change: -28.66,
    cyber_aov_change: -87.41,
    prev_meta: {
      name: 'Account Total',
      spend: 8004.0,
      ctr: 1.326522,
      clicks: 542,
      roas: 0.466017,
      purchases: 3,
      atc: 16,
      ic: 12,
      vc: 213,
      conv_value: 3730.0,
      cpa: 2668.0,
      cp_atc: 500.25
    },
    prev_cyber: {
      order_count: 6,
      total_revenue: 7850.0,
      aov: 1308.33,
      new_members: 0,
      product_ranking: []
    }
  },
  summary: {
    total_spend: 6501.0,
    total_revenue: 5600.0,
    mer: 0.86,
    roas: 0.887556,
    order_count: 34,
    aov: 164.71,
    new_members: 0,
    ga4_sessions: 715,
    ga4_overall_conversion: 0.98,
    top_audience_segment: 'male 35-44',
    top_product: '【任選3入】LIQUI MOLY 車用香氛磚'
  }
};

// 歷史數據模擬 - 用於趨勢圖
export const mockHistoricalData = [
  { date: '2026-01-27', revenue: 4200, spend: 5800, roas: 0.72, orders: 18 },
  { date: '2026-01-28', revenue: 3800, spend: 5200, roas: 0.73, orders: 15 },
  { date: '2026-01-29', revenue: 4500, spend: 6100, roas: 0.74, orders: 22 },
  { date: '2026-01-30', revenue: 5100, spend: 6500, roas: 0.78, orders: 28 },
  { date: '2026-01-31', revenue: 4800, spend: 6200, roas: 0.77, orders: 24 },
  { date: '2026-02-01', revenue: 5300, spend: 6800, roas: 0.78, orders: 30 },
  { date: '2026-02-02', revenue: 4900, spend: 6400, roas: 0.77, orders: 26 },
  { date: '2026-02-03', revenue: 5800, spend: 7200, roas: 0.81, orders: 32 },
  { date: '2026-02-04', revenue: 6200, spend: 7500, roas: 0.83, orders: 35 },
  { date: '2026-02-05', revenue: 5600, spend: 6800, roas: 0.82, orders: 31 },
  { date: '2026-02-06', revenue: 5900, spend: 7000, roas: 0.84, orders: 33 },
  { date: '2026-02-07', revenue: 6100, spend: 7100, roas: 0.86, orders: 34 },
  { date: '2026-02-08', revenue: 5400, spend: 6500, roas: 0.83, orders: 29 },
  { date: '2026-02-09', revenue: 5700, spend: 6700, roas: 0.85, orders: 32 },
  { date: '2026-02-10', revenue: 5600, spend: 6501, roas: 0.89, orders: 34 }
];

// 週匯總數據
export const mockWeeklyData = [
  { week: 'W1', revenue: 22400, spend: 29800, roas: 0.75, orders: 107 },
  { week: 'W2', revenue: 28500, spend: 35200, roas: 0.81, orders: 138 },
  { week: 'W3', revenue: 31200, spend: 37500, roas: 0.83, orders: 152 },
  { week: 'W4', revenue: 34500, spend: 40800, roas: 0.85, orders: 168 },
  { week: 'W5', revenue: 39300, spend: 45600, roas: 0.86, orders: 193 },
  { week: 'W6', revenue: 5600, spend: 6501, roas: 0.89, orders: 34 }
];
