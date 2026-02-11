# 🗄️ Supabase 資料庫設置指南

## 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com) 並登入
2. 點擊 "New Project"
3. 填寫專案資訊：
   - **Name**: `carmall-dashboard`
   - **Database Password**: 設定安全密碼
   - **Region**: `Southeast Asia (Singapore)` (離台灣最近)

## 2. 建立資料表

在 Supabase SQL Editor 執行以下 SQL：

```sql
-- 日報/週報數據表
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('daily', 'weekly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Meta 廣告總覽
  meta_spend DECIMAL(10,2),
  meta_ctr DECIMAL(5,2),
  meta_clicks INTEGER,
  meta_roas DECIMAL(5,2),
  meta_purchases INTEGER,
  meta_atc INTEGER,
  meta_conv_value DECIMAL(10,2),
  meta_cpa DECIMAL(10,2),
  
  -- GA4 數據
  ga4_active_users INTEGER,
  ga4_sessions INTEGER,
  ga4_atc INTEGER,
  ga4_purchases INTEGER,
  ga4_revenue DECIMAL(10,2),
  ga4_overall_conversion DECIMAL(5,2),
  
  -- Cyberbiz 數據
  cyber_order_count INTEGER,
  cyber_revenue DECIMAL(10,2),
  cyber_aov DECIMAL(10,2),
  
  -- 計算指標
  mer DECIMAL(5,2),
  
  -- 原始 JSON (完整數據備份)
  raw_data JSONB,
  
  UNIQUE(mode, start_date, end_date)
);

-- Meta 廣告活動詳情
CREATE TABLE meta_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  spend DECIMAL(10,2),
  ctr DECIMAL(5,2),
  clicks INTEGER,
  roas DECIMAL(5,2),
  purchases INTEGER,
  atc INTEGER,
  conv_value DECIMAL(10,2),
  cpa DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 受眾分析 (年齡)
CREATE TABLE meta_audience_age (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  age_range TEXT NOT NULL,
  spend DECIMAL(10,2),
  impressions INTEGER,
  clicks INTEGER,
  purchases INTEGER
);

-- 受眾分析 (性別)
CREATE TABLE meta_audience_gender (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,
  spend DECIMAL(10,2),
  impressions INTEGER,
  clicks INTEGER,
  purchases INTEGER
);

-- 商品銷售排行
CREATE TABLE product_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  total_quantity INTEGER,
  total_revenue DECIMAL(10,2),
  rank INTEGER
);

-- GA4 流量來源
CREATE TABLE ga4_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  sessions INTEGER,
  atc INTEGER,
  purchases INTEGER,
  session_to_atc_rate DECIMAL(5,2)
);

-- 建立索引優化查詢效能
CREATE INDEX idx_reports_date ON reports(start_date DESC, end_date DESC);
CREATE INDEX idx_reports_mode ON reports(mode);
CREATE INDEX idx_campaigns_report ON meta_campaigns(report_id);
CREATE INDEX idx_products_report ON product_rankings(report_id);

-- Row Level Security (可選)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- 如需要認證，可以加入 RLS 政策
```

## 3. 取得 API 金鑰

1. 進入 Supabase 專案 → Settings → API
2. 複製以下資訊：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...`
   - **service_role key**: (用於後端寫入)

## 4. 環境變數設置

在專案根目錄建立 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. 安裝 Supabase Client

```bash
npm install @supabase/supabase-js
```

## 6. 建立 Supabase Client

建立 `src/lib/supabase.ts`：

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 用於伺服器端操作 (寫入數據)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

## 7. 資料查詢範例

```typescript
// 取得最新報告
const { data, error } = await supabase
  .from('reports')
  .select('*')
  .order('generated_at', { ascending: false })
  .limit(1)
  .single();

// 取得特定日期範圍的報告
const { data, error } = await supabase
  .from('reports')
  .select(`
    *,
    meta_campaigns(*),
    product_rankings(*),
    ga4_channels(*)
  `)
  .gte('start_date', '2026-02-01')
  .lte('end_date', '2026-02-28');
```

---

完成以上步驟後，Dashboard 即可從 Supabase 讀取實時數據！
