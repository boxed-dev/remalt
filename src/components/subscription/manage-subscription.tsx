'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database } from '@/types/supabase'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface ManageSubscriptionProps {
  subscription: Subscription | null
  customerPortalUrl?: string
}

export function ManageSubscription({
  subscription,
  customerPortalUrl,
}: ManageSubscriptionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleManageSubscription = async () => {
    if (!customerPortalUrl) return

    setLoading(true)
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800',
    }

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            You don&apos;t have an active subscription. Choose a plan to get started.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push('/pricing')}>
            View Plans
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          {getStatusBadge(subscription.status)}
        </div>
        <CardDescription>
          Manage your subscription and billing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">Current Period</div>
          <div className="text-sm">
            {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </div>
        </div>

        {subscription.cancel_at_period_end && (
          <div className="rounded-md bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              Your subscription will be canceled at the end of the current billing period.
            </p>
          </div>
        )}

        {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Trial ends on {new Date(subscription.trial_end).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleManageSubscription} disabled={loading}>
          {loading ? 'Loading...' : 'Manage Subscription'}
        </Button>
        {subscription.status === 'active' && !subscription.cancel_at_period_end && (
          <Button variant="outline" onClick={() => router.push('/pricing')}>
            Change Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}