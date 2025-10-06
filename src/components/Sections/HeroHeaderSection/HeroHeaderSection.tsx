"use client";
import React from "react";
import { motion } from "motion/react";
import GetStartedButton from "@/components/ui/buttonAnimation";

export default function HeroHeaderSection() {
  const headingClass =
    "font-inter font-semibold text-black text-[24px] sm:text-5xl lg:text-[84px] text-center tracking-[-0.5px] sm:tracking-[-2px] lg:tracking-[-3.36px] leading-tight sm:whitespace-nowrap";

  return (
    <section className="w-full h-full md:h-screen flex items-center justify-center bg-white py-12 sm:py-16 lg:py-20">
      <motion.div
        className="flex flex-col items-center gap-6 max-w-8xl px-4 py-10"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="flex flex-col items-center gap-2">
          <div className="relative flex flex-col items-center w-full">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-4 mb-2">
              <h1 className={headingClass}>The</h1>
              <h1 className={headingClass}>AI Canvas for</h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-4">
              <h1 className={headingClass}>Creating Content That Sells</h1>
              {/* <h1 className={headingClass}></h1> */}
            </div>
          </div>

          <p className="font-inter font-medium text-[#757575] text-sm sm:text-lg lg:text-2xl text-center tracking-[-0.18px] leading-relaxed max-w-4xl mt-4">
            Turn your ideas, research, and inspiration into high-converting
            content — posts, ads, scripts, and pages that actually move revenue,
            not just engagement.
          </p>
        </header>

        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="relative w-full flex justify-center">
            <GetStartedButton
              className="h-10 px-6 bg-gradient-to-r from-black via-white-600 to-green-600 hover:opacity-90 font-inter font-medium text-white text-sm text-center tracking-[-0.56px] leading-[14px] rounded-lg shadow-lg border border-gray-300"
              data-tally-open="np8V18"
              data-tally-emoji-text="👋"
              data-tally-emoji-animation="wave"
            >
              Get Early Access
            </GetStartedButton>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
