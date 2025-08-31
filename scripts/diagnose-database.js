#!/usr/bin/env node

// Database diagnostic script for stripe_subscriptions table issue
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ezdmasftbvaohoghiflo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZG1hc2Z0YnZhb2hvZ2hpZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDg1MDcsImV4cCI6MjA3MDUyNDUwN30.ftjY1OgDM3MftuplHE3vf_ht-k2M8FeT0_gGcMEXWtc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseDatabaseSchema() {
  console.log('🔍 Diagnosing Supabase database schema...\n');

  try {
    // Check 1: List all tables with stripe prefix
    console.log('1. Checking for stripe-related tables:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('run_sql', {
        query: `
          SELECT 
            table_name, 
            table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name LIKE 'stripe_%'
          ORDER BY table_name;
        `
      });

    if (tablesError) {
      console.log('❌ Error querying tables:', tablesError.message);
      
      // Try alternative approach
      console.log('\n2. Attempting direct table query:');
      const { data: directCheck, error: directError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .limit(1);
        
      if (directError) {
        console.log('❌ stripe_subscriptions table error:', directError.message);
        console.log('   Code:', directError.code);
        console.log('   Details:', directError.details);
      } else {
        console.log('✅ stripe_subscriptions table exists and is accessible');
      }
    } else {
      if (tables && tables.length > 0) {
        console.log('✅ Found stripe tables:');
        tables.forEach(table => {
          console.log(`   - ${table.table_name} (${table.table_type})`);
        });
      } else {
        console.log('❌ No stripe tables found');
      }
    }

    // Check 2: Test stripe_customers table
    console.log('\n3. Testing stripe_customers table:');
    const { data: customers, error: customersError } = await supabase
      .from('stripe_customers')
      .select('*')
      .limit(1);
      
    if (customersError) {
      console.log('❌ stripe_customers error:', customersError.message);
    } else {
      console.log('✅ stripe_customers table is accessible');
    }

    // Check 3: Test stripe_user_subscriptions view
    console.log('\n4. Testing stripe_user_subscriptions view:');
    const { data: userSubs, error: userSubsError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
      
    if (userSubsError) {
      console.log('❌ stripe_user_subscriptions error:', userSubsError.message);
    } else {
      console.log('✅ stripe_user_subscriptions view is accessible');
    }

    // Check 4: Test custom types
    console.log('\n5. Checking custom types:');
    const { data: types, error: typesError } = await supabase
      .rpc('run_sql', {
        query: `
          SELECT 
            n.nspname AS schema_name,
            t.typname AS type_name
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname LIKE 'stripe_%'
          ORDER BY t.typname;
        `
      });

    if (typesError) {
      console.log('❌ Error querying custom types:', typesError.message);
    } else if (types && types.length > 0) {
      console.log('✅ Found custom types:');
      types.forEach(type => {
        console.log(`   - ${type.type_name}`);
      });
    } else {
      console.log('❌ No custom stripe types found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnostic
diagnoseDatabaseSchema()
  .then(() => {
    console.log('\n🏁 Diagnostic complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Diagnostic failed:', error);
    process.exit(1);
  });