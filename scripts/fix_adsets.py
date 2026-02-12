#!/usr/bin/env python3
"""
Upload meta_adsets data using correct table structure.
meta_adsets schema: report_id, adset_id, adset_name, campaign_id, campaign_name, 
                    targeting (JSONB), spend, impressions, clicks, purchases, roas, week_start
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed", file=sys.stderr)
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
SCRIPTS_DIR = Path(__file__).parent

WEEKS = [
    {"date": "2026-01-15", "start": "2026-01-15", "end": "2026-01-21"},
    {"date": "2026-01-22", "start": "2026-01-22", "end": "2026-01-28"},
    {"date": "2026-01-29", "start": "2026-01-29", "end": "2026-02-04"},
    {"date": "2026-02-05", "start": "2026-02-05", "end": "2026-02-11"},
]


def load_json(filename: str):
    filepath = SCRIPTS_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def get_report_id(start_date: str):
    """Get report_id for a given start_date."""
    try:
        result = supabase.table('reports').select('id').eq('start_date', start_date).execute()
        if result.data:
            return result.data[0]['id']
    except Exception as e:
        print(f"    Error getting report_id: {e}")
    return None


def upload_meta_adsets():
    print("=" * 60)
    print("📤 Uploading meta_adsets")
    print("=" * 60)
    
    total = 0
    
    for week in WEEKS:
        data = load_json(f"report_data_{week['date']}.json")
        if not data:
            print(f"  ⚠️  {week['date']}: No data file")
            continue
        
        # Get report_id for this week
        report_id = get_report_id(week['start'])
        if not report_id:
            print(f"  ⚠️  {week['date']}: No report found")
            continue
        
        # Try top-level meta_adsets first
        adsets = data.get('meta_adsets', [])
        
        # Also try meta.adsets as fallback
        if not adsets:
            adsets = data.get('meta', {}).get('adsets', [])
        
        if not adsets:
            print(f"  ⚠️  {week['date']}: No adsets in data")
            continue
        
        week_count = 0
        for adset in adsets:
            # Build targeting JSONB from available data
            targeting = adset.get('targeting', {}) or {}
            
            record = {
                'report_id': report_id,
                # 'week_start': week['start'],  # Column may not exist yet
                'adset_id': str(adset.get('adset_id', '')),
                'adset_name': adset.get('adset_name') or adset.get('name', ''),
                'campaign_id': str(adset.get('campaign_id', '')),
                'campaign_name': adset.get('campaign_name', ''),
                'targeting': targeting,
                'spend': float(adset.get('spend', 0) or 0),
                'impressions': int(adset.get('impressions', 0) or 0),
                'clicks': int(adset.get('clicks', 0) or 0),
                'purchases': int(adset.get('purchases', 0) or 0),
                'roas': float(adset.get('roas', 0) or 0),
            }
            
            try:
                # Check if exists
                existing = supabase.table('meta_adsets').select('id').eq('report_id', report_id).eq('adset_id', record['adset_id']).execute()
                if existing.data:
                    supabase.table('meta_adsets').update(record).eq('id', existing.data[0]['id']).execute()
                else:
                    supabase.table('meta_adsets').insert(record).execute()
                week_count += 1
            except Exception as e:
                print(f"    ⚠️  Failed adset {record['adset_id']}: {e}")
        
        print(f"  ✅ {week['date']}: {week_count} adsets")
        total += week_count
    
    return total


def verify():
    print("\n" + "=" * 60)
    print("✅ Verification")
    print("=" * 60)
    
    tables = ['reports', 'ad_creatives', 'ad_copies', 'weekly_insights', 
              'meta_adsets', 'meta_campaigns', 'meta_audience_age', 
              'meta_audience_gender', 'ga4_channels', 'product_rankings']
    
    for table in tables:
        try:
            result = supabase.table(table).select('id', count='exact').execute()
            count = result.count if hasattr(result, 'count') and result.count else len(result.data)
            print(f"  {table}: {count}")
        except Exception as e:
            print(f"  {table}: Error - {e}")
    
    # Storage count
    try:
        files = supabase.storage.from_('ad-images').list()
        total_images = 0
        for item in files:
            if item.get('id') is None:
                folder_files = supabase.storage.from_('ad-images').list(item['name'])
                total_images += len([f for f in folder_files if f.get('id')])
            else:
                total_images += 1
        print(f"  ad-images (storage): {total_images} files")
    except Exception as e:
        print(f"  ad-images: Error - {e}")


def main():
    upload_meta_adsets()
    verify()
    print("\n✅ Done!")


if __name__ == '__main__':
    main()
