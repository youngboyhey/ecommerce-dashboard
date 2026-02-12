#!/usr/bin/env python3
"""
Full Supabase Cleanup - Clear all tables and storage for rebuild.
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials")
    sys.exit(1)

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

# Tables to clear in order (child tables first to avoid FK violations)
TABLES = [
    'insight_tracking',
    'meta_campaigns',
    'meta_adsets',
    'meta_audience_age',
    'meta_audience_gender',
    'ga4_channels',
    'product_rankings',
    'ad_creatives',
    'ad_copies',
    'weekly_insights',
    'reports',  # Parent table last
]

def get_row_count(table_name):
    """Get current row count for a table."""
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    params = {'select': 'count', 'head': 'true'}
    headers_with_count = {**headers, 'Prefer': 'count=exact'}
    
    response = requests.get(url, headers=headers_with_count, params={'select': '*'})
    
    if response.status_code == 200:
        count = response.headers.get('content-range', '*/0')
        if '/' in count:
            total = count.split('/')[-1]
            return int(total) if total != '*' else 0
    return 0

def clear_table(table_name):
    """Delete all rows from a table using various primary key strategies."""
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    headers_delete = {**headers, 'Prefer': 'return=minimal'}
    
    # Try different column strategies to match all rows
    strategies = [
        {'id': 'neq.00000000-0000-0000-0000-000000000000'},
        {'report_id': 'neq.00000000-0000-0000-0000-000000000000'},
        {'created_at': 'neq.1900-01-01T00:00:00'},
    ]
    
    for params in strategies:
        response = requests.delete(url, headers=headers_delete, params=params)
        if response.status_code in [200, 204]:
            return True
    
    return False

def list_storage_files(bucket_name, prefix=''):
    """List all files in a storage bucket."""
    url = f"{SUPABASE_URL}/storage/v1/object/list/{bucket_name}"
    response = requests.post(url, headers=headers, json={'prefix': prefix, 'limit': 1000})
    
    if response.status_code != 200:
        return []
    
    return response.json()

def clear_storage_bucket(bucket_name):
    """Clear all files from a storage bucket, handling nested folders."""
    files = list_storage_files(bucket_name)
    
    if not files:
        return 0
    
    deleted_count = 0
    folders_to_check = []
    
    for file_obj in files:
        name = file_obj.get('name', '')
        file_id = file_obj.get('id')
        
        # If it's a folder, we need to recurse
        if file_id is None and name:
            folders_to_check.append(name)
        elif name:
            # It's a file, delete it
            delete_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{name}"
            response = requests.delete(delete_url, headers=headers)
            if response.status_code in [200, 204]:
                deleted_count += 1
    
    # Handle nested folders
    for folder in folders_to_check:
        nested_files = list_storage_files(bucket_name, prefix=folder + '/')
        for file_obj in nested_files:
            name = file_obj.get('name', '')
            if name and file_obj.get('id'):
                file_path = f"{folder}/{name}"
                delete_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_path}"
                response = requests.delete(delete_url, headers=headers)
                if response.status_code in [200, 204]:
                    deleted_count += 1
    
    return deleted_count

def main():
    print("🧹 Full Supabase Cleanup for Rebuild")
    print("=" * 60)
    print(f"Target: {SUPABASE_URL}")
    print()
    
    # ═══════════════════════════════════════════════════════════
    # Step 1: Clear Tables
    # ═══════════════════════════════════════════════════════════
    print("📋 STEP 1: Clearing Tables (child → parent)")
    print("-" * 60)
    
    table_results = {}
    
    for table in TABLES:
        before_count = get_row_count(table)
        success = clear_table(table)
        after_count = get_row_count(table)
        
        deleted = before_count - after_count
        status = "✅" if success and after_count == 0 else "⚠️"
        
        table_results[table] = {
            'before': before_count,
            'deleted': deleted,
            'after': after_count,
            'success': success and after_count == 0
        }
        
        print(f"  {status} {table}: {before_count} → {after_count} (deleted: {deleted})")
    
    print()
    
    # ═══════════════════════════════════════════════════════════
    # Step 2: Clear Storage
    # ═══════════════════════════════════════════════════════════
    print("🖼️  STEP 2: Clearing Storage Bucket (ad-images)")
    print("-" * 60)
    
    storage_deleted = clear_storage_bucket('ad-images')
    print(f"  🗑️  Deleted {storage_deleted} files from 'ad-images'")
    
    print()
    
    # ═══════════════════════════════════════════════════════════
    # Step 3: Verification
    # ═══════════════════════════════════════════════════════════
    print("🔍 STEP 3: Verification")
    print("-" * 60)
    
    all_clear = True
    for table in TABLES:
        count = get_row_count(table)
        status = "✅" if count == 0 else "❌"
        if count > 0:
            all_clear = False
        print(f"  {status} {table}: {count} rows")
    
    # Verify storage
    remaining_files = list_storage_files('ad-images')
    storage_clear = len(remaining_files) == 0 or all(f.get('id') is None for f in remaining_files)
    storage_status = "✅" if storage_clear else "❌"
    print(f"  {storage_status} ad-images bucket: {'empty' if storage_clear else f'{len(remaining_files)} files remaining'}")
    
    print()
    
    # ═══════════════════════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════════════════════
    print("=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    total_deleted = sum(r['deleted'] for r in table_results.values())
    print(f"  Tables cleared: {len(TABLES)}")
    print(f"  Total rows deleted: {total_deleted}")
    print(f"  Storage files deleted: {storage_deleted}")
    print()
    
    if all_clear and storage_clear:
        print("✅ CLEANUP COMPLETE - Ready for Full Rebuild!")
        return 0
    else:
        print("⚠️  Some items may not have been cleared. Check above for details.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
