import { createClient } from '@/lib/supabase/server'
import { PRODUCTS } from '@/lib/stripe/config'
import { PricingCard } from '@/components/subscription/pricing-card'
import { redirect } from 'next/navigation'
import { createCheckoutSession, createOrRetrieveCustomer } from '@/utils/stripe-helpers'
import { Database } from '@/types/supabase'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current subscription if user is logged in
  let currentSubscription: Subscription | null = null
  if (user) {
    const result = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    currentSubscription = result.data as Subscription | null
  }

  async function handleSubscribe(priceId: string) {
    'use server'

    if (!user) {
      redirect('/auth/signin?redirectedFrom=/pricing')
    }

    try {
      const customerId = await createOrRetrieveCustomer({
        uuid: user.id,
        email: user.email!,
      })

      const session = await createCheckoutSession({
        priceId,
        customerId,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/account?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
        trialPeriodDays: 14,
      })

      if (session.url) {
        redirect(session.url)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      redirect('/pricing?error=checkout-failed')
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <form action={handleSubscribe.bind(null, PRODUCTS.FREE.priceId)}>
            <PricingCard
              name={PRODUCTS.FREE.name}
              description={PRODUCTS.FREE.description}
              price={PRODUCTS.FREE.price}
              features={PRODUCTS.FREE.features}
              onSubscribe={() => {}}
              isCurrentPlan={currentSubscription?.price_id === PRODUCTS.FREE.priceId}
            />
          </form>

          <form action={handleSubscribe.bind(null, PRODUCTS.PRO.priceId)}>
            <PricingCard
              name={PRODUCTS.PRO.name}
              description={PRODUCTS.PRO.description}
              price={PRODUCTS.PRO.price}
              features={PRODUCTS.PRO.features}
              onSubscribe={() => {}}
              isCurrentPlan={currentSubscription?.price_id === PRODUCTS.PRO.priceId}
              isPopular
            />
          </form>

          <form action={handleSubscribe.bind(null, PRODUCTS.ENTERPRISE.priceId)}>
            <PricingCard
              name={PRODUCTS.ENTERPRISE.name}
              description={PRODUCTS.ENTERPRISE.description}
              price={PRODUCTS.ENTERPRISE.price}
              features={PRODUCTS.ENTERPRISE.features}
              onSubscribe={() => {}}
              isCurrentPlan={currentSubscription?.price_id === PRODUCTS.ENTERPRISE.priceId}
            />
          </form>
        </div>
      </div>
    </div>
  )
}