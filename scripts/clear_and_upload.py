#!/usr/bin/env python3
"""
Clear all data and re-upload 4 weeks of data to Supabase.
"""

import json
import os
import sys
import hashlib
import httpx
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
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

WEEKS = [
    {"date": "2026-01-15", "start": "2026-01-15", "end": "2026-01-21"},
    {"date": "2026-01-22", "start": "2026-01-22", "end": "2026-01-28"},
    {"date": "2026-01-29", "start": "2026-01-29", "end": "2026-02-04"},
    {"date": "2026-02-05", "start": "2026-02-05", "end": "2026-02-11"},
]

SCRIPTS_DIR = Path(__file__).parent


def clear_all_data():
    """Clear all tables and storage."""
    print("🗑️  Clearing all existing data...")
    
    # Tables to clear (order matters due to foreign keys)
    # Child tables first, then parent tables
    tables_to_clear = [
        'insight_tracking',
        'weekly_insights',
        'ad_copies',
        'ad_creatives',
        'meta_adsets',
        'product_rankings',
        'ga4_channels',
        'meta_audience_gender',
        'meta_audience_age',
        'meta_campaigns',
        'reports',  # Parent table last
    ]
    
    for table in tables_to_clear:
        try:
            # Use a broad filter to delete all rows
            result = supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            count = len(result.data) if result.data else 0
            print(f"  ✅ {table}: deleted {count} records")
        except Exception as e:
            print(f"  ⚠️  {table}: {e}")
    
    # Clear storage bucket
    print("\n🗑️  Clearing ad-images storage bucket...")
    try:
        # List all files in bucket
        files = supabase.storage.from_('ad-images').list()
        if files:
            # List files in subdirectories too
            all_files = []
            for item in files:
                if item.get('name'):
                    # Check if it's a folder
                    subfiles = supabase.storage.from_('ad-images').list(item['name'])
                    if subfiles:
                        for sf in subfiles:
                            if sf.get('name'):
                                all_files.append(f"{item['name']}/{sf['name']}")
                    else:
                        all_files.append(item['name'])
            
            if all_files:
                supabase.storage.from_('ad-images').remove(all_files)
                print(f"  ✅ Deleted {len(all_files)} files from ad-images bucket")
            else:
                print("  ✅ ad-images bucket is empty")
        else:
            print("  ✅ ad-images bucket is empty")
    except Exception as e:
        print(f"  ⚠️  Storage clear error: {e}")
    
    print()


def load_json(filename: str) -> Optional[Dict]:
    """Load JSON file if exists."""
    filepath = SCRIPTS_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def upload_report_data(week: Dict) -> Optional[str]:
    """Upload report_data and return report_id."""
    filename = f"report_data_{week['date']}.json"
    data = load_json(filename)
    if not data:
        print(f"  ⚠️  {filename} not found, skipping")
        return None
    
    meta_total = data.get('meta', {}).get('total', {})
    ga4_data = data.get('ga4', {})
    cyberbiz_data = data.get('cyberbiz', {})
    
    report_record = {
        'mode': data.get('mode', 'weekly'),
        'start_date': data.get('start_date', week['start']),
        'end_date': data.get('end_date', week['end']),
        'generated_at': data.get('generated_at', datetime.now().isoformat()),
        'meta_spend': meta_total.get('spend', 0),
        'meta_ctr': meta_total.get('ctr', 0),
        'meta_clicks': meta_total.get('clicks', 0),
        'meta_roas': meta_total.get('roas', 0),
        'meta_purchases': meta_total.get('purchases', 0),
        'meta_atc': meta_total.get('atc', 0),
        'meta_conv_value': meta_total.get('conv_value', 0),
        'meta_cpa': meta_total.get('cpa', 0),
        'ga4_active_users': ga4_data.get('active_users', 0),
        'ga4_sessions': ga4_data.get('sessions', 0),
        'ga4_atc': ga4_data.get('atc', 0),
        'ga4_purchases': ga4_data.get('purchases', 0),
        'ga4_revenue': ga4_data.get('purchase_revenue', 0),
        'ga4_overall_conversion': ga4_data.get('funnel_rates', {}).get('overall_conversion', 0),
        'cyber_order_count': cyberbiz_data.get('order_count', 0),
        'cyber_revenue': cyberbiz_data.get('total_revenue', 0),
        'cyber_aov': cyberbiz_data.get('aov', 0),
        'cyber_new_members': cyberbiz_data.get('new_members', 0),
        'mer': data.get('mer', 0),
        'raw_data': data
    }
    
    result = supabase.table('reports').insert(report_record).execute()
    report_id = result.data[0]['id'] if result.data else None
    print(f"  ✅ reports: inserted (id: {report_id[:8] if report_id else 'N/A'}...)")
    
    # Upload campaigns
    campaigns = data.get('meta', {}).get('campaigns', [])
    if campaigns and report_id:
        campaign_records = [{
            'report_id': report_id,
            'campaign_id': c.get('campaign_id'),
            'campaign_name': c.get('name'),
            'spend': c.get('spend'),
            'clicks': c.get('clicks'),
            'ctr': c.get('ctr'),
            'purchases': c.get('purchases'),
            'roas': c.get('roas'),
            'conv_value': c.get('conv_value'),
            'cpa': c.get('cpa'),
            'atc': c.get('atc'),
        } for c in campaigns]
        supabase.table('meta_campaigns').insert(campaign_records).execute()
        print(f"  ✅ meta_campaigns: {len(campaign_records)} records")
    
    # Upload audience age
    age_data = data.get('meta_audience', {}).get('age', [])
    if age_data and report_id:
        age_records = [{
            'report_id': report_id,
            'age_range': a.get('age_range'),
            'spend': a.get('spend'),
            'impressions': a.get('impressions'),
            'clicks': a.get('clicks'),
            'purchases': a.get('purchases')
        } for a in age_data]
        supabase.table('meta_audience_age').insert(age_records).execute()
        print(f"  ✅ meta_audience_age: {len(age_records)} records")
    
    # Upload audience gender
    gender_data = data.get('meta_audience', {}).get('gender', [])
    if gender_data and report_id:
        gender_records = [{
            'report_id': report_id,
            'gender': g.get('gender'),
            'spend': g.get('spend'),
            'impressions': g.get('impressions'),
            'clicks': g.get('clicks'),
            'purchases': g.get('purchases')
        } for g in gender_data]
        supabase.table('meta_audience_gender').insert(gender_records).execute()
        print(f"  ✅ meta_audience_gender: {len(gender_records)} records")
    
    # Upload GA4 channels
    ga4_channels = data.get('ga4_channels', [])
    if ga4_channels and report_id:
        channel_records = [{
            'report_id': report_id,
            'source': ch.get('source'),
            'sessions': ch.get('sessions'),
            'atc': ch.get('atc'),
            'purchases': ch.get('purchases'),
            'session_to_atc_rate': ch.get('session_to_atc_rate'),
        } for ch in ga4_channels]
        supabase.table('ga4_channels').insert(channel_records).execute()
        print(f"  ✅ ga4_channels: {len(channel_records)} records")
    
    # Upload product rankings
    products = data.get('cyberbiz', {}).get('product_ranking', [])
    if products and report_id:
        product_records = [{
            'report_id': report_id,
            'product_name': p.get('product_name'),
            'sku': p.get('sku'),
            'total_quantity': p.get('total_quantity'),
            'total_revenue': p.get('total_revenue'),
            'rank': idx + 1
        } for idx, p in enumerate(products)]
        supabase.table('product_rankings').insert(product_records).execute()
        print(f"  ✅ product_rankings: {len(product_records)} records")
    
    return report_id


def download_image(url: str) -> Optional[bytes]:
    """Download image from URL."""
    if not url:
        return None
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                return resp.content
    except Exception as e:
        print(f"    ⚠️  Failed to download: {e}")
    return None


def upload_image_to_storage(image_data: bytes, filename: str) -> Optional[str]:
    """Upload image to Supabase Storage."""
    try:
        try:
            supabase.storage.get_bucket('ad-images')
        except:
            supabase.storage.create_bucket('ad-images', {'public': True})
        
        supabase.storage.from_('ad-images').upload(
            filename,
            image_data,
            {'content-type': 'image/jpeg', 'upsert': 'true'}
        )
        
        public_url = supabase.storage.from_('ad-images').get_public_url(filename)
        return public_url
    except Exception as e:
        print(f"    ⚠️  Storage upload error: {e}")
        return None


def upload_ad_creatives(week: Dict) -> tuple[int, int]:
    """Upload ad_creatives data. Returns (record_count, image_count)."""
    filename = f"ad_creatives_{week['date']}.json"
    data = load_json(filename)
    if not data:
        print(f"  ⚠️  {filename} not found, skipping")
        return 0, 0
    
    count = 0
    images_uploaded = 0
    
    for creative in data:
        ad_id = creative.get('ad_id') or creative.get('creative_id')
        
        image_url = creative.get('image_url')
        if not image_url and creative.get('carousel_images'):
            image_url = creative['carousel_images'][0]
        
        storage_url = None
        if image_url:
            image_hash = hashlib.md5(image_url.encode()).hexdigest()[:12]
            storage_filename = f"{week['date']}/{ad_id}_{image_hash}.jpg"
            
            image_data = download_image(image_url)
            if image_data:
                storage_url = upload_image_to_storage(image_data, storage_filename)
                if storage_url:
                    images_uploaded += 1
        
        record = {
            'report_date': week['date'],
            'week_start': week['start'],
            'week_end': week['end'],
            'creative_name': creative.get('ad_name'),
            'ad_id': ad_id,
            'campaign_name': creative.get('ad_name'),
            'image_url': storage_url or image_url,
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
            print(f"    ⚠️  Failed to insert creative {ad_id}: {e}")
    
    print(f"  ✅ ad_creatives: {count} records (images: {images_uploaded})")
    return count, images_uploaded


def upload_ad_copies(week: Dict) -> int:
    """Upload ad_copies data."""
    filename = f"ad_copies_{week['date']}.json"
    data = load_json(filename)
    if not data:
        print(f"  ⚠️  {filename} not found, skipping")
        return 0
    
    count = 0
    for copy in data:
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
            print(f"    ⚠️  Failed to insert copy {ad_id}: {e}")
    
    print(f"  ✅ ad_copies: {count} records")
    return count


def upload_weekly_insights(week: Dict) -> int:
    """Upload weekly_insights data."""
    filename = f"weekly_insights_{week['date']}.json"
    data = load_json(filename)
    if not data:
        print(f"  ⚠️  {filename} not found, skipping")
        return 0
    
    record = {
        'report_date': week['date'],
        'week_start': data.get('week_start', week['start']),
        'week_end': data.get('week_end', week['end']),
        'insights': {
            'highlights': data.get('highlights', []),
            'warnings': data.get('warnings', []),
            'recommendations': data.get('recommendations', []),
        },
        'summary': data,
    }
    
    try:
        supabase.table('weekly_insights').insert(record).execute()
        print(f"  ✅ weekly_insights: 1 record")
        return 1
    except Exception as e:
        print(f"    ⚠️  Failed to insert weekly_insights: {e}")
        return 0


def main():
    print("=" * 60)
    print("📤 Supabase Clear & Re-Upload")
    print("=" * 60)
    
    # Step 1: Clear all data
    clear_all_data()
    
    # Step 2: Upload fresh data
    print("📤 Uploading fresh data...")
    
    total_stats = {
        'reports': 0,
        'ad_creatives': 0,
        'ad_copies': 0,
        'weekly_insights': 0,
        'images': 0,
    }
    
    for week in WEEKS:
        print(f"\n📅 Week: {week['date']} ({week['start']} ~ {week['end']})")
        print("-" * 40)
        
        report_id = upload_report_data(week)
        if report_id:
            total_stats['reports'] += 1
        
        count, imgs = upload_ad_creatives(week)
        total_stats['ad_creatives'] += count
        total_stats['images'] += imgs
        
        count = upload_ad_copies(week)
        total_stats['ad_copies'] += count
        
        count = upload_weekly_insights(week)
        total_stats['weekly_insights'] += count
    
    print("\n" + "=" * 60)
    print("📊 Final Summary")
    print("=" * 60)
    print(f"  reports:         {total_stats['reports']}")
    print(f"  ad_creatives:    {total_stats['ad_creatives']}")
    print(f"  ad_copies:       {total_stats['ad_copies']}")
    print(f"  weekly_insights: {total_stats['weekly_insights']}")
    print(f"  images uploaded: {total_stats['images']}")
    print("\n✅ Clean re-upload complete!")


if __name__ == '__main__':
    main()
