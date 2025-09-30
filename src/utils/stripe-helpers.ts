import { stripe } from '@/lib/stripe/config'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import Stripe from 'stripe'

type Price = Database['public']['Tables']['prices']['Row']
type Product = Database['public']['Tables']['products']['Row']

export async function createOrRetrieveCustomer({
  uuid,
  email,
}: {
  uuid: string
  email: string
}) {
  const supabase = await createServiceRoleClient()
  const result = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', uuid)
    .single()

  const data = result.data as { stripe_customer_id: string | null } | null

  if (result.error || !data?.stripe_customer_id) {
    // No customer record found, create a new Stripe customer
    const customerData: { metadata: { supabaseUUID: string }; email?: string } = {
      metadata: {
        supabaseUUID: uuid,
      },
    }
    if (email) customerData.email = email

    const customer = await stripe.customers.create(customerData)

    // Insert the new customer into Supabase
    const insertResult = await supabase
      .from('customers')
      // @ts-expect-error - Supabase type inference issue with service role client
      .insert([{ id: uuid, stripe_customer_id: customer.id }])

    if (insertResult.error) throw insertResult.error
    return customer.id
  }
  return data.stripe_customer_id
}

export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
  trialPeriodDays,
}: {
  priceId: string
  customerId: string
  successUrl: string
  cancelUrl: string
  trialPeriodDays?: number
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: trialPeriodDays,
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })

  return session
}

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export const upsertProductRecord = async (product: Stripe.Product) => {
  const supabase = await createServiceRoleClient()
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
    created: new Date(product.created * 1000).toISOString(),
    updated: new Date(product.updated * 1000).toISOString(),
  }

  // @ts-expect-error - Supabase type inference issue with service role client
  const { error } = await supabase.from('products').upsert([productData])
  if (error) throw error
}

export const upsertPriceRecord = async (price: Stripe.Price) => {
  const supabase = await createServiceRoleClient()

  const priceData: Price = {
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : price.product.id,
    active: price.active,
    currency: price.currency,
    description: price.nickname ?? null,
    type: price.type === 'recurring' ? 'recurring' : 'one_time',
    unit_amount: price.unit_amount ?? null,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? null,
    metadata: price.metadata,
    created: new Date(price.created * 1000).toISOString(),
    updated: new Date(price.created * 1000).toISOString(),
  }

  // @ts-expect-error - Supabase type inference issue with service role client
  const { error } = await supabase.from('prices').upsert([priceData])
  if (error) throw error
}

export const createOrRetrieveSubscription = async ({
  subscriptionId,
  customerId,
}: {
  subscriptionId: string
  customerId: string
}) => {
  const supabase = await createServiceRoleClient()
  const result = await supabase
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  const customer = result.data as { id: string } | null

  if (!customer) throw new Error('Customer not found')

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method'],
  })

  // Type cast to any to workaround Stripe v18 type definition issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any

  const subscriptionData: Database['public']['Tables']['subscriptions']['Insert'] = {
    id: sub.id,
    user_id: customer.id,
    metadata: sub.metadata,
    status: sub.status as 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused',
    price_id: sub.items.data[0].price.id,
    quantity: sub.items.data[0].quantity ?? 1,
    cancel_at_period_end: sub.cancel_at_period_end,
    cancel_at: sub.cancel_at
      ? new Date(sub.cancel_at * 1000).toISOString()
      : null,
    canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
    current_period_start: new Date(
      sub.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      sub.current_period_end * 1000
    ).toISOString(),
    created: new Date(sub.created * 1000).toISOString(),
    ended_at: sub.ended_at
      ? new Date(sub.ended_at * 1000).toISOString()
      : null,
    trial_start: sub.trial_start
      ? new Date(sub.trial_start * 1000).toISOString()
      : null,
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  }

  const upsertResult = await supabase
    .from('subscriptions')
    // @ts-expect-error - Supabase type inference issue with service role client
    .upsert([subscriptionData])

  if (upsertResult.error) throw upsertResult.error
}

export const deleteSubscription = async (subscriptionId: string) => {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId)

  if (error) throw error
}