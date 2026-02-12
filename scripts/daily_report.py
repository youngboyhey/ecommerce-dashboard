import os
import json
import requests
import argparse
from datetime import datetime, timedelta
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)

# Configuration
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN")
META_AD_ACCOUNT_ID = os.environ.get("META_AD_ACCOUNT_ID")
GA4_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID")
GA4_KEY_PATH = os.environ.get("GA4_KEY_PATH")
CYBERBIZ_TOKEN = os.environ.get("CYBERBIZ_TOKEN")

# [NEW] Google Search Console Configuration
GSC_KEY_PATH = os.environ.get("GSC_KEY_PATH", os.environ.get("GA4_KEY_PATH"))  # 可共用同一個 Service Account
GSC_SITE_URL = os.environ.get("GSC_SITE_URL")  # 例如 "https://example.com" 或 "sc-domain:example.com"

def parse_insight(insight):
    # Parse ROAS
    roas = 0.0
    if "purchase_roas" in insight:
        for item in insight["purchase_roas"]:
            if item["action_type"] == "omni_purchase":
                roas = float(item["value"])
    
    # Parse Actions
    atc = 0
    ic = 0
    vc = 0
    purchases = 0
    if "actions" in insight:
        for item in insight["actions"]:
            val = int(item["value"])
            if item["action_type"] == "omni_add_to_cart": atc = val
            elif item["action_type"] == "omni_initiated_checkout": ic = val
            elif item["action_type"] == "omni_view_content": vc = val
            elif item["action_type"] == "omni_purchase": purchases = val
    
    # Parse Conversion Value
    conv_value = 0.0
    if "action_values" in insight:
        for item in insight["action_values"]:
            if item["action_type"] == "omni_purchase":
                conv_value = float(item["value"])
    
    spend = float(insight.get("spend", 0))
    return {
        "name": insight.get("campaign_name", "Account Total"),
        "spend": spend,
        "ctr": float(insight.get("ctr", 0)),
        "clicks": int(insight.get("inline_link_clicks", 0)),
        "roas": roas,
        "purchases": purchases,
        "atc": atc,
        "ic": ic,
        "vc": vc,
        "conv_value": conv_value,
        "cpa": spend / purchases if purchases > 0 else 0,
        "cp_atc": spend / atc if atc > 0 else 0
    }

def get_meta_data(start_date, end_date):
    acc_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/insights"
    params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "campaign_name,campaign_id,spend,ctr,inline_link_clicks,purchase_roas,actions,action_values",
    }
    
    # 1. Account Total
    acc_resp = requests.get(acc_url, params=params).json()
    account_total = parse_insight(acc_resp["data"][0]) if "data" in acc_resp and acc_resp["data"] else None

    # 2. Campaigns
    camp_params = params.copy()
    camp_params["level"] = "campaign"
    camp_resp = requests.get(acc_url, params=camp_params).json()
    
    campaigns = []
    if "data" in camp_resp:
        for item in camp_resp["data"]:
            if float(item.get("spend", 0)) > 0:
                p = parse_insight(item)
                p["campaign_id"] = item.get("campaign_id") # Keep ID
                campaigns.append(p)
                
    return {
        "total": account_total,
        "campaigns": campaigns
    }


def get_meta_audience_breakdown(start_date, end_date):
    """
    [NEW] 取得 Meta Ads 受眾數據分布（年齡、性別、地區）
    使用 breakdown 參數分析廣告受眾
    """
    base_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    
    audience_data = {
        "age": [],
        "gender": [],
        "region": [],
        "age_gender": []
    }
    
    # 1. Age breakdown
    age_params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": time_range,
        "fields": "spend,impressions,clicks,actions",
        "breakdowns": "age"
    }
    try:
        age_resp = requests.get(base_url, params=age_params).json()
        if "data" in age_resp:
            for item in age_resp["data"]:
                purchases = 0
                if "actions" in item:
                    for action in item["actions"]:
                        if action["action_type"] == "omni_purchase":
                            purchases = int(action["value"])
                audience_data["age"].append({
                    "age_range": item.get("age", "Unknown"),
                    "spend": float(item.get("spend", 0)),
                    "impressions": int(item.get("impressions", 0)),
                    "clicks": int(item.get("clicks", 0)),
                    "purchases": purchases
                })
    except Exception as e:
        print(f"Error fetching age breakdown: {e}")
    
    # 2. Gender breakdown
    gender_params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": time_range,
        "fields": "spend,impressions,clicks,actions",
        "breakdowns": "gender"
    }
    try:
        gender_resp = requests.get(base_url, params=gender_params).json()
        if "data" in gender_resp:
            for item in gender_resp["data"]:
                purchases = 0
                if "actions" in item:
                    for action in item["actions"]:
                        if action["action_type"] == "omni_purchase":
                            purchases = int(action["value"])
                audience_data["gender"].append({
                    "gender": item.get("gender", "Unknown"),
                    "spend": float(item.get("spend", 0)),
                    "impressions": int(item.get("impressions", 0)),
                    "clicks": int(item.get("clicks", 0)),
                    "purchases": purchases
                })
    except Exception as e:
        print(f"Error fetching gender breakdown: {e}")
    
    # 3. Region breakdown (country + region)
    region_params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": time_range,
        "fields": "spend,impressions,clicks,actions",
        "breakdowns": "region"
    }
    try:
        region_resp = requests.get(base_url, params=region_params).json()
        if "data" in region_resp:
            for item in region_resp["data"]:
                purchases = 0
                if "actions" in item:
                    for action in item["actions"]:
                        if action["action_type"] == "omni_purchase":
                            purchases = int(action["value"])
                audience_data["region"].append({
                    "region": item.get("region", "Unknown"),
                    "spend": float(item.get("spend", 0)),
                    "impressions": int(item.get("impressions", 0)),
                    "clicks": int(item.get("clicks", 0)),
                    "purchases": purchases
                })
            # Sort by spend and keep top 10
            audience_data["region"] = sorted(
                audience_data["region"], 
                key=lambda x: x["spend"], 
                reverse=True
            )[:10]
    except Exception as e:
        print(f"Error fetching region breakdown: {e}")
    
    # 4. Age + Gender combined breakdown
    age_gender_params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": time_range,
        "fields": "spend,impressions,clicks,actions",
        "breakdowns": "age,gender"
    }
    try:
        ag_resp = requests.get(base_url, params=age_gender_params).json()
        if "data" in ag_resp:
            for item in ag_resp["data"]:
                purchases = 0
                if "actions" in item:
                    for action in item["actions"]:
                        if action["action_type"] == "omni_purchase":
                            purchases = int(action["value"])
                audience_data["age_gender"].append({
                    "age_range": item.get("age", "Unknown"),
                    "gender": item.get("gender", "Unknown"),
                    "spend": float(item.get("spend", 0)),
                    "impressions": int(item.get("impressions", 0)),
                    "clicks": int(item.get("clicks", 0)),
                    "purchases": purchases
                })
    except Exception as e:
        print(f"Error fetching age+gender breakdown: {e}")
    
    return audience_data


def get_meta_efficiency_metrics(start_date, end_date):
    """
    [NEW] 取得 Meta Ads 效率指標：CPM, Frequency, Reach, Impressions
    這些指標對於判斷廣告疲乏和成本控制至關重要
    """
    base_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/insights"
    params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "spend,impressions,reach,frequency,cpm"
    }
    
    try:
        resp = requests.get(base_url, params=params).json()
        if "data" in resp and resp["data"]:
            data = resp["data"][0]
            return {
                "impressions": int(data.get("impressions", 0)),
                "reach": int(data.get("reach", 0)),
                "frequency": float(data.get("frequency", 0)),
                "cpm": float(data.get("cpm", 0)),
                # 警示判斷
                "frequency_warning": float(data.get("frequency", 0)) > 2.5,
                "cpm_warning": float(data.get("cpm", 0)) > 300  # CPM > 300 需關注
            }
    except Exception as e:
        print(f"Error fetching efficiency metrics: {e}")
    
    return {
        "impressions": 0, "reach": 0, "frequency": 0, "cpm": 0,
        "frequency_warning": False, "cpm_warning": False
    }


def parse_targeting(raw_targeting):
    """
    [NEW] 簡化 Meta Ads targeting 資料格式
    將原始 API 回傳的複雜結構轉換為易讀格式
    """
    if not raw_targeting:
        return None
    
    result = {}
    
    # 1. 年齡範圍
    age_min = raw_targeting.get("age_min", 18)
    age_max = raw_targeting.get("age_max", 65)
    if age_max == 65:
        result["age_range"] = f"{age_min}+"
    else:
        result["age_range"] = f"{age_min}-{age_max}"
    
    # 2. 性別
    genders = raw_targeting.get("genders", [])
    gender_map = {1: "男", 2: "女"}
    if genders:
        result["genders"] = [gender_map.get(g, str(g)) for g in genders]
    else:
        result["genders"] = ["不限"]
    
    # 3. 地區
    geo_locations = raw_targeting.get("geo_locations", {})
    locations = []
    # 國家
    countries = geo_locations.get("countries", [])
    country_map = {"TW": "台灣", "HK": "香港", "JP": "日本", "US": "美國", "SG": "新加坡", "MY": "馬來西亞"}
    for c in countries:
        locations.append(country_map.get(c, c))
    # 地區/城市
    regions = geo_locations.get("regions", [])
    for r in regions:
        if isinstance(r, dict):
            locations.append(r.get("name", str(r)))
        else:
            locations.append(str(r))
    cities = geo_locations.get("cities", [])
    for city in cities:
        if isinstance(city, dict):
            locations.append(city.get("name", str(city)))
        else:
            locations.append(str(city))
    result["locations"] = locations if locations else ["未指定"]
    
    # 4. 興趣
    interests = []
    flexible_spec = raw_targeting.get("flexible_spec", [])
    for spec in flexible_spec:
        if isinstance(spec, dict):
            for interest in spec.get("interests", []):
                if isinstance(interest, dict):
                    interests.append(interest.get("name", ""))
                else:
                    interests.append(str(interest))
            # behaviors
            for behavior in spec.get("behaviors", []):
                if isinstance(behavior, dict):
                    interests.append(behavior.get("name", ""))
    # 直接的 interests 欄位
    direct_interests = raw_targeting.get("interests", [])
    for interest in direct_interests:
        if isinstance(interest, dict):
            interests.append(interest.get("name", ""))
        else:
            interests.append(str(interest))
    result["interests"] = interests if interests else []
    
    # 5. 自訂受眾
    custom_audiences = []
    for ca in raw_targeting.get("custom_audiences", []):
        if isinstance(ca, dict):
            custom_audiences.append(ca.get("name", ca.get("id", "")))
        else:
            custom_audiences.append(str(ca))
    result["custom_audiences"] = custom_audiences if custom_audiences else []
    
    # 6. 排除受眾
    excluded_audiences = []
    for ea in raw_targeting.get("excluded_custom_audiences", []):
        if isinstance(ea, dict):
            excluded_audiences.append(ea.get("name", ea.get("id", "")))
        else:
            excluded_audiences.append(str(ea))
    if excluded_audiences:
        result["excluded_audiences"] = excluded_audiences
    
    return result


def get_meta_adset_data(start_date, end_date):
    """
    [NEW] 取得廣告組 (Adset) 層級表現
    用於分析哪個受眾定向最有效
    包含 targeting（受眾設定）資料和受眾分布數據
    """
    base_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/insights"
    params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "adset_id,adset_name,spend,impressions,reach,ctr,purchase_roas,actions,cpm,clicks",
        "level": "adset",
        "limit": 20
    }
    
    adsets = []
    adset_ids = []  # 收集有花費的 adset_id
    try:
        resp = requests.get(base_url, params=params).json()
        if "data" in resp:
            for item in resp["data"]:
                spend = float(item.get("spend", 0))
                if spend > 0:
                    # Parse ROAS
                    roas = 0.0
                    if "purchase_roas" in item:
                        for r in item["purchase_roas"]:
                            if r["action_type"] == "omni_purchase":
                                roas = float(r["value"])
                    
                    # Parse purchases
                    purchases = 0
                    if "actions" in item:
                        for action in item["actions"]:
                            if action["action_type"] == "omni_purchase":
                                purchases = int(action["value"])
                    
                    adset_id = item.get("adset_id")
                    adsets.append({
                        "adset_id": adset_id,
                        "adset_name": item.get("adset_name", "Unknown"),
                        "spend": spend,
                        "impressions": int(item.get("impressions", 0)),
                        "reach": int(item.get("reach", 0)),
                        "clicks": int(item.get("clicks", 0)),
                        "ctr": float(item.get("ctr", 0)),
                        "cpm": float(item.get("cpm", 0)),
                        "roas": roas,
                        "purchases": purchases,
                        "cpa": spend / purchases if purchases > 0 else 0,
                        "targeting": None,  # 先初始化，稍後填入
                        # [NEW] 受眾分布數據（稍後填入）
                        "age_distribution": [],
                        "gender_distribution": [],
                        "interests": []
                    })
                    if adset_id:
                        adset_ids.append(adset_id)
        
        # Sort by ROAS descending
        adsets.sort(key=lambda x: x["roas"], reverse=True)
    except Exception as e:
        print(f"Error fetching adset data: {e}")
    
    # [NEW] 取得 targeting 資料
    if adset_ids:
        try:
            targeting_map = {}
            # 呼叫 adsets API 取得 targeting 欄位
            adsets_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/adsets"
            targeting_params = {
                "access_token": META_ACCESS_TOKEN,
                "fields": "id,name,targeting",
                "filtering": json.dumps([{
                    "field": "id",
                    "operator": "IN",
                    "value": adset_ids[:20]  # 最多 20 個
                }]),
                "limit": 20
            }
            targeting_resp = requests.get(adsets_url, params=targeting_params).json()
            
            if "data" in targeting_resp:
                for item in targeting_resp["data"]:
                    adset_id = item.get("id")
                    raw_targeting = item.get("targeting", {})
                    targeting_map[adset_id] = parse_targeting(raw_targeting)
            
            # 合併 targeting 到 adsets，並提取 interests
            for adset in adsets:
                adset_id = adset.get("adset_id")
                if adset_id in targeting_map:
                    targeting = targeting_map[adset_id]
                    adset["targeting"] = targeting
                    # 提取 interests 列表
                    if targeting:
                        adset["interests"] = targeting.get("interests", [])
                    
            print(f"✅ Fetched targeting for {len(targeting_map)} adsets")
        except Exception as e:
            print(f"⚠️  Error fetching adset targeting: {e}")
    
    # [NEW] 取得每個 adset 的年齡和性別分布
    for adset in adsets:
        adset_id = adset.get("adset_id")
        if adset_id:
            age_gender_data = get_adset_age_gender_breakdown(adset_id, start_date, end_date)
            if age_gender_data:
                adset["age_distribution"] = age_gender_data.get("age", [])
                adset["gender_distribution"] = age_gender_data.get("gender", [])
    
    return adsets[:10]  # Top 10 adsets


def get_adset_age_gender_breakdown(adset_id, start_date, end_date):
    """
    [NEW] 取得單一廣告組的年齡和性別花費分布
    """
    base_url = f"https://graph.facebook.com/v19.0/{adset_id}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    
    result = {
        "age": [],
        "gender": []
    }
    
    # 1. Age breakdown
    try:
        age_params = {
            "access_token": META_ACCESS_TOKEN,
            "time_range": time_range,
            "fields": "spend",
            "breakdowns": "age"
        }
        age_resp = requests.get(base_url, params=age_params).json()
        if "data" in age_resp:
            for item in age_resp["data"]:
                result["age"].append({
                    "age_range": item.get("age", "Unknown"),
                    "spend": float(item.get("spend", 0))
                })
    except Exception as e:
        print(f"  ⚠️ Error fetching age breakdown for {adset_id}: {e}")
    
    # 2. Gender breakdown
    try:
        gender_params = {
            "access_token": META_ACCESS_TOKEN,
            "time_range": time_range,
            "fields": "spend",
            "breakdowns": "gender"
        }
        gender_resp = requests.get(base_url, params=gender_params).json()
        if "data" in gender_resp:
            for item in gender_resp["data"]:
                result["gender"].append({
                    "gender": item.get("gender", "Unknown"),
                    "spend": float(item.get("spend", 0))
                })
    except Exception as e:
        print(f"  ⚠️ Error fetching gender breakdown for {adset_id}: {e}")
    
    return result


def get_meta_ad_creatives(start_date, end_date, backup_images=True):
    """
    [NEW] 取得廣告文案內容（ad creative body/title）
    並自動備份圖片到 Supabase Storage
    支援輪播廣告的多張圖片
    
    Args:
        start_date: 開始日期
        end_date: 結束日期
        backup_images: 是否備份圖片到 Supabase（預設 True）
    
    [FIX 2026-02-12] 先用 /insights API 取得日期範圍內有花費的廣告 ID，
    再抓取對應的 creative，確保只包含報告期間實際運行的廣告。
    """
    # Step 0: 先用 insights API 取得在日期範圍內有花費的廣告 ID 和完整成效數據
    insights_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/insights"
    insights_params = {
        "access_token": META_ACCESS_TOKEN,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "ad_id,ad_name,spend,impressions,clicks,ctr,cpm,purchase_roas,actions,action_values",
        "level": "ad",
        "limit": 100
    }
    
    ad_ids_with_spend = []
    ad_id_to_name = {}  # 用於後續比對
    ad_id_to_metrics = {}  # [NEW] 儲存每個廣告的成效數據
    try:
        insights_resp = requests.get(insights_url, params=insights_params).json()
        if "data" in insights_resp:
            for item in insights_resp["data"]:
                spend = float(item.get("spend", 0))
                if spend > 0:
                    ad_id = item.get("ad_id")
                    ad_ids_with_spend.append(ad_id)
                    ad_id_to_name[ad_id] = item.get("ad_name", "Unknown")
                    
                    # [NEW] 解析成效數據
                    roas = 0.0
                    if "purchase_roas" in item:
                        for r in item["purchase_roas"]:
                            if r.get("action_type") == "omni_purchase":
                                roas = float(r["value"])
                    
                    purchases = 0
                    atc = 0
                    if "actions" in item:
                        for action in item["actions"]:
                            if action.get("action_type") == "omni_purchase":
                                purchases = int(action["value"])
                            elif action.get("action_type") == "omni_add_to_cart":
                                atc = int(action["value"])
                    
                    conv_value = 0.0
                    if "action_values" in item:
                        for av in item["action_values"]:
                            if av.get("action_type") == "omni_purchase":
                                conv_value = float(av["value"])
                    
                    ad_id_to_metrics[ad_id] = {
                        "spend": spend,
                        "impressions": int(item.get("impressions", 0)),
                        "clicks": int(item.get("clicks", 0)),
                        "ctr": float(item.get("ctr", 0)),
                        "cpm": float(item.get("cpm", 0)),
                        "roas": roas,
                        "purchases": purchases,
                        "atc": atc,
                        "conv_value": conv_value,
                        "cpa": spend / purchases if purchases > 0 else 0
                    }
        print(f"📊 Found {len(ad_ids_with_spend)} ads with spend in {start_date} ~ {end_date}")
    except Exception as e:
        print(f"⚠️  Error fetching ad insights for date filter: {e}")
    
    # 如果沒有找到任何有花費的廣告，直接返回空列表
    if not ad_ids_with_spend:
        print(f"⚠️  No ads with spend found in date range {start_date} ~ {end_date}")
        return []
    
    # Step 1: 只抓取有花費的廣告的 creative - 使用 filtering by ad_id
    ads_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/ads"
    ads_params = {
        "access_token": META_ACCESS_TOKEN,
        "fields": "id,name,creative{id,title,body,object_story_spec,effective_object_story_id,image_url,thumbnail_url,asset_feed_spec}",
        "filtering": json.dumps([{"field": "id", "operator": "IN", "value": ad_ids_with_spend[:50]}]),
        "limit": 50
    }
    
    creatives = []
    try:
        ads_resp = requests.get(ads_url, params=ads_params).json()
        if "data" in ads_resp:
            for ad in ads_resp["data"]:
                creative_data = ad.get("creative", {})
                
                # Extract text content from object_story_spec if available
                body = creative_data.get("body", "")
                title = creative_data.get("title", "")
                
                # 取得主圖片 URL
                main_image_url = creative_data.get("image_url") or creative_data.get("thumbnail_url")
                
                # 取得輪播圖片列表（優先用 image_hash）
                carousel_images = []
                image_hashes = []  # 收集所有需要解析的 hash
                object_story = creative_data.get("object_story_spec", {})
                if object_story:
                    link_data = object_story.get("link_data", {})
                    if link_data:
                        if not body:
                            body = link_data.get("message", "")
                        if not title:
                            title = link_data.get("name", "") or link_data.get("title", "")
                        
                        # 輪播廣告的圖片在 child_attachments 裡
                        child_attachments = link_data.get("child_attachments", [])
                        for i, child in enumerate(child_attachments):
                            image_hash = child.get("image_hash")
                            child_image = child.get("picture") or child.get("image_url")
                            carousel_images.append({
                                "index": i,
                                "image_hash": image_hash,  # 保存 hash 用於後續解析
                                "image_url": child_image,  # 可能是臨時 URL 或空
                                "name": child.get("name", ""),
                                "description": child.get("description", ""),
                                "link": child.get("link", "")
                            })
                            if image_hash:
                                image_hashes.append(image_hash)
                
                # 如果沒有輪播圖片，用主圖片
                if not carousel_images and main_image_url:
                    carousel_images = [{"index": 0, "image_hash": None, "image_url": main_image_url, "name": "", "description": "", "link": ""}]
                
                # [NEW] 取得該廣告的成效數據
                ad_id = ad.get("id")
                metrics = ad_id_to_metrics.get(ad_id, {})
                
                creatives.append({
                    "ad_id": ad_id,
                    "ad_name": ad.get("name"),
                    "creative_id": creative_data.get("id"),
                    "title": title,
                    "body": body,
                    "image_url": main_image_url,  # 保持主圖片欄位相容性
                    "carousel_images": carousel_images,  # 新增：所有輪播圖片
                    "is_carousel": len(carousel_images) > 1,  # 是否為輪播廣告
                    # 初始化備份狀態欄位
                    "image_backup_status": "pending",
                    "supabase_image_url": None,
                    "supabase_carousel_urls": [],  # 新增：所有備份後的輪播圖片 URL
                    # [NEW] 成效數據 - 供 Supabase ad_creatives 表使用
                    "spend": metrics.get("spend", 0),
                    "impressions": metrics.get("impressions", 0),
                    "clicks": metrics.get("clicks", 0),
                    "ctr": metrics.get("ctr", 0),
                    "cpm": metrics.get("cpm", 0),
                    "roas": metrics.get("roas", 0),
                    "purchases": metrics.get("purchases", 0),
                    "atc": metrics.get("atc", 0),
                    "conv_value": metrics.get("conv_value", 0),
                    "cpa": metrics.get("cpa", 0)
                })
    except Exception as e:
        print(f"Error fetching ad creatives: {e}")
    
    # Step 1.5: 用 image_hash 解析真正的圖片 URL
    all_hashes = set()
    for creative in creatives:
        for img in creative.get("carousel_images", []):
            if img.get("image_hash"):
                all_hashes.add(img["image_hash"])
    
    if all_hashes:
        print(f"Resolving {len(all_hashes)} image hashes...")
        try:
            # 批次取得所有 hash 對應的 URL
            hash_to_url = {}
            hash_list = list(all_hashes)
            # 每次最多查詢 50 個 hash
            for i in range(0, len(hash_list), 50):
                batch = hash_list[i:i+50]
                images_url = f"https://graph.facebook.com/v19.0/{META_AD_ACCOUNT_ID}/adimages"
                images_params = {
                    "access_token": META_ACCESS_TOKEN,
                    "hashes": json.dumps(batch),
                    "fields": "hash,url"
                }
                images_resp = requests.get(images_url, params=images_params).json()
                if "data" in images_resp:
                    for img_data in images_resp["data"]:
                        hash_to_url[img_data["hash"]] = img_data.get("url")
            
            # 更新 creatives 的圖片 URL
            for creative in creatives:
                for img in creative.get("carousel_images", []):
                    img_hash = img.get("image_hash")
                    if img_hash and img_hash in hash_to_url:
                        img["image_url"] = hash_to_url[img_hash]
                
                # 更新主圖片 URL（用第一張輪播圖）
                if creative.get("carousel_images"):
                    first_img = creative["carousel_images"][0]
                    if first_img.get("image_url"):
                        creative["image_url"] = first_img["image_url"]
                
                # 更新 is_carousel 狀態
                creative["is_carousel"] = len(creative.get("carousel_images", [])) > 1
            
            print(f"✅ Resolved {len(hash_to_url)} image URLs from hashes")
        except Exception as e:
            print(f"⚠️  Error resolving image hashes: {e}")
    
    # Step 2: 備份圖片到 Supabase Storage
    if backup_images and creatives:
        try:
            from scripts.image_storage import backup_creative_images
            creatives = backup_creative_images(creatives)
        except ImportError as e:
            print(f"⚠️  Image storage module not available: {e}")
            # 標記所有圖片備份為 skipped
            for creative in creatives:
                creative["image_backup_status"] = "skipped"
        except Exception as e:
            print(f"⚠️  Error during image backup: {e}")
            for creative in creatives:
                if creative.get("image_backup_status") == "pending":
                    creative["image_backup_status"] = "failed"
    
    return creatives


def extract_ad_copies(ad_creatives):
    """
    [NEW] 從 ad_creatives 中提取文案數據
    供上傳 Supabase ad_copies 表使用
    
    Returns:
        list: 文案數據列表，每筆包含：
            - ad_id: 廣告 ID
            - ad_name: 廣告名稱
            - primary_text: 主要文案（body）
            - headline: 標題
            - description: 描述（從輪播圖第一張取得）
            - 成效數據: spend, impressions, clicks, purchases, ctr, roas
    """
    ad_copies = []
    
    for creative in ad_creatives:
        # 取得描述（優先用輪播圖的 description）
        description = ""
        carousel_images = creative.get("carousel_images", [])
        if carousel_images:
            # 嘗試從輪播圖取得描述
            for img in carousel_images:
                if isinstance(img, dict) and img.get("description"):
                    description = img.get("description")
                    break
        
        ad_id = creative.get("ad_id", "")
        ad_copies.append({
            "copy_id": f"copy_{ad_id}",  # [NEW] 文案唯一識別 ID
            "ad_id": ad_id,
            "ad_name": creative.get("ad_name"),
            "primary_text": creative.get("body", ""),
            "headline": creative.get("title", ""),
            "description": description,
            # 成效數據
            "spend": creative.get("spend", 0),
            "impressions": creative.get("impressions", 0),
            "clicks": creative.get("clicks", 0),
            "purchases": creative.get("purchases", 0),
            "ctr": creative.get("ctr", 0),
            "cpm": creative.get("cpm", 0),
            "roas": creative.get("roas", 0),
            "cpa": creative.get("cpa", 0),
            "conv_value": creative.get("conv_value", 0)
        })
    
    # 按花費排序
    ad_copies.sort(key=lambda x: x["spend"], reverse=True)
    
    return ad_copies


def get_ga4_data(start_date, end_date):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GA4_KEY_PATH
    client = BetaAnalyticsDataClient()
    
    # 1. Overall Funnel - [ENHANCED] 確保有完整漏斗數據
    request = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[],
        metrics=[
            Metric(name="activeUsers"), 
            Metric(name="sessions"),
            Metric(name="addToCarts"),
            Metric(name="checkouts"),
            Metric(name="transactions"),
            Metric(name="ecommercePurchases"),  # [NEW] 購買次數
            Metric(name="purchaseRevenue"),      # [NEW] 購買營收
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    response = client.run_report(request)
    total_data = {
        "active_users": 0, 
        "sessions": 0, 
        "atc": 0, 
        "ic": 0, 
        "purchases": 0,
        "ecommerce_purchases": 0,
        "purchase_revenue": 0.0
    }
    if response.rows:
        row = response.rows[0]
        total_data = {
            "active_users": int(row.metric_values[0].value),
            "sessions": int(row.metric_values[1].value),
            "atc": int(row.metric_values[2].value),
            "ic": int(row.metric_values[3].value),
            "purchases": int(row.metric_values[4].value),
            "ecommerce_purchases": int(row.metric_values[5].value),
            "purchase_revenue": float(row.metric_values[6].value)
        }
    
    # [NEW] 計算各階段轉換率
    funnel_rates = calculate_funnel_rates(total_data)
    total_data["funnel_rates"] = funnel_rates

    # 2. Source Breakdown
    breakdown_req = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="sessionSourceMedium")],
        metrics=[
            Metric(name="sessions"),
            Metric(name="addToCarts"),
            Metric(name="checkouts"),
            Metric(name="transactions")
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    bd_response = client.run_report(breakdown_req)
    channels = []
    if bd_response.rows:
        for row in bd_response.rows:
            source = row.dimension_values[0].value
            sessions = int(row.metric_values[0].value)
            if sessions > 0:
                atc = int(row.metric_values[1].value)
                ic = int(row.metric_values[2].value)
                purchases = int(row.metric_values[3].value)
                channels.append({
                    "source": source,
                    "sessions": sessions,
                    "atc": atc,
                    "ic": ic,
                    "purchases": purchases,
                    # [NEW] 每個渠道的轉換率
                    "session_to_atc_rate": round(atc / sessions * 100, 2) if sessions > 0 else 0,
                    "atc_to_purchase_rate": round(purchases / atc * 100, 2) if atc > 0 else 0
                })
    
    # Return all channels (no limit) - frontend will handle display
    # Sort by purchases first, then sessions to ensure sources with purchases are included
    return {
        "total": total_data,
        "channels": sorted(channels, key=lambda x: (x["purchases"], x["sessions"]), reverse=True)
    }


def get_ga4_device_data(start_date, end_date):
    """
    [NEW] 取得 GA4 裝置分布數據
    了解用戶使用 mobile/desktop/tablet 的比例
    """
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GA4_KEY_PATH
    client = BetaAnalyticsDataClient()
    
    request = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="deviceCategory")],
        metrics=[
            Metric(name="sessions"),
            Metric(name="activeUsers"),
            Metric(name="transactions"),
            Metric(name="purchaseRevenue")
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    
    devices = []
    try:
        response = client.run_report(request)
        total_sessions = 0
        
        for row in response.rows:
            sessions = int(row.metric_values[0].value)
            total_sessions += sessions
            devices.append({
                "device": row.dimension_values[0].value,
                "sessions": sessions,
                "users": int(row.metric_values[1].value),
                "transactions": int(row.metric_values[2].value),
                "revenue": float(row.metric_values[3].value)
            })
        
        # Calculate percentages
        for d in devices:
            d["session_pct"] = round(d["sessions"] / total_sessions * 100, 1) if total_sessions > 0 else 0
            d["conv_rate"] = round(d["transactions"] / d["sessions"] * 100, 2) if d["sessions"] > 0 else 0
            
    except Exception as e:
        print(f"Error fetching device data: {e}")
    
    return devices


def get_ga4_user_type(start_date, end_date):
    """
    [NEW] 取得 GA4 新/回訪用戶比例
    判斷流量品質和品牌認知
    """
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GA4_KEY_PATH
    client = BetaAnalyticsDataClient()
    
    request = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="newVsReturning")],
        metrics=[
            Metric(name="sessions"),
            Metric(name="activeUsers"),
            Metric(name="transactions"),
            Metric(name="purchaseRevenue")
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    
    user_types = {}
    try:
        response = client.run_report(request)
        total_sessions = 0
        
        for row in response.rows:
            user_type = row.dimension_values[0].value  # "new" or "returning"
            sessions = int(row.metric_values[0].value)
            total_sessions += sessions
            user_types[user_type] = {
                "sessions": sessions,
                "users": int(row.metric_values[1].value),
                "transactions": int(row.metric_values[2].value),
                "revenue": float(row.metric_values[3].value)
            }
        
        # Calculate percentages and conversion rates
        for k, v in user_types.items():
            v["session_pct"] = round(v["sessions"] / total_sessions * 100, 1) if total_sessions > 0 else 0
            v["conv_rate"] = round(v["transactions"] / v["sessions"] * 100, 2) if v["sessions"] > 0 else 0
            
    except Exception as e:
        print(f"Error fetching user type data: {e}")
    
    return user_types


def get_ga4_engagement(start_date, end_date):
    """
    [NEW] 取得 GA4 互動指標
    包含互動率、平均工作階段時長、頁面瀏覽量
    """
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GA4_KEY_PATH
    client = BetaAnalyticsDataClient()
    
    request = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[],
        metrics=[
            Metric(name="engagementRate"),
            Metric(name="averageSessionDuration"),
            Metric(name="screenPageViews"),
            Metric(name="screenPageViewsPerSession"),
            Metric(name="bounceRate")
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    
    engagement = {}
    try:
        response = client.run_report(request)
        if response.rows:
            row = response.rows[0]
            engagement = {
                "engagement_rate": round(float(row.metric_values[0].value) * 100, 2),
                "avg_session_duration_sec": float(row.metric_values[1].value),
                "avg_session_duration_formatted": format_duration(float(row.metric_values[1].value)),
                "page_views": int(float(row.metric_values[2].value)),
                "pages_per_session": round(float(row.metric_values[3].value), 2),
                "bounce_rate": round(float(row.metric_values[4].value) * 100, 2)
            }
    except Exception as e:
        print(f"Error fetching engagement data: {e}")
        engagement = {
            "engagement_rate": 0, "avg_session_duration_sec": 0,
            "avg_session_duration_formatted": "0:00",
            "page_views": 0, "pages_per_session": 0, "bounce_rate": 0
        }
    
    return engagement


def format_duration(seconds):
    """將秒數格式化為 M:SS 格式"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}:{secs:02d}"


def get_gsc_data(start_date, end_date):
    """
    [NEW] 取得 Google Search Console 數據
    包含搜尋關鍵字、頁面表現、CTR、平均排名
    """
    # 在執行時讀取環境變數（避免 import 時讀取空值）
    gsc_site_url = os.environ.get("GSC_SITE_URL")
    gsc_key_path = os.environ.get("GSC_KEY_PATH", os.environ.get("GA4_KEY_PATH"))
    
    if not gsc_site_url or not gsc_key_path:
        print(f"GSC configuration missing (site={gsc_site_url}, key={gsc_key_path}), skipping...")
        return None
    
    try:
        from googleapiclient.discovery import build
        from google.oauth2 import service_account
        
        credentials = service_account.Credentials.from_service_account_file(
            gsc_key_path,
            scopes=['https://www.googleapis.com/auth/webmasters.readonly']
        )
        service = build('searchconsole', 'v1', credentials=credentials)
        
        gsc_data = {
            "total": {},
            "top_queries": [],
            "top_pages": []
        }
        
        # 1. 總覽數據
        total_request = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": []
        }
        total_response = service.searchanalytics().query(
            siteUrl=gsc_site_url, body=total_request
        ).execute()
        
        if "rows" in total_response and total_response["rows"]:
            row = total_response["rows"][0]
            gsc_data["total"] = {
                "clicks": int(row.get("clicks", 0)),
                "impressions": int(row.get("impressions", 0)),
                "ctr": round(row.get("ctr", 0) * 100, 2),
                "position": round(row.get("position", 0), 1)
            }
        
        # 2. Top 搜尋關鍵字
        query_request = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["query"],
            "rowLimit": 10
        }
        query_response = service.searchanalytics().query(
            siteUrl=gsc_site_url, body=query_request
        ).execute()
        
        if "rows" in query_response:
            for row in query_response["rows"]:
                gsc_data["top_queries"].append({
                    "query": row["keys"][0],
                    "clicks": int(row.get("clicks", 0)),
                    "impressions": int(row.get("impressions", 0)),
                    "ctr": round(row.get("ctr", 0) * 100, 2),
                    "position": round(row.get("position", 0), 1)
                })
        
        # 3. Top 頁面表現
        page_request = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["page"],
            "rowLimit": 10
        }
        page_response = service.searchanalytics().query(
            siteUrl=gsc_site_url, body=page_request
        ).execute()
        
        if "rows" in page_response:
            # 嘗試導入 get_page_title 函數
            try:
                from skills.gsc.scripts.gsc_query import get_page_title
                can_fetch_title = True
            except ImportError:
                can_fetch_title = False
            
            for row in page_response["rows"]:
                # 簡化 URL 顯示
                page_url = row["keys"][0]
                page_path = page_url.replace(gsc_site_url, "") or "/"
                
                # 抓取頁面標題
                page_title = None
                if can_fetch_title:
                    page_title = get_page_title(page_url)
                    # 如果標題等於 URL，設為 None（讓前端 fallback）
                    if page_title == page_url:
                        page_title = None
                
                gsc_data["top_pages"].append({
                    "page": page_path,
                    "full_url": page_url,
                    "title": page_title,
                    "clicks": int(row.get("clicks", 0)),
                    "impressions": int(row.get("impressions", 0)),
                    "ctr": round(row.get("ctr", 0) * 100, 2),
                    "position": round(row.get("position", 0), 1)
                })
        
        return gsc_data
        
    except ImportError:
        print("google-api-python-client not installed, skipping GSC...")
        return None
    except Exception as e:
        print(f"Error fetching GSC data: {e}")
        return None


def calculate_funnel_rates(data):
    """
    [NEW] 計算 GA4 漏斗各階段轉換率
    漏斗：進站 → 加入購物車 → 開始結帳 → 購買
    """
    sessions = data.get("sessions", 0)
    atc = data.get("atc", 0)
    ic = data.get("ic", 0)
    purchases = data.get("purchases", 0)
    
    return {
        "session_to_atc": round(atc / sessions * 100, 2) if sessions > 0 else 0,
        "atc_to_checkout": round(ic / atc * 100, 2) if atc > 0 else 0,
        "checkout_to_purchase": round(purchases / ic * 100, 2) if ic > 0 else 0,
        "overall_conversion": round(purchases / sessions * 100, 2) if sessions > 0 else 0,
        # [NEW] 各階段流失率
        "atc_drop_off": round((1 - atc / sessions) * 100, 2) if sessions > 0 else 0,
        "checkout_drop_off": round((1 - ic / atc) * 100, 2) if atc > 0 else 0,
        "purchase_drop_off": round((1 - purchases / ic) * 100, 2) if ic > 0 else 0
    }


def get_cyberbiz_data(start_date, end_date):
    """
    注意：Cyberbiz orders API 不支援日期篩選，需要分頁抓取後本地篩選
    """
    url = "https://app-store-api.cyberbiz.io/v1/orders"
    headers = {
        "Authorization": f"Bearer {CYBERBIZ_TOKEN}",
        "Accept": "application/json"
    }
    
    # 分頁抓取所有訂單
    all_orders = []
    page = 1
    while page <= 50:  # 最多 50 頁 x 50 = 2500 筆
        params = {"limit": 50, "page": page}
        try:
            resp = requests.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                break
            orders = resp.json()
            if not orders:
                break
            all_orders.extend(orders)
            if len(orders) < 50:
                break
            page += 1
        except Exception as e:
            print(f"Error fetching orders page {page}: {e}")
            break
    
    # 本地篩選日期範圍
    actual_orders = []
    for o in all_orders:
        created_at = o.get("created_at", "")
        # Cyberbiz format is "YYYY-MM-DD HH:MM:SS"
        date_part = created_at.split(' ')[0] if created_at else ""
        if date_part and start_date <= date_part <= end_date:
            actual_orders.append(o)
    
    total_revenue = sum(float(o.get("prices", {}).get("total_price", 0)) for o in actual_orders)
    order_count = len(actual_orders)
    
    # [NEW] 計算客單價 (AOV - Average Order Value)
    aov = round(total_revenue / order_count, 2) if order_count > 0 else 0
    
    # [NEW] 商品銷售排行
    product_ranking = get_product_ranking(actual_orders)
    
    # [NEW] 新增會員數
    new_members = get_new_members_count(start_date, end_date)
    
    return {
        "order_count": order_count,
        "total_revenue": total_revenue,
        "aov": aov,
        "product_ranking": product_ranking,
        "new_members": new_members
    }


def get_new_members_count(start_date, end_date):
    """
    從 Cyberbiz API 取得指定日期範圍內的新增會員數
    注意：Cyberbiz customers API 不支援日期篩選，需要抓取全部後本地篩選
    """
    url = "https://app-store-api.cyberbiz.io/v1/customers"
    headers = {
        "Authorization": f"Bearer {CYBERBIZ_TOKEN}",
        "Accept": "application/json"
    }
    
    all_customers = []
    page = 1
    
    # 抓取所有會員 (假設總數 < 1000)
    while page <= 20:  # 最多 20 頁 x 50 = 1000 筆
        params = {"limit": 50, "page": page}
        try:
            resp = requests.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                break
            customers = resp.json()
            if not customers:
                break
            all_customers.extend(customers)
            if len(customers) < 50:
                break
            page += 1
        except Exception as e:
            print(f"Error fetching customers page {page}: {e}")
            break
    
    # 本地篩選日期範圍
    new_members = 0
    for customer in all_customers:
        created_at = customer.get("created_at", "")
        date_part = created_at.split(' ')[0] if created_at else ""
        if date_part and start_date <= date_part <= end_date:
            new_members += 1
    
    return new_members


def get_product_ranking(orders):
    """
    [NEW] 從訂單中計算商品銷售排行
    """
    product_sales = {}
    
    for order in orders:
        line_items = order.get("line_items", [])
        for item in line_items:
            product_name = item.get("title", item.get("name", "Unknown"))
            variant_title = item.get("variant_title", "")
            sku = item.get("sku", "")
            quantity = int(item.get("quantity", 1))
            price = float(item.get("price", 0))
            
            # Use product name as key (could also use SKU)
            key = product_name
            if key not in product_sales:
                product_sales[key] = {
                    "product_name": product_name,
                    "variant": variant_title,
                    "sku": sku,
                    "total_quantity": 0,
                    "total_revenue": 0
                }
            product_sales[key]["total_quantity"] += quantity
            product_sales[key]["total_revenue"] += price * quantity
    
    # Sort by total revenue and return top 10
    ranking = sorted(
        product_sales.values(), 
        key=lambda x: x["total_revenue"], 
        reverse=True
    )[:10]
    
    # Round revenue values
    for item in ranking:
        item["total_revenue"] = round(item["total_revenue"], 2)
    
    return ranking


def download_creative_images(creatives, output_dir="creative_images"):
    """Download creative images for vision analysis, including carousel images"""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.facebook.com/"
    }
    
    downloaded = []
    for i, creative in enumerate(creatives[:3]):  # Process top 3 ads
        ad_name = creative.get("ad_name", f"creative_{i}")
        safe_name = "".join(c for c in ad_name if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
        
        # Download main image
        main_image_url = creative.get("image_url")
        if main_image_url:
            try:
                resp = requests.get(main_image_url, headers=headers, timeout=30, allow_redirects=True)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    filename = f"{output_dir}/{safe_name}_main.jpg"
                    with open(filename, "wb") as f:
                        f.write(resp.content)
                    downloaded.append({
                        "name": f"{ad_name} (主圖)", 
                        "file": filename, 
                        "roas": creative.get("roas", 0),
                        "type": "main"
                    })
                    print(f"  ✓ Downloaded main: {safe_name}")
            except Exception as e:
                print(f"  ✗ Error downloading main image: {e}")
        
        # Download carousel images
        carousel_images = creative.get("carousel_images", [])
        if carousel_images:
            print(f"  發現輪播素材，共 {len(carousel_images)} 張圖片")
            for idx, img_data in enumerate(carousel_images[:6]):  # Max 6 carousel images
                img_url = img_data.get("url") if isinstance(img_data, dict) else img_data
                if not img_url or not img_url.startswith("http"):
                    continue
                    
                try:
                    resp = requests.get(img_url, headers=headers, timeout=30, allow_redirects=True)
                    if resp.status_code == 200 and len(resp.content) > 1000:
                        filename = f"{output_dir}/{safe_name}_carousel_{idx+1}.jpg"
                        with open(filename, "wb") as f:
                            f.write(resp.content)
                        downloaded.append({
                            "name": f"{ad_name} (輪播{idx+1})", 
                            "file": filename, 
                            "roas": creative.get("roas", 0),
                            "type": "carousel",
                            "description": img_data.get("description", "") if isinstance(img_data, dict) else ""
                        })
                        print(f"    ✓ Downloaded carousel {idx+1}")
                except Exception as e:
                    print(f"    ✗ Error downloading carousel {idx+1}: {e}")
    
    print(f"\n總共下載 {len(downloaded)} 張圖片")
    return downloaded


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", help="Start date YYYY-MM-DD")
    parser.add_argument("--end", help="End date YYYY-MM-DD")
    parser.add_argument("--mode", choices=["daily", "weekly"], default="daily")
    parser.add_argument("--skip-ai-analysis", dest="skip_ai", action="store_true", default=True,
                        help="Skip AI analysis (default: True). Use --no-skip-ai-analysis to enable.")
    parser.add_argument("--no-skip-ai-analysis", dest="skip_ai", action="store_false",
                        help="Enable AI analysis (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)")
    args = parser.parse_args()

    today = datetime.now()
    if args.start and args.end:
        start_date, end_date = args.start, args.end
    elif args.mode == "weekly":
        end_dt = today - timedelta(days=1)
        start_dt = end_dt - timedelta(days=6)
        start_date, end_date = start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")
    else:
        yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
        start_date = end_date = yesterday

    print(f"Fetching {args.mode} data from {start_date} to {end_date}...")
    
    # Fetch current period data
    meta = get_meta_data(start_date, end_date)
    ga4 = get_ga4_data(start_date, end_date)
    cyber = get_cyberbiz_data(start_date, end_date)
    
    # [NEW] Fetch Meta audience breakdown data
    print("Fetching Meta audience breakdown data...")
    meta_audience = get_meta_audience_breakdown(start_date, end_date)
    
    # [NEW] Fetch Meta ad creatives with copy
    print("Fetching Meta ad creatives...")
    ad_creatives = get_meta_ad_creatives(start_date, end_date)
    
    # [NEW] 提取文案數據供 Supabase ad_copies 表使用
    print("Extracting ad copies...")
    ad_copies = extract_ad_copies(ad_creatives)
    
    # [NEW] Fetch Meta efficiency metrics (CPM, Frequency, Reach)
    print("Fetching Meta efficiency metrics...")
    meta_efficiency = get_meta_efficiency_metrics(start_date, end_date)
    
    # [NEW] Fetch Meta adset level data
    print("Fetching Meta adset data...")
    meta_adsets = get_meta_adset_data(start_date, end_date)
    
    # [NEW] Fetch GA4 device distribution
    print("Fetching GA4 device data...")
    ga4_devices = get_ga4_device_data(start_date, end_date)
    
    # [NEW] Fetch GA4 new vs returning users
    print("Fetching GA4 user type data...")
    ga4_user_types = get_ga4_user_type(start_date, end_date)
    
    # [NEW] Fetch GA4 engagement metrics
    print("Fetching GA4 engagement metrics...")
    ga4_engagement = get_ga4_engagement(start_date, end_date)
    
    # [NEW] Fetch Google Search Console data
    print("Fetching GSC data...")
    gsc_data = get_gsc_data(start_date, end_date)
    
    # Fetch previous period data for WoW comparison (weekly mode only)
    wow_data = None
    if args.mode == "weekly":
        prev_end_dt = datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)
        prev_start_dt = prev_end_dt - timedelta(days=6)
        prev_start = prev_start_dt.strftime("%Y-%m-%d")
        prev_end = prev_end_dt.strftime("%Y-%m-%d")
        print(f"Fetching WoW comparison data from {prev_start} to {prev_end}...")
        prev_meta = get_meta_data(prev_start, prev_end)
        prev_cyber = get_cyberbiz_data(prev_start, prev_end)
        wow_data = {
            "meta_roas_change": ((meta["total"]["roas"] / prev_meta["total"]["roas"] - 1) * 100) if prev_meta["total"] and prev_meta["total"]["roas"] > 0 else None,
            "cyber_revenue_change": ((cyber["total_revenue"] / prev_cyber["total_revenue"] - 1) * 100) if prev_cyber["total_revenue"] > 0 else None,
            # [NEW] AOV 週比變化
            "cyber_aov_change": ((cyber["aov"] / prev_cyber["aov"] - 1) * 100) if prev_cyber.get("aov", 0) > 0 else None,
            "prev_meta": prev_meta["total"],
            "prev_cyber": prev_cyber
        }
    
    # [NEW] Fetch previous day data for DoD comparison (daily mode)
    dod_data = None
    if args.mode == "daily":
        # 前天的日期
        prev_date_dt = datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)
        prev_date = prev_date_dt.strftime("%Y-%m-%d")
        print(f"Fetching DoD comparison data from {prev_date}...")
        
        prev_meta = get_meta_data(prev_date, prev_date)
        prev_cyber = get_cyberbiz_data(prev_date, prev_date)
        prev_ga4 = get_ga4_data(prev_date, prev_date)
        
        # 計算各項 DoD 變化率
        dod_data = {
            "prev_date": prev_date,
            "prev_cyberbiz": prev_cyber,
            "prev_meta": prev_meta["total"],
            "prev_ga4": prev_ga4["total"],
            
            # Cyberbiz 變化率
            "cyber_revenue_change": round(((cyber["total_revenue"] / prev_cyber["total_revenue"] - 1) * 100), 2) if prev_cyber["total_revenue"] > 0 else None,
            "cyber_order_change": round(((cyber["order_count"] / prev_cyber["order_count"] - 1) * 100), 2) if prev_cyber["order_count"] > 0 else None,
            "cyber_aov_change": round(((cyber["aov"] / prev_cyber["aov"] - 1) * 100), 2) if prev_cyber.get("aov", 0) > 0 else None,
            
            # Meta Ads 變化率
            "meta_roas_change": round(((meta["total"]["roas"] / prev_meta["total"]["roas"] - 1) * 100), 2) if prev_meta["total"] and prev_meta["total"]["roas"] > 0 else None,
            "meta_spend_change": round(((meta["total"]["spend"] / prev_meta["total"]["spend"] - 1) * 100), 2) if prev_meta["total"] and prev_meta["total"]["spend"] > 0 else None,
            "meta_purchases_change": round(((meta["total"]["purchases"] / prev_meta["total"]["purchases"] - 1) * 100), 2) if prev_meta["total"] and prev_meta["total"]["purchases"] > 0 else None,
            "meta_cpa_change": round(((meta["total"]["cpa"] / prev_meta["total"]["cpa"] - 1) * 100), 2) if prev_meta["total"] and prev_meta["total"]["cpa"] > 0 else None,
            
            # GA4 變化率
            "ga4_sessions_change": round(((ga4["total"]["sessions"] / prev_ga4["total"]["sessions"] - 1) * 100), 2) if prev_ga4["total"]["sessions"] > 0 else None,
            "ga4_conversion_change": round((ga4["total"].get("funnel_rates", {}).get("overall_conversion", 0) - prev_ga4["total"].get("funnel_rates", {}).get("overall_conversion", 0)), 2)
        }
    
    # New: Creative Analysis
    top_creatives = []
    try:
        from scripts.creative_analyzer import get_top_performing_creatives
        top_creatives = get_top_performing_creatives(start_date, end_date)
    except ImportError:
        print("⚠️ creative_analyzer module not available, skipping creative analysis")
    
    # Download creative images for vision analysis
    if top_creatives and len(top_creatives) > 0:
        print("Downloading creative images...")
        download_creative_images(top_creatives)
    
    # [AI 分析]：Vision + 文案分析
    # 預設跳過（由 sub-agent 執行），使用 --no-skip-ai-analysis 可啟用直接呼叫 API
    if args.mode == "weekly" and ad_creatives and not args.skip_ai:
        try:
            from scripts.ai_analyzer import run_full_ai_analysis, get_ai_client_info
            print(f"\n🤖 AI Analysis enabled ({get_ai_client_info()})")
            
            # 為 ad_creatives 補充成效數據（從 meta_adsets 取得）
            adset_metrics = {adset.get("adset_name", ""): adset for adset in meta_adsets}
            for creative in ad_creatives:
                ad_name = creative.get("ad_name", "")
                # 嘗試從 adset 名稱匹配成效數據
                for adset_name, adset in adset_metrics.items():
                    if ad_name in adset_name or adset_name in ad_name:
                        creative["ctr"] = adset.get("ctr", 0)
                        creative["roas"] = adset.get("roas", 0)
                        creative["spend"] = adset.get("spend", 0)
                        creative["purchases"] = adset.get("purchases", 0)
                        creative["cpm"] = adset.get("cpm", 0)
                        break
            
            # 執行完整 AI 分析（Vision + 文案）
            ad_creatives = run_full_ai_analysis(ad_creatives)
            print("✅ AI analysis complete")
            
        except ImportError as e:
            print(f"⚠️ AI analyzer module not available: {e}")
        except Exception as e:
            print(f"⚠️ AI analysis error (continuing without AI data): {e}")
    elif args.mode == "weekly" and args.skip_ai:
        print("\n📊 AI Analysis skipped (--skip-ai-analysis). Use trigger_ai_analysis.py to generate sub-agent task.")
    
    spend = meta["total"]["spend"] if meta["total"] else 0
    mer = cyber["total_revenue"] / spend if spend > 0 else 0
    
    # [ENHANCED] 優化後的報表結構
    report = {
        "mode": args.mode,
        "start_date": start_date,
        "end_date": end_date,
        "generated_at": datetime.now().isoformat(),
        
        # Meta Ads 數據
        "meta": meta,
        "meta_audience": meta_audience,      # 受眾分布數據
        "meta_efficiency": meta_efficiency,  # [NEW] CPM, Frequency, Reach
        "meta_adsets": meta_adsets,          # [NEW] Adset 層級表現
        "ad_creatives": ad_creatives,        # 廣告素材內容（含成效數據）
        "ad_copies": ad_copies,              # [NEW] 廣告文案（供 Supabase ad_copies 表）
        "top_creatives": top_creatives,
        
        # GA4 數據 (含完整漏斗)
        "ga4": ga4["total"],
        "ga4_channels": ga4["channels"],
        "ga4_devices": ga4_devices,          # [NEW] 裝置分布
        "ga4_user_types": ga4_user_types,    # [NEW] 新/回訪用戶
        "ga4_engagement": ga4_engagement,    # [NEW] 互動指標
        
        # [NEW] Google Search Console 數據
        "gsc": gsc_data,
        
        # Cyberbiz 數據 (含客單價和商品排行)
        "cyberbiz": cyber,
        
        # 綜合指標
        "mer": mer,
        "wow": wow_data,
        "dod": dod_data,  # DoD 日比數據
        
        # [NEW] 警示區塊
        "alerts": generate_alerts(meta, meta_efficiency, ga4, cyber),
        
        # 數據摘要 (便於快速查看)
        "summary": {
            "total_spend": spend,
            "total_revenue": cyber["total_revenue"],
            "mer": round(mer, 2),
            "roas": meta["total"]["roas"] if meta["total"] else 0,
            "order_count": cyber["order_count"],
            "aov": cyber["aov"],
            "ga4_sessions": ga4["total"].get("sessions", 0),
            "ga4_overall_conversion": ga4["total"].get("funnel_rates", {}).get("overall_conversion", 0),
            "top_audience_segment": get_top_audience_segment(meta_audience),
            "top_product": cyber["product_ranking"][0]["product_name"] if cyber["product_ranking"] else None,
            # [NEW] 效率指標
            "cpm": meta_efficiency.get("cpm", 0),
            "frequency": meta_efficiency.get("frequency", 0),
            "reach": meta_efficiency.get("reach", 0),
            # [NEW] GSC 摘要
            "gsc_clicks": gsc_data["total"].get("clicks", 0) if gsc_data else 0,
            "gsc_avg_position": gsc_data["total"].get("position", 0) if gsc_data else 0
        }
    }
    
    # 輸出檔名帶上 start_date，避免多個平行執行互相覆蓋
    output_filename = f"report_data_{start_date}.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"Report data saved to {output_filename}")

    # New: Auto-generate text report for preview
    try:
        from scripts.report_formatter import generate_report_text
        report_text = generate_report_text(report)
        preview_filename = f"REPORT_PREVIEW_{start_date}.md"
        with open(preview_filename, "w", encoding="utf-8") as f:
            f.write(report_text)
        print(f"Report preview saved to {preview_filename}")
    except ImportError:
        print("⚠️ report_formatter module not available, skipping preview generation")
    
    # [NEW] Upload to Supabase for Dashboard integration (weekly only)
    if args.mode == "weekly":
        try:
            from scripts.supabase_uploader import upload_report_to_supabase
            print("\n📤 Uploading to Supabase (weekly report)...")
            upload_success = upload_report_to_supabase(report)
            if upload_success:
                print("✅ Dashboard data synced to Supabase!")
        except Exception as e:
            # Supabase 上傳失敗不影響原有報表流程
            print(f"⚠️  Supabase upload skipped: {e}")
    else:
        print("\n📊 Daily report - skipping Supabase upload (Dashboard uses weekly data)")


def generate_alerts(meta, meta_efficiency, ga4, cyber):
    """
    [NEW] 自動生成警示區塊
    當指標異常時提醒經營者注意
    """
    alerts = []
    
    # 1. Frequency 過高警示
    freq = meta_efficiency.get("frequency", 0)
    if freq > 2.5:
        alerts.append({
            "type": "warning",
            "category": "Meta Ads",
            "message": f"⚠️ 曝光頻率過高 ({freq:.1f})，受眾可能已疲乏，建議更換素材或擴大受眾",
            "metric": "frequency",
            "value": freq,
            "threshold": 2.5
        })
    elif freq > 2.0:
        alerts.append({
            "type": "caution",
            "category": "Meta Ads",
            "message": f"📊 曝光頻率偏高 ({freq:.1f})，請關注素材疲乏跡象",
            "metric": "frequency",
            "value": freq,
            "threshold": 2.0
        })
    
    # 2. CPM 過高警示
    cpm = meta_efficiency.get("cpm", 0)
    if cpm > 400:
        alerts.append({
            "type": "warning",
            "category": "Meta Ads",
            "message": f"⚠️ CPM 過高 (${cpm:.0f})，流量成本飆升，檢查受眾定向或競價策略",
            "metric": "cpm",
            "value": cpm,
            "threshold": 400
        })
    elif cpm > 300:
        alerts.append({
            "type": "caution",
            "category": "Meta Ads",
            "message": f"📊 CPM 偏高 (${cpm:.0f})，注意流量成本趨勢",
            "metric": "cpm",
            "value": cpm,
            "threshold": 300
        })
    
    # 3. ROAS 過低警示
    roas = meta.get("total", {}).get("roas", 0) if meta.get("total") else 0
    if roas > 0 and roas < 1.5:
        alerts.append({
            "type": "warning",
            "category": "Meta Ads",
            "message": f"⚠️ ROAS 過低 ({roas:.2f})，廣告可能虧損，檢查素材和受眾",
            "metric": "roas",
            "value": roas,
            "threshold": 1.5
        })
    
    # 4. 轉換率過低警示
    funnel = ga4.get("total", {}).get("funnel_rates", {})
    overall_conv = funnel.get("overall_conversion", 0)
    if overall_conv > 0 and overall_conv < 0.5:
        alerts.append({
            "type": "warning",
            "category": "GA4",
            "message": f"⚠️ 網站整體轉換率過低 ({overall_conv:.2f}%)，檢查購物流程是否有障礙",
            "metric": "conversion_rate",
            "value": overall_conv,
            "threshold": 0.5
        })
    
    # 5. 購物車流失率過高
    checkout_drop = funnel.get("checkout_drop_off", 0)
    if checkout_drop > 70:
        alerts.append({
            "type": "warning",
            "category": "GA4",
            "message": f"⚠️ 結帳流失率過高 ({checkout_drop:.1f}%)，檢查結帳頁面體驗和付款方式",
            "metric": "checkout_drop_off",
            "value": checkout_drop,
            "threshold": 70
        })
    
    # 6. 零訂單警示
    if cyber.get("order_count", 0) == 0:
        alerts.append({
            "type": "critical",
            "category": "Cyberbiz",
            "message": "🚨 今日零訂單！請立即檢查網站和廣告狀態",
            "metric": "order_count",
            "value": 0,
            "threshold": 1
        })
    
    return alerts


def get_top_audience_segment(audience_data):
    """
    [NEW] 從受眾數據中找出表現最佳的分群
    """
    if not audience_data or not audience_data.get("age_gender"):
        return None
    
    # Find segment with highest purchases relative to spend
    best_segment = None
    best_roi = 0
    
    for segment in audience_data["age_gender"]:
        spend = segment.get("spend", 0)
        purchases = segment.get("purchases", 0)
        if spend > 0:
            roi = purchases / spend
            if roi > best_roi:
                best_roi = roi
                best_segment = f"{segment['gender']} {segment['age_range']}"
    
    return best_segment


if __name__ == "__main__":
    main()
