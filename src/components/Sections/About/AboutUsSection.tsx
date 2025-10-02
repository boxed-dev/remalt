"use client";
import React from "react";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import Image from "next/image";

const featureCards = [
  {
    id: 1,
    icon: "/about/1.svg",
    title: "Community-powered",
  },
  {
    id: 2,
    icon: "/about/2.svg",
    title: "Community-powered",
  },
  {
    id: 3,
    icon: "/about/4.svg",
    title: "Privacy by design",
  },
  {
    id: 4,
    icon: "about/3.svg",
    title: "Integration without chaos",
  },
];

export default function AboutUsSection() {
  return (
    <section className="w-full py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-[#fbfbfb] border-none shadow-none">
          <CardContent className="">
            <div className="relative">
              {/* Header with badge and line */}
              <div className="flex items-center gap-4 mb-8 md:mb-16">
                <Badge className="bg-brand-gradient text-white border-none px-4 py-2 rounded-full">
                  <Image
                    className="w-4 h-4 mr-2"
                    alt="Math trend up"
                    src="/arrow.svg"
                    width={16}
                    height={16}
                  />
                  <span className="badge-text">ABOUT US</span>
                </Badge>
                <div className="hidden sm:block w-[150px] sm:w-[225px] bg-[linear-gradient(90deg,rgba(18,120,90,1)_0%,rgba(18,120,90,0.5)_27%,rgba(255,255,255,0.25)_81%)] h-px" />
              </div>
              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-16 items-start">
                {/* Left content */}
                <div className="space-y-4 md:space-y-6">
                  <h2 className="section-heading">
                    Built for founders who want clarity and growth
                  </h2>

                  <p className="paragraph-text">
                    Remalt is designed to cut through the noise and give online
                    founders the frameworks, systems, and community they need to
                    scale with confidence.
                  </p>
                  <Button className="bg-[#12785a] hover:bg-[#0f6b4d] text-white text-xs sm:text-sm py-2 px-4 sm:px-6 sm:py-3 rounded-lg shadow-lg border border-[#7c5ac5] flex items-center w-fit">
                    Join the Waitlist 
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Right content - Dashboard preview */}
                <div className="relative min-h-[400px] lg:min-h-[500px]">
                  <div
                    className="rounded-xl overflow-hidden bg-cover bg-center bg-no-repeat relative h-full min-h-[400px] lg:min-h-[500px]"
                    style={{
                      backgroundImage: "url(/about.png)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {featureCards.map((feature) => (
                    <Card
                      key={feature.id}
                      className="bg-white shadow-md border border-gray-100"
                    >
                      <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between min-h-[100px] sm:min-h-[120px]">
                        <div className="w-16 h-16 sm:w-12 sm:h-12 rounded flex items-center justify-center text-gray-400 text-xs">
                          <Image
                            className="w-8 h-8"
                            alt="Math trend up"
                            src={feature.icon}
                            width={64}
                            height={64}
                          />
                        </div>
                        <div className="feature-text">{feature.title}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="pt-0 sm:pt-8 lg:pt-14">
                  <div className="mb-6 sm:mb-8 lg:mb-10 text-yellow-400 text-xl">
                    ★★★★★
                  </div>

                  <blockquote className="testimonial-text mb-4 sm:mb-6">
                    Before Remalt, I felt stuck in hustle mode. Now, I have
                    clarity, a clear system, and peers pushing me forward. It
                    feels like finally running my business with a compass.
                  </blockquote>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <cite className="testimonial-text not-italic">
                      — Early Access Founder
                    </cite>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
