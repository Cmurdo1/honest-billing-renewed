#!/usr/bin/env node

// Apply comprehensive schema migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://ezdmasftbvaohoghiflo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZG1hc2Z0YnZhb2hvZ2hpZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDg1MDcsImV4cCI6MjA3MDUyNDUwN30.ftjY1OgDM3MftuplHE3vf_ht-k2M8FeT0_gGcMEXWtc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🚀 Applying comprehensive schema migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250823200000_comprehensive_schema_verification.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded, executing...');
    
    // Split the migration into smaller chunks to avoid query size limits
    const statements = migrationSQL
      .split(/;\s*(?=--|\n|$)/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Use RPC to execute SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Results:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Manual verification may be needed.');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Test basic schema verification after migration
async function verifySchema() {
  console.log('\n🔍 Verifying schema integrity...');
  
  try {
    // Test the verification function
    const { data, error } = await supabase.rpc('verify_schema_integrity');
    
    if (error) {
      console.log('❌ Schema verification error:', error.message);
    } else {
      console.log('✅ Schema verification results:', JSON.stringify(data, null, 2));
    }
    
    // Test the problematic query that was causing the original error
    console.log('\n🧪 Testing stripe_user_subscriptions view...');
    const { data: viewData, error: viewError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.log('❌ View query error:', viewError.message);
    } else {
      console.log('✅ stripe_user_subscriptions view is working correctly');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the migration and verification
applyMigration()
  .then(() => verifySchema())
  .then(() => {
    console.log('\n🏁 Schema update complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Process failed:', error);
    process.exit(1);
  });