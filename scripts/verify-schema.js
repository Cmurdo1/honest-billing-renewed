#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const checks = [
  {
    name: 'Table: stripe_customers',
    fn: async () => {
      const { data, error } = await supabase.from('stripe_customers').select('*').limit(1);
      if (error) throw error;
      return true;
    },
  },
  {
    name: 'Table: stripe_subscriptions',
    fn: async () => {
      const { data, error } = await supabase.from('stripe_subscriptions').select('*').limit(1);
      if (error) throw error;
      return true;
    },
  },
  {
    name: 'Table: stripe_orders',
    fn: async () => {
        const { data, error } = await supabase.from('stripe_orders').select('*').limit(1);
        if (error) throw error;
        return true;
    }
  },
  {
    name: 'View: stripe_user_subscriptions',
    fn: async () => {
      const { data, error } = await supabase.from('stripe_user_subscriptions').select('*').limit(1);
      if (error) throw error;
      return true;
    },
  },
  {
    name: 'RPC: invalidate_subscription_cache',
    fn: async () => {
      const { data, error } = await supabase.rpc('invalidate_subscription_cache', { p_customer_id: 'cus_123' }).limit(1);
      // We expect an error because the customer doesn't exist, but not a "not found" error
      if (error && error.message.includes('not found')) throw error;
      return true;
    },
  },
  {
    name: 'RPC: verify_stripe_subscriptions_table',
    fn: async () => {
        const { data, error } = await supabase.rpc('verify_stripe_subscriptions_table');
        if (error) throw error;
        return data;
    }
  }
];

async function main() {
  console.log('Verifying database schema...');
  let allGood = true;

  for (const check of checks) {
    try {
      const result = await check.fn();
      if(result) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
        allGood = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name} - ${error.message}`);
      allGood = false;
    }
  }

  if (allGood) {
    console.log('\n✅ All database schema checks passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some database schema checks failed.');
    process.exit(1);
  }
}

main();
