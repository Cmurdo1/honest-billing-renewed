/**
 * create-pro-checkout.js
 *
 * Usage (PowerShell):
 *  $env:STRIPE_SECRET_KEY = 'sk_test_xxx'
 *  $env:STRIPE_PRO_PRICE_ID = 'price_....'   # optional, if you already have a Pro price
 *  $env:SITE_URL = 'https://honestinvoice.com'  # optional, falls back to VITE_APP_URL
 *  $env:TEST_USER_EMAIL = 'test@example.com'    # recommended for customer lookup
 *  $env:TEST_USER_ID = 'user-uuid'              # optional metadata / supabase mapping
 *  # optionally provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upsert mapping
 *  node .\scripts\create-pro-checkout.js
 *
 * What it does:
 *  - Uses STRIPE_PRO_PRICE_ID if present; otherwise creates a product+price named "HonestInvoice Pro"
 *  - Finds or creates a Stripe customer by email and attaches user_id metadata if provided
 *  - Creates a checkout.session for a subscription to the Pro price
 *  - Optionally upserts the customer mapping to Supabase when SUPABASE_* env vars are present
 */

const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('Missing STRIPE_SECRET_KEY. Set it in env and retry.');
  process.exit(1);
}

const stripe = Stripe(stripeKey);
const providedPriceId = process.env.STRIPE_PRO_PRICE_ID;
const siteUrl = process.env.SITE_URL || process.env.VITE_APP_URL || 'https://honestinvoice.com';
const testEmail = process.env.TEST_USER_EMAIL || null;
const testUserId = process.env.TEST_USER_ID || null;

async function findOrCreatePrice() {
  if (providedPriceId) {
    console.log('Using provided STRIPE_PRO_PRICE_ID:', providedPriceId);
    return providedPriceId;
  }

  console.log('No STRIPE_PRO_PRICE_ID provided - creating product + price for HonestInvoice Pro');

  const product = await stripe.products.create({
    name: 'HonestInvoice Pro',
    description: 'Pro subscription for HonestInvoice',
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 19900, // $199.00 monthly - adjust as needed
    currency: 'usd',
    recurring: { interval: 'month', interval_count: 1 },
    nickname: 'HonestInvoice Pro Monthly',
  });

  console.log('Created product and price:', product.id, price.id);
  return price.id;
}

async function findOrCreateCustomer() {
  if (!testEmail) {
    console.warn('No TEST_USER_EMAIL set. Creating an anonymous customer without email.');
    const c = await stripe.customers.create({ metadata: testUserId ? { userId: testUserId } : undefined });
    return c.id;
  }

  // Try to find an existing customer with the email
  const customers = await stripe.customers.list({ email: testEmail, limit: 1 });
  if (customers.data.length > 0) {
    const existing = customers.data[0];
    console.log('Found existing customer for', testEmail, existing.id);
    // Ensure metadata has user id if provided
    if (testUserId && existing.metadata?.userId !== testUserId) {
      await stripe.customers.update(existing.id, { metadata: { ...(existing.metadata || {}), userId: testUserId } });
      console.log('Updated customer metadata with user id');
    }
    return existing.id;
  }

  // Create a new customer
  const newCustomer = await stripe.customers.create({
    email: testEmail,
    metadata: testUserId ? { userId: testUserId } : undefined,
  });

  console.log('Created new customer', newCustomer.id, 'for', testEmail);
  return newCustomer.id;
}

async function upsertSupabaseMapping(customerId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey || !testUserId) {
    return;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('stripe_customers').upsert({
      user_id: testUserId,
      customer_id: customerId,
      deleted_at: null,
    }, { onConflict: 'user_id' });

    if (error) {
      console.warn('Failed to upsert stripe_customers mapping to Supabase:', error.message || error);
    } else {
      console.log('Upserted stripe_customers mapping into Supabase for user', testUserId);
    }
  } catch (err) {
    console.warn('Skipping Supabase mapping - @supabase/supabase-js not installed or runtime error:', err.message || err);
  }
}

async function main() {
  try {
    const priceId = await findOrCreatePrice();
    const customerId = await findOrCreateCustomer();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${siteUrl.replace(/\/$/, '')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl.replace(/\/$/, '')}/billing?canceled=true`,
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      metadata: {
        product_type: 'honestinvoice_pro',
        service: 'honestinvoice',
        user_id: testUserId || '',
      },
      subscription_data: testUserId
        ? { metadata: { user_id: testUserId, product_type: 'honestinvoice_pro', tier: 'pro' } }
        : undefined,
    });

    console.log('Created Checkout Session:', session.id);
    console.log('Open this URL (test mode):', session.url);

    // Optionally upsert mapping to Supabase if SUPABASE_* env vars provided
    await upsertSupabaseMapping(customerId);

    console.log('Finished.');
  } catch (err) {
    console.error('Error creating Pro checkout session:', err.message || err);
    process.exit(1);
  }
}

main();
