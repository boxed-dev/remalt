import { ManageSubscription } from '@/components/subscription/manage-subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppHeader } from '@/components/layout/app-header'

// Mock user data for testing
const mockUser = {
  email: 'demo@example.com',
  full_name: 'Demo User',
  id: 'demo-user-123',
}

// Mock subscription data for testing
const mockSubscription = {
  id: 'sub_123',
  user_id: 'demo-user-123',
  status: 'active' as const,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancel_at_period_end: false,
  trial_end: null,
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      <AppHeader />
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6" style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif'
        }}>
          {params.success && (
            <div className="rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 p-4">
              <p className="text-[14px] font-medium text-[#34C759]">
                Payment successful! Your subscription is now active.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-[32px] font-semibold text-[#1A1D21]">Account Settings</h1>
            <p className="text-[15px] text-[#6B7280]">
              Manage your account settings and subscription
            </p>
          </div>

          <Card className="border-[#E8ECEF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[18px] font-semibold text-[#1A1D21]">Profile Information</CardTitle>
              <CardDescription className="text-[14px] text-[#6B7280]">
                Your personal details and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="text-[13px] font-medium text-[#6B7280]">Email</div>
                <div className="text-[14px] text-[#1A1D21]">{mockUser.email}</div>
              </div>
              <div className="grid gap-2">
                <div className="text-[13px] font-medium text-[#6B7280]">Name</div>
                <div className="text-[14px] text-[#1A1D21]">{mockUser.full_name}</div>
              </div>
              <div className="grid gap-2">
                <div className="text-[13px] font-medium text-[#6B7280]">User ID</div>
                <div className="text-[13px] font-mono text-[#6B7280]">{mockUser.id}</div>
              </div>
            </CardContent>
          </Card>

          <ManageSubscription subscription={mockSubscription} />
        </div>
      </div>
    </div>
  )
}