# Dashboard 數據正確性 Code Review 報告

**審查日期**: 2026-02-11
**審查者**: 八爪章魚 🐙

---

## 📊 1. 數據流檢查

### useReportData.ts - Supabase 數據獲取

| 項目 | 狀態 | 說明 |
|------|------|------|
| 查詢邏輯 | ✅ 正確 | 支援 weekly/daily 模式，dateRange 過濾 |
| 空數組保護 | ✅ 正確 | `aggregateDailyReports` 已處理空數組情況 |
| `findTopAudienceSegment` | ✅ 正確 | 有空數組保護，防止 reduce crash |
| 聚合模式檢測 | ✅ 正確 | 以 `aggregated-` 前綴判斷是否需查詢多個 report_id |
| 數據轉換 | ✅ 正確 | `transformToReportData` 正確映射所有欄位 |

### useWeeklyData.ts - 週報彙總計算

| 項目 | 狀態 | 說明 |
|------|------|------|
| 週選項計算 | ✅ 正確 | 正確從最新日期往回推算 4 週 |
| 累加值計算 | ✅ 正確 | revenue, orders, adSpend, newMembers, sessions 正確累加 |
| 平均值計算 | ✅ 正確 | conversion 使用平均值 |
| MER 計算 | ✅ 正確 | `revenue / adSpend` |
| **ROAS 計算** | ⚠️ **需修正** | 目前 `roas = revenue / adSpend`，與 MER 重複，應使用 `meta_conv_value / meta_spend` |
| WoW 變化計算 | ✅ 正確 | `calcChange` 函數正確計算百分比變化 |

### aggregateDailyReports - 多天數據聚合

| 項目 | 狀態 | 說明 |
|------|------|------|
| 累加指標 | ✅ 正確 | spend, clicks, purchases, atc, conv_value, revenue, orders 等 |
| 平均指標 | ✅ 正確 | CTR, overall_conversion 使用平均值 |
| 衍生指標 | ✅ 正確 | ROAS, CPA, AOV, MER 根據聚合後數值重新計算 |

### 關聯數據聚合

| 函數 | 狀態 | 說明 |
|------|------|------|
| `aggregateCampaigns` | ⚠️ 有瑕疵 | CTR 計算使用 `clicks/spend`，應為 `clicks/impressions`（但無 impressions 欄位） |
| `aggregateAudienceAge` | ✅ 正確 | 按 age_range 合併 |
| `aggregateAudienceGender` | ✅ 正確 | 按 gender 合併 |
| `aggregateProductRankings` | ✅ 正確 | 按 SKU 合併，重新計算排名 |
| `aggregateChannels` | ✅ 正確 | 按 source 合併，重算 session_to_atc_rate |

---

## 💰 2. KPI 卡片數據

### 主要 KPI (第一排)

| KPI | 公式 | 狀態 | 驗證 |
|-----|------|------|------|
| 總營收 | `cyber_revenue` | ✅ 正確 | `weeklyData?.revenue ?? data.summary.total_revenue` |
| 訂單數 | `cyber_order_count` | ✅ 正確 | `weeklyData?.orders ?? data.summary.order_count` |
| MER | `cyber_revenue / meta_spend` | ✅ 正確 | 正確使用 MER 公式 |
| 新增會員 | `cyber_new_members` | ✅ 正確 | `weeklyData?.newMembers ?? data.summary.new_members` |

### 次要 KPI (第二排)

| KPI | 公式 | 狀態 | 驗證 |
|-----|------|------|------|
| 廣告花費 | `meta_spend` | ✅ 正確 | `weeklyData?.adSpend ?? data.summary.total_spend` |
| 客單價 (AOV) | `cyber_revenue / cyber_order_count` | ✅ 正確 | 在 aggregation 中正確計算 |
| **廣告 ROAS** | `meta_conv_value / meta_spend` | ⚠️ **問題** | useWeeklyData 中 roas 實際是 MER |
| 轉換率 | `ga4_overall_conversion` | ✅ 正確 | 使用平均值計算 |

---

## 📈 3. 圖表數據

| 圖表 | 數據來源 | 狀態 | 驗證 |
|------|----------|------|------|
| RevenueTrendChart | `useHistoricalData` + dateRange 過濾 | ✅ 正確 | 根據 selectedWeek 過濾日數據 |
| MetaAdsChart | `data.meta.campaigns` | ✅ 正確 | 來自聚合後的 campaigns |
| GA4Funnel | `data.ga4` | ✅ 正確 | sessions, atc, ic, purchases |
| AudienceAnalysis | `data.meta_audience` | ✅ 正確 | age, gender 數據 |
| DeviceBreakdown | `data.ga4_devices` | ✅ 正確 | 從 raw_data 映射 |
| ProductRanking | `data.cyberbiz.product_ranking` | ✅ 正確 | 聚合後按營收排序 |
| GSCPerformance | `data.gsc` | ✅ 正確 | 從 raw_data 讀取 |
| ChannelPerformance | `data.ga4_channels` | ✅ 正確 | 聚合後的渠道數據 |

---

## 🔄 4. 週報切換

| 項目 | 狀態 | 驗證 |
|------|------|------|
| WeekSelector 傳遞 | ✅ 正確 | 正確更新 selectedWeek state |
| dateRange 計算 | ✅ 正確 | `useMemo` 依據 selectedWeek 計算 |
| useReportData 接收 | ✅ 正確 | 接收 dateRange 並查詢對應範圍 |
| RevenueTrendChart 過濾 | ✅ 正確 | 接收 dateRange 並過濾 dailyData |
| 組件響應更新 | ✅ 正確 | 所有組件使用 data prop，切換週時自動更新 |

---

## 🔴 需要修復的問題

### ❌ 錯誤 #1: useWeeklyData ROAS 計算錯誤

**問題**: `useWeeklyData.ts` 中 ROAS 的計算與 MER 相同，都是 `revenue / adSpend`。

**預期**: 廣告 ROAS 應為 `meta_conv_value / meta_spend`

**位置**: `src/lib/useWeeklyData.ts` - `calculateWeekSummary` 函數

**修復方案**: 需要從 daily 報表中讀取 `meta_conv_value` 並正確計算 ROAS

---

## ⚠️ 潛在問題

### 1. Campaign CTR 聚合計算

**位置**: `useReportData.ts` - `aggregateCampaigns` 函數

**問題**: CTR 計算使用 `clicks / spend * 100`，實際 CTR 應為 `clicks / impressions * 100`

**原因**: `CampaignRow` 目前沒有 `impressions` 欄位

**建議**: 
- 方案 A: 新增 impressions 欄位到 meta_campaigns 表
- 方案 B: 從 raw_data 讀取 impressions
- 方案 C: 暫時使用加權平均 CTR（需要 impressions）

### 2. GA4 Devices 數據依賴 raw_data

**位置**: `useReportData.ts` - `transformToReportData` 函數

**問題**: `ga4_devices` 完全從 `raw_data` 讀取，如果 raw_data 為空則顯示模擬數據

**建議**: 考慮將 ga4_devices 獨立存為關聯表

---

## ✅ 正確的部分

1. **數據獲取架構**: Supabase 查詢邏輯完整，支援 daily/weekly 模式
2. **空值保護**: 所有聚合函數都有空數組保護
3. **數據轉換**: `transformToReportData` 正確映射所有欄位
4. **週報切換**: 完整的響應式更新，所有組件都會根據 selectedWeek 更新
5. **MER 計算**: 正確使用 `cyber_revenue / meta_spend`
6. **聚合邏輯**: 累加值和平均值的區分正確
7. **圖表數據**: 所有圖表都使用正確的數據來源

---

## 修復記錄

| 日期 | 問題 | 修復 | Commit |
|------|------|------|--------|
| 2026-02-11 | useWeeklyData ROAS 計算錯誤 | 新增 meta_conv_value 查詢並正確計算 ROAS | `8155ebe` ✅ |

