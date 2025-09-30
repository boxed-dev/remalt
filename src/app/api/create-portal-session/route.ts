import { createClient } from '@/lib/supabase/server'
import { createPortalSession, createOrRetrieveCustomer } from '@/utils/stripe-helpers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerId = await createOrRetrieveCustomer({
      uuid: user.id,
      email: user.email!,
    })

    const session = await createPortalSession({
      customerId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}