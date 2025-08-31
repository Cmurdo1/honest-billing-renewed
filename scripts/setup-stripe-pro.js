#!/usr/bin/env node

/**
 * Stripe Pro Product Configuration for HonestInvoice
 * 
 * This script sets up the complete Stripe product configuration for
 * HonestInvoice Pro subscription with entitlement features.
 * 
 * Usage:
 * 1. Set your Stripe secret key in the STRIPE_SECRET_KEY variable
 * 2. Run: node scripts/setup-stripe-pro.js
 * 3. Copy the output values to your environment configuration
 */

// CONFIGURATION - Update this with your Stripe secret key
const STRIPE_SECRET_KEY = 'sk_test_YOUR_SECRET_KEY'; // Replace with your actual test secret key

import Stripe from 'stripe';
const stripe = new Stripe(STRIPE_SECRET_KEY);

async function setupHonestInvoicePro() {
  console.log('🚀 Setting up HonestInvoice Pro Stripe configuration...\n');

  try {
    // Step 1: Create HonestInvoice Pro Product
    console.log('1️⃣ Creating HonestInvoice Pro product...');
    const product = await stripe.products.create({
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

    console.log('✅ Product created successfully!');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Default Price ID: ${product.default_price}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Monthly Price: $4.99\n`);

    // Step 2: Create Entitlement Features
    console.log('2️⃣ Creating entitlement features...');

    // Feature 1: Unlimited Invoices
    const unlimitedInvoicesFeature = await stripe.entitlements.features.create({
      name: 'Unlimited Invoices',
      lookup_key: 'honest-invoice-unlimited-invoices',
      metadata: {
        description: 'Create unlimited invoices without restrictions',
        free_limit: '5',
        pro_limit: 'unlimited'
      }
    });
    console.log(`✅ Unlimited Invoices feature: ${unlimitedInvoicesFeature.id}`);

    // Feature 2: Custom Branding
    const customBrandingFeature = await stripe.entitlements.features.create({
      name: 'Custom Branding',
      lookup_key: 'honest-invoice-custom-branding',
      metadata: {
        description: 'Customize invoice appearance with your brand colors and logo',
        includes: 'logo_upload,color_customization,font_selection'
      }
    });
    console.log(`✅ Custom Branding feature: ${customBrandingFeature.id}`);

    // Feature 3: Recurring Invoices
    const recurringInvoicesFeature = await stripe.entitlements.features.create({
      name: 'Recurring Invoices',
      lookup_key: 'honest-invoice-recurring-invoices',
      metadata: {
        description: 'Set up automatic recurring invoice generation',
        intervals: 'weekly,monthly,quarterly,yearly'
      }
    });
    console.log(`✅ Recurring Invoices feature: ${recurringInvoicesFeature.id}`);

    // Feature 4: Advanced Analytics
    const advancedAnalyticsFeature = await stripe.entitlements.features.create({
      name: 'Advanced Analytics',
      lookup_key: 'honest-invoice-advanced-analytics',
      metadata: {
        description: 'Detailed revenue reports and invoice analytics',
        includes: 'revenue_charts,client_analytics,payment_tracking,export_reports'
      }
    });
    console.log(`✅ Advanced Analytics feature: ${advancedAnalyticsFeature.id}\n`);

    // Step 3: Link Features to Product
    console.log('3️⃣ Linking features to product...');
    
    const features = [
      { feature: unlimitedInvoicesFeature, name: 'Unlimited Invoices' },
      { feature: customBrandingFeature, name: 'Custom Branding' },
      { feature: recurringInvoicesFeature, name: 'Recurring Invoices' },
      { feature: advancedAnalyticsFeature, name: 'Advanced Analytics' }
    ];

    for (const { feature, name } of features) {
      const productFeature = await stripe.products.createFeature(
        product.id,
        {
          entitlement_feature: feature.id,
        }
      );
      console.log(`✅ Linked ${name} to product`);
    }

    // Step 4: Create Sample Checkout Session
    console.log('\n4️⃣ Creating sample checkout session...');
    const session = await stripe.checkout.sessions.create({
      success_url: 'https://honestinvoice.com/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://honestinvoice.com/dashboard/billing?canceled=true',
      line_items: [
        {
          price: product.default_price,
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

    console.log('✅ Sample checkout session created!');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Checkout URL: ${session.url}\n`);

    // Step 5: Output Environment Configuration
    console.log('🔧 ENVIRONMENT CONFIGURATION');
    console.log('Add these values to your environment variables:\n');
    
    console.log('# Stripe Configuration');
    console.log(`STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}`);
    console.log(`STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY`);
    console.log(`STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET\n`);
    
    console.log('# Product Configuration');
    console.log(`STRIPE_PRO_PRODUCT_ID=${product.id}`);
    console.log(`STRIPE_PRO_PRICE_ID=${product.default_price}\n`);
    
    console.log('# Feature IDs');
    console.log(`STRIPE_UNLIMITED_INVOICES_FEATURE_ID=${unlimitedInvoicesFeature.id}`);
    console.log(`STRIPE_CUSTOM_BRANDING_FEATURE_ID=${customBrandingFeature.id}`);
    console.log(`STRIPE_RECURRING_INVOICES_FEATURE_ID=${recurringInvoicesFeature.id}`);
    console.log(`STRIPE_ADVANCED_ANALYTICS_FEATURE_ID=${advancedAnalyticsFeature.id}\n`);

    // Step 6: Output Supabase Function Update
    console.log('📝 NEXT STEPS:');
    console.log('1. Copy the environment variables above to your .env file and Supabase dashboard');
    console.log('2. Update your stripe-checkout function to use the STRIPE_PRO_PRICE_ID');
    console.log('3. Test the checkout flow with the sample URL above');
    console.log('4. Set up webhook endpoint in Stripe dashboard\n');

    console.log('🎉 HonestInvoice Pro setup completed successfully!');
    
    return {
      product,
      features: {
        unlimitedInvoices: unlimitedInvoicesFeature,
        customBranding: customBrandingFeature,
        recurringInvoices: recurringInvoicesFeature,
        advancedAnalytics: advancedAnalyticsFeature
      },
      sampleSession: session
    };

  } catch (error) {
    console.error('❌ Error setting up HonestInvoice Pro:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Make sure to update the STRIPE_SECRET_KEY variable with your actual Stripe secret key');
    }
    throw error;
  }
}

// Run the setup (ES module compatible)
setupHonestInvoicePro()
  .then(() => {
    console.log('\n✨ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });

export { setupHonestInvoicePro };