'use client'

import { PricingCard } from '@/components/subscription/pricing-card'
// import { AppHeader } from '@/components/layout/app-header'
import { useRouter } from 'next/navigation'

// Mock product data
const PRODUCTS = {
  FREE: {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    priceId: 'price_free',
    features: [
      '5 workflows per month',
      'Basic AI models',
      'Community support',
      'Email notifications',
    ],
  },
  PRO: {
    name: 'Pro',
    description: 'Best for professionals',
    price: 29,
    priceId: 'price_pro',
    features: [
      'Unlimited workflows',
      'Advanced AI models',
      'Priority support',
      'Custom integrations',
      'Team collaboration',
      'Advanced analytics',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    priceId: 'price_enterprise',
    features: [
      'Everything in Pro',
      'Dedicated account manager',
      'Custom AI model training',
      'SLA guarantee',
      'Advanced security',
      'Unlimited team members',
    ],
  },
}

export default function PricingPage() {
  const router = useRouter()

  const handleSubscribe = (planName: string) => {
    // Navigate to flows page for now
    router.push('/flows')
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      {/* <AppHeader /> */}
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto" style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif'
        }}>
          <div className="text-center mb-12">
            <h1 className="text-[40px] font-semibold text-[#1A1D21] mb-4">Choose Your Plan</h1>
            <p className="text-[18px] text-[#6B7280]">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name={PRODUCTS.FREE.name}
              description={PRODUCTS.FREE.description}
              price={PRODUCTS.FREE.price}
              features={PRODUCTS.FREE.features}
              onSubscribe={() => handleSubscribe('Free')}
            />

            <PricingCard
              name={PRODUCTS.PRO.name}
              description={PRODUCTS.PRO.description}
              price={PRODUCTS.PRO.price}
              features={PRODUCTS.PRO.features}
              onSubscribe={() => handleSubscribe('Pro')}
              isPopular
            />

            <PricingCard
              name={PRODUCTS.ENTERPRISE.name}
              description={PRODUCTS.ENTERPRISE.description}
              price={PRODUCTS.ENTERPRISE.price}
              features={PRODUCTS.ENTERPRISE.features}
              onSubscribe={() => handleSubscribe('Enterprise')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
