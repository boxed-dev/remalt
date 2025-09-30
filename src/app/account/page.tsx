import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ManageSubscription } from '@/components/subscription/manage-subscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { success?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select<'*', { full_name: string | null }>('*')
    .eq('id', user.id)
    .single()

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .single()

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {searchParams.success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Payment successful! Your subscription is now active.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and subscription
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your personal details and account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="text-sm">{user.email}</div>
            </div>
            {profile?.full_name && (
              <div className="grid gap-2">
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="text-sm">{profile.full_name}</div>
              </div>
            )}
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">User ID</div>
              <div className="text-sm font-mono">{user.id}</div>
            </div>
            <div className="pt-4">
              <form action="/auth/signout" method="POST">
                <Button type="submit" variant="outline">
                  Sign Out
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <ManageSubscription subscription={subscription} />
      </div>
    </div>
  )
}