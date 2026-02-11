-- Weekly Analysis Tables Migration
-- 執行方式：在 Supabase Dashboard > SQL Editor 中執行此檔案

-- 1. 廣告素材分析表
CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  creative_name TEXT,
  ad_id TEXT,
  campaign_name TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  performance_tier TEXT CHECK (performance_tier IN ('high', 'medium', 'low')),
  performance_rank INTEGER,
  vision_analysis JSONB,
  success_factors TEXT[],
  failure_factors TEXT[],
  improvement_suggestions TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date, ad_id)
);

-- 2. 廣告文案分析表
CREATE TABLE IF NOT EXISTS ad_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  ad_id TEXT,
  campaign_name TEXT,
  copy_type TEXT CHECK (copy_type IN ('primary_text', 'headline', 'description')),
  copy_content TEXT NOT NULL,
  copy_length INTEGER,
  metrics JSONB NOT NULL DEFAULT '{}',
  performance_tier TEXT CHECK (performance_tier IN ('high', 'low')),
  performance_rank INTEGER,
  analysis JSONB,
  feature_tags JSONB,
  strengths TEXT[],
  weaknesses TEXT[],
  suggested_variations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date, ad_id, copy_type)
);

-- 3. 週報洞察表
CREATE TABLE IF NOT EXISTS weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  insights JSONB NOT NULL,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 洞察執行追蹤表
CREATE TABLE IF NOT EXISTS insight_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_insight_id UUID REFERENCES weekly_insights(id),
  insight_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  status_updated_at TIMESTAMPTZ,
  status_notes TEXT,
  result_summary TEXT,
  result_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(weekly_insight_id, insight_id)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_ad_creatives_report_date ON ad_creatives(report_date);
CREATE INDEX IF NOT EXISTS idx_ad_copies_report_date ON ad_copies(report_date);
CREATE INDEX IF NOT EXISTS idx_weekly_insights_report_date ON weekly_insights(report_date);
CREATE INDEX IF NOT EXISTS idx_insight_tracking_weekly_insight_id ON insight_tracking(weekly_insight_id);

-- RLS Policies (Row Level Security)
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_tracking ENABLE ROW LEVEL SECURITY;

-- 允許匿名讀取（公開儀表板）
CREATE POLICY "Allow anonymous read on ad_creatives" ON ad_creatives FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read on ad_copies" ON ad_copies FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read on weekly_insights" ON weekly_insights FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read on insight_tracking" ON insight_tracking FOR SELECT USING (true);

-- 允許 service_role 完全存取
CREATE POLICY "Allow service_role all on ad_creatives" ON ad_creatives FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role all on ad_copies" ON ad_copies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role all on weekly_insights" ON weekly_insights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role all on insight_tracking" ON insight_tracking FOR ALL USING (auth.role() = 'service_role');
