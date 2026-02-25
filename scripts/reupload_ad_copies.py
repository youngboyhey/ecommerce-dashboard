#!/usr/bin/env python3
"""重新上傳 ad_copies 到 Supabase"""

import json
import os
from supabase import create_client

# Supabase 連線
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

# 週資料對照 (report_date = week_start，對應 reports 表的週次定義)
# 2026-02-12 修正：週次應與 reports 表的 start_date 對齊
weeks = [
    {"file": "report_data_2026-01-15.json", "report_date": "2026-01-15", "week_start": "2026-01-15", "week_end": "2026-01-21"},
    {"file": "report_data_2026-01-22.json", "report_date": "2026-01-22", "week_start": "2026-01-22", "week_end": "2026-01-28"},
    {"file": "report_data_2026-01-29.json", "report_date": "2026-01-29", "week_start": "2026-01-29", "week_end": "2026-02-04"},
    {"file": "report_data_2026-02-05.json", "report_date": "2026-02-05", "week_start": "2026-02-05", "week_end": "2026-02-11"},
]

# Step 1: 清空現有資料
print("=== Step 1: 清空現有 ad_copies 資料 ===")
try:
    delete_result = supabase.table("ad_copies").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"已清空 {len(delete_result.data) if delete_result.data else 0} 筆資料")
except Exception as e:
    print(f"清空時發生錯誤: {e}")

# Step 2: 上傳各週資料
print("\n=== Step 2: 上傳 ad_copies 資料 ===")
upload_stats = {}

for week in weeks:
    file_path = week["file"]
    report_date = week["report_date"]
    week_start = week["week_start"]
    week_end = week["week_end"]
    
    print(f"\n處理 {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
        
        ad_copies = report_data.get('ad_copies', [])
        uploaded = 0
        
        for copy in ad_copies:
            # 取得文案內容 (依序嘗試 primary_text, headline, description)
            copy_content = copy.get('primary_text') or copy.get('headline') or copy.get('description') or ''
            
            # 計算 ROAS 並決定 performance_tier (只有 high/low)
            roas = copy.get('roas', 0) or 0
            tier = 'high' if roas >= 1.5 else 'low'
            
            data = {
                'report_date': report_date,
                'week_start': week_start,
                'week_end': week_end,
                'ad_id': copy.get('ad_id'),
                'campaign_name': copy.get('ad_name'),  # 用 ad_name 作為 campaign_name
                'copy_type': 'primary_text',
                'copy_content': copy_content,
                'copy_length': len(copy_content),
                'metrics': {
                    'spend': copy.get('spend'),
                    'clicks': copy.get('clicks'),
                    'purchases': copy.get('purchases'),
                    'impressions': copy.get('impressions'),
                    'ctr': copy.get('ctr'),
                    'cpm': copy.get('cpm'),
                    'roas': roas,
                    'cpa': copy.get('cpa'),
                    'conv_value': copy.get('conv_value')
                },
                'performance_tier': tier,
                'analysis': None  # 原始資料沒有 ai_analysis
            }
            
            supabase.table('ad_copies').insert(data).execute()
            uploaded += 1
        
        upload_stats[week_start] = uploaded
        print(f"  ✓ {week_start}: 上傳 {uploaded} 筆")
        
    except FileNotFoundError:
        print(f"  ✗ 找不到檔案: {file_path}")
        upload_stats[week_start] = 0
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        upload_stats[week_start] = 0

# Step 3: 驗證上傳結果
print("\n=== Step 3: 驗證上傳結果 ===")
result = supabase.table("ad_copies").select("*").execute()
total = len(result.data) if result.data else 0
print(f"\n📊 ad_copies 總筆數: {total}")

print("\n按週統計:")
week_starts = ['2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29']
for ws in week_starts:
    count = len([r for r in result.data if r.get('week_start') == ws])
    print(f"  {ws}: {count} 筆")

print("\n=== 完成 ===")
