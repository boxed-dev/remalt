import { AuthForm } from '@/components/auth/auth-form'

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string }
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm
        type="signin"
        redirectTo={searchParams.redirectedFrom || '/account'}
      />
    </div>
  )
}