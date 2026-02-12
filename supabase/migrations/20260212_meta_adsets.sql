-- 建立 meta_adsets 資料表用於存放廣告受眾設定
CREATE TABLE IF NOT EXISTS meta_adsets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  adset_id TEXT NOT NULL,
  adset_name TEXT NOT NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  targeting JSONB,  -- 包含年齡、性別、地區、興趣、自訂受眾
  spend DECIMAL(10,2),
  impressions INTEGER,
  clicks INTEGER,
  purchases INTEGER,
  roas DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_adsets_report ON meta_adsets(report_id);

-- targeting 欄位結構範例：
-- {
--   "age_min": 25,
--   "age_max": 55,
--   "genders": [1, 2],  -- 1=male, 2=female
--   "geo_locations": {
--     "countries": ["TW"],
--     "cities": [{"key": "2306179", "name": "Taipei"}]
--   },
--   "interests": [
--     {"id": "6003139266461", "name": "汽車"},
--     {"id": "6003107902433", "name": "汽車改裝"}
--   ],
--   "custom_audiences": [
--     {"id": "23849012345", "name": "網站訪客-30天"},
--     {"id": "23849012346", "name": "購買客戶"}
--   ],
--   "excluded_custom_audiences": [
--     {"id": "23849012347", "name": "已購買7天"}
--   ]
-- }
