"use client";
import {
  ArrowRight as ArrowRightIcon,
  TrendingUp as TrendingUpIcon,
  Clock,
  Users,
  Play,
} from "lucide-react";
import React from "react";
import { motion } from "motion/react";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import GetStartedButton from "@/components/ui/buttonAnimation";

const features = [
  {
    icon: Clock,
    text: "Time-saving workflows",
  },
  {
    icon: Users,
    text: "Team-ready features",
  },
  {
    icon: Play,
    text: "East to start",
  },
];

export default function CTA() {
  return (
    <section className="w-full min-h-[400px] sm:min-h-[450px] lg:min-h-[512px] flex items-center bg-gradient-to-br from-black via-emerald-700 to-black py-12 sm:py-16 lg:py-20">
      <motion.div
        className="mx-auto  w-full px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-6 sm:gap-8 items-center">
          <div className="flex flex-col gap-4 items-center">
            <div className="relative flex items-center justify-center w-full max-w-md">
              <div className="hidden sm:block absolute left-0 w-[25%] bg-[linear-gradient(90deg,rgba(0,0,0,0)_19%,rgba(198,180,237,0.5)_73%,rgba(149,115,222,1)_100%)] h-px" />

              <Badge className="h-8 bg-[#f5f1ff] text-black border-[#e3d6ff] rounded-[50px] flex items-center justify-center gap-2 px-3 sm:px-4 hover:bg-[#f5f1ff] text-xs whitespace-nowrap">
                <TrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="[font-family:'Inter',Helvetica] font-normal tracking-[-0.12px] leading-[14.4px]">
                  Reserve Your Spot
                </span>
              </Badge>

              <div className="hidden sm:block absolute right-0 w-[25%] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_19%,rgba(198,180,237,0.5)_73%,rgba(149,115,222,1)_100%)] h-px rotate-180" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="font-inter font-semibold text-white text-3xl sm:text-4xl lg:text-[55px] text-center tracking-[-2.20px] leading-tight px-4">
                Scale Your Content. Scale Your Business.
              </h1>

              <p className="[font-family:'Inter',Helvetica] font-medium text-white text-base sm:text-lg lg:text-2xl text-center tracking-[-0.18px] leading-relaxed max-w-4xl mx-auto  mt-4">
                Remalt gives founders and creators the ecosystem to plan,
                produce, and repurpose content 11X faster — so every idea
                becomes a growth asset.
              </p>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <GetStartedButton
              className=" right-1 top-1 h-10 px-10 py-4 bg-gradient-to-r from-black via-white-600 to-green-600   font-medium text-white text-sm text-center tracking-[-0.56px] leading-[14px] rounded-xl"
              data-tally-open="np8V18"
              data-tally-emoji-text="👋"
              data-tally-emoji-animation="wave"
            >
              <span className=" sm:inline mr-6">
                Join the Early Access List
              </span>
            </GetStartedButton>
          </div>

          {/* <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 mt-4 sm:mt-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-2 sm:gap-3 items-center">
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-white/20 rounded flex items-center justify-center">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-tight">
                  {feature.text}
                </span>
              </div>
            ))}
          </div> */}
        </div>
      </motion.div>
    </section>
  );
}
