# Supabase & Stripe Setup Instructions

## Prerequisites
- Supabase account (https://supabase.com)
- Stripe account (https://stripe.com)
- Node.js 18+ installed

## 1. Supabase Setup

### Create a new Supabase project
1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Fill in project details and wait for setup

### Get your API keys
1. Go to Project Settings → API
2. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon/public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service role key - keep secret!)

### Run database migrations
1. Go to SQL Editor in Supabase dashboard
2. Copy and run the SQL from `supabase/migrations/20240101000000_init.sql`

### Enable OAuth providers (optional)
1. Go to Authentication → Providers
2. Enable Google and/or GitHub OAuth
3. Add redirect URL: `http://localhost:3000/auth/callback`

## 2. Stripe Setup

### Get your API keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Publishable key)
   - `STRIPE_SECRET_KEY` (Secret key)

### Create products and prices
1. Go to https://dashboard.stripe.com/test/products
2. Create three products:
   - Free (£0/month)
   - Pro (£29/month)
   - Enterprise (£99/month)
3. For each product, create a monthly recurring price
4. Copy the price IDs and add them to your `.env.local`:
   ```
   STRIPE_FREE_PRICE_ID=price_xxx
   STRIPE_PRO_PRICE_ID=price_xxx
   STRIPE_ENTERPRISE_PRICE_ID=price_xxx
   ```

### Setup webhook
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks
   ```
4. Copy the webhook signing secret and add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

### Configure Customer Portal
1. Go to https://dashboard.stripe.com/test/settings/billing/portal
2. Enable customer portal
3. Configure cancellation policy, update payment methods, etc.

## 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

Required variables:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional: Stripe Price IDs
STRIPE_FREE_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 4. Run the application

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## 5. Test the integration

### Test authentication:
1. Click "Sign Up"
2. Create a new account
3. Check your email for verification
4. Sign in with your credentials

### Test payments:
1. Sign in to your account
2. Go to Pricing page
3. Select a plan
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Check account page for subscription status

### Test subscription management:
1. Go to Account page
2. Click "Manage Subscription"
3. Update payment method or cancel subscription

## Production Deployment

### Supabase
1. Update environment variables with production keys
2. Update OAuth redirect URLs to production domain
3. Review and tighten RLS policies

### Stripe
1. Switch to live mode keys
2. Create production webhook endpoint
3. Update products and prices
4. Configure production customer portal

### Vercel Deployment
1. Push to GitHub
2. Import to Vercel
3. Add all environment variables
4. Deploy

## Troubleshooting

### Supabase auth not working
- Check NEXT_PUBLIC_SUPABASE_URL and ANON_KEY
- Verify email settings in Supabase dashboard
- Check browser console for errors

### Stripe webhooks not received
- Ensure Stripe CLI is running
- Check webhook secret is correct
- Verify endpoint URL is accessible

### Subscription not syncing
- Check Stripe webhook logs
- Verify database permissions
- Check Supabase service role key