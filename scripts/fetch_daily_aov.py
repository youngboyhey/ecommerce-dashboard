#!/usr/bin/env python3
"""
Batch fetch daily AOV data for the past N days.

Usage:
    python3 fetch_daily_aov.py --days 28
    python3 fetch_daily_aov.py --start 2026-01-15 --end 2026-02-11
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env.local')

# Import required modules
from scripts.daily_report import get_cyberbiz_data

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase", file=sys.stderr)
    sys.exit(1)


def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("Error: Missing Supabase credentials", file=sys.stderr)
        sys.exit(1)
    
    return create_client(url, key)


def fetch_and_upload_daily_data(start_date: str, end_date: str, dry_run: bool = False):
    """
    Fetch daily Cyberbiz data for date range and upload to Supabase.
    
    Each day gets its own report record with mode='daily'.
    """
    supabase = get_supabase_client() if not dry_run else None
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    
    current_dt = start_dt
    success_count = 0
    error_count = 0
    
    print(f"📊 Fetching daily AOV data from {start_date} to {end_date}")
    print(f"   Total days: {(end_dt - start_dt).days + 1}")
    print()
    
    while current_dt <= end_dt:
        date_str = current_dt.strftime("%Y-%m-%d")
        print(f"  📅 {date_str}: ", end="", flush=True)
        
        try:
            # Fetch Cyberbiz data for this single day
            cyber_data = get_cyberbiz_data(date_str, date_str)
            
            aov = cyber_data.get('aov', 0)
            orders = cyber_data.get('order_count', 0)
            revenue = cyber_data.get('total_revenue', 0)
            new_members = cyber_data.get('new_members', 0)
            
            print(f"AOV=${aov:.0f}, Orders={orders}, Revenue=${revenue:.0f}", end="")
            
            if dry_run:
                print(" (dry-run)")
            else:
                # Upload to Supabase
                report_record = {
                    'mode': 'daily',
                    'start_date': date_str,
                    'end_date': date_str,
                    'generated_at': datetime.now().isoformat(),
                    
                    # Cyberbiz fields (primary data for daily mode)
                    'cyber_order_count': orders,
                    'cyber_revenue': revenue,
                    'cyber_aov': aov,
                    'cyber_new_members': new_members,
                    
                    # Set other fields to 0/null for daily mode
                    'meta_spend': 0,
                    'meta_ctr': 0,
                    'meta_clicks': 0,
                    'meta_roas': 0,
                    'meta_purchases': 0,
                    'meta_atc': 0,
                    'meta_conv_value': 0,
                    'meta_cpa': 0,
                    'ga4_active_users': 0,
                    'ga4_sessions': 0,
                    'ga4_atc': 0,
                    'ga4_purchases': 0,
                    'ga4_revenue': 0,
                    'ga4_overall_conversion': 0,
                    'mer': 0,
                }
                
                # Upsert (update if exists, insert if not)
                existing = supabase.table('reports').select('id').eq('start_date', date_str).eq('mode', 'daily').execute()
                
                if existing.data and len(existing.data) > 0:
                    # Update existing
                    report_id = existing.data[0]['id']
                    supabase.table('reports').update(report_record).eq('id', report_id).execute()
                    print(f" ✓ updated")
                else:
                    # Insert new
                    supabase.table('reports').insert(report_record).execute()
                    print(f" ✓ inserted")
                
                success_count += 1
                
        except Exception as e:
            print(f" ✗ Error: {e}")
            error_count += 1
        
        current_dt += timedelta(days=1)
    
    print()
    print(f"{'=' * 50}")
    print(f"📊 Summary")
    print(f"   Success: {success_count}")
    print(f"   Errors: {error_count}")
    
    return success_count, error_count


def main():
    parser = argparse.ArgumentParser(description='Batch fetch daily AOV data')
    parser.add_argument('--start', help='Start date YYYY-MM-DD')
    parser.add_argument('--end', help='End date YYYY-MM-DD')
    parser.add_argument('--days', type=int, default=28, help='Number of past days to fetch (default: 28)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fetched without uploading')
    
    args = parser.parse_args()
    
    # Determine date range
    if args.start and args.end:
        start_date = args.start
        end_date = args.end
    else:
        # Default: past N days (not including today)
        today = datetime.now()
        end_dt = today - timedelta(days=1)  # Yesterday
        start_dt = end_dt - timedelta(days=args.days - 1)
        start_date = start_dt.strftime("%Y-%m-%d")
        end_date = end_dt.strftime("%Y-%m-%d")
    
    fetch_and_upload_daily_data(start_date, end_date, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
