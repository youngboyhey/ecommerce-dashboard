#!/usr/bin/env python3
"""
Supabase Uploader for E-commerce Dashboard

Upload weekly report JSON files to Supabase database.

Usage:
  # Upload a single report
  python3 supabase_uploader.py report_data_2026-02-05.json

  # Upload multiple reports
  python3 supabase_uploader.py report_data_*.json

  # Upload all reports in directory
  python3 supabase_uploader.py --dir ./

  # Dry run (show what would be uploaded)
  python3 supabase_uploader.py --dry-run report_data_2026-02-05.json

Features:
  - Properly sets week_start for all records
  - Uses upsert to avoid duplicates
  - Respects foreign key constraints (creates report first, then related records)
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase", file=sys.stderr)
    sys.exit(1)


def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    # Try loading from .env.local
    env_path = Path(__file__).parent.parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
    
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("Error: Missing Supabase credentials", file=sys.stderr)
        print("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)
    
    return create_client(url, key)


def upload_report(supabase: Client, report_data: Dict[str, Any], dry_run: bool = False) -> Dict[str, int]:
    """
    Upload a single report to Supabase.
    
    Returns dict with counts of inserted/updated records per table.
    """
    results = {}
    
    # Extract week info
    week_start = report_data.get('week_start') or report_data.get('start_date')
    week_end = report_data.get('end_date')
    
    if not week_start:
        raise ValueError("Report missing week_start or start_date field")
    
    print(f"\n  📅 Week: {week_start} ~ {week_end}")
    
    # Extract meta total data
    meta_total = report_data.get('meta', {}).get('total', {})
    ga4_data = report_data.get('ga4', {})
    cyberbiz_data = report_data.get('cyberbiz', {})
    
    # 1. Create/update main report record (matching ReportRow schema)
    report_record = {
        'mode': report_data.get('mode', 'weekly'),
        'start_date': week_start,
        'end_date': week_end,
        'generated_at': report_data.get('generated_at', datetime.now().isoformat()),
        
        # Meta Ads fields
        'meta_spend': meta_total.get('spend', 0),
        'meta_ctr': meta_total.get('ctr', 0),
        'meta_clicks': meta_total.get('clicks', 0),
        'meta_roas': meta_total.get('roas', 0),
        'meta_purchases': meta_total.get('purchases', 0),
        'meta_atc': meta_total.get('atc', 0),
        'meta_conv_value': meta_total.get('conv_value', 0),
        'meta_cpa': meta_total.get('cpa', 0),
        
        # GA4 fields
        'ga4_active_users': ga4_data.get('active_users', 0),
        'ga4_sessions': ga4_data.get('sessions', 0),
        'ga4_atc': ga4_data.get('atc', 0),
        'ga4_purchases': ga4_data.get('purchases', 0),
        'ga4_revenue': ga4_data.get('purchase_revenue', 0),
        'ga4_overall_conversion': ga4_data.get('funnel_rates', {}).get('overall_conversion', 0),
        
        # Cyberbiz fields
        'cyber_order_count': cyberbiz_data.get('order_count', 0),
        'cyber_revenue': cyberbiz_data.get('total_revenue', 0),
        'cyber_aov': cyberbiz_data.get('aov', 0),
        'cyber_new_members': cyberbiz_data.get('new_members', 0),
        
        # Calculated
        'mer': report_data.get('mer', 0),
        
        # Raw JSON for additional data
        'raw_data': report_data
    }
    
    report_id = None
    
    if dry_run:
        print(f"     → reports: 1 record")
        results['reports'] = 1
        report_id = 'dry-run-id'
    else:
        # First check if report exists for this start_date
        existing = supabase.table('reports').select('id').eq('start_date', week_start).eq('mode', report_data.get('mode', 'weekly')).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing
            report_id = existing.data[0]['id']
            supabase.table('reports').update(report_record).eq('id', report_id).execute()
            print(f"     ✅ reports: updated 1 record (id: {report_id[:8]}...)")
        else:
            # Insert new
            result = supabase.table('reports').insert(report_record).execute()
            report_id = result.data[0]['id'] if result.data else None
            print(f"     ✅ reports: inserted 1 record (id: {report_id[:8] if report_id else 'N/A'}...)")
        
        results['reports'] = 1
    
    # 2. Upload campaigns
    campaigns = report_data.get('meta', {}).get('campaigns', [])
    if campaigns and report_id:
        campaign_records = []
        for campaign in campaigns:
            # Only include fields that exist in the database schema
            campaign_records.append({
                'report_id': report_id,
                'campaign_id': campaign.get('campaign_id'),
                'campaign_name': campaign.get('name'),
                'spend': campaign.get('spend'),
                'clicks': campaign.get('clicks'),
                'ctr': campaign.get('ctr'),
                'purchases': campaign.get('purchases'),
                'roas': campaign.get('roas'),
                'conv_value': campaign.get('conv_value'),
                'cpa': campaign.get('cpa'),
                'atc': campaign.get('atc'),
            })
        
        if dry_run:
            print(f"     → meta_campaigns: {len(campaign_records)} records")
            results['meta_campaigns'] = len(campaign_records)
        else:
            # Delete existing records for this report, then insert
            supabase.table('meta_campaigns').delete().eq('report_id', report_id).execute()
            result = supabase.table('meta_campaigns').insert(campaign_records).execute()
            results['meta_campaigns'] = len(result.data) if result.data else 0
            print(f"     ✅ meta_campaigns: {results['meta_campaigns']} record(s)")
    
    # 3. Upload audience data
    audience = report_data.get('meta_audience', {})
    
    # Age data
    age_data = audience.get('age', [])
    if age_data and report_id:
        age_records = [
            {
                'report_id': report_id,
                'age_range': item.get('age_range'),
                'spend': item.get('spend'),
                'impressions': item.get('impressions'),
                'clicks': item.get('clicks'),
                'purchases': item.get('purchases')
            }
            for item in age_data
        ]
        
        if dry_run:
            print(f"     → meta_audience_age: {len(age_records)} records")
            results['meta_audience_age'] = len(age_records)
        else:
            supabase.table('meta_audience_age').delete().eq('report_id', report_id).execute()
            result = supabase.table('meta_audience_age').insert(age_records).execute()
            results['meta_audience_age'] = len(result.data) if result.data else 0
            print(f"     ✅ meta_audience_age: {results['meta_audience_age']} record(s)")
    
    # Gender data
    gender_data = audience.get('gender', [])
    if gender_data and report_id:
        gender_records = [
            {
                'report_id': report_id,
                'gender': item.get('gender'),
                'spend': item.get('spend'),
                'impressions': item.get('impressions'),
                'clicks': item.get('clicks'),
                'purchases': item.get('purchases')
            }
            for item in gender_data
        ]
        
        if dry_run:
            print(f"     → meta_audience_gender: {len(gender_records)} records")
            results['meta_audience_gender'] = len(gender_records)
        else:
            supabase.table('meta_audience_gender').delete().eq('report_id', report_id).execute()
            result = supabase.table('meta_audience_gender').insert(gender_records).execute()
            results['meta_audience_gender'] = len(result.data) if result.data else 0
            print(f"     ✅ meta_audience_gender: {results['meta_audience_gender']} record(s)")
    
    # 4. Upload GA4 channels
    ga4_channels = report_data.get('ga4_channels', [])
    if ga4_channels and report_id:
        channel_records = [
            {
                'report_id': report_id,
                'source': item.get('source'),
                'sessions': item.get('sessions'),
                'atc': item.get('atc'),
                'purchases': item.get('purchases'),
                'session_to_atc_rate': item.get('session_to_atc_rate'),
            }
            for item in ga4_channels
        ]
        
        if dry_run:
            print(f"     → ga4_channels: {len(channel_records)} records")
            results['ga4_channels'] = len(channel_records)
        else:
            supabase.table('ga4_channels').delete().eq('report_id', report_id).execute()
            result = supabase.table('ga4_channels').insert(channel_records).execute()
            results['ga4_channels'] = len(result.data) if result.data else 0
            print(f"     ✅ ga4_channels: {results['ga4_channels']} record(s)")
    
    # 5. Upload product rankings
    products = report_data.get('cyberbiz', {}).get('product_ranking', [])
    if products and report_id:
        product_records = [
            {
                'report_id': report_id,
                'product_name': item.get('product_name'),
                'sku': item.get('sku'),
                'total_quantity': item.get('total_quantity'),
                'total_revenue': item.get('total_revenue'),
                'rank': idx + 1
            }
            for idx, item in enumerate(products)
        ]
        
        if dry_run:
            print(f"     → product_rankings: {len(product_records)} records")
            results['product_rankings'] = len(product_records)
        else:
            supabase.table('product_rankings').delete().eq('report_id', report_id).execute()
            result = supabase.table('product_rankings').insert(product_records).execute()
            results['product_rankings'] = len(result.data) if result.data else 0
            print(f"     ✅ product_rankings: {results['product_rankings']} record(s)")
    
    # 6. Upload ad_creatives (廣告素材 + 多圖 + 影片)
    ad_creatives = report_data.get('ad_creatives', [])
    if ad_creatives and report_id:
        import hashlib
        
        count = 0
        for creative in ad_creatives:
            ad_id = creative.get('ad_id') or creative.get('creative_id')
            if not ad_id:
                continue
            
            # Get image URL
            image_url = creative.get('supabase_image_url') or creative.get('image_url')
            if not image_url and creative.get('carousel_images'):
                first_img = creative['carousel_images'][0]
                if isinstance(first_img, dict):
                    image_url = first_img.get('image_url')
                elif isinstance(first_img, str):
                    image_url = first_img
            
            # Extract carousel URLs
            carousel_images_data = creative.get('carousel_images', [])
            carousel_urls = []
            for img in carousel_images_data:
                if isinstance(img, dict):
                    url = img.get('image_url')
                    if url:
                        carousel_urls.append(url)
                elif isinstance(img, str):
                    carousel_urls.append(img)
            
            # 影片相關欄位
            is_video = creative.get('is_video', False)
            video_id = creative.get('video_id')
            video_thumbnail_url = creative.get('video_thumbnail_url')
            video_analysis = creative.get('video_analysis')
            
            # 影片封面優先
            final_image_url = image_url
            if is_video and video_thumbnail_url:
                final_image_url = video_thumbnail_url
            
            record = {
                'report_date': week_start,
                'week_start': week_start,
                'week_end': week_end,
                'creative_name': creative.get('ad_name'),
                'ad_id': ad_id,
                'campaign_name': creative.get('ad_name'),
                'image_url': final_image_url,
                'thumbnail_url': creative.get('image_url'),
                'carousel_images': carousel_urls if carousel_urls else None,
                'is_video': is_video,
                'video_id': video_id,
                'video_thumbnail_url': video_thumbnail_url,
                'video_analysis': video_analysis,
                'metrics': {
                    'spend': creative.get('spend', 0),
                    'impressions': creative.get('impressions', 0),
                    'clicks': creative.get('clicks', 0),
                    'purchases': creative.get('purchases', 0),
                    'ctr': creative.get('ctr', 0),
                    'roas': creative.get('roas', 0),
                },
                'performance_tier': 'high' if creative.get('roas', 0) >= 1.5 else ('medium' if creative.get('roas', 0) >= 1 else 'low'),
                'vision_analysis': creative.get('ai_analysis') or creative.get('vision_analysis'),
                'success_factors': creative.get('success_factors'),
                'failure_factors': creative.get('failure_factors'),
                'improvement_suggestions': creative.get('improvement_suggestions'),
                'tags': ['video'] if is_video else [],
            }
            
            try:
                existing = supabase.table('ad_creatives').select('id').eq('report_date', week_start).eq('ad_id', ad_id).execute()
                if existing.data:
                    supabase.table('ad_creatives').update(record).eq('id', existing.data[0]['id']).execute()
                else:
                    supabase.table('ad_creatives').insert(record).execute()
                count += 1
            except Exception as e:
                if not dry_run:
                    print(f"    ⚠️  Failed to insert creative {ad_id}: {e}")
        
        results['ad_creatives'] = count
        if not dry_run:
            print(f"     ✅ ad_creatives: {count} record(s)")
    
    # 7. Upload ad_copies (廣告文案)
    ad_copies = report_data.get('ad_copies', [])
    if ad_copies and report_id:
        count = 0
        for copy in ad_copies:
            ad_id = copy.get('ad_id') or copy.get('creative_id')
            if not ad_id:
                continue
            
            record = {
                'report_date': week_start,
                'week_start': week_start,
                'week_end': week_end,
                'creative_name': copy.get('ad_name'),
                'ad_id': ad_id,
                'campaign_name': copy.get('ad_name'),
                'body': copy.get('body'),
                'title': copy.get('title'),
                'metrics': {
                    'spend': copy.get('spend', 0),
                    'impressions': copy.get('impressions', 0),
                    'clicks': copy.get('clicks', 0),
                    'purchases': copy.get('purchases', 0),
                    'ctr': copy.get('ctr', 0),
                    'roas': copy.get('roas', 0),
                },
                'performance_tier': 'high' if copy.get('roas', 0) >= 1.5 else ('medium' if copy.get('roas', 0) >= 1 else 'low'),
            }
            
            try:
                existing = supabase.table('ad_copies').select('id').eq('report_date', week_start).eq('ad_id', ad_id).execute()
                if existing.data:
                    supabase.table('ad_copies').update(record).eq('id', existing.data[0]['id']).execute()
                else:
                    supabase.table('ad_copies').insert(record).execute()
                count += 1
            except Exception as e:
                if not dry_run:
                    print(f"    ⚠️  Failed to insert ad_copy {ad_id}: {e}")
        
        results['ad_copies'] = count
        if not dry_run:
            print(f"     ✅ ad_copies: {count} record(s)")
    
    return results


def upload_report_to_supabase(report_data: Dict[str, Any]) -> bool:
    """Convenience wrapper called from daily_report.py main().
    
    Returns True on success, False on failure.
    """
    try:
        client = get_supabase_client()
        results = upload_report(client, report_data)
        total = sum(results.values())
        print(f"     📊 Total records uploaded: {total}")
        return total > 0
    except Exception as e:
        print(f"     ❌ upload_report_to_supabase failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Upload weekly reports to Supabase',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('files', nargs='*', help='JSON files to upload')
    parser.add_argument('--dir', type=str, help='Directory containing report_data_*.json files')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be uploaded')
    
    args = parser.parse_args()
    
    # Collect files to process
    files_to_process: List[Path] = []
    
    if args.dir:
        dir_path = Path(args.dir)
        files_to_process.extend(sorted(dir_path.glob('report_data_*.json')))
    
    for file_arg in args.files:
        files_to_process.append(Path(file_arg))
    
    if not files_to_process:
        print("Error: No files specified. Use --dir or provide file paths.", file=sys.stderr)
        sys.exit(1)
    
    # Remove duplicates and sort
    files_to_process = sorted(set(files_to_process))
    
    print(f"📤 Supabase Uploader")
    print(f"{'=' * 50}")
    print(f"Files to process: {len(files_to_process)}")
    if args.dry_run:
        print("Mode: DRY RUN (no changes will be made)")
    print()
    
    # Initialize Supabase client
    if not args.dry_run:
        supabase = get_supabase_client()
    else:
        supabase = None
    
    total_results = {}
    success_count = 0
    error_count = 0
    
    for file_path in files_to_process:
        print(f"📄 Processing: {file_path.name}")
        
        if not file_path.exists():
            print(f"   ❌ File not found: {file_path}")
            error_count += 1
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                report_data = json.load(f)
            
            results = upload_report(supabase, report_data, dry_run=args.dry_run)
            
            # Aggregate results
            for table, count in results.items():
                total_results[table] = total_results.get(table, 0) + count
            
            success_count += 1
            
        except json.JSONDecodeError as e:
            print(f"   ❌ Invalid JSON: {e}")
            error_count += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            error_count += 1
    
    # Summary
    print()
    print(f"{'=' * 50}")
    print(f"📊 Summary")
    print(f"   Files processed: {success_count}")
    print(f"   Errors: {error_count}")
    print()
    if total_results:
        print("   Records per table:")
        for table, count in sorted(total_results.items()):
            print(f"     {table}: {count}")
    
    if args.dry_run:
        print()
        print("🔍 Dry run complete. No changes were made.")
    
    return 0 if error_count == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
