#!/usr/bin/env node

// Test script to check database table existence
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ezdmasftbvaohoghiflo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZG1hc2Z0YnZhb2hvZ2hpZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDg1MDcsImV4cCI6MjA3MDUyNDUwN30.ftjY1OgDM3MftuplHE3vf_ht-k2M8FeT0_gGcMEXWtc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  console.log('🔍 Checking core application tables...\n');
  
  const tables = [
    'clients', 
    'invoices', 
    'invoice_items', 
    'recurring_invoices', 
    'recurring_invoice_items', 
    'user_settings',
    'stripe_customers',
    'stripe_subscriptions'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists and accessible`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
    }
  }
}

checkTables()
  .then(() => {
    console.log('\n🏁 Table check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });