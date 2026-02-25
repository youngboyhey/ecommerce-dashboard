#!/usr/bin/env python3
"""
Upload W1 Video Analysis Results to Supabase

讀取 w1_video_analysis_results.json 並更新 ad_creatives 表的影片相關欄位。
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase", file=sys.stderr)
    sys.exit(1)


# Load environment
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials", file=sys.stderr)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# W1 的日期範圍
W1_DATE = "2026-01-15"
W1_START = "2026-01-15"
W1_END = "2026-01-21"


def load_video_analysis() -> list:
    """Load W1 video analysis results."""
    script_dir = Path(__file__).parent
    filepath = script_dir / "w1_video_analysis_results.json"
    
    if not filepath.exists():
        print(f"Error: {filepath} not found", file=sys.stderr)
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def update_ad_creative(video_data: dict) -> bool:
    """Update ad_creative with video analysis data."""
    video_id = video_data.get("video_id")
    
    if not video_id:
        print("  ⚠️  No video_id, skipping")
        return False
    
    # 準備更新資料（使用現有欄位）
    # 注意：ad_creatives 表尚未有 is_video 等欄位，使用替代方案
    video_analysis = video_data.get("video_analysis")
    video_thumbnail = video_data.get("video_thumbnail_url")
    
    update_data = {
        # 用 vision_analysis 存放影片分析結果
        "vision_analysis": video_analysis,
        # 用 tags 標記為影片
        "tags": ["video", "gcp_analysis"],
    }
    
    # 如果有影片封面，也更新圖片欄位
    if video_thumbnail:
        update_data["image_url"] = video_thumbnail
        update_data["thumbnail_url"] = video_thumbnail
    
    # 先用 ad_id = video_id 查詢（因為影片素材的 ad_id 可能就是 video_id）
    # 或者在 metrics 中查找 video_id
    print(f"\n📹 Processing video_id: {video_id}")
    
    try:
        # 方法 1: 直接用 video_id 作為 ad_id 查詢
        existing = supabase.table('ad_creatives').select('id, ad_id').eq('report_date', W1_DATE).eq('ad_id', video_id).execute()
        
        if existing.data:
            record_id = existing.data[0]['id']
            supabase.table('ad_creatives').update(update_data).eq('id', record_id).execute()
            print(f"  ✅ Updated ad_id={video_id} (matched by video_id)")
            return True
        
        # 方法 2: 用 LIKE 搜尋（ad_id 可能是 video_id 的一部分或反之）
        all_w1 = supabase.table('ad_creatives').select('id, ad_id, creative_name').eq('report_date', W1_DATE).execute()
        
        for record in all_w1.data:
            ad_id = record.get('ad_id', '')
            # 檢查是否有關聯（ad_id 包含 video_id 或 video_id 包含 ad_id）
            if video_id in str(ad_id) or str(ad_id) in video_id:
                record_id = record['id']
                supabase.table('ad_creatives').update(update_data).eq('id', record_id).execute()
                print(f"  ✅ Updated ad_id={ad_id} (partial match with video_id)")
                return True
        
        # 方法 3: 如果沒有匹配的記錄，建立新記錄
        print(f"  ℹ️  No existing record found for video_id={video_id}, creating new...")
        
        # 使用現有欄位儲存影片資料（ad_creatives 表尚未有 is_video 等欄位）
        # vision_analysis 欄位可以存放影片分析結果
        # tags 欄位可以標記為影片
        new_record = {
            "report_date": W1_DATE,
            "week_start": W1_START,
            "week_end": W1_END,
            "ad_id": video_id,
            "creative_name": f"Video Creative {video_id}",
            # 用 vision_analysis 欄位存放影片分析（GCP/Gemini）
            "vision_analysis": video_data.get("video_analysis"),
            # 用 image_url 存放影片封面
            "image_url": video_data.get("video_thumbnail_url"),
            "thumbnail_url": video_data.get("video_thumbnail_url"),
            "metrics": {},
            "performance_tier": "low",  # 預設 low，因為 constraint 不接受 unknown
            # 用 tags 標記為影片素材
            "tags": ["video", "gcp_analysis"],
        }
        
        supabase.table('ad_creatives').insert(new_record).execute()
        print(f"  ✅ Created new record for video_id={video_id}")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    print("=" * 60)
    print("📹 W1 Video Analysis Uploader")
    print("=" * 60)
    
    video_data_list = load_video_analysis()
    
    if not video_data_list:
        print("No video analysis data to upload")
        return
    
    print(f"Found {len(video_data_list)} video(s) to process")
    
    success = 0
    failed = 0
    
    for video_data in video_data_list:
        if update_ad_creative(video_data):
            success += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print("📊 Upload Summary")
    print("=" * 60)
    print(f"  Success: {success}")
    print(f"  Failed:  {failed}")
    print("\n✅ W1 video analysis upload complete!")


if __name__ == '__main__':
    main()
