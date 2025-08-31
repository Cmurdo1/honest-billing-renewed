#!/usr/bin/env node

// Direct fix for missing columns using individual ALTER statements
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ezdmasftbvaohoghiflo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZG1hc2Z0YnZhb2hvZ2hpZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDg1MDcsImV4cCI6MjA3MDUyNDUwN30.ftjY1OgDM3MftuplHE3vf_ht-k2M8FeT0_gGcMEXWtc";

// Note: This is a service role key that should be kept secret
// For demonstration purposes - in production, use environment variables
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZG1hc2Z0YnZhb2hvZ2hpZmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk0ODUwNywiZXhwIjoyMDcwNTI0NTA3fQ.CUW6Z1gI6W6_R6QXpGQJEKQkR5TgLsIL6DzWyQJcN4A";

// Try both anon and service role
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixMissingColumns() {
  console.log('🔧 Fixing missing columns in stripe tables...\n');

  const alterStatements = [
    // Fix stripe_customers table
    {
      name: 'Add customer_id to stripe_customers',
      sql: 'ALTER TABLE stripe_customers ADD COLUMN IF NOT EXISTS customer_id text'
    },
    {
      name: 'Add customer_id unique constraint',
      sql: 'ALTER TABLE stripe_customers ADD CONSTRAINT IF NOT EXISTS stripe_customers_customer_id_unique UNIQUE (customer_id)'
    },
    {
      name: 'Add user_id to stripe_customers',
      sql: 'ALTER TABLE stripe_customers ADD COLUMN IF NOT EXISTS user_id uuid'
    },
    {
      name: 'Add user_id foreign key',
      sql: 'ALTER TABLE stripe_customers ADD CONSTRAINT IF NOT EXISTS stripe_customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)'
    },
    
    // Fix stripe_subscriptions table
    {
      name: 'Add customer_id to stripe_subscriptions',
      sql: 'ALTER TABLE stripe_subscriptions ADD COLUMN IF NOT EXISTS customer_id text'
    },
    {
      name: 'Add subscription_id to stripe_subscriptions',
      sql: 'ALTER TABLE stripe_subscriptions ADD COLUMN IF NOT EXISTS subscription_id text'
    },
    {
      name: 'Add status to stripe_subscriptions',
      sql: 'ALTER TABLE stripe_subscriptions ADD COLUMN IF NOT EXISTS status text DEFAULT \'not_started\''
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const statement of alterStatements) {
    console.log(`Executing: ${statement.name}...`);
    
    try {
      // Try with service role first, then anon
      let { error } = await supabaseService.rpc('exec_sql', { sql: statement.sql });
      
      if (error && error.message.includes('Could not find the function')) {
        // Try alternative approach using query
        ({ error } = await supabaseService
          .from('pg_stat_statements')
          .select('*')
          .eq('query', statement.sql));
      }
      
      if (error) {
        console.log(`❌ ${statement.name}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${statement.name}: Success`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${statement.name}: ${err.message}`);
      errorCount++;
    }
    
    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Results: ${successCount} success, ${errorCount} errors`);
  
  // Test if the fix worked
  console.log('\n🧪 Testing if the fix worked...');
  await testFix();
}

async function testFix() {
  // Test 1: Check if we can query customer_id columns
  console.log('Testing stripe_customers.customer_id...');
  try {
    const { error } = await supabaseAnon
      .from('stripe_customers')
      .select('customer_id')
      .limit(1);
    
    if (error) {
      console.log(`❌ stripe_customers.customer_id: ${error.message}`);
    } else {
      console.log('✅ stripe_customers.customer_id: Working');
    }
  } catch (err) {
    console.log(`❌ stripe_customers.customer_id: ${err.message}`);
  }

  console.log('Testing stripe_subscriptions.customer_id...');
  try {
    const { error } = await supabaseAnon
      .from('stripe_subscriptions')
      .select('customer_id')
      .limit(1);
    
    if (error) {
      console.log(`❌ stripe_subscriptions.customer_id: ${error.message}`);
    } else {
      console.log('✅ stripe_subscriptions.customer_id: Working');
    }
  } catch (err) {
    console.log(`❌ stripe_subscriptions.customer_id: ${err.message}`);
  }

  // Test 2: Check the view
  console.log('Testing stripe_user_subscriptions view...');
  try {
    const { error } = await supabaseAnon
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ stripe_user_subscriptions: ${error.message}`);
    } else {
      console.log('✅ stripe_user_subscriptions: Working');
    }
  } catch (err) {
    console.log(`❌ stripe_user_subscriptions: ${err.message}`);
  }
}

// Alternative approach: Create a test migration that can be run manually
async function createManualFix() {
  console.log('\n📝 Creating manual fix script...');
  
  const manualSQLFix = `
-- Manual fix for missing columns
-- Run this in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stripe_customers'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stripe_subscriptions'
ORDER BY ordinal_position;

-- Step 2: Add missing columns to stripe_customers
ALTER TABLE stripe_customers 
ADD COLUMN IF NOT EXISTS customer_id text,
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Step 3: Add missing columns to stripe_subscriptions  
ALTER TABLE stripe_subscriptions 
ADD COLUMN IF NOT EXISTS customer_id text,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS price_id text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS current_period_start bigint,
ADD COLUMN IF NOT EXISTS current_period_end bigint,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method_brand text,
ADD COLUMN IF NOT EXISTS payment_method_last4 text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Step 4: Add constraints
ALTER TABLE stripe_customers 
ADD CONSTRAINT IF NOT EXISTS stripe_customers_customer_id_unique UNIQUE (customer_id),
ADD CONSTRAINT IF NOT EXISTS stripe_customers_user_id_unique UNIQUE (user_id);

ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT IF NOT EXISTS stripe_subscriptions_customer_id_unique UNIQUE (customer_id);

-- Step 5: Add foreign key if possible
-- ALTER TABLE stripe_customers 
-- ADD CONSTRAINT stripe_customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Step 6: Verify the fix
SELECT 'stripe_customers columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'stripe_customers';

SELECT 'stripe_subscriptions columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'stripe_subscriptions';
`;

  console.log('Manual SQL Fix Script:');
  console.log('====================');
  console.log(manualSQLFix);
  
  console.log('\n💡 To fix the issue manually:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Copy and paste the SQL script above');
  console.log('3. Run the script');
  console.log('4. Run the test script again to verify');
}

// Run the fix attempt
fixMissingColumns()
  .then(() => createManualFix())
  .then(() => {
    console.log('\n🏁 Fix attempt complete');
    console.log('\nIf automated fix failed, use the manual SQL script provided above.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix attempt failed:', error);
    console.log('\nPlease use the manual SQL script approach.');
    process.exit(1);
  });