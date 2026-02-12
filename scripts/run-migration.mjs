// Migration script to add week_start column to meta_adsets
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

async function runMigration() {
  console.log('🚀 Starting migration: add week_start to meta_adsets');
  
  // Step 1: Check if week_start column exists
  console.log('\n📋 Checking if week_start column exists...');
  const { data: testData, error: testError } = await supabase
    .from('meta_adsets')
    .select('week_start')
    .limit(1);
  
  if (testError && (testError.message.includes('column') || testError.code === '42703')) {
    console.log('❌ week_start column does not exist yet');
    console.log('⚠️  DDL operations require direct database access or Supabase Dashboard');
    console.log('\n   Please run this SQL in Supabase Dashboard SQL Editor:');
    console.log('   --------------------------------------------------');
    console.log('   ALTER TABLE meta_adsets ADD COLUMN IF NOT EXISTS week_start DATE;');
    console.log('   CREATE INDEX IF NOT EXISTS idx_meta_adsets_week_start ON meta_adsets(week_start);');
    console.log('   --------------------------------------------------');
    process.exit(1);
  } else if (testError) {
    console.log('Error checking column:', testError.message, testError.code);
    // Continue anyway to see what happens
  } else {
    console.log('✅ week_start column already exists!');
  }

  // Step 2: Get current data state
  console.log('\n📊 Current data in meta_adsets:');
  const { data: currentData, error: currentError } = await supabase
    .from('meta_adsets')
    .select('id, adset_id, adset_name, week_start')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (currentError) {
    console.error('Error fetching data:', currentError.message);
  } else if (!currentData || currentData.length === 0) {
    console.log('No data in table yet');
  } else {
    console.table(currentData);
    
    // Count records without week_start
    const nullCount = currentData.filter(r => r.week_start === null).length;
    console.log(`Records without week_start: ${nullCount}`);
  }

  // Step 3: Update existing records with week_start = 2026-02-05
  console.log('\n📝 Updating records with NULL week_start to 2026-02-05...');
  const { data: updateData, error: updateError } = await supabase
    .from('meta_adsets')
    .update({ week_start: '2026-02-05' })
    .is('week_start', null)
    .select('id, adset_id, week_start');
  
  if (updateError) {
    console.error('Update error:', updateError.message);
  } else {
    console.log(`✅ Updated ${updateData?.length || 0} records`);
    if (updateData && updateData.length > 0) {
      console.table(updateData);
    }
  }

  // Step 4: Final verification
  console.log('\n🔍 Final verification:');
  const { data: finalData, error: finalError, count } = await supabase
    .from('meta_adsets')
    .select('id, adset_id, adset_name, week_start', { count: 'exact' });
  
  if (finalError) {
    console.error('Verification error:', finalError.message);
  } else {
    console.log(`Total records: ${count || finalData?.length || 0}`);
    const withWeekStart = finalData?.filter(r => r.week_start !== null).length || 0;
    const withoutWeekStart = finalData?.filter(r => r.week_start === null).length || 0;
    console.log(`Records with week_start: ${withWeekStart}`);
    console.log(`Records without week_start: ${withoutWeekStart}`);
    
    if (finalData && finalData.length > 0) {
      console.log('\nSample data:');
      console.table(finalData.slice(0, 5));
    }
  }

  console.log('\n✅ Migration verification complete!');
}

runMigration().catch(console.error);
