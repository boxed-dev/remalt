"use client";
import React from "react";
import { motion } from "motion/react";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import Image from "next/image";
import GetStartedButton from "@/components/ui/buttonAnimation";

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
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-4 md:mb-16 items-start">
                {/* Left content */}
                <div className="space-y-4 md:space-y-6">
                  <h2 className="section-heading">
                    Built for founders who want clarity, not chaos.
                  </h2>

                  <p className="paragraph-text">
                    Remalt gives online founders the frameworks, systems, and
                    founder-led community to turn ideas into scalable results —
                    fast. No fluff. No guesswork. Just the clarity, direction,
                    and execution power you need to grow with confidence.
                  </p>
                  <GetStartedButton
                    className="bg-[#12785a] hover:bg-[#0f6b4d] text-white text-xs sm:text-sm py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg border border-[#7c5ac5] flex items-center"
                    data-tally-open="np8V18"
                    data-tally-emoji-text="👋"
                    data-tally-emoji-animation="wave"
                  >
                    <span className=" sm:inline mr-6">
                      Claim Early Founder Perks
                    </span>
                  </GetStartedButton>
                </div>

                {/* Right content - Dashboard preview */}
                <div className="relative min-h-[250px] lg:min-h-[400px]">
                  <div
                    className="rounded-xl overflow-hidden bg-contain bg-start bg-no-repeat relative h-full min-h-[250px] lg:min-h-[400px]"
                    style={{
                      backgroundImage: "url(/about01.png)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  {featureCards.map((feature) => (
                    <Card key={feature.id} className="shadow-md">
                      <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 bg-gradient-to-br from-[#12785a]/10 to-[#12785a]/5 rounded-lg flex items-center justify-center shadow-sm">
                          <Image
                            className="w-6 h-6 sm:w-8 sm:h-8"
                            alt={feature.title}
                            src={feature.icon}
                            width={32}
                            height={32}
                          />
                        </div>
                        <div className="feature-text text-sm sm:text-base leading-snug">
                          {feature.title}
                        </div>
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
                    <Image
                      className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                      alt="Avatar"
                      src="/avatar.png"
                      width={32}
                      height={32}
                    />
                    <cite className="testimonial-text not-italic">
                      — Early Access Founder
                    </cite>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
