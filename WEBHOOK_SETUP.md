# Stripe webhook setup for HonestInvoice

1) Production webhook URL

   Use your Supabase Edge Function endpoint for webhooks:

   https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook

   Example (from this repo):

   https://ezdmasftbvaohoghiflo.supabase.co/functions/v1/stripe-webhook

2) Register endpoint in Stripe Dashboard

   - Go to Developers → Webhooks → + Add endpoint
   - Paste the webhook URL from step (1)
   - Select events (recommended):
     - checkout.session.completed
     - invoice.payment_succeeded
     - customer.subscription.created
     - customer.subscription.updated
     - customer.subscription.deleted
     - payment_intent.succeeded
   - Save and copy the Signing secret (starts with `whsec_...`)

3) Set environment variable for Supabase Edge Function

   In your Supabase dashboard (Project → Settings → Environment variables for Functions) or in your deployment pipeline, add:

   STRIPE_WEBHOOK_SECRET=whsec_xxx

   Note: The function `supabase/functions/stripe-webhook/index.ts` will return a clear 500 error if this variable is missing.

4) Test locally with Stripe CLI (recommended)

   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run your Supabase functions locally (Supabase CLI) or ensure your deployed function is reachable.
   - Forward events to your local endpoint (PowerShell):

     stripe listen --forward-to "http://localhost:54321/functions/v1/stripe-webhook"

   - Trigger test events:

     stripe trigger checkout.session.completed

   The webhook function expects the raw body and the `stripe-signature` header for verification.

5) Troubleshooting

   - If you see 401 responses sent to `/functions/v1/stripe-checkout`, Stripe is hitting the wrong endpoint. Update your Stripe endpoint to point to `/stripe-webhook`.
   - If you get a 400 with `Webhook signature verification failed`, confirm the webhook secret in Stripe matches `STRIPE_WEBHOOK_SECRET` in your function env.
   - Check function logs in Supabase for detailed errors.
