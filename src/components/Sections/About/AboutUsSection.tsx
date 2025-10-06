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
    title: "Growth without limits",
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
    <section className="w-full py-12 md:py-16 px-4">
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Card className="bg-gradient-to-br from-[#fbfbfb] to-white border-none shadow-none overflow-hidden">
          <CardContent className="relative">
            {/* Decorative background elements for mobile */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#12785a]/5 rounded-full blur-3xl -z-10 md:hidden" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#7c5ac5]/5 rounded-full blur-3xl -z-10 md:hidden" />
            
            <div className="relative">
              {/* Header with badge and line */}
              <motion.div 
                className="flex items-center gap-4 mb-10 md:mb-16"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Badge className="bg-brand-gradient text-white border-none px-4 py-2 rounded-full shadow-lg">
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
              </motion.div>
              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 mb-8 md:mb-16 items-start">
                {/* Left content */}
                <motion.div 
                  className="space-y-6 md:space-y-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <h2 className="section-heading leading-tight">
                    Built for founders who want clarity, not chaos.
                  </h2>

                  <p className="paragraph-text leading-relaxed">
                    Remalt gives online founders the frameworks, systems, and
                    founder-led community to turn ideas into scalable results —
                    fast. No fluff. No guesswork. Just the clarity, direction,
                    and execution power you need to grow with confidence.
                  </p>
                  <GetStartedButton
                    className="bg-[#12785a] hover:bg-[#0f6b4d] text-white text-sm sm:text-sm px-6 py-3 sm:px-6 sm:py-3 rounded-lg shadow-lg hover:shadow-xl transition-all border border-[#7c5ac5] flex items-center w-full sm:w-auto justify-center"
                    data-tally-open="np8V18"
                    data-tally-emoji-text="👋"
                    data-tally-emoji-animation="wave"
                  >
                    <span className="mr-6">
                      Claim Early Founder Perks
                    </span>
                  </GetStartedButton>
                </motion.div>

                {/* Right content - Dashboard preview */}
                <motion.div 
                  className="relative min-h-[280px] lg:min-h-[400px] -mx-4 sm:mx-0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div
                    className="rounded-none sm:rounded-xl overflow-hidden bg-contain bg-center sm:bg-start bg-no-repeat relative h-full min-h-[280px] lg:min-h-[400px] "
                    style={{
                      backgroundImage: "url(/about01.png)",
                    }}
                  ></div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  {featureCards.map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    >
                      <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#12785a]/20 group">
                        <CardContent className="p-5 sm:p-6 h-full flex flex-col justify-between min-h-[160px] sm:min-h-[180px]">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 mb-4 sm:mb-5 bg-gradient-to-br from-[#12785a]/15 to-[#12785a]/5 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                            <Image
                              className="w-7 h-7 sm:w-9 sm:h-9"
                              alt={feature.title}
                              src={feature.icon}
                              width={36}
                              height={36}
                            />
                          </div>
                          <div className="feature-text text-sm sm:text-base leading-snug font-medium">
                            {feature.title}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <motion.div 
                  className="pt-6 sm:pt-8 lg:pt-14 px-6 sm:px-8 py-8 sm:py-10 bg-gradient-to-br from-white to-[#12785a]/5 rounded-2xl "
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <div className="mb-6 sm:mb-8 text-yellow-400 text-2xl sm:text-xl flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                      >
                        ★
                      </motion.span>
                    ))}
                  </div>

                  <blockquote className="testimonial-text mb-6 sm:mb-6 leading-relaxed italic">
                    Before Remalt, I felt stuck in hustle mode. Now, I have
                    clarity, a clear system, and peers pushing me forward. It
                    feels like finally running my business with a compass.
                  </blockquote>

                  <div className="flex items-center gap-3">
                    <Image
                      className="w-12 h-12 rounded-full bg-gray-200 object-cover ring-2 ring-[#12785a]/20"
                      alt="Avatar"
                      src="/avatar.png"
                      width={48}
                      height={48}
                    />
                    <cite className="testimonial-text not-italic font-medium">
                      — Early Access Founder
                    </cite>
                  </div>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
