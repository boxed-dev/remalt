import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import {
  upsertProductRecord,
  upsertPriceRecord,
  createOrRetrieveSubscription,
  deleteSubscription,
} from '@/utils/stripe-helpers'
import Stripe from 'stripe'

const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'price.created',
  'price.updated',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature') as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Stripe webhook secret not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${errorMessage}`)
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product)
          break

        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price)
          break

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription
          await createOrRetrieveSubscription({
            subscriptionId: subscription.id,
            customerId: subscription.customer as string,
          })
          break

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription
          await deleteSubscription(deletedSubscription.id)
          break

        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session
          if (checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription as string
            await createOrRetrieveSubscription({
              subscriptionId,
              customerId: checkoutSession.customer as string,
            })
          }
          break

        default:
          console.log(`Unhandled relevant event: ${event.type}`)
      }
    } catch (error) {
      console.error('Webhook handler error:', error)
      return NextResponse.json(
        { error: 'Webhook handler failed' },
        { status: 500 }
      )
    }
  } else {
    console.log(`Ignoring event: ${event.type}`)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}