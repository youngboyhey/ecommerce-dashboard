// Clear all Supabase data
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables to clear (in order to respect foreign key constraints)
const tablesToClear = [
  'insight_tracking',
  'weekly_insights',
  'ad_creatives',
  'ad_copies',
  'meta_adsets',
  'meta_audience_age',
  'meta_audience_gender',
  'product_rankings',
  'ga4_channels',
  'meta_campaigns',
  'reports'
];

async function clearAllData() {
  console.log('🗑️  Starting to clear all Supabase data...\n');
  
  let totalDeleted = 0;
  const results = {};
  
  for (const table of tablesToClear) {
    try {
      // First count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        // Table might not exist
        console.log(`⚠️  ${table}: ${countError.message}`);
        results[table] = { status: 'error', message: countError.message };
        continue;
      }
      
      const recordCount = count || 0;
      
      if (recordCount === 0) {
        console.log(`✓  ${table}: already empty`);
        results[table] = { status: 'empty', count: 0 };
        continue;
      }
      
      // Delete all records - use neq with a condition that's always true
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');  // Delete all non-zero UUIDs
      
      if (deleteError) {
        console.log(`❌ ${table}: delete failed - ${deleteError.message}`);
        results[table] = { status: 'delete_error', message: deleteError.message };
        continue;
      }
      
      console.log(`✅ ${table}: deleted ${recordCount} records`);
      results[table] = { status: 'deleted', count: recordCount };
      totalDeleted += recordCount;
      
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      results[table] = { status: 'exception', message: err.message };
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('═'.repeat(50));
  console.log(`Total records deleted: ${totalDeleted}`);
  console.log('\nPer table:');
  for (const [table, result] of Object.entries(results)) {
    if (result.status === 'deleted') {
      console.log(`  ${table}: ${result.count}`);
    } else if (result.status === 'empty') {
      console.log(`  ${table}: (empty)`);
    } else {
      console.log(`  ${table}: ${result.status} - ${result.message || ''}`);
    }
  }
  
  return { totalDeleted, results };
}

clearAllData()
  .then(({ totalDeleted }) => {
    console.log('\n✅ Data clearing complete!');
    console.log(`📦 Total: ${totalDeleted} records deleted`);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
