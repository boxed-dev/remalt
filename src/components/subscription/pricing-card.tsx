'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

interface PricingCardProps {
  name: string
  description: string
  price: number
  interval?: string
  features: string[]
  priceId?: string
  onSubscribe: () => void
  isCurrentPlan?: boolean
  isPopular?: boolean
  disabled?: boolean
}

export function PricingCard({
  name,
  description,
  price,
  interval = 'month',
  features,
  onSubscribe,
  isCurrentPlan = false,
  isPopular = false,
  disabled = false,
}: PricingCardProps) {
  return (
    <Card className={`relative border-[#E8ECEF] hover:border-[#CBD5E1] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-1 ${isPopular ? 'border-[#007AFF] shadow-[0_2px_12px_rgba(0,122,255,0.15)] scale-105' : 'shadow-[0_1px_3px_rgba(0,0,0,0.08)]'}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold uppercase tracking-wide shadow-[0_2px_8px_rgba(0,122,255,0.25)]">
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-[24px] font-semibold text-[#1A1D21]">{name}</CardTitle>
        <CardDescription className="text-[14px] text-[#6B7280]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <span className="text-[48px] font-semibold text-[#1A1D21]">${price}</span>
          {price > 0 && <span className="text-[16px] text-[#6B7280]">/{interval}</span>}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-[#34C759] mt-0.5 flex-shrink-0" />
              <span className="text-[14px] text-[#1A1D21]">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className={`w-full h-11 rounded-lg font-medium transition-all duration-150 ${
            isPopular
              ? 'bg-[#007AFF] hover:bg-[#0051D5] text-white shadow-[0_1px_3px_rgba(0,122,255,0.3)]'
              : 'bg-white border border-[#E8ECEF] text-[#1A1D21] hover:bg-[#F5F5F7] hover:border-[#CBD5E1]'
          } ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={onSubscribe}
          disabled={disabled || isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : price === 0 ? 'Get Started' : 'Subscribe'}
        </Button>
      </CardFooter>
    </Card>
  )
}