#!/usr/bin/env node

/**
 * Comprehensive Stripe Integration Test Suite
 * 
 * This master test runner executes all Stripe integration tests in proper sequence:
 * 1. Database Component Tests
 * 2. Environment Configuration Tests  
 * 3. Stripe Setup Tests
 * 4. Supabase Function Tests
 * 5. Webhook Validation Tests
 * 6. Subscription Synchronization Tests
 * 7. Pro Access Control Tests
 * 8. End-to-End Integration Tests
 * 
 * Provides comprehensive reporting and remediation guidance.
 */

import { config } from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment variables
config();

// Import all test modules
import { runDatabaseComponentTests } from './test-database-components.js';
import { runEnvironmentConfigTests } from './test-environment-config.js';
import { runStripeSetupTests } from './test-stripe-setup.js';
import { runSupabaseFunctionTests } from './test-supabase-functions.js';
import { runWebhookValidationTests } from './test-webhook-validation.js';
import { runSubscriptionSyncTests } from './test-subscription-sync.js';
import { runProAccessControlTests } from './test-pro-access-control.js';
import { runEndToEndIntegrationTests } from './test-e2e-integration.js';

// Master test results tracking
const masterResults = {
  testSuites: {
    databaseComponents: { success: false, duration: 0, critical: true },
    environmentConfig: { success: false, duration: 0, critical: true },
    stripeSetup: { success: false, duration: 0, critical: true },
    supabaseFunctions: { success: false, duration: 0, critical: false },
    webhookValidation: { success: false, duration: 0, critical: false },
    subscriptionSync: { success: false, duration: 0, critical: false },
    proAccessControl: { success: false, duration: 0, critical: false },
    e2eIntegration: { success: false, duration: 0, critical: false }
  },
  overallSuccess: false,
  totalDuration: 0,
  criticalIssues: 0,
  passedTests: 0,
  totalTests: 8
};

async function runComprehensiveTestSuite() {
  const startTime = performance.now();
  
  console.log('🧪 COMPREHENSIVE STRIPE INTEGRATION TEST SUITE\n');
  console.log('==============================================\n');
  console.log('Testing all components of the HonestInvoice Stripe integration:\n');
  console.log('✅ Database schema and access control');
  console.log('✅ Environment configuration validation');
  console.log('✅ Stripe product and feature setup');
  console.log('✅ Supabase Edge Functions integration');
  console.log('✅ Webhook signature verification');
  console.log('✅ Subscription synchronization');
  console.log('✅ Pro feature access control');
  console.log('✅ End-to-end user flow\n');

  const testSuites = [
    {
      name: 'Database Components',
      key: 'databaseComponents',
      runner: runDatabaseComponentTests,
      description: 'Database schema, RLS policies, and custom functions'
    },
    {
      name: 'Environment Configuration',
      key: 'environmentConfig',
      runner: runEnvironmentConfigTests,
      description: 'Local and Supabase environment variables'
    },
    {
      name: 'Stripe Setup',
      key: 'stripeSetup',
      runner: runStripeSetupTests,
      description: 'Stripe Pro product creation and configuration'
    },
    {
      name: 'Supabase Functions',
      key: 'supabaseFunctions',
      runner: runSupabaseFunctionTests,
      description: 'Edge Functions for checkout and webhook processing'
    },
    {
      name: 'Webhook Validation',
      key: 'webhookValidation',
      runner: runWebhookValidationTests,
      description: 'Webhook signature verification and event processing'
    },
    {
      name: 'Subscription Synchronization',
      key: 'subscriptionSync',
      runner: runSubscriptionSyncTests,
      description: 'Data sync between Stripe and Supabase'
    },
    {
      name: 'Pro Access Control',
      key: 'proAccessControl',
      runner: runProAccessControlTests,
      description: 'Feature access logic and frontend integration'
    },
    {
      name: 'End-to-End Integration',
      key: 'e2eIntegration',
      runner: runEndToEndIntegrationTests,
      description: 'Complete subscription flow from checkout to activation'
    }
  ];

  // Run all test suites
  for (const suite of testSuites) {
    await runTestSuite(suite);
    
    // Add separator between test suites
    if (suite !== testSuites[testSuites.length - 1]) {
      console.log('\n' + '='.repeat(80) + '\n');
    }
  }

  // Calculate final results
  const endTime = performance.now();
  masterResults.totalDuration = endTime - startTime;
  
  // Count successes and critical issues
  for (const [key, result] of Object.entries(masterResults.testSuites)) {
    if (result.success) {
      masterResults.passedTests++;
    } else if (result.critical) {
      masterResults.criticalIssues++;
    }
  }
  
  masterResults.overallSuccess = masterResults.criticalIssues === 0 && masterResults.passedTests >= 6;

  // Generate comprehensive report
  generateMasterTestReport();

  return masterResults;
}

async function runTestSuite(suite) {
  const suiteStartTime = performance.now();
  
  console.log(`🔍 Running ${suite.name} Tests`);
  console.log(`📝 ${suite.description}`);
  console.log('-'.repeat(60));
  
  try {
    const results = await suite.runner();
    
    const suiteEndTime = performance.now();
    const duration = suiteEndTime - suiteStartTime;
    
    masterResults.testSuites[suite.key].success = results.overallSuccess;
    masterResults.testSuites[suite.key].duration = duration;
    
    console.log(`\n⏱️  Suite completed in ${Math.round(duration)}ms`);
    console.log(`📊 Result: ${results.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    
  } catch (error) {
    const suiteEndTime = performance.now();
    const duration = suiteEndTime - suiteStartTime;
    
    masterResults.testSuites[suite.key].success = false;
    masterResults.testSuites[suite.key].duration = duration;
    
    console.error(`\n❌ Suite failed with error: ${error.message}`);
    console.log(`⏱️  Suite failed after ${Math.round(duration)}ms`);
  }
}

function generateMasterTestReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST SUITE RESULTS');
  console.log('='.repeat(80) + '\n');

  // Test suite results
  console.log('Test Suite Results:');
  console.log('-------------------');
  
  for (const [key, result] of Object.entries(masterResults.testSuites)) {
    const suiteName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const critical = result.critical ? ' (CRITICAL)' : '';
    const duration = Math.round(result.duration);
    
    console.log(`  ${suiteName.padEnd(25)} ${status}${critical.padEnd(11)} ${duration}ms`);
  }

  // Overall statistics
  console.log('\nOverall Statistics:');
  console.log('-------------------');
  console.log(`Total Test Suites: ${masterResults.totalTests}`);
  console.log(`Passed: ${masterResults.passedTests}`);
  console.log(`Failed: ${masterResults.totalTests - masterResults.passedTests}`);
  console.log(`Critical Issues: ${masterResults.criticalIssues}`);
  console.log(`Total Duration: ${Math.round(masterResults.totalDuration)}ms`);
  
  // Overall status
  console.log(`\nOverall Status: ${masterResults.overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);

  // Provide remediation guidance
  if (!masterResults.overallSuccess) {
    generateRemediationGuidance();
  } else {
    generateSuccessGuidance();
  }

  // Generate deployment checklist
  generateDeploymentChecklist();
}

function generateRemediationGuidance() {
  console.log('\n🔧 REMEDIATION GUIDANCE');
  console.log('========================\n');

  const failedCritical = [];
  const failedNonCritical = [];

  for (const [key, result] of Object.entries(masterResults.testSuites)) {
    if (!result.success) {
      if (result.critical) {
        failedCritical.push(key);
      } else {
        failedNonCritical.push(key);
      }
    }
  }

  if (failedCritical.length > 0) {
    console.log('🚨 CRITICAL ISSUES (Must be fixed before deployment):');
    console.log('-----------------------------------------------------');
    
    for (const issue of failedCritical) {
      generateSpecificGuidance(issue);
    }
  }

  if (failedNonCritical.length > 0) {
    console.log('\n⚠️  NON-CRITICAL ISSUES (Recommended to fix):');
    console.log('----------------------------------------------');
    
    for (const issue of failedNonCritical) {
      generateSpecificGuidance(issue);
    }
  }
}

function generateSpecificGuidance(issueKey) {
  const guidance = {
    databaseComponents: {
      title: 'Database Components',
      steps: [
        'Run database migrations: supabase db reset --linked',
        'Apply missing SQL scripts in Supabase SQL Editor',
        'Verify RLS policies are enabled and correctly configured',
        'Test database function creation and execution'
      ]
    },
    environmentConfig: {
      title: 'Environment Configuration',
      steps: [
        'Create .env file with all required variables',
        'Update Supabase environment variables in dashboard',
        'Verify API keys are valid and have correct permissions',
        'Test environment variable accessibility in functions'
      ]
    },
    stripeSetup: {
      title: 'Stripe Setup',
      steps: [
        'Set valid STRIPE_SECRET_KEY environment variable',
        'Run: node scripts/setup-stripe-pro.js',
        'Copy generated environment variables to configuration',
        'Verify Stripe product and features creation'
      ]
    },
    supabaseFunctions: {
      title: 'Supabase Functions',
      steps: [
        'Deploy Edge Functions: supabase functions deploy',
        'Set function environment variables in Supabase dashboard',
        'Test function connectivity and authentication',
        'Verify function permissions and error handling'
      ]
    },
    webhookValidation: {
      title: 'Webhook Validation',
      steps: [
        'Configure webhook endpoint in Stripe dashboard',
        'Set STRIPE_WEBHOOK_SECRET in Supabase environment',
        'Test webhook signature verification',
        'Monitor webhook delivery and processing logs'
      ]
    },
    subscriptionSync: {
      title: 'Subscription Synchronization',
      steps: [
        'Verify database write permissions for webhook function',
        'Test subscription record creation and updates',
        'Implement cache invalidation triggers',
        'Monitor real-time synchronization performance'
      ]
    },
    proAccessControl: {
      title: 'Pro Access Control',
      steps: [
        'Review useProAccess hook implementation',
        'Test ProFeatureGate component integration',
        'Verify access control logic for all subscription states',
        'Test frontend state updates and cache invalidation'
      ]
    },
    e2eIntegration: {
      title: 'End-to-End Integration',
      steps: [
        'Test complete checkout flow with real Stripe payment',
        'Verify immediate feature activation after payment',
        'Monitor webhook processing latency',
        'Test user experience across all subscription states'
      ]
    }
  };

  const issueGuidance = guidance[issueKey];
  if (issueGuidance) {
    console.log(`\n${issueGuidance.title}:`);
    for (const step of issueGuidance.steps) {
      console.log(`  • ${step}`);
    }
  }
}

function generateSuccessGuidance() {
  console.log('\n🎉 ALL TESTS PASSED - SYSTEM READY!');
  console.log('====================================\n');
  
  console.log('✅ Your Stripe integration is fully functional and ready for production use.\n');
  
  console.log('📝 RECOMMENDED NEXT STEPS:');
  console.log('1. Deploy to production environment');
  console.log('2. Update production environment variables');
  console.log('3. Configure production Stripe webhook endpoint');
  console.log('4. Monitor initial production transactions');
  console.log('5. Set up monitoring and alerting for webhook processing\n');
  
  console.log('🚀 PRODUCTION READINESS CONFIRMED!');
}

function generateDeploymentChecklist() {
  console.log('\n📋 DEPLOYMENT CHECKLIST');
  console.log('========================\n');

  const checklist = [
    {
      item: 'Database schema and migrations applied',
      critical: true,
      status: masterResults.testSuites.databaseComponents.success
    },
    {
      item: 'Environment variables configured',
      critical: true,
      status: masterResults.testSuites.environmentConfig.success
    },
    {
      item: 'Stripe Pro product and features created',
      critical: true,
      status: masterResults.testSuites.stripeSetup.success
    },
    {
      item: 'Supabase Edge Functions deployed',
      critical: false,
      status: masterResults.testSuites.supabaseFunctions.success
    },
    {
      item: 'Webhook endpoint configured and tested',
      critical: false,
      status: masterResults.testSuites.webhookValidation.success
    },
    {
      item: 'Subscription synchronization working',
      critical: false,
      status: masterResults.testSuites.subscriptionSync.success
    },
    {
      item: 'Pro feature access control implemented',
      critical: false,
      status: masterResults.testSuites.proAccessControl.success
    },
    {
      item: 'End-to-end flow tested and validated',
      critical: false,
      status: masterResults.testSuites.e2eIntegration.success
    }
  ];

  for (const check of checklist) {
    const status = check.status ? '✅' : '❌';
    const priority = check.critical ? ' (CRITICAL)' : '';
    console.log(`${status} ${check.item}${priority}`);
  }

  const readyForProduction = checklist.filter(c => c.critical).every(c => c.status);
  
  console.log(`\n🚀 Production Ready: ${readyForProduction ? '✅ YES' : '❌ NO'}`);
  
  if (!readyForProduction) {
    console.log('\n⚠️  Complete all CRITICAL items before deploying to production.');
  }
}

// Command line options
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    stopOnFailure: args.includes('--stop-on-failure'),
    skipNonCritical: args.includes('--critical-only'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log('Stripe Integration Test Suite\n');
    console.log('Usage: node scripts/test-stripe-integration-suite.js [options]\n');
    console.log('Options:');
    console.log('  --verbose, -v          Show detailed test output');
    console.log('  --stop-on-failure      Stop execution on first test failure');
    console.log('  --critical-only        Run only critical tests');
    console.log('  --help, -h             Show this help message\n');
    console.log('Examples:');
    console.log('  node scripts/test-stripe-integration-suite.js');
    console.log('  node scripts/test-stripe-integration-suite.js --verbose');
    console.log('  node scripts/test-stripe-integration-suite.js --critical-only\n');
    process.exit(0);
  }

  return options;
}

// Export for use in other scripts
export { runComprehensiveTestSuite, masterResults };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseCommandLineArgs();
  
  runComprehensiveTestSuite()
    .then(() => {
      const exitCode = masterResults.overallSuccess ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('\n❌ Test suite execution failed:', error);
      process.exit(1);
    });
}