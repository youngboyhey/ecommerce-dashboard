#!/usr/bin/env python3
"""
AI 分析任務觸發器
讀取 report_data.json，產出 ai_analysis_task.json 供 sub-agent 執行分析

[2026-02-12 修正] 改為按「廣告」分組，而非按「圖片」分組
- 每個廣告（ad_id）只產出一筆分析
- 輪播圖片合併在一起分析
- 只分析本週有花費的廣告

Usage:
    python scripts/trigger_ai_analysis.py [--input report_data.json] [--output ai_analysis_task.json]
"""
import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path


def load_report_data(input_path: str) -> dict:
    """載入報表數據"""
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        sys.exit(1)
    
    with open(input_path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_creatives_for_analysis(report: dict) -> list:
    """
    從報表中提取需要 AI 分析的素材資料
    
    [核心修正] 以 meta_adsets（本週有花費的廣告）為主
    每個廣告 = 1 筆分析（包含所有輪播圖）
    """
    ad_creatives = report.get("ad_creatives", [])
    meta_adsets = report.get("meta_adsets", [])
    
    if not meta_adsets:
        print("⚠️ No meta_adsets found - 本週沒有開啟的廣告")
        return []
    
    # Step 1: 建立 ad_creatives 映射表
    # 關鍵發現：adset_id 和 ad_id 的前 12 位數字相同（屬於同一個 campaign 結構）
    creative_by_ad_id = {}
    creative_by_id_prefix = {}  # 新增：用 ID 前綴索引（最可靠的匹配方式）
    creative_by_name_prefix = {}
    
    for creative in ad_creatives:
        ad_id = creative.get("ad_id", "")
        ad_name = creative.get("ad_name", "")
        
        if ad_id:
            creative_by_ad_id[ad_id] = creative
            # 用 ID 前 12 位建立索引
            id_prefix = ad_id[:12] if len(ad_id) >= 12 else ad_id
            # 優先保留有文案和輪播圖的 creative
            if id_prefix not in creative_by_id_prefix:
                creative_by_id_prefix[id_prefix] = creative
            else:
                existing = creative_by_id_prefix[id_prefix]
                # 如果新的有文案而舊的沒有，替換
                if creative.get("body") and not existing.get("body"):
                    creative_by_id_prefix[id_prefix] = creative
                # 如果新的有輪播圖而舊的沒有，替換
                elif creative.get("carousel_images") and not existing.get("carousel_images"):
                    creative_by_id_prefix[id_prefix] = creative
        
        # 建立名稱前綴索引（備用）
        if ad_name:
            prefix = "_".join(ad_name.split("_")[:2]) if "_" in ad_name else ad_name[:20]
            creative_by_name_prefix[prefix] = creative
    
    print(f"📊 Report contains:")
    print(f"   - {len(meta_adsets)} adsets with spend (本週有開)")
    print(f"   - {len(ad_creatives)} total creatives (歷史全部)")
    print(f"   - ID prefixes indexed: {list(creative_by_id_prefix.keys())}")
    
    # Step 2: 從有花費的 adsets 出發，匹配對應的 creative
    creatives_for_analysis = []
    used_creative_ids = set()  # 追蹤已使用的 creative，避免重複
    
    for adset in meta_adsets:
        adset_id = adset.get("adset_id", "")
        adset_name = adset.get("adset_name", "")
        spend = adset.get("spend", 0)
        
        # 跳過沒花費的
        if spend <= 0:
            continue
        
        # 嘗試找對應的 creative
        matched_creative = None
        
        # 方法 1: 直接用 adset_id 匹配
        if adset_id in creative_by_ad_id:
            matched_creative = creative_by_ad_id[adset_id]
        
        # 方法 2【最可靠】: 用 ID 前 12 位匹配
        if not matched_creative:
            id_prefix = adset_id[:12] if len(adset_id) >= 12 else adset_id
            if id_prefix in creative_by_id_prefix:
                matched_creative = creative_by_id_prefix[id_prefix]
        
        # 方法 3: 用名稱前綴匹配
        if not matched_creative:
            adset_prefix = "_".join(adset_name.split("_")[:2]) if "_" in adset_name else adset_name[:20]
            for prefix, creative in creative_by_name_prefix.items():
                if (adset_prefix in prefix or prefix in adset_prefix or 
                    adset_name in creative.get("ad_name", "") or
                    creative.get("ad_name", "") in adset_name):
                    if creative.get("ad_id", "") not in used_creative_ids:
                        matched_creative = creative
                        break
        
        # 方法 4: 用關鍵字匹配（最後手段）
        if not matched_creative:
            for creative in ad_creatives:
                creative_id = creative.get("ad_id", "")
                creative_name = creative.get("ad_name", "")
                
                if creative_id in used_creative_ids:
                    continue
                
                keywords = ["芳香磚", "香氛磚", "LM", "優化", "互動", "任選", "組合"]
                for kw in keywords:
                    if kw in adset_name and kw in creative_name:
                        matched_creative = creative
                        break
                if matched_creative:
                    break
        
        # 記錄已使用的 creative
        if matched_creative:
            used_creative_ids.add(matched_creative.get("ad_id", ""))
        
        # 收集輪播圖片 URL
        carousel_images = []
        copy_text = ""
        ad_id = adset_id  # 預設用 adset_id
        ad_name_final = adset_name
        
        if matched_creative:
            ad_id = matched_creative.get("ad_id", adset_id)
            ad_name_final = matched_creative.get("ad_name", adset_name)
            copy_text = matched_creative.get("body", "") or matched_creative.get("title", "")
            
            # 優先用 Supabase 備份的 URL
            supabase_urls = matched_creative.get("supabase_carousel_urls", [])
            if supabase_urls:
                if isinstance(supabase_urls[0], dict):
                    carousel_images = [u.get("url") for u in supabase_urls if u.get("url")]
                else:
                    carousel_images = supabase_urls
            else:
                # 用原始 carousel_images
                for img in matched_creative.get("carousel_images", []):
                    url = img.get("image_url") if isinstance(img, dict) else img
                    if url and url.startswith("http"):
                        carousel_images.append(url)
                
                # 如果沒有輪播圖，用主圖
                if not carousel_images:
                    main_url = matched_creative.get("supabase_image_url") or matched_creative.get("image_url")
                    if main_url:
                        carousel_images = [main_url]
        
        print(f"   ✓ {adset_name[:40]}... → matched creative: {ad_name_final[:30] if matched_creative else 'None'}")
        
        # 計算 CVR
        impressions = adset.get("impressions", 0)
        ctr = adset.get("ctr", 0)
        clicks = int(impressions * ctr / 100) if impressions and ctr else 0
        purchases = adset.get("purchases", 0)
        cvr = (purchases / clicks * 100) if clicks > 0 else 0
        
        creatives_for_analysis.append({
            "ad_id": ad_id,
            "adset_id": adset_id,
            "ad_name": ad_name_final,
            "carousel_images": carousel_images[:7],  # 最多 7 張（輪播上限）
            "image_count": len(carousel_images),
            "is_carousel": len(carousel_images) > 1,
            "metrics": {
                "ctr": round(adset.get("ctr", 0), 2),
                "cvr": round(cvr, 2),
                "roas": round(adset.get("roas", 0), 2),
                "spend": round(adset.get("spend", 0), 0),
                "purchases": purchases,
                "impressions": impressions,
                "cpm": round(adset.get("cpm", 0), 2)
            },
            "copy": copy_text,
            # [NEW] 加入 targeting 資料供受眾分析
            "targeting": adset.get("targeting", {})
        })
    
    # 按花費排序
    creatives_for_analysis.sort(key=lambda x: x["metrics"]["spend"], reverse=True)
    
    print(f"\n📋 Final: {len(creatives_for_analysis)} ads to analyze")
    return creatives_for_analysis


def generate_ai_task(report: dict, output_path: str) -> dict:
    """產生 AI 分析任務 JSON"""
    creatives = extract_creatives_for_analysis(report)
    
    if not creatives:
        print("⚠️ No creatives with spend found for analysis")
        return None
    
    # 取得報表日期
    report_date = report.get("end_date") or datetime.now().strftime("%Y-%m-%d")
    
    task = {
        "task_type": "weekly_ai_analysis",
        "report_date": report_date,
        "generated_at": datetime.now().isoformat(),
        "total_ads": len(creatives),
        "creatives": creatives,
        "analysis_instructions": """
請分析以下廣告的視覺元素、文案和受眾設定。

## 重要：每個廣告可能包含多張輪播圖
- 請將同一廣告的所有輪播圖「綜合分析」
- 不要把每張圖當成獨立素材

## 分析要求

1. **視覺分析**（針對輪播組合整體，需詳細評估）：
   - 整體構圖和視覺流動（評分 1-10）
   - 色彩搭配的和諧度（主色調、對比、品牌一致性）
   - 吸引力評分（1-10）：第一眼吸睛程度
   - 文字排版和易讀性
   - 產品展示方式
   - 輪播圖之間的關聯性和故事性
   - 視覺成功因素（為什麼有效）
   - 視覺待改善項目（哪些地方可以更好）
   - 視覺優化建議（具體改進方向）

2. **文案分析**（需詳細評估）：
   - 語調和風格：專業、親切、幽默、急迫感...
   - 情感觸發點：FOMO、社會認同、獨特性、稀缺性...
   - CTA 有效性：
     * 是否明確告知下一步行動
     * 用詞是否有動力（立即、限時、免費...）
     * 是否減少購買阻力
   - CTA 評分 (1-10)：根據明確性和動力評分
   - 整體評分 (1-10)：根據清晰度、說服力、行動呼籲強度綜合評分
   - 文案成功因素（為什麼這個文案有效）
   - 文案待改善項目（哪些地方可以更好）
   - 文案優化建議（具體改寫方向或範例）

3. **受眾分析**（分析 targeting 設定）：
   - 年齡範圍是否合適（太廣或太窄）
   - 性別設定是否合理
   - 地區設定是否精準
   - 興趣標籤的相關性和精準度
   - 自訂受眾/類似受眾的品質評估
   - 受眾與產品/文案的匹配度
   
   評估標準：
   - 興趣標籤數量：5-15 個最佳，超過 20 個可能過於分散
   - Lookalike 受眾：檢查來源品質（加入購物車 > 瀏覽內容）
   - 年齡範圍：過廣（18+）可能浪費預算，建議根據產品屬性縮窄

4. **成效歸因**：結合成效數據（CTR、ROAS、購買數）和受眾設定，判斷：
   - 跨維度成功因素（視覺+文案+受眾的綜合優勢）
   - 跨維度失敗因素（哪些維度拖累整體表現）
   - 優先改善建議（最能提升成效的優化方向）

請以結構化方式輸出分析結果。
""",
        "output_format": {
            "per_ad": {
                "ad_id": "廣告 ID",
                "adset_id": "廣告組 ID",
                "vision_analysis": {
                    "composition": "整體構圖描述",
                    "composition_score": "構圖評分 1-10",
                    "color_scheme": ["主色調"],
                    "color_harmony": "色彩和諧度評估",
                    "brand_consistency": "品牌一致性評估",
                    "attractiveness_score": "吸引力評分 1-10",
                    "text_detected": "圖片文字內容",
                    "text_readability": "文字易讀性評估",
                    "product_presentation": "產品呈現方式",
                    "carousel_narrative": "輪播故事性描述（如有多張圖）",
                    "success_factors": ["視覺成功因素"],
                    "failure_factors": ["視覺待改善項目"],
                    "improvement_suggestions": ["視覺優化建議"]
                },
                "copy_analysis": {
                    "tone": "語調（專業/親切/幽默/急迫）",
                    "emotional_triggers": ["情感觸發點"],
                    "call_to_action": "CTA 內容",
                    "cta_effectiveness": "CTA 有效性評估",
                    "cta_score": "CTA 評分 1-10",
                    "overall_score": "1-10 評分",
                    "strengths": ["文案成功因素"],
                    "weaknesses": ["文案待改善項目"],
                    "suggested_improvements": ["文案優化建議"]
                },
                "targeting_analysis": {
                    "age_assessment": "年齡範圍評估（是否適合產品）",
                    "gender_assessment": "性別設定評估",
                    "location_assessment": "地區設定評估",
                    "interests_assessment": "興趣標籤評估（數量、相關性、精準度）",
                    "custom_audience_assessment": "自訂受眾/Lookalike 評估",
                    "audience_product_fit": "受眾與產品匹配度",
                    "strengths": ["受眾設定優點"],
                    "weaknesses": ["受眾設定缺點"],
                    "suggestions": ["受眾優化建議"],
                    "score": "1-10 評分"
                }
            },
            "overall_success_factors": ["跨維度成功因素"],
            "overall_failure_factors": ["跨維度失敗因素"],
            "priority_improvements": ["優先改善建議"],
            "summary": {
                "best_performing": "表現最佳的廣告 ID",
                "best_targeting": "受眾設定最佳的廣告組 ID",
                "key_insights": ["關鍵洞察"],
                "targeting_insights": ["受眾相關洞察"],
                "next_week_recommendations": ["下週建議"]
            }
        }
    }
    
    # 寫入檔案
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(task, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ AI analysis task saved to {output_path}")
    print(f"   - Report date: {report_date}")
    print(f"   - Ads to analyze: {len(creatives)}")
    print(f"   - Analysis types: vision, copy, targeting")
    for i, c in enumerate(creatives):
        targeting = c.get("targeting", {})
        targeting_info = ""
        if targeting:
            interests_count = len(targeting.get("interests", []))
            custom_count = len(targeting.get("custom_audiences", []))
            targeting_info = f", {interests_count} interests, {custom_count} custom audiences"
        print(f"     {i+1}. {c['ad_name'][:40]}... ({c['image_count']} images, ${c['metrics']['spend']:.0f} spent{targeting_info})")
    
    return task


def main():
    parser = argparse.ArgumentParser(description="Generate AI analysis task for sub-agent")
    parser.add_argument("--input", "-i", default="report_data.json",
                        help="Input report JSON file (default: report_data.json)")
    parser.add_argument("--output", "-o", default="ai_analysis_task.json",
                        help="Output task JSON file (default: ai_analysis_task.json)")
    args = parser.parse_args()
    
    print(f"📊 Loading report from {args.input}...")
    report = load_report_data(args.input)
    
    # 檢查是否為週報
    if report.get("mode") != "weekly":
        print(f"⚠️ Warning: Report mode is '{report.get('mode')}', AI analysis is designed for weekly reports")
    
    print(f"🔧 Generating AI analysis task...\n")
    task = generate_ai_task(report, args.output)
    
    if task:
        print(f"\n📋 Next step: spawn sub-agent (螃蟹) to process {args.output}")
    
    return 0 if task else 1


if __name__ == "__main__":
    sys.exit(main())
