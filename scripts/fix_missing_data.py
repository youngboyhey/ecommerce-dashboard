#!/usr/bin/env python3
"""
Fix missing data: upload W2 ad_creatives/ad_copies and all weeks meta_adsets
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


def load_json(filename: str) -> Optional[Dict]:
    filepath = SCRIPTS_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def download_image(url: str) -> Optional[bytes]:
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
    try:
        try:
            supabase.storage.get_bucket('ad-images')
        except:
            supabase.storage.create_bucket('ad-images', {'public': True})
        
        supabase.storage.from_('ad-images').upload(
            filename, image_data,
            {'content-type': 'image/jpeg', 'upsert': 'true'}
        )
        return supabase.storage.from_('ad-images').get_public_url(filename)
    except Exception as e:
        if 'Duplicate' in str(e) or 'already exists' in str(e):
            return supabase.storage.from_('ad-images').get_public_url(filename)
        print(f"    ⚠️  Storage error: {e}")
        return None


def upload_w2_ad_creatives():
    """Upload W2 ad_creatives from report_data top-level key."""
    print("\n📤 Uploading W2 ad_creatives from report_data...")
    
    week = WEEKS[1]  # W2
    data = load_json("report_data_2026-01-22.json")
    
    if not data:
        print("  ⚠️  report_data_2026-01-22.json not found!")
        return 0
    
    creatives = data.get('ad_creatives', [])
    if not creatives:
        print("  ⚠️  No ad_creatives in report_data")
        return 0
    
    count = 0
    images_uploaded = 0
    
    for creative in creatives:
        ad_id = creative.get('ad_id') or creative.get('creative_id')
        
        # Get image URL - prefer supabase_image_url if available
        image_url = creative.get('supabase_image_url') or creative.get('image_url')
        carousel_images = creative.get('supabase_carousel_urls') or creative.get('carousel_images', [])
        
        if not image_url and carousel_images:
            image_url = carousel_images[0]
        
        # Upload image if it's an external URL (not already in supabase)
        storage_url = image_url
        if image_url and 'supabase' not in image_url:
            image_hash = hashlib.md5(image_url.encode()).hexdigest()[:12]
            storage_filename = f"{week['date']}/{ad_id}_{image_hash}.jpg"
            
            image_data = download_image(image_url)
            if image_data:
                new_url = upload_image_to_storage(image_data, storage_filename)
                if new_url:
                    storage_url = new_url
                    images_uploaded += 1
        
        # Calculate metrics from available data
        spend = creative.get('spend', 0)
        impressions = creative.get('impressions', 0)
        clicks = creative.get('clicks', 0)
        purchases = creative.get('purchases', 0)
        ctr = creative.get('ctr', 0)
        roas = creative.get('roas', 0)
        
        record = {
            'report_date': week['date'],
            'week_start': week['start'],
            'week_end': week['end'],
            'creative_name': creative.get('ad_name') or creative.get('title'),
            'ad_id': ad_id,
            'campaign_name': creative.get('ad_name'),
            'image_url': storage_url,
            'thumbnail_url': image_url,
            'metrics': {
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'purchases': purchases,
                'ctr': ctr,
                'roas': roas,
            },
            'performance_tier': 'high' if roas >= 1.5 else ('medium' if roas >= 1 else 'low'),
            'vision_analysis': None,
            'tags': [],
        }
        
        try:
            # Check if already exists
            existing = supabase.table('ad_creatives').select('id').eq('report_date', week['date']).eq('ad_id', ad_id).execute()
            if existing.data:
                supabase.table('ad_creatives').update(record).eq('id', existing.data[0]['id']).execute()
            else:
                supabase.table('ad_creatives').insert(record).execute()
            count += 1
        except Exception as e:
            print(f"    ⚠️  Failed creative {ad_id}: {e}")
    
    print(f"  ✅ ad_creatives (W2): {count} records, {images_uploaded} images uploaded")
    return count


def upload_w2_ad_copies():
    """Upload W2 ad_copies from report_data ad_creatives."""
    print("\n📤 Uploading W2 ad_copies...")
    
    week = WEEKS[1]
    data = load_json("report_data_2026-01-22.json")
    
    if not data:
        return 0
    
    creatives = data.get('ad_creatives', [])
    count = 0
    
    for creative in creatives:
        ad_id = creative.get('ad_id') or creative.get('creative_id')
        primary_text = creative.get('body', '') or creative.get('title', '')
        
        if not primary_text:
            continue
        
        record = {
            'report_date': week['date'],
            'week_start': week['start'],
            'week_end': week['end'],
            'ad_id': ad_id,
            'campaign_name': creative.get('ad_name'),
            'copy_type': 'primary_text',
            'copy_content': primary_text,
            'copy_length': len(primary_text),
            'metrics': {
                'spend': creative.get('spend', 0),
                'clicks': creative.get('clicks', 0),
                'purchases': creative.get('purchases', 0),
            },
            'performance_tier': 'high' if creative.get('purchases', 0) > 0 else 'low',
            'analysis': None,
        }
        
        try:
            existing = supabase.table('ad_copies').select('id').eq('report_date', week['date']).eq('ad_id', ad_id).execute()
            if existing.data:
                supabase.table('ad_copies').update(record).eq('id', existing.data[0]['id']).execute()
            else:
                supabase.table('ad_copies').insert(record).execute()
            count += 1
        except Exception as e:
            print(f"    ⚠️  Failed copy {ad_id}: {e}")
    
    print(f"  ✅ ad_copies (W2): {count} records")
    return count


def upload_meta_adsets_from_toplevel():
    """Upload meta_adsets from report_data top-level meta_adsets key."""
    print("\n📤 Uploading meta_adsets from all weeks...")
    
    total = 0
    
    for week in WEEKS:
        data = load_json(f"report_data_{week['date']}.json")
        if not data:
            continue
        
        # Try top-level meta_adsets first
        adsets = data.get('meta_adsets', [])
        
        # Also try meta.adsets as fallback
        if not adsets:
            adsets = data.get('meta', {}).get('adsets', [])
        
        if not adsets:
            print(f"  ⚠️  {week['date']}: No adsets found")
            continue
        
        week_count = 0
        for adset in adsets:
            # Extract targeting info
            targeting = adset.get('targeting', {})
            
            record = {
                'report_date': week['date'],
                'week_start': week['start'],
                'week_end': week['end'],
                'adset_id': adset.get('adset_id'),
                'adset_name': adset.get('adset_name') or adset.get('name'),
                'campaign_id': adset.get('campaign_id'),
                'campaign_name': adset.get('campaign_name'),
                'spend': adset.get('spend', 0),
                'impressions': adset.get('impressions', 0),
                'clicks': adset.get('clicks', 0),
                'purchases': adset.get('purchases', 0),
                'roas': adset.get('roas', 0),
                'ctr': adset.get('ctr', 0),
                'cpa': adset.get('cpa', 0),
                'age_distribution': targeting.get('age_range', adset.get('age_distribution', {})),
                'gender_distribution': targeting.get('genders', adset.get('gender_distribution', {})),
                'interests': targeting.get('interests', adset.get('interests', [])),
            }
            
            try:
                existing = supabase.table('meta_adsets').select('id').eq('report_date', week['date']).eq('adset_id', record['adset_id']).execute()
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
    print("✅ Final Verification")
    print("=" * 60)
    
    tables = ['reports', 'ad_creatives', 'ad_copies', 'weekly_insights', 
              'meta_adsets', 'meta_campaigns', 'meta_audience_age', 
              'meta_audience_gender', 'ga4_channels', 'product_rankings']
    
    results = {}
    for table in tables:
        try:
            result = supabase.table(table).select('id', count='exact').execute()
            count = result.count if hasattr(result, 'count') and result.count else len(result.data)
            results[table] = count
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
    
    return results


def main():
    print("=" * 60)
    print("🔧 Fix Missing Data Script")
    print("=" * 60)
    
    # Upload W2 ad_creatives
    upload_w2_ad_creatives()
    
    # Upload W2 ad_copies
    upload_w2_ad_copies()
    
    # Upload meta_adsets from all weeks
    upload_meta_adsets_from_toplevel()
    
    # Verify
    verify()
    
    print("\n✅ Done!")


if __name__ == '__main__':
    main()
