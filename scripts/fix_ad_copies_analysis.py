#!/usr/bin/env python3
"""修復 ad_copies 的 analysis 欄位 - 合併 AI 分析結果"""

import json
import os
from supabase import create_client

# Supabase 連線
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

# 週資料對照
weeks = [
    {
        "report_file": "report_data_2026-01-15.json",
        "ai_file": "ai_analysis_result_2026-01-15.json",
        "report_date": "2026-01-15",
        "week_start": "2026-01-08",
        "week_end": "2026-01-14",
        "week_name": "W1"
    },
    {
        "report_file": "report_data_2026-01-22.json",
        "ai_file": "ai_analysis_result_2026-01-22.json",
        "report_date": "2026-01-22",
        "week_start": "2026-01-15",
        "week_end": "2026-01-21",
        "week_name": "W2"
    },
    {
        "report_file": "report_data_2026-01-29.json",
        "ai_file": "ai_analysis_result_2026-01-29.json",
        "report_date": "2026-01-29",
        "week_start": "2026-01-22",
        "week_end": "2026-01-28",
        "week_name": "W3"
    },
    {
        "report_file": "report_data_2026-02-05.json",
        "ai_file": "ai_analysis_result_2026-02-05.json",
        "report_date": "2026-02-05",
        "week_start": "2026-01-29",
        "week_end": "2026-02-04",
        "week_name": "W4"
    },
]

def load_ai_analysis(ai_file):
    """載入 AI 分析結果，建立 ad_id -> copy_analysis 對照表"""
    analysis_map = {}
    try:
        with open(ai_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for ad in data.get('ads_analysis', []):
                ad_id = ad.get('ad_id')
                copy_analysis = ad.get('copy_analysis', {})
                if ad_id and copy_analysis:
                    # 轉換為 ad_copies 需要的 analysis 格式
                    analysis_map[ad_id] = {
                        'strengths': copy_analysis.get('strengths', []),
                        'weaknesses': copy_analysis.get('weaknesses', []),
                        'suggested_improvements': copy_analysis.get('suggested_improvements', []),
                        'tone': copy_analysis.get('tone', ''),
                        'emotional_triggers': copy_analysis.get('emotional_triggers', []),
                        'call_to_action': copy_analysis.get('call_to_action', ''),
                        'cta_effectiveness': copy_analysis.get('cta_effectiveness', ''),
                        'cta_score': copy_analysis.get('cta_score'),
                        'overall_score': copy_analysis.get('overall_score')
                    }
    except FileNotFoundError:
        print(f"  ⚠️  AI 分析檔案不存在: {ai_file}")
    except Exception as e:
        print(f"  ⚠️  載入 AI 分析失敗: {e}")
    return analysis_map


# Step 1: 清空現有資料
print("=== Step 1: 清空現有 ad_copies 資料 ===")
try:
    delete_result = supabase.table("ad_copies").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"已清空 {len(delete_result.data) if delete_result.data else 0} 筆資料")
except Exception as e:
    print(f"清空時發生錯誤: {e}")

# Step 2: 上傳各週資料（含 AI 分析）
print("\n=== Step 2: 上傳 ad_copies 資料（含 AI 分析）===")
upload_stats = {}

for week in weeks:
    print(f"\n{week['week_name']} ({week['week_start']}~{week['week_end']}):")
    
    # 載入 AI 分析
    ai_analysis_map = load_ai_analysis(week['ai_file'])
    print(f"  AI 分析數量: {len(ai_analysis_map)} 筆")
    
    try:
        with open(week['report_file'], 'r', encoding='utf-8') as f:
            report_data = json.load(f)
        
        ad_copies = report_data.get('ad_copies', [])
        uploaded = 0
        with_analysis = 0
        
        for copy in ad_copies:
            ad_id = copy.get('ad_id')
            
            # 取得文案內容
            copy_content = copy.get('primary_text') or copy.get('headline') or copy.get('description') or ''
            
            # 計算 ROAS 並決定 performance_tier
            roas = copy.get('roas', 0) or 0
            tier = 'high' if roas >= 1.5 else 'low'
            
            # 取得 AI 分析（如果有）
            analysis = ai_analysis_map.get(ad_id)
            if analysis:
                with_analysis += 1
            
            data = {
                'report_date': week['report_date'],
                'week_start': week['week_start'],
                'week_end': week['week_end'],
                'ad_id': ad_id,
                'campaign_name': copy.get('ad_name'),
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
                'analysis': analysis  # 加入 AI 分析
            }
            
            supabase.table('ad_copies').insert(data).execute()
            uploaded += 1
        
        upload_stats[week['week_start']] = {'total': uploaded, 'with_analysis': with_analysis}
        print(f"  ✓ 上傳 {uploaded} 筆，{with_analysis} 筆有 AI 分析")
        
    except FileNotFoundError:
        print(f"  ✗ 找不到檔案: {week['report_file']}")
        upload_stats[week['week_start']] = {'total': 0, 'with_analysis': 0}
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        upload_stats[week['week_start']] = {'total': 0, 'with_analysis': 0}

# Step 3: 驗證上傳結果
print("\n=== Step 3: 驗證上傳結果 ===")
result = supabase.table("ad_copies").select("*").order("week_start").execute()
total = len(result.data) if result.data else 0
print(f"\n📊 ad_copies 總筆數: {total}")

print("\n按週統計:")
for week in weeks:
    ws = week['week_start']
    records = [r for r in result.data if r.get('week_start') == ws]
    count = len(records)
    has_analysis = sum(1 for r in records if r.get('analysis') and (r['analysis'].get('strengths') or r['analysis'].get('weaknesses')))
    print(f"  {week['week_name']} ({ws}): {count} 筆，{has_analysis} 筆有 AI 分析")

print("\n=== 完成 ===")
