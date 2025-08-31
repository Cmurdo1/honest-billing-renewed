/**
 * send-test-webhook.js
 *
 * Sends a test Stripe-style webhook (signed) to a target URL. Useful when
 * the Stripe CLI isn't available locally. Usage:
 *
 * PowerShell:
 *  $env:STRIPE_WEBHOOK_SECRET = 'whsec_xxx'
 *  node .\scripts\send-test-webhook.js --url "http://localhost:54321/functions/v1/stripe-webhook" --event checkout.session.completed
 *
 * Note: This script crafts a signature header compatible with stripe.webhooks
 * verification (v1). It uses the TEST_PAYLOAD constant for the event body; you
 * can customize the payload shape for different event types.
 */

import crypto from 'crypto';
const { argv } = process;

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs();
const url = args.url || args.u || process.env.TARGET_WEBHOOK_URL;
const secret = process.env.STRIPE_WEBHOOK_SECRET;
const eventType = args.event || 'checkout.session.completed';

if (!url) {
  console.error('Missing target URL. Provide --url "http://..." or set TARGET_WEBHOOK_URL env var.');
  process.exit(1);
}

if (!secret) {
  console.error('Missing STRIPE_WEBHOOK_SECRET env var. Set it to the webhook signing secret.');
  process.exit(1);
}

// Minimal checkout.session.completed-like payload for testing.
const TEST_PAYLOAD = {
  id: 'evt_test_webhook',
  object: 'event',
  type: eventType,
  data: {
    object: {
      id: 'cs_test_123',
      object: 'checkout.session',
      customer: 'cus_test_123',
      mode: 'subscription',
      payment_status: 'paid',
    },
  },
};

function computeStripeSignature(secret, payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function send() {
  const body = JSON.stringify(TEST_PAYLOAD);
  const sig = computeStripeSignature(secret, body);

  console.log('Sending test webhook to', url);
  console.log('Signature header:', sig);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': sig,
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks) - test-script',
      },
      body,
    });

    const text = await res.text();
    console.log('Response status:', res.status);
    console.log('Response body:', text);
  } catch (err) {
    console.error('Request failed:', err.message || err);
    process.exit(1);
  }
}

// Node 18+ has global fetch; if not available, dynamically import node-fetch
if (typeof fetch === 'undefined') {
  try {
    const mod = await import('node-fetch');
    // node-fetch v3 exports default
    globalThis.fetch = mod.default || mod;
  } catch (err) {
    console.error('Fetch is not available and node-fetch could not be imported. Install node-fetch@2 or run on Node 18+');
    process.exit(1);
  }
}

send();
