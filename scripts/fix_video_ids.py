#!/usr/bin/env python3
"""
fix_video_ids.py - 修復 Supabase ad_creatives 中缺少的 video_id 欄位

問題：早期上傳的廣告素材未偵測影片類型，導致 video_id 為 null。
解法：透過 Meta Graph API 重新查詢每個 ad_id 的 creative，偵測影片素材並更新。

Usage:
    python3 fix_video_ids.py          # 修復所有缺少 video_id 的廣告
    python3 fix_video_ids.py --dry-run  # 只顯示需要修復的廣告，不實際更新
"""

import os
import sys
import json
import requests
from collections import defaultdict

# Load credentials
CREDENTIALS_PATH = os.path.expanduser("~/.openclaw/credentials/api-keys.env")
if os.path.exists(CREDENTIALS_PATH):
    with open(CREDENTIALS_PATH) as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                os.environ.setdefault(key, value)

META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")


def get_video_id_from_meta(ad_id: str) -> dict:
    """
    透過 Meta Graph API 查詢廣告的 creative，偵測是否為影片素材。
    
    Returns:
        {'is_video': bool, 'video_id': str|None}
    """
    if not META_ACCESS_TOKEN:
        return {'is_video': False, 'video_id': None}
    
    try:
        url = f"https://graph.facebook.com/v21.0/{ad_id}"
        params = {
            "access_token": META_ACCESS_TOKEN,
            "fields": "creative{video_id,object_story_spec,thumbnail_url}"
        }
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code != 200:
            return {'is_video': False, 'video_id': None}
        
        data = resp.json()
        creative = data.get("creative", {})
        
        # 直接從 creative 取得 video_id
        video_id = creative.get("video_id")
        
        # 從 object_story_spec 取得 video_data
        if not video_id:
            object_story = creative.get("object_story_spec", {})
            if object_story:
                video_data = object_story.get("video_data", {})
                if video_data:
                    video_id = video_data.get("video_id")
        
        return {
            'is_video': bool(video_id),
            'video_id': str(video_id) if video_id else None
        }
        
    except Exception as e:
        print(f"  ⚠️  Error querying Meta API for {ad_id}: {e}")
        return {'is_video': False, 'video_id': None}


def main():
    dry_run = '--dry-run' in sys.argv
    
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # 取得所有 Supabase 中沒有 video_id 的廣告
    res = sb.table('ad_creatives').select('id,ad_id,creative_name,is_video,video_id,week_start').is_('video_id', 'null').execute()
    
    # 按 ad_id 去重複（同一個廣告可能在多個週出現）
    unique_ads = {}
    ad_records = defaultdict(list)
    for r in res.data:
        unique_ads[r['ad_id']] = r['creative_name']
        ad_records[r['ad_id']].append(r)
    
    print(f"📊 Found {len(res.data)} records ({len(unique_ads)} unique ads) without video_id")
    
    updated_count = 0
    for ad_id, name in unique_ads.items():
        result = get_video_id_from_meta(ad_id)
        
        if result['is_video'] and result['video_id']:
            print(f"  📹 VIDEO: {name[:50]} (ad_id={ad_id}, video_id={result['video_id']})")
            
            if not dry_run:
                for record in ad_records[ad_id]:
                    sb.table('ad_creatives').update({
                        'is_video': True,
                        'video_id': result['video_id'],
                    }).eq('id', record['id']).execute()
                    updated_count += 1
                    print(f"    ✅ Updated record (week_start={record['week_start']})")
        else:
            pass  # 非影片，不需要更新
    
    if dry_run:
        print(f"\n🔍 Dry run complete. No changes made.")
    else:
        print(f"\n✅ Updated {updated_count} records in Supabase.")


if __name__ == "__main__":
    main()
