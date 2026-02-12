#!/usr/bin/env python3
"""
Clear all data from Supabase tables and storage.
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
    'Prefer': 'return=minimal'
}

# Tables to clear in order (dependencies first)
TABLES = [
    'weekly_insights',
    'product_rankings',
    'ga4_channels',
    'meta_audience_age',
    'meta_audience_gender',
    'meta_campaigns',
    'meta_adsets',
    'ad_creatives',
    'ad_copies',
    'reports'
]

def clear_table(table_name):
    """Delete all rows from a table."""
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    # Use neq filter to match all rows
    params = {'id': 'neq.00000000-0000-0000-0000-000000000000'}
    
    # First try with id column
    response = requests.delete(url, headers=headers, params=params)
    
    if response.status_code == 400:
        # Table might not have 'id' column, try without filter (delete all)
        # For tables without id, we need to find their primary key
        # Try common column names
        for col in ['report_id', 'name', 'created_at']:
            params = {col: f'neq.___impossible___'}
            response = requests.delete(url, headers=headers, params=params)
            if response.status_code in [200, 204]:
                break
    
    return response.status_code in [200, 204]

def clear_storage_bucket(bucket_name):
    """Clear all files from a storage bucket."""
    # List all files in the bucket
    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{bucket_name}"
    
    response = requests.post(list_url, headers=headers, json={'prefix': '', 'limit': 1000})
    
    if response.status_code != 200:
        print(f"  ⚠️  Could not list files in bucket '{bucket_name}': {response.status_code}")
        return False
    
    files = response.json()
    if not files:
        print(f"  ℹ️  Bucket '{bucket_name}' is already empty")
        return True
    
    # Delete each file
    deleted_count = 0
    for file_obj in files:
        file_name = file_obj.get('name')
        if file_name:
            delete_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_name}"
            del_response = requests.delete(delete_url, headers=headers)
            if del_response.status_code in [200, 204]:
                deleted_count += 1
    
    print(f"  🗑️  Deleted {deleted_count} files from '{bucket_name}'")
    return True

def main():
    print("🧹 Clearing Supabase Data")
    print("=" * 50)
    print(f"URL: {SUPABASE_URL}")
    print()
    
    # Step 1: Clear tables
    print("📋 Step 1: Clearing Tables")
    print("-" * 30)
    
    for table in TABLES:
        success = clear_table(table)
        status = "✅" if success else "⚠️"
        print(f"  {status} {table}")
    
    print()
    
    # Step 2: Clear storage
    print("🖼️  Step 2: Clearing Storage")
    print("-" * 30)
    clear_storage_bucket('ad-images')
    
    print()
    print("✅ Supabase cleanup complete!")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
