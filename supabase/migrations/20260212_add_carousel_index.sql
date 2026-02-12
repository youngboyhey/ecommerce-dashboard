-- [2026-02-12] 修改 ad_creatives 表支援每張輪播圖一筆記錄
-- 選項 A 實作：每張輪播圖獨立一筆 ad_creatives 記錄

-- 1. 新增 carousel_index 欄位（預設 0 表示主圖/首圖）
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS carousel_index INTEGER DEFAULT 0;

-- 2. 新增輪播圖專屬欄位
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS carousel_name TEXT;        -- 輪播卡片標題
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS carousel_description TEXT; -- 輪播卡片描述
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS carousel_link TEXT;        -- 輪播卡片連結

-- 3. 刪除舊的唯一約束
ALTER TABLE ad_creatives DROP CONSTRAINT IF EXISTS ad_creatives_report_date_ad_id_key;
ALTER TABLE ad_creatives DROP CONSTRAINT IF EXISTS ad_creatives_week_start_ad_id_key;

-- 4. 建立新的唯一約束（加入 carousel_index）
ALTER TABLE ad_creatives ADD CONSTRAINT ad_creatives_week_start_ad_id_carousel_idx_key 
  UNIQUE(week_start, ad_id, carousel_index);

-- 5. 為 carousel_index 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_ad_creatives_carousel ON ad_creatives(ad_id, carousel_index);

-- 6. 新增備註
COMMENT ON COLUMN ad_creatives.carousel_index IS '輪播圖片順序，0 表示首圖/主圖';
COMMENT ON COLUMN ad_creatives.carousel_name IS '輪播卡片的標題（如：🌊 海洋 | 清爽持久）';
COMMENT ON COLUMN ad_creatives.carousel_description IS '輪播卡片的副標題/描述';
COMMENT ON COLUMN ad_creatives.carousel_link IS '輪播卡片的目標連結';
