#!/usr/bin/env node

// Test and fix the specific s.customer_id issue
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ezdmasftbvaohoghiflo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZG1hc2Z0YnZhb2hvZ2hpZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDg1MDcsImV4cCI6MjA3MDUyNDUwN30.ftjY1OgDM3MftuplHE3vf_ht-k2M8FeT0_gGcMEXWtc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSpecificIssue() {
  console.log('🔍 Testing specific database issues that could cause "s.customer_id does not exist" error...\n');

  // Test 1: Check stripe_subscriptions table structure
  console.log('1. Testing stripe_subscriptions table structure:');
  try {
    const { data, error } = await supabase
      .from('stripe_subscriptions')
      .select('id, customer_id, subscription_id, status')
      .limit(1);
    
    if (error) {
      console.log('❌ stripe_subscriptions query error:', error.message);
    } else {
      console.log('✅ stripe_subscriptions table is accessible with customer_id column');
      console.log('   Sample structure:', data?.[0] ? Object.keys(data[0]) : 'No data available');
    }
  } catch (err) {
    console.log('❌ Exception querying stripe_subscriptions:', err.message);
  }

  // Test 2: Check stripe_customers table
  console.log('\n2. Testing stripe_customers table:');
  try {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('id, user_id, customer_id')
      .limit(1);
    
    if (error) {
      console.log('❌ stripe_customers query error:', error.message);
    } else {
      console.log('✅ stripe_customers table is accessible');
      console.log('   Sample structure:', data?.[0] ? Object.keys(data[0]) : 'No data available');
    }
  } catch (err) {
    console.log('❌ Exception querying stripe_customers:', err.message);
  }

  // Test 3: Test the join that might be causing issues
  console.log('\n3. Testing problematic join query (stripe_user_subscriptions view):');
  try {
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ stripe_user_subscriptions view error:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
    } else {
      console.log('✅ stripe_user_subscriptions view is working correctly');
      console.log('   Available columns:', data?.[0] ? Object.keys(data[0]) : 'No data available');
    }
  } catch (err) {
    console.log('❌ Exception querying stripe_user_subscriptions view:', err.message);
  }

  // Test 4: Test is_pro_user function which might be causing the issue
  console.log('\n4. Testing is_pro_user function:');
  try {
    const { data, error } = await supabase.rpc('is_pro_user');
    
    if (error) {
      console.log('❌ is_pro_user function error:', error.message);
      console.log('   This might be the source of the s.customer_id error!');
    } else {
      console.log('✅ is_pro_user function is working');
      console.log('   Result:', data);
    }
  } catch (err) {
    console.log('❌ Exception calling is_pro_user:', err.message);
  }

  // Test 5: Test get_user_subscription_status function
  console.log('\n5. Testing get_user_subscription_status function:');
  try {
    const { data, error } = await supabase.rpc('get_user_subscription_status');
    
    if (error) {
      console.log('❌ get_user_subscription_status function error:', error.message);
      console.log('   This might be another source of the s.customer_id error!');
    } else {
      console.log('✅ get_user_subscription_status function is working');
      console.log('   Result:', data);
    }
  } catch (err) {
    console.log('❌ Exception calling get_user_subscription_status:', err.message);
  }

  // Test 6: Check if there are any triggers or other functions that might be failing
  console.log('\n6. Testing manual join to reproduce the exact error:');
  try {
    // This query mimics what might be happening internally in functions
    const { data, error } = await supabase
      .from('stripe_customers')
      .select(`
        *,
        stripe_subscriptions!inner(*)
      `)
      .limit(1);
    
    if (error) {
      console.log('❌ Manual join query error:', error.message);
      console.log('   This shows the exact join issue');
    } else {
      console.log('✅ Manual join query is working');
    }
  } catch (err) {
    console.log('❌ Exception in manual join:', err.message);
  }

  console.log('\n7. Checking current authentication state:');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('❌ Auth error:', error.message);
      console.log('   Note: Most functions require authentication');
    } else if (!user) {
      console.log('ℹ️  No authenticated user - this is expected for anon key');
      console.log('   Some functions may fail due to RLS policies');
    } else {
      console.log('✅ Authenticated user:', user.id);
    }
  } catch (err) {
    console.log('❌ Exception checking auth:', err.message);
  }
}

// Create a simple repair function that can be called if issues are found
async function attemptRepair() {
  console.log('\n🔧 Attempting to repair common issues...\n');

  // Try to refresh the view definition
  console.log('Attempting to refresh stripe_user_subscriptions view...');
  
  // Since we can't execute DDL directly, we'll test if the components exist
  const tests = [
    {
      name: 'stripe_customers table',
      query: () => supabase.from('stripe_customers').select('customer_id').limit(1)
    },
    {
      name: 'stripe_subscriptions table with customer_id',
      query: () => supabase.from('stripe_subscriptions').select('customer_id').limit(1)
    }
  ];

  for (const test of tests) {
    try {
      const { error } = await test.query();
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: OK`);
      }
    } catch (err) {
      console.log(`❌ ${test.name}: ${err.message}`);
    }
  }
}

// Run the test and repair
testSpecificIssue()
  .then(() => attemptRepair())
  .then(() => {
    console.log('\n🏁 Diagnostic complete');
    console.log('\n💡 If you are seeing "s.customer_id does not exist" errors:');
    console.log('   1. The error likely comes from a database function or view');
    console.log('   2. Check the is_pro_user() or get_user_subscription_status() functions');
    console.log('   3. The stripe_user_subscriptions view might need to be recreated');
    console.log('   4. Run the comprehensive migration script to fix all issues');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Diagnostic failed:', error);
    process.exit(1);
  });