import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Deno type declarations for Edge Runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
// @ts-ignore - Deno npm imports
import Stripe from 'npm:stripe@17.7.0';
// @ts-ignore - Deno npm imports
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
// Read webhook secret optionally so we can return a clear server error when it's missing
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'HonestInvoice Pro',
    version: '1.0.0',
    url: 'https://honestinvoice.com',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Ensure webhook signing secret is present in the environment
    if (!stripeWebhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable for stripe-webhook function');
      return new Response('Server misconfigured: missing STRIPE_WEBHOOK_SECRET', { status: 500 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.warn('No stripe-signature header found. Headers:', Object.fromEntries(req.headers.entries()));
      return new Response(JSON.stringify({ error: 'No stripe-signature header found' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    // Process the event asynchronously but don't wait for completion here
    // We'll handle it synchronously to capture errors, but always return 200 when verification succeeds
    try {
      await handleEvent(event);
    } catch (err) {
      console.error('Error while handling Stripe event:', err);
      // Still return 200 to Stripe (to avoid retries) but log the error for investigation
      return Response.json({ received: true, warning: 'Processing error logged' });
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const eventId = event.id;
  const eventType = event.type;
  
  console.info(`Processing webhook event: ${eventType} (${eventId})`);
  
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    console.warn(`No data object in event: ${eventId}`);
    return;
  }

  if (!('customer' in stripeData)) {
    console.warn(`No customer field in event: ${eventId}`);
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    console.info(`Skipping payment_intent.succeeded without invoice: ${eventId}`);
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No valid customer ID in event ${eventId}: ${JSON.stringify(event)}`);
    return;
  }

  try {
    // Handle different event types
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeData as Stripe.Checkout.Session, customerId, eventId);
        break;
      
      case 'invoice.payment_succeeded':
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        console.info(`Processing subscription event ${eventType} for customer: ${customerId}`);
        await syncCustomerFromStripe(customerId, eventId);
        break;
      
      case 'customer.subscription.deleted':
        console.info(`Processing subscription deletion for customer: ${customerId}`);
        await handleSubscriptionDeleted(customerId, eventId);
        break;
      
      default:
        console.info(`Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error handling event ${eventId}:`, error);
    throw error; // Re-throw to trigger retry
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, customerId: string, eventId: string) {
  const { mode, payment_status } = session;
  const isSubscription = mode === 'subscription';
  
  console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session: ${session.id}`);
  
  if (isSubscription) {
    // Wait a moment for Stripe to fully process the subscription
    await new Promise(resolve => setTimeout(resolve, 1000));
    await syncCustomerFromStripe(customerId, eventId);
  } else if (mode === 'payment' && payment_status === 'paid') {
    await handleOneTimePayment(session, customerId, eventId);
  }
}

async function handleOneTimePayment(session: Stripe.Checkout.Session, customerId: string, eventId: string) {
  try {
    const {
      id: checkout_session_id,
      payment_intent,
      amount_subtotal,
      amount_total,
      currency,
      payment_status
    } = session;

    const { error: orderError } = await supabase.from('stripe_orders').insert({
      checkout_session_id,
      payment_intent_id: payment_intent,
      customer_id: customerId,
      amount_subtotal,
      amount_total,
      currency,
      payment_status,
      status: 'completed',
    });

    if (orderError) {
      console.error(`Error inserting order for event ${eventId}:`, orderError);
      throw orderError;
    }
    
    console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
  } catch (error) {
    console.error(`Error processing one-time payment for event ${eventId}:`, error);
    throw error;
  }
}

async function handleSubscriptionDeleted(customerId: string, eventId: string) {
  try {
    const { error } = await supabase
      .from('stripe_subscriptions')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);
    
    if (error) {
      console.error(`Error updating subscription status for deleted subscription (${eventId}):`, error);
      throw error;
    }
    
    // Invalidate cache
    await invalidateSubscriptionCache(customerId);
    
    console.info(`Successfully handled subscription deletion for customer: ${customerId}`);
  } catch (error) {
    console.error(`Error handling subscription deletion for event ${eventId}:`, error);
    throw error;
  }
}

// Enhanced subscription sync with retry logic and customer mapping verification
async function syncCustomerFromStripe(customerId: string, eventId?: string, retryCount = 0): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
  
  try {
    console.info(`Syncing subscription for customer ${customerId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    // Ensure customer mapping exists
    await ensureCustomerMapping(customerId);
    
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`No subscriptions found for customer: ${customerId}`);
      await updateSubscriptionStatus(customerId, 'not_started', null);
      return;
    }

    // Get the most recent subscription
    const subscription = subscriptions.data[0];
    console.info(`Found subscription ${subscription.id} with status: ${subscription.status}`);

    // Update subscription data
    await updateSubscriptionData(customerId, subscription);
    
    // Invalidate cache to ensure frontend gets updated data
    await invalidateSubscriptionCache(customerId);
    
    console.info(`Successfully synced subscription for customer: ${customerId} (event: ${eventId || 'manual'})`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId} (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < maxRetries) {
      console.warn(`Retrying sync for customer ${customerId} in ${retryDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return await syncCustomerFromStripe(customerId, eventId, retryCount + 1);
    }
    
    throw new Error(`Failed to sync subscription after ${maxRetries + 1} attempts: ${error.message}`);
  }
}

async function ensureCustomerMapping(customerId: string): Promise<void> {
  // Check if customer mapping exists
  const { data: existingCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .eq('deleted_at', null)
    .maybeSingle();
  
  if (existingCustomer) {
    return; // Mapping already exists
  }
  
  console.warn(`No customer mapping found for ${customerId}`);
  
  // Try to find user_id from Stripe customer metadata
  try {
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    
    if (stripeCustomer.deleted) {
      throw new Error(`Stripe customer ${customerId} is deleted`);
    }
    
    const userId = stripeCustomer.metadata?.userId || stripeCustomer.metadata?.user_id;
    
    if (userId) {
      console.info(`Creating customer mapping: ${customerId} -> ${userId}`);
      const { error } = await supabase.from('stripe_customers').insert({
        user_id: userId,
        customer_id: customerId
      });
      
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    } else {
      console.error(`No user_id found in Stripe customer ${customerId} metadata`);
    }
  } catch (error) {
    console.error(`Error ensuring customer mapping for ${customerId}:`, error);
    // Don't throw here - continue with sync even if mapping creation fails
  }
}

async function updateSubscriptionStatus(customerId: string, status: string, subscriptionData?: Stripe.Subscription | null): Promise<void> {
  const updateData: any = {
    customer_id: customerId,
    status: status as any,
    updated_at: new Date().toISOString()
  };
  
  if (subscriptionData) {
    updateData.subscription_id = subscriptionData.id;
    updateData.price_id = subscriptionData.items.data[0]?.price.id || null;
    updateData.current_period_start = subscriptionData.current_period_start;
    updateData.current_period_end = subscriptionData.current_period_end;
    updateData.cancel_at_period_end = subscriptionData.cancel_at_period_end;
    
    if (subscriptionData.default_payment_method && typeof subscriptionData.default_payment_method !== 'string') {
      updateData.payment_method_brand = subscriptionData.default_payment_method.card?.brand ?? null;
      updateData.payment_method_last4 = subscriptionData.default_payment_method.card?.last4 ?? null;
    }
  }
  
  const { error } = await supabase.from('stripe_subscriptions').upsert(
    updateData,
    { onConflict: 'customer_id' }
  );
  
  if (error) {
    console.error(`Error updating subscription for ${customerId}:`, error);
    throw error;
  }
}

async function updateSubscriptionData(customerId: string, subscription: Stripe.Subscription): Promise<void> {
  await updateSubscriptionStatus(customerId, subscription.status, subscription);
}

async function invalidateSubscriptionCache(customerId: string): Promise<void> {
  try {
    // Call the database function to invalidate cache
    const { error } = await supabase.rpc('invalidate_subscription_cache', {
      p_customer_id: customerId
    });
    
    if (error) {
      console.warn(`Error invalidating cache for ${customerId}:`, error);
      // Don't throw - cache invalidation failure shouldn't break the sync
    }
  } catch (error) {
    console.warn(`Cache invalidation error for ${customerId}:`, error);
  }
}