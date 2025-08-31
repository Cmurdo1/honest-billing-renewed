#!/usr/bin/env node

/**
 * Stripe Setup Validation and Pro Product Creation Test
 * 
 * This script validates and executes:
 * - Stripe API connectivity and authentication
 * - Pro product creation with proper configuration
 * - Feature entitlements setup
 * - Price configuration validation
 * - Test checkout session creation
 * 
 * Test IDs: STRIPE-001, STRIPE-002
 */

import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables
config();

// Stripe configuration - will be updated with actual secret key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY_HERE';

// Test results tracking
const testResults = {
  apiConnectivity: false,
  productCreation: false,
  priceConfiguration: false,
  featureEntitlements: {
    unlimitedInvoices: false,
    customBranding: false,
    recurringInvoices: false,
    advancedAnalytics: false
  },
  checkoutSession: false,
  overallSuccess: false
};

// Store created resources for cleanup/reference
const createdResources = {
  product: null,
  features: {},
  sampleSession: null
};

async function runStripeSetupTests() {
  console.log('💳 Running Stripe Setup and Validation Tests\n');
  console.log('=============================================\n');

  try {
    // Validate Stripe credentials
    if (STRIPE_SECRET_KEY === 'sk_test_YOUR_SECRET_KEY_HERE') {
      console.log('❌ SETUP REQUIRED: Please set STRIPE_SECRET_KEY environment variable');
      console.log('   Example: export STRIPE_SECRET_KEY=sk_test_your_actual_key');
      console.log('   Or create .env file with: STRIPE_SECRET_KEY=sk_test_your_actual_key\n');
      return testResults;
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      appInfo: {
        name: 'HonestInvoice Pro Test Suite',
        version: '1.0.0',
        url: 'https://honestinvoice.com',
      },
    });

    // Test 1: API Connectivity (STRIPE-001)
    console.log('🔗 Test STRIPE-001: API Connectivity');
    console.log('------------------------------------');
    await testAPIConnectivity(stripe);

    // Test 2: Pro Product Creation (STRIPE-001)
    console.log('\n📦 Test STRIPE-001: Pro Product Creation');
    console.log('----------------------------------------');
    await testProProductCreation(stripe);

    // Test 3: Feature Entitlements (STRIPE-002)
    console.log('\n⭐ Test STRIPE-002: Feature Entitlements');
    console.log('----------------------------------------');
    await testFeatureEntitlements(stripe);

    // Test 4: Checkout Session Creation
    console.log('\n🛒 Test: Sample Checkout Session');
    console.log('--------------------------------');
    await testCheckoutSession(stripe);

    // Generate final report
    generateStripeSetupReport();

  } catch (error) {
    console.error('❌ Stripe setup test suite failed:', error.message);
    testResults.overallSuccess = false;
  }

  return testResults;
}

async function testAPIConnectivity(stripe) {
  try {
    console.log('  Testing Stripe API connectivity...');
    
    // Test basic API connectivity
    const account = await stripe.accounts.retrieve();
    console.log(`    ✅ PASS: Connected to Stripe account - ${account.email || account.id}`);
    console.log(`    ✅ Account type: ${account.type}`);
    console.log(`    ✅ Capabilities: ${Object.keys(account.capabilities || {}).join(', ')}`);
    
    testResults.apiConnectivity = true;
  } catch (error) {
    console.log(`    ❌ FAIL: API connectivity failed - ${error.message}`);
    testResults.apiConnectivity = false;
    throw error; // Stop execution if API fails
  }
}

async function testProProductCreation(stripe) {
  try {
    console.log('  Creating HonestInvoice Pro product...');
    
    // Check if product already exists
    const existingProducts = await stripe.products.list({ 
      limit: 100 
    });
    
    let product = existingProducts.data.find(p => p.name === 'HonestInvoice Pro');
    
    if (product) {
      console.log(`    ✅ FOUND: Existing HonestInvoice Pro product - ${product.id}`);
      createdResources.product = product;
    } else {
      // Create new product
      product = await stripe.products.create({
        name: 'HonestInvoice Pro',
        description: 'Professional invoicing features including unlimited invoices, custom branding, recurring invoices, and advanced analytics for honestinvoice.com',
        default_price_data: {
          currency: 'usd',
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
          unit_amount: 499, // $4.99 per month
        },
        metadata: {
          service: 'honestinvoice',
          tier: 'pro',
          website: 'honestinvoice.com',
          features: 'unlimited_invoices,custom_branding,recurring_invoices,analytics'
        }
      });
      
      console.log(`    ✅ CREATED: New HonestInvoice Pro product - ${product.id}`);
      createdResources.product = product;
    }
    
    // Validate price configuration
    const price = await stripe.prices.retrieve(product.default_price);
    
    if (price.unit_amount === 499 && price.recurring?.interval === 'month') {
      console.log(`    ✅ PASS: Price configured correctly - $4.99/month`);
      testResults.priceConfiguration = true;
    } else {
      console.log(`    ❌ FAIL: Price configuration incorrect`);
      console.log(`       Expected: $4.99/month, Got: $${price.unit_amount / 100}/${price.recurring?.interval}`);
      testResults.priceConfiguration = false;
    }
    
    testResults.productCreation = true;
    
  } catch (error) {
    console.log(`    ❌ FAIL: Product creation failed - ${error.message}`);
    testResults.productCreation = false;
    testResults.priceConfiguration = false;
    throw error;
  }
}

async function testFeatureEntitlements(stripe) {
  const features = [
    {
      name: 'Unlimited Invoices',
      lookup_key: 'honest-invoice-unlimited-invoices',
      testKey: 'unlimitedInvoices',
      metadata: {
        description: 'Create unlimited invoices without restrictions',
        free_limit: '5',
        pro_limit: 'unlimited'
      }
    },
    {
      name: 'Custom Branding',
      lookup_key: 'honest-invoice-custom-branding',
      testKey: 'customBranding',
      metadata: {
        description: 'Customize invoice appearance with your brand colors and logo',
        includes: 'logo_upload,color_customization,font_selection'
      }
    },
    {
      name: 'Recurring Invoices',
      lookup_key: 'honest-invoice-recurring-invoices',
      testKey: 'recurringInvoices',
      metadata: {
        description: 'Set up automatic recurring invoice generation',
        intervals: 'weekly,monthly,quarterly,yearly'
      }
    },
    {
      name: 'Advanced Analytics',
      lookup_key: 'honest-invoice-advanced-analytics',
      testKey: 'advancedAnalytics',
      metadata: {
        description: 'Detailed revenue reports and invoice analytics',
        includes: 'revenue_charts,client_analytics,payment_tracking,export_reports'
      }
    }
  ];

  console.log('  Creating/validating feature entitlements...');
  
  for (const featureConfig of features) {
    try {
      // Check if feature already exists
      const existingFeatures = await stripe.entitlements.features.list({
        lookup_key: featureConfig.lookup_key
      });
      
      let feature;
      if (existingFeatures.data.length > 0) {
        feature = existingFeatures.data[0];
        console.log(`    ✅ FOUND: ${featureConfig.name} - ${feature.id}`);
      } else {
        // Create new feature
        feature = await stripe.entitlements.features.create({
          name: featureConfig.name,
          lookup_key: featureConfig.lookup_key,
          metadata: featureConfig.metadata
        });
        console.log(`    ✅ CREATED: ${featureConfig.name} - ${feature.id}`);
      }
      
      createdResources.features[featureConfig.testKey] = feature;
      testResults.featureEntitlements[featureConfig.testKey] = true;
      
      // Link feature to product if not already linked
      if (createdResources.product) {
        try {
          await stripe.products.createFeature(
            createdResources.product.id,
            { entitlement_feature: feature.id }
          );
          console.log(`    ✅ LINKED: ${featureConfig.name} to product`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`    ✅ ALREADY LINKED: ${featureConfig.name} to product`);
          } else {
            console.log(`    ⚠️  WARNING: Could not link ${featureConfig.name} - ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`    ❌ FAIL: ${featureConfig.name} creation failed - ${error.message}`);
      testResults.featureEntitlements[featureConfig.testKey] = false;
    }
  }
}

async function testCheckoutSession(stripe) {
  try {
    console.log('  Creating sample checkout session...');
    
    if (!createdResources.product) {
      console.log('    ❌ FAIL: No product available for checkout session');
      testResults.checkoutSession = false;
      return;
    }
    
    const session = await stripe.checkout.sessions.create({
      success_url: 'https://honestinvoice.com/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://honestinvoice.com/dashboard/billing?canceled=true',
      line_items: [
        {
          price: createdResources.product.default_price,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        product_type: 'honestinvoice_pro',
        service: 'honestinvoice'
      },
      subscription_data: {
        metadata: {
          product_type: 'honestinvoice_pro',
          tier: 'pro'
        }
      }
    });
    
    console.log(`    ✅ PASS: Checkout session created - ${session.id}`);
    console.log(`    ✅ Checkout URL: ${session.url}`);
    
    createdResources.sampleSession = session;
    testResults.checkoutSession = true;
    
  } catch (error) {
    console.log(`    ❌ FAIL: Checkout session creation failed - ${error.message}`);
    testResults.checkoutSession = false;
  }
}

function generateStripeSetupReport() {
  console.log('\n📊 STRIPE SETUP TEST RESULTS');
  console.log('=============================\n');

  // API and Product Results
  console.log('Core Setup:');
  console.log(`  API Connectivity: ${testResults.apiConnectivity ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Product Creation: ${testResults.productCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Price Configuration: ${testResults.priceConfiguration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Checkout Session: ${testResults.checkoutSession ? '✅ PASS' : '❌ FAIL'}`);

  // Feature Entitlements Results
  console.log('\nFeature Entitlements:');
  Object.entries(testResults.featureEntitlements).forEach(([feature, passed]) => {
    const featureName = feature.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`  ${featureName}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  // Calculate overall success
  const coreTests = [
    testResults.apiConnectivity,
    testResults.productCreation,
    testResults.priceConfiguration,
    testResults.checkoutSession
  ];
  
  const featureTests = Object.values(testResults.featureEntitlements);
  
  const coreSuccess = coreTests.filter(Boolean).length >= 3;
  const featureSuccess = featureTests.filter(Boolean).length >= 3;
  
  testResults.overallSuccess = coreSuccess && featureSuccess;

  console.log(`\nOverall Stripe Setup: ${testResults.overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);

  // Output configuration values
  if (testResults.overallSuccess && createdResources.product) {
    console.log('\n🔧 ENVIRONMENT CONFIGURATION VALUES');
    console.log('===================================');
    console.log('Add these to your .env file and Supabase environment variables:\n');
    
    console.log('# Stripe Configuration');
    console.log(`STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}`);
    console.log(`STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY  # Get from Stripe dashboard`);
    console.log(`STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET      # Get after creating webhook\n`);
    
    console.log('# Product Configuration');
    console.log(`STRIPE_PRO_PRODUCT_ID=${createdResources.product.id}`);
    console.log(`STRIPE_PRO_PRICE_ID=${createdResources.product.default_price}\n`);
    
    if (Object.keys(createdResources.features).length > 0) {
      console.log('# Feature IDs');
      Object.entries(createdResources.features).forEach(([key, feature]) => {
        const envKey = `STRIPE_${key.toUpperCase()}_FEATURE_ID`;
        console.log(`${envKey}=${feature.id}`);
      });
      console.log('');
    }
    
    if (createdResources.sampleSession) {
      console.log('# Test Checkout Session');
      console.log(`SAMPLE_CHECKOUT_URL=${createdResources.sampleSession.url}\n`);
    }
  }

  // Provide next steps
  if (!testResults.overallSuccess) {
    console.log('\n🔧 SETUP STEPS:');
    
    if (!testResults.apiConnectivity) {
      console.log('1. Verify Stripe API key:');
      console.log('   - Check Stripe dashboard -> Developers -> API keys');
      console.log('   - Ensure test mode is enabled for development');
      console.log('   - Update STRIPE_SECRET_KEY environment variable');
    }
    
    if (!coreSuccess) {
      console.log('2. Complete product setup:');
      console.log('   - Retry product creation');
      console.log('   - Verify account permissions for product management');
    }
    
    if (!featureSuccess) {
      console.log('3. Configure feature entitlements:');
      console.log('   - Enable entitlements in Stripe dashboard');
      console.log('   - Verify account has entitlements feature access');
    }
  } else {
    console.log('\n🎉 Stripe setup completed successfully!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Copy environment variables to .env file');
    console.log('2. Add environment variables to Supabase function configuration');
    console.log('3. Create webhook endpoint in Stripe dashboard');
    console.log('4. Test Supabase Edge Functions integration');
  }
}

// Export for use in other test files
export { runStripeSetupTests, testResults as stripeSetupTestResults, createdResources };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStripeSetupTests()
    .then(() => {
      process.exit(testResults.overallSuccess ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}