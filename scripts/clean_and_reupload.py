#!/usr/bin/env python3
"""
Complete Supabase cleanup and reupload script.
1. Clear all tables
2. Clear storage
3. Upload all 4 weeks data
4. Generate missing W2 data
5. Upload meta_adsets
6. Verify
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
SCRIPTS_DIR = Path(__file__).parent

# Week definitions
WEEKS = [
    {"date": "2026-01-15", "start": "2026-01-15", "end": "2026-01-21"},
    {"date": "2026-01-22", "start": "2026-01-22", "end": "2026-01-28"},
    {"date": "2026-01-29", "start": "2026-01-29", "end": "2026-02-04"},
    {"date": "2026-02-05", "start": "2026-02-05", "end": "2026-02-11"},
]

# Tables to clear
TABLES = [
    'reports', 'ad_creatives', 'ad_copies', 'weekly_insights',
    'meta_adsets', 'meta_campaigns', 'meta_audience_age',
    'meta_audience_gender', 'ga4_channels', 'product_rankings'
]


def load_json(filename: str) -> Optional[Dict]:
    """Load JSON file if exists."""
    filepath = SCRIPTS_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def save_json(filename: str, data: Any):
    """Save JSON file."""
    filepath = SCRIPTS_DIR / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ============================================================
# STEP 1: Clear all tables
# ============================================================
def clear_all_tables():
    print("\n" + "=" * 60)
    print("🗑️  STEP 1: Clearing all tables")
    print("=" * 60)
    
    for table in TABLES:
        try:
            # Use a condition that matches all rows
            result = supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            print(f"  ✅ Cleared {table}")
        except Exception as e:
            print(f"  ⚠️  Error clearing {table}: {e}")


# ============================================================
# STEP 2: Clear storage
# ============================================================
def clear_storage():
    print("\n" + "=" * 60)
    print("🗑️  STEP 2: Clearing storage (ad-images bucket)")
    print("=" * 60)
    
    try:
        # List all files in ad-images bucket
        files = supabase.storage.from_('ad-images').list()
        
        # Handle both flat files and folders
        all_files = []
        
        for item in files:
            name = item.get('name', '')
            if item.get('id') is None:  # It's a folder
                # List files in folder
                folder_files = supabase.storage.from_('ad-images').list(name)
                for f in folder_files:
                    if f.get('id'):  # It's a file
                        all_files.append(f"{name}/{f['name']}")
            else:  # It's a file
                all_files.append(name)
        
        if all_files:
            # Delete in batches
            batch_size = 100
            for i in range(0, len(all_files), batch_size):
                batch = all_files[i:i+batch_size]
                supabase.storage.from_('ad-images').remove(batch)
            print(f"  ✅ Deleted {len(all_files)} files from ad-images bucket")
        else:
            print("  ✅ ad-images bucket is already empty")
            
    except Exception as e:
        print(f"  ⚠️  Error clearing storage: {e}")


# ============================================================
# STEP 3 & 4: Upload data helpers
# ============================================================
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
        print(f"    ⚠️  Failed to download image: {e}")
    return None


def upload_image_to_storage(image_data: bytes, filename: str) -> Optional[str]:
    """Upload image to Supabase Storage."""
    try:
        # Ensure bucket exists
        try:
            supabase.storage.get_bucket('ad-images')
        except:
            supabase.storage.create_bucket('ad-images', {'public': True})
        
        # Upload
        supabase.storage.from_('ad-images').upload(
            filename,
            image_data,
            {'content-type': 'image/jpeg', 'upsert': 'true'}
        )
        
        # Get public URL
        public_url = supabase.storage.from_('ad-images').get_public_url(filename)
        return public_url
    except Exception as e:
        # If file already exists, get public URL
        if 'Duplicate' in str(e) or 'already exists' in str(e):
            return supabase.storage.from_('ad-images').get_public_url(filename)
        print(f"    ⚠️  Failed to upload to storage: {e}")
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


def upload_ad_creatives(week: Dict, creatives_data: Optional[List] = None) -> int:
    """Upload ad_creatives data."""
    if creatives_data is None:
        filename = f"ad_creatives_{week['date']}.json"
        creatives_data = load_json(filename)
    
    if not creatives_data:
        print(f"  ⚠️  ad_creatives_{week['date']}.json not found, skipping")
        return 0
    
    count = 0
    images_uploaded = 0
    
    for creative in creatives_data:
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
    return count


def upload_ad_copies(week: Dict, copies_data: Optional[List] = None) -> int:
    """Upload ad_copies data."""
    if copies_data is None:
        filename = f"ad_copies_{week['date']}.json"
        copies_data = load_json(filename)
    
    if not copies_data:
        print(f"  ⚠️  ad_copies_{week['date']}.json not found, skipping")
        return 0
    
    count = 0
    for copy in copies_data:
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


def upload_weekly_insights(week: Dict, insights_data: Optional[Dict] = None) -> int:
    """Upload weekly_insights data."""
    if insights_data is None:
        filename = f"weekly_insights_{week['date']}.json"
        insights_data = load_json(filename)
    
    if not insights_data:
        print(f"  ⚠️  weekly_insights_{week['date']}.json not found, skipping")
        return 0
    
    record = {
        'report_date': week['date'],
        'week_start': insights_data.get('week_start', week['start']),
        'week_end': insights_data.get('week_end', week['end']),
        'insights': {
            'highlights': insights_data.get('highlights', []),
            'warnings': insights_data.get('warnings', []),
            'recommendations': insights_data.get('recommendations', []),
        },
        'summary': insights_data,
    }
    
    try:
        supabase.table('weekly_insights').insert(record).execute()
        print(f"  ✅ weekly_insights: 1 record")
        return 1
    except Exception as e:
        print(f"    ⚠️  Failed to insert weekly_insights: {e}")
        return 0


# ============================================================
# STEP 4: Generate missing W2 data
# ============================================================
def generate_w2_missing_data():
    """Generate and upload missing data for W2 (2026-01-22)."""
    print("\n" + "-" * 40)
    print("🔧 Generating missing W2 data from report_data_2026-01-22.json")
    print("-" * 40)
    
    week = WEEKS[1]  # W2
    report_data = load_json("report_data_2026-01-22.json")
    
    if not report_data:
        print("  ⚠️  report_data_2026-01-22.json not found!")
        return
    
    # Extract creatives from report_data
    creatives = report_data.get('creatives', [])
    if not creatives:
        # Try to get from meta.ads
        ads = report_data.get('meta', {}).get('ads', [])
        if ads:
            creatives = ads
    
    # Extract adsets which might have creative info
    adsets = report_data.get('meta', {}).get('adsets', [])
    
    # Build ad_creatives from available data
    ad_creatives = []
    ad_copies = []
    
    # Process ads if available
    if creatives:
        for ad in creatives:
            ad_id = ad.get('ad_id')
            ad_creatives.append({
                'ad_id': ad_id,
                'ad_name': ad.get('ad_name') or ad.get('name'),
                'image_url': ad.get('image_url'),
                'carousel_images': ad.get('carousel_images', []),
                'spend': ad.get('spend', 0),
                'impressions': ad.get('impressions', 0),
                'clicks': ad.get('clicks', 0),
                'purchases': ad.get('purchases', 0),
                'ctr': ad.get('ctr', 0),
                'roas': ad.get('roas', 0),
            })
            
            ad_copies.append({
                'ad_id': ad_id,
                'ad_name': ad.get('ad_name') or ad.get('name'),
                'primary_text': ad.get('primary_text', ''),
                'spend': ad.get('spend', 0),
                'clicks': ad.get('clicks', 0),
                'purchases': ad.get('purchases', 0),
            })
    
    # Generate weekly insights
    meta_total = report_data.get('meta', {}).get('total', {})
    ga4_data = report_data.get('ga4', {})
    
    weekly_insights = {
        'week_start': week['start'],
        'week_end': week['end'],
        'highlights': [
            f"本週 Meta 廣告花費 ${meta_total.get('spend', 0):,.0f}",
            f"ROAS 達 {meta_total.get('roas', 0):.2f}",
            f"GA4 活躍用戶 {ga4_data.get('active_users', 0):,}",
        ],
        'warnings': [],
        'recommendations': [
            "建議持續監控廣告表現",
            "優化高轉換率的廣告組合",
        ],
    }
    
    # Save generated files
    if ad_creatives:
        save_json(f"ad_creatives_{week['date']}.json", ad_creatives)
        print(f"  ✅ Generated ad_creatives_{week['date']}.json ({len(ad_creatives)} ads)")
    
    if ad_copies:
        save_json(f"ad_copies_{week['date']}.json", ad_copies)
        print(f"  ✅ Generated ad_copies_{week['date']}.json ({len(ad_copies)} copies)")
    
    save_json(f"weekly_insights_{week['date']}.json", weekly_insights)
    print(f"  ✅ Generated weekly_insights_{week['date']}.json")
    
    return ad_creatives, ad_copies, weekly_insights


# ============================================================
# STEP 5: Upload meta_adsets
# ============================================================
def upload_meta_adsets():
    print("\n" + "=" * 60)
    print("📤 STEP 5: Uploading meta_adsets")
    print("=" * 60)
    
    total_adsets = 0
    
    for week in WEEKS:
        filename = f"report_data_{week['date']}.json"
        data = load_json(filename)
        
        if not data:
            print(f"  ⚠️  {filename} not found, skipping")
            continue
        
        adsets = data.get('meta', {}).get('adsets', [])
        if not adsets:
            print(f"  ⚠️  No adsets in {filename}")
            continue
        
        for adset in adsets:
            record = {
                'report_date': week['date'],
                'week_start': week['start'],
                'week_end': week['end'],
                'adset_id': adset.get('adset_id'),
                'adset_name': adset.get('name') or adset.get('adset_name'),
                'campaign_id': adset.get('campaign_id'),
                'campaign_name': adset.get('campaign_name'),
                'spend': adset.get('spend', 0),
                'impressions': adset.get('impressions', 0),
                'clicks': adset.get('clicks', 0),
                'purchases': adset.get('purchases', 0),
                'roas': adset.get('roas', 0),
                'ctr': adset.get('ctr', 0),
                'cpa': adset.get('cpa', 0),
                'age_distribution': adset.get('age_distribution', {}),
                'gender_distribution': adset.get('gender_distribution', {}),
                'interests': adset.get('interests', []),
            }
            
            try:
                supabase.table('meta_adsets').insert(record).execute()
                total_adsets += 1
            except Exception as e:
                print(f"    ⚠️  Failed to insert adset: {e}")
        
        print(f"  ✅ {week['date']}: {len(adsets)} adsets uploaded")
    
    print(f"  📊 Total meta_adsets: {total_adsets}")
    return total_adsets


# ============================================================
# STEP 6: Verification
# ============================================================
def verify_uploads():
    print("\n" + "=" * 60)
    print("✅ STEP 6: Verification")
    print("=" * 60)
    
    results = {}
    
    for table in TABLES:
        try:
            result = supabase.table(table).select('id', count='exact').execute()
            count = result.count if hasattr(result, 'count') and result.count else len(result.data)
            results[table] = count
            print(f"  {table}: {count} records")
        except Exception as e:
            results[table] = f"Error: {e}"
            print(f"  {table}: Error - {e}")
    
    # Count images in storage
    try:
        files = supabase.storage.from_('ad-images').list()
        total_images = 0
        for item in files:
            if item.get('id') is None:  # Folder
                folder_files = supabase.storage.from_('ad-images').list(item['name'])
                total_images += len([f for f in folder_files if f.get('id')])
            else:
                total_images += 1
        results['ad-images (storage)'] = total_images
        print(f"  ad-images (storage): {total_images} files")
    except Exception as e:
        print(f"  ad-images (storage): Error - {e}")
    
    return results


# ============================================================
# Main execution
# ============================================================
def main():
    print("=" * 60)
    print("🚀 Supabase Complete Clean & Reupload")
    print("=" * 60)
    print(f"Target: {SUPABASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    
    # Step 1: Clear all tables
    clear_all_tables()
    
    # Step 2: Clear storage
    clear_storage()
    
    # Step 3 & 4: Upload all weeks data
    print("\n" + "=" * 60)
    print("📤 STEP 3 & 4: Uploading all weeks data")
    print("=" * 60)
    
    for week in WEEKS:
        print(f"\n📅 Week: {week['date']} ({week['start']} ~ {week['end']})")
        print("-" * 40)
        
        # Check if this is W2 and needs generated data
        is_w2 = week['date'] == '2026-01-22'
        
        # Upload report data
        upload_report_data(week)
        
        # For W2, generate missing data first if needed
        if is_w2:
            creatives_file = SCRIPTS_DIR / f"ad_creatives_{week['date']}.json"
            if not creatives_file.exists():
                generated = generate_w2_missing_data()
                if generated:
                    ad_creatives, ad_copies, weekly_insights = generated
                    upload_ad_creatives(week, ad_creatives)
                    upload_ad_copies(week, ad_copies)
                    upload_weekly_insights(week, weekly_insights)
                    continue
        
        # Upload existing files
        upload_ad_creatives(week)
        upload_ad_copies(week)
        upload_weekly_insights(week)
    
    # Step 5: Upload meta_adsets
    upload_meta_adsets()
    
    # Step 6: Verification
    results = verify_uploads()
    
    print("\n" + "=" * 60)
    print("🎉 Complete!")
    print("=" * 60)
    
    return results


if __name__ == '__main__':
    main()
