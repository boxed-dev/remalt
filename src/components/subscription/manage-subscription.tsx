'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Subscription = {
  id: string
  user_id: string
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid' | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  trial_end: string | null
}

interface ManageSubscriptionProps {
  subscription: Subscription | null
}

export function ManageSubscription({
  subscription,
}: ManageSubscriptionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleManageSubscription = async () => {
    // Mock function for testing - would integrate with payment provider
    setLoading(true)
    try {
      // Placeholder for future payment integration
      alert('Subscription management would open here')
    } catch (error) {
      console.error('Error managing subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusColors: Record<string, string> = {
      active: 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20',
      trialing: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20',
      canceled: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20',
      past_due: 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20',
      unpaid: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20',
    }

    return (
      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide border ${statusColors[status] || 'bg-[#F5F5F7] text-[#6B7280] border-[#E8ECEF]'}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  if (!subscription) {
    return (
      <Card className="border-[#E8ECEF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-[#1A1D21]">No Active Subscription</CardTitle>
          <CardDescription className="text-[14px] text-[#6B7280]">
            You don&apos;t have an active subscription. Choose a plan to get started.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push('/pricing')} className="bg-[#007AFF] hover:bg-[#0051D5] text-white">
            View Plans
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-[#E8ECEF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[18px] font-semibold text-[#1A1D21]">Subscription</CardTitle>
          {getStatusBadge(subscription.status)}
        </div>
        <CardDescription className="text-[14px] text-[#6B7280]">
          Manage your subscription and billing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="text-[13px] font-medium text-[#6B7280]">Current Period</div>
          <div className="text-[14px] text-[#1A1D21]">
            {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </div>
        </div>

        {subscription.cancel_at_period_end && (
          <div className="rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20 p-4">
            <p className="text-[14px] text-[#FF9500]">
              Your subscription will be canceled at the end of the current billing period.
            </p>
          </div>
        )}

        {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
          <div className="rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 p-4">
            <p className="text-[14px] text-[#007AFF]">
              Trial ends on {new Date(subscription.trial_end).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleManageSubscription} disabled={loading} className="bg-[#007AFF] hover:bg-[#0051D5] text-white">
          {loading ? 'Loading...' : 'Manage Subscription'}
        </Button>
        {subscription.status === 'active' && !subscription.cancel_at_period_end && (
          <Button variant="outline" onClick={() => router.push('/pricing')} className="border-[#E8ECEF] text-[#1A1D21] hover:bg-[#F5F5F7]">
            Change Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}