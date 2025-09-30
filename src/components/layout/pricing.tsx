import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out AI workflows",
    badge: null,
    features: [
      "5 workflows per month",
      "Basic AI models",
      "Community support",
      "Template library access",
    ],
    buttonText: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "month",
    description: "For professionals and growing teams",
    badge: "Most Popular",
    features: [
      "Unlimited workflows",
      "Advanced AI models (GPT-4, Claude)",
      "Priority support",
      "Custom templates",
      "Team collaboration",
      "Analytics & insights",
    ],
    buttonText: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large organizations with specific needs",
    badge: null,
    features: [
      "Everything in Pro",
      "Custom AI model training",
      "Dedicated support",
      "SSO & advanced security",
      "Custom integrations",
      "SLA guarantee",
    ],
    buttonText: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Simple,
            <span className="bg-gradient-to-r from-[#095D40] to-[#D4AF7F] bg-clip-text text-transparent">
              {" "}transparent pricing
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Choose the plan that fits your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? "border-[#095D40]/20 shadow-lg scale-105"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-[#095D40] to-[#D4AF7F] text-white">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pt-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-gray-600">/{plan.period}</span>
                  )}
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-6">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular
                      ? "apple-button"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200 border-0"
                  }`}
                >
                  {plan.buttonText}
                  {plan.popular && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Have questions? Check out our{" "}
            <a href="/faq" className="text-[#095D40] hover:text-[#095D40]/80 underline">
              FAQ
            </a>{" "}
            or{" "}
            <a href="/contact" className="text-[#095D40] hover:text-[#095D40]/80 underline">
              contact our team
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}