-- [2026-02-12] 更新 ad_creatives 的 metrics 欄位，加入 clicks 和 purchases
-- 這個腳本用於確保 CVR 可以正確計算

-- 更新「任選3入」廣告的 metrics（涵，clicks=518, purchases=4）
UPDATE ad_creatives
SET metrics = jsonb_set(
  jsonb_set(
    COALESCE(metrics, '{}'::jsonb),
    '{clicks}',
    '518'::jsonb
  ),
  '{purchases}',
  '4'::jsonb
)
WHERE creative_name LIKE '%任選3入%'
  AND report_date = '2026-02-09';  -- 調整為正確的 report_date

-- 更新「龍蝦標題版」廣告的 metrics（J，clicks=342, purchases=5）
UPDATE ad_creatives
SET metrics = jsonb_set(
  jsonb_set(
    COALESCE(metrics, '{}'::jsonb),
    '{clicks}',
    '342'::jsonb
  ),
  '{purchases}',
  '5'::jsonb
)
WHERE creative_name LIKE '%龍蝦%'
  AND report_date = '2026-02-09';  -- 調整為正確的 report_date

-- 驗證更新結果
SELECT 
  creative_name,
  metrics->>'spend' as spend,
  metrics->>'clicks' as clicks,
  metrics->>'purchases' as purchases,
  CASE 
    WHEN (metrics->>'clicks')::int > 0 
    THEN ROUND(((metrics->>'purchases')::numeric / (metrics->>'clicks')::numeric * 100), 2)
    ELSE 0 
  END as calculated_cvr
FROM ad_creatives
WHERE report_date = '2026-02-09';
