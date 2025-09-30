import { AuthForm } from '@/components/auth/auth-form'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm type="signup" />
    </div>
  )
}