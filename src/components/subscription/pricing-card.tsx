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
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <span className="text-4xl font-bold">${price}</span>
          {price > 0 && <span className="text-muted-foreground">/{interval}</span>}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'outline'}
          onClick={onSubscribe}
          disabled={disabled || isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : price === 0 ? 'Get Started' : 'Subscribe'}
        </Button>
      </CardFooter>
    </Card>
  )
}