# HonestInvoice Local Deployment Guide

## 🎯 Quick Start

This guide will help you deploy the HonestInvoice application locally after the recent database schema fixes and $4.99 pricing updates.

## ⚠️ CRITICAL: Database Schema Fix Required

**IMPORTANT**: The application currently has missing database columns that will cause "s.customer_id does not exist" errors. You **MUST** apply the database fix before the application will work properly.

### Step 1: Apply Database Schema Fix (REQUIRED)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/ezdmasftbvaohoghiflo/sql/new
   - Sign in to your Supabase account

2. **Copy and Execute the Fix Script**:
   ```sql
   -- ===============================================
   -- EMERGENCY DATABASE SCHEMA FIX
   -- ===============================================

   -- Create required enum types
   DO $$ 
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
           CREATE TYPE stripe_subscription_status AS ENUM (
               'not_started', 'incomplete', 'incomplete_expired', 'trialing',
               'active', 'past_due', 'canceled', 'unpaid', 'paused'
           );
       END IF;
   END $$;

   -- Fix stripe_customers table
   ALTER TABLE stripe_customers 
   ADD COLUMN IF NOT EXISTS customer_id text,
   ADD COLUMN IF NOT EXISTS user_id uuid,
   ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

   -- Fix stripe_subscriptions table
   ALTER TABLE stripe_subscriptions 
   ADD COLUMN IF NOT EXISTS customer_id text,
   ADD COLUMN IF NOT EXISTS subscription_id text,
   ADD COLUMN IF NOT EXISTS price_id text,
   ADD COLUMN IF NOT EXISTS current_period_start bigint,
   ADD COLUMN IF NOT EXISTS current_period_end bigint,
   ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
   ADD COLUMN IF NOT EXISTS payment_method_brand text,
   ADD COLUMN IF NOT EXISTS payment_method_last4 text,
   ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

   -- Add status column with proper enum type
   DO $$
   BEGIN
       IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'stripe_subscriptions' AND column_name = 'status'
       ) THEN
           ALTER TABLE stripe_subscriptions ADD COLUMN status stripe_subscription_status DEFAULT 'not_started';
       END IF;
   END $$;

   -- Add constraints
   ALTER TABLE stripe_customers 
   ADD CONSTRAINT IF NOT EXISTS stripe_customers_customer_id_unique UNIQUE (customer_id),
   ADD CONSTRAINT IF NOT EXISTS stripe_customers_user_id_unique UNIQUE (user_id);

   ALTER TABLE stripe_subscriptions 
   ADD CONSTRAINT IF NOT EXISTS stripe_subscriptions_customer_id_unique UNIQUE (customer_id);

   -- Create/Update helper functions
   CREATE OR REPLACE FUNCTION public.is_pro_user(user_uuid uuid DEFAULT auth.uid())
   RETURNS boolean
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
     has_active_subscription boolean := false;
   BEGIN
     SELECT EXISTS(
       SELECT 1 
       FROM public.stripe_customers c
       JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
       WHERE c.user_id = user_uuid 
         AND c.deleted_at IS NULL
         AND s.deleted_at IS NULL
         AND s.status IN ('active', 'trialing')
     ) INTO has_active_subscription;
     
     RETURN has_active_subscription;
   END;
   $$;

   CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid DEFAULT auth.uid())
   RETURNS text
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
     subscription_status text := 'none';
   BEGIN
     SELECT COALESCE(s.status::text, 'none')
     FROM public.stripe_customers c
     LEFT JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
     WHERE c.user_id = user_uuid 
       AND c.deleted_at IS NULL
       AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL)
     ORDER BY s.created_at DESC
     LIMIT 1
     INTO subscription_status;
     
     RETURN subscription_status;
   END;
   $$;

   -- Grant permissions
   GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated;
   GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) TO authenticated;

   -- Verification
   SELECT 'stripe_customers columns:' as info;
   SELECT column_name FROM information_schema.columns WHERE table_name = 'stripe_customers';

   SELECT 'stripe_subscriptions columns:' as info;
   SELECT column_name FROM information_schema.columns WHERE table_name = 'stripe_subscriptions';
   ```

3. **Verify the Fix**:
   - You should see all columns listed for both tables
   - No error messages about missing columns

## Step 2: Local Development Setup

### Prerequisites
- ✅ Node.js v24.6.0 (Verified)
- ✅ npm 11.5.1 (Verified)
- ✅ Dependencies installed (node_modules exists)

### Environment Configuration
Your `.env` file is already configured with:
- ✅ Supabase URL and keys
- ✅ Stripe configuration (Live keys - for production testing)
- ✅ $4.99 Pro pricing configuration

## Step 3: Start Local Development Server

```bash
# Navigate to project directory
cd "c:\Users\corym\OneDrive\Documents\HonestInvoice\honest-billing-renewed"

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

The application will be available at: http://localhost:5173

## Step 4: Testing Checklist

### 🔍 Database Schema Verification
Run this command to verify the database fix worked:
```bash
node scripts/test-customer-id-issue.js
```

**Expected Results**:
- ✅ stripe_customers.customer_id: Working
- ✅ stripe_subscriptions.customer_id: Working
- ✅ is_pro_user function: Working
- ✅ get_user_subscription_status function: Working

### 🧪 Core Functionality Tests

1. **Application Loading**
   - [ ] Application loads without errors
   - [ ] No console errors in browser
   - [ ] Navigation works properly

2. **Authentication**
   - [ ] Sign up works
   - [ ] Sign in works
   - [ ] Sign out works
   - [ ] User session persists

3. **Client Management**
   - [ ] Can create new clients
   - [ ] Can view client list
   - [ ] Can edit client details
   - [ ] Can delete clients

4. **Invoice Management**
   - [ ] Can create new invoices
   - [ ] Can add invoice items
   - [ ] Can edit invoices
   - [ ] Can change invoice status
   - [ ] Can view invoice list

5. **Pro Features (${4.99}/month)**
   - [ ] Pro upgrade button shows $4.99/month
   - [ ] Billing page displays correctly
   - [ ] Subscription status checks work
   - [ ] Pro features are gated appropriately

### 🔧 Database Query Tests
Run these test commands to verify everything works:

```bash
# Test all database components
npm run test:database

# Test environment configuration
npm run test:environment

# Test Stripe integration
npm run test:stripe

# Test pro access control
npm run test:access
```

### 🚀 Stripe Integration Tests
```bash
# Test Stripe setup (requires Stripe secret key)
npm run test:stripe-setup

# Test webhook validation
npm run test:webhooks

# Test subscription synchronization
npm run test:sync
```

## Step 5: Common Issues & Solutions

### Issue: "s.customer_id does not exist"
**Solution**: Make sure you applied the database schema fix from Step 1

### Issue: Application won't start
**Solution**: 
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Stripe errors
**Solution**: Verify your `.env` file has the correct Stripe keys

### Issue: Authentication errors
**Solution**: Check Supabase configuration and ensure RLS policies are set

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. ✅ Application loads at http://localhost:5173
2. ✅ No "customer_id does not exist" errors
3. ✅ Authentication flows work
4. ✅ Dashboard displays properly
5. ✅ Pro subscription shows $4.99/month
6. ✅ All test scripts pass
7. ✅ Console shows no critical errors

## 📋 Next Steps

After successful local deployment:

1. **Test all functionality** thoroughly
2. **Create test data** (clients, invoices) to verify everything works
3. **Test Pro subscription flow** (if you have Stripe test mode set up)
4. **Check performance** and loading times
5. **Verify mobile responsiveness**

## 🆘 Support

If you encounter issues:

1. Check the browser console for errors
2. Run the diagnostic scripts provided
3. Verify the database schema fix was applied correctly
4. Check environment variables are correct

---

**Status**: Ready for local deployment after database schema fix is applied.