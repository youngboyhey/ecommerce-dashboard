#!/usr/bin/env python3
"""
Upload W2 (2026-01-22 ~ 2026-01-28) data to Supabase.
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load env
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SCRIPTS_DIR = Path(__file__).parent
week = {'date': '2026-01-22', 'start': '2026-01-22', 'end': '2026-01-28'}

print('=== 上傳 W2 數據到 Supabase ===')
print()

# 1. Upload ad_creatives
print('📦 上傳 ad_creatives...')
with open(SCRIPTS_DIR / 'ad_creatives_2026-01-22.json', 'r') as f:
    creatives = json.load(f)

# 先刪除舊的 W2 數據
try:
    supabase.table('ad_creatives').delete().eq('report_date', week['date']).execute()
    print(f'   刪除舊數據完成')
except Exception as e:
    print(f'   刪除舊數據: {e}')

count = 0
for creative in creatives:
    ad_id = creative.get('ad_id') or creative.get('creative_id')
    image_url = creative.get('image_url')
    if not image_url and creative.get('carousel_images'):
        first_img = creative['carousel_images'][0]
        image_url = first_img.get('image_url') if isinstance(first_img, dict) else first_img
    
    record = {
        'report_date': week['date'],
        'week_start': week['start'],
        'week_end': week['end'],
        'creative_name': creative.get('ad_name'),
        'ad_id': ad_id,
        'campaign_name': creative.get('ad_name'),
        'image_url': image_url,
        'thumbnail_url': image_url,
        'metrics': {
            'spend': creative.get('spend', 0),
            'impressions': creative.get('impressions', 0),
            'clicks': creative.get('clicks', 0),
            'purchases': creative.get('purchases', 0),
            'ctr': creative.get('ctr', 0),
            'roas': creative.get('roas', 0),
        },
        'performance_tier': 'high' if creative.get('roas', 0) >= 1.5 else ('medium' if creative.get('roas', 0) >= 1 else 'low'),
        'vision_analysis': creative.get('ai_analysis'),
        'tags': [],
    }
    
    try:
        supabase.table('ad_creatives').insert(record).execute()
        count += 1
    except Exception as e:
        print(f'   ⚠️ 插入 {ad_id} 失敗: {e}')

print(f'✅ ad_creatives: {count} 筆')

# 2. Upload ad_copies
print()
print('📦 上傳 ad_copies...')
with open(SCRIPTS_DIR / 'ad_copies_2026-01-22.json', 'r') as f:
    copies = json.load(f)

try:
    supabase.table('ad_copies').delete().eq('report_date', week['date']).execute()
    print(f'   刪除舊數據完成')
except Exception as e:
    print(f'   刪除舊數據: {e}')

count = 0
for copy in copies:
    ad_id = copy.get('ad_id')
    primary_text = copy.get('primary_text', '')
    
    record = {
        'report_date': week['date'],
        'week_start': week['start'],
        'week_end': week['end'],
        'ad_id': ad_id,
        'campaign_name': copy.get('ad_name'),
        'copy_type': 'primary_text',
        'copy_content': primary_text,
        'copy_length': len(primary_text),
        'metrics': {
            'spend': copy.get('spend', 0),
            'clicks': copy.get('clicks', 0),
            'purchases': copy.get('purchases', 0),
        },
        'performance_tier': 'high' if copy.get('purchases', 0) > 0 else 'low',
        'analysis': copy.get('ai_analysis'),
    }
    
    try:
        supabase.table('ad_copies').insert(record).execute()
        count += 1
    except Exception as e:
        print(f'   ⚠️ 插入 {ad_id} 失敗: {e}')

print(f'✅ ad_copies: {count} 筆')

# 3. Upload meta_adsets
print()
print('📦 上傳 meta_adsets...')
with open(SCRIPTS_DIR / 'meta_adsets_2026-01-22.json', 'r') as f:
    adsets = json.load(f)

try:
    supabase.table('meta_adsets').delete().eq('report_date', week['date']).execute()
    print(f'   刪除舊數據完成')
except Exception as e:
    print(f'   刪除舊數據: {e}')

count = 0
for adset in adsets:
    record = {
        'report_date': week['date'],
        'week_start': week['start'],
        'week_end': week['end'],
        'adset_id': adset.get('adset_id'),
        'adset_name': adset.get('adset_name'),
        'spend': adset.get('spend', 0),
        'impressions': adset.get('impressions', 0),
        'reach': adset.get('reach', 0),
        'clicks': adset.get('clicks', 0),
        'ctr': adset.get('ctr', 0),
        'cpm': adset.get('cpm', 0),
        'roas': adset.get('roas', 0),
        'purchases': adset.get('purchases', 0),
        'cpa': adset.get('cpa', 0),
        'targeting': adset.get('targeting'),
        'interests': adset.get('interests', []),
    }
    
    try:
        supabase.table('meta_adsets').insert(record).execute()
        count += 1
    except Exception as e:
        print(f'   ⚠️ 插入 {adset.get("adset_name")} 失敗: {e}')

print(f'✅ meta_adsets: {count} 筆')

print()
print('🎉 W2 數據上傳完成！')
