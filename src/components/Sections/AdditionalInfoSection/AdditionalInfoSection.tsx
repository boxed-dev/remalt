"use client";
import { motion } from "motion/react";
import { TrendingUp as TrendingUpIcon } from "lucide-react";
import React from "react";
import { Badge } from "@components/ui/badge";

export  default function AdditionalInfoSection () {
  return (
    <section className="w-full flex bg-[#ffffffa1] py-12 sm:py-16 lg:py-[100px]">
      <motion.div 
        className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-10 lg:gap-[50px]"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="flex flex-col items-center gap-6 sm:gap-8 max-w-2xl mx-auto">
          <div className="w-full h-8 relative flex items-center justify-center">
            <div className="hidden sm:block absolute left-0 w-32 sm:w-40 h-px bg-gradient-to-r from-[#12785a] to-white" />

            <Badge className="bg-gradient-to-r from-white via-[#12785a] to-[#d4af7f] text-white border border-[#e3d6ff] rounded-[50px] h-8 px-3 flex items-center gap-2 text-xs">
              <TrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-normal tracking-[-0.12px] leading-[14.4px] [font-family:'Inter',Helvetica]">
                BEHIND THE BUILD
              </span>
            </Badge>

            <div className="hidden sm:block absolute right-0 w-32 sm:w-40 h-px bg-gradient-to-l from-[#12785a] to-white" />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 text-center px-4">
            <h2 className="text-3xl sm:text-4xl lg:text-[55px] font-semibold tracking-[-2.20px] leading-tight [font-family:'Geist',Helvetica] text-black">
              How we got here
            </h2>

            <div className="flex flex-col gap-1">
              <p className="text-sm sm:text-base lg:text-lg font-medium text-[#757575] tracking-[-0.18px] leading-relaxed [font-family:'Inter',Helvetica]">
                We&apos;re reimagining how meetings work — built to help
              </p>
              <p className="text-sm sm:text-base lg:text-lg font-medium text-[#757575] tracking-[-0.18px] leading-relaxed [font-family:'Inter',Helvetica]">
                modern teams save time, gain clarity, and act faster.
              </p>
            </div>
          </div>
        </header>

        <div className="w-full min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-sm text-center p-4">
            Statistics Container
          </div>
        </div>
      </motion.div>
    </section>
  );
};
