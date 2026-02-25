-- Add video fields to ad_creatives table
-- Migration: 2026-02-13

-- 影片素材標記
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT FALSE;

-- 影片 ID（Meta video_id）
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS video_id TEXT;

-- 影片封面圖 URL
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- 影片分析結果（GCP Video Intelligence / Gemini 分析）
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS video_analysis JSONB;

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_ad_creatives_is_video ON ad_creatives(is_video) WHERE is_video = TRUE;
CREATE INDEX IF NOT EXISTS idx_ad_creatives_video_id ON ad_creatives(video_id) WHERE video_id IS NOT NULL;

-- 更新 comment
COMMENT ON COLUMN ad_creatives.is_video IS '是否為影片素材';
COMMENT ON COLUMN ad_creatives.video_id IS 'Meta 影片 ID';
COMMENT ON COLUMN ad_creatives.video_thumbnail_url IS '影片封面圖 URL (Supabase Storage)';
COMMENT ON COLUMN ad_creatives.video_analysis IS 'GCP Video Intelligence / Gemini 影片分析結果';
