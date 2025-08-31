#!/usr/bin/env node

/**
 * Webhook Endpoint Test Script for HonestInvoice
 * 
 * This script tests the Stripe webhook endpoint to verify:
 * 1. Endpoint accessibility
 * 2. Proper response to invalid requests
 * 3. Environment variable configuration
 * 
 * Usage: node scripts/test-webhook-endpoint.js
 */

const https = require('https');

const WEBHOOK_URL = 'https://ezdmasftbvaohoghiflo.supabase.co/functions/v1/stripe-webhook';

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testWebhookEndpoint() {
  log(colors.blue + colors.bold, '\n🔍 Testing Stripe Webhook Endpoint for HonestInvoice');
  log(colors.blue, `📡 Endpoint: ${WEBHOOK_URL}\n`);

  const tests = [
    {
      name: 'OPTIONS Request (CORS Preflight)',
      method: 'OPTIONS',
      expectedStatus: 204,
      description: 'Should return 204 for CORS preflight requests'
    },
    {
      name: 'GET Request (Method Not Allowed)',
      method: 'GET',
      expectedStatus: 405,
      description: 'Should return 405 for non-POST requests'
    },
    {
      name: 'POST Request without Signature',
      method: 'POST',
      expectedStatus: 400,
      description: 'Should return 400 when stripe-signature header is missing',
      body: JSON.stringify({ test: 'data' }),
      headers: {
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'POST Request with Invalid Signature',
      method: 'POST',
      expectedStatus: 400,
      description: 'Should return 400 when stripe-signature is invalid',
      body: JSON.stringify({ test: 'data' }),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature'
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      log(colors.yellow, `\n🧪 Test: ${test.name}`);
      log(colors.reset, `   Description: ${test.description}`);

      const url = new URL(WEBHOOK_URL);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: test.method,
        headers: {
          'User-Agent': 'HonestInvoice-Webhook-Test/1.0',
          ...test.headers
        }
      };

      const response = await makeRequest(options, test.body);

      if (response.statusCode === test.expectedStatus) {
        log(colors.green, `   ✅ PASS: Status ${response.statusCode} (expected ${test.expectedStatus})`);
        passed++;
      } else {
        log(colors.red, `   ❌ FAIL: Status ${response.statusCode} (expected ${test.expectedStatus})`);
        log(colors.red, `   Response: ${response.body}`);
        failed++;
      }

    } catch (error) {
      log(colors.red, `   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  // Summary
  log(colors.blue + colors.bold, '\n📊 Test Results Summary');
  log(colors.green, `✅ Passed: ${passed}`);
  log(colors.red, `❌ Failed: ${failed}`);
  
  if (failed === 0) {
    log(colors.green + colors.bold, '\n🎉 All tests passed! Webhook endpoint is responding correctly.');
    log(colors.yellow, '\n⚠️  Note: These tests verify endpoint accessibility and basic functionality.');
    log(colors.yellow, '   To test actual webhook processing, you need to:');
    log(colors.reset, '   1. Set environment variables in Supabase Dashboard');
    log(colors.reset, '   2. Configure webhook in Stripe Dashboard');
    log(colors.reset, '   3. Trigger actual events from Stripe');
  } else {
    log(colors.red + colors.bold, '\n❌ Some tests failed. Check the endpoint configuration.');
  }

  // Environment Variable Check Instructions
  log(colors.blue + colors.bold, '\n🔧 Next Steps for Full Webhook Setup:');
  log(colors.reset, '');
  log(colors.yellow, '1. Set Environment Variables in Supabase Dashboard:');
  log(colors.reset, '   - Go to: https://supabase.com/dashboard/project/ezdmasftbvaohoghiflo/functions');
  log(colors.reset, '   - Click: stripe-webhook → Settings tab');
  log(colors.reset, '   - Add: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET');
  log(colors.reset, '');
  log(colors.yellow, '2. Configure Stripe Webhook:');
  log(colors.reset, '   - URL: https://ezdmasftbvaohoghiflo.supabase.co/functions/v1/stripe-webhook');
  log(colors.reset, '   - Events: checkout.session.completed, customer.subscription.*');
  log(colors.reset, '');
  log(colors.yellow, '3. Test with Stripe CLI (after setup):');
  log(colors.reset, '   - stripe trigger checkout.session.completed');
  log(colors.reset, '   - stripe trigger customer.subscription.updated');
  log(colors.reset, '');
}

// Run the tests
testWebhookEndpoint().catch(console.error);