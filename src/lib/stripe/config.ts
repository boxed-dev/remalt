import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
  appInfo: {
    name: 'Remalt',
    version: '0.1.0',
  },
})

// Product and Price IDs configuration
export const PRODUCTS = {
  FREE: {
    name: 'Free',
    description: 'Perfect for trying out Remalt',
    features: [
      '5 workflows per month',
      'Basic AI models',
      'Community support',
      'Basic templates',
    ],
    priceId: process.env.STRIPE_FREE_PRICE_ID || '',
    price: 0,
  },
  PRO: {
    name: 'Pro',
    description: 'For professionals and small teams',
    features: [
      'Unlimited workflows',
      'Advanced AI models',
      'Priority support',
      'Custom templates',
      'Team collaboration (up to 5 members)',
      'API access',
      'Advanced analytics',
    ],
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    price: 29,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For large teams and organizations',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Custom AI models',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'White-label options',
      'Advanced security features',
    ],
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    price: 99,
  },
}

export const TRIAL_PERIOD_DAYS = 14