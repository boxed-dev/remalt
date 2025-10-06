"use client";
import { motion } from "motion/react";
import { TrendingUp as TrendingUpIcon } from "lucide-react";
import React from "react";
import Image from "next/image";
import { Badge } from "@components/ui/badge";

// First row: Mix of social media, AI, productivity, and browsers
const logosRow1 = [
  { name: "Youtube", image: "/logos/yt.png", opacity: "" },
  { name: "ChatGPT", image: "/logos/gpt.png", opacity: "" },
  { name: "LinkedIn", image: "/logos/linkedin.png", opacity: "" },
  { name: "Google Docs", image: "/logos/gdoc.png", opacity: "" },
  { name: "Instagram", image: "/logos/insta.png", opacity: "" },
  { name: "Chrome", image: "/logos/chrome.png", opacity: "" },
  { name: "Gmail", image: "/logos/gmail.png", opacity: "" },
];

// Second row: Complementary mix - different categories from row 1
const logosRow2 = [
  { name: "TikTok", image: "/logos/tiktok.png", opacity: "" },
  { name: "Claude", image: "/logos/claude.png", opacity: "" },
  { name: "Facebook", image: "/logos/facebook.png", opacity: "" },
  { name: "Notion", image: "/logos/notion.png", opacity: "" },
  { name: "YouTube Shorts", image: "/logos/ytshorts.png", opacity: "" },
  { name: "Safari", image: "/logos/safari.png", opacity: "" },
  { name: "X (Twitter)", image: "/logos/x.png", opacity: "" },
];

export default function IntegrationsSection() {
  return (
    <section className="w-full py-12 sm:py-16 lg:py-[100px] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <motion.div
        className="max-w-[1240px] mx-auto flex flex-col items-center gap-6 sm:gap-8"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="w-full max-w-[612px] h-8 relative flex items-center justify-center">
          <div className="hidden sm:block absolute left-0 w-[150px] sm:w-[225px] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_19%,rgba(18,120,90,0.5)_73%,rgba(18,120,90,1)_100%)] h-px" />

          <Badge className="relative w-auto sm:w-[131px] h-8 bg-[linear-gradient(131deg,rgba(255,255,255,1)_0%,rgba(18,120,90,1)_48%,rgba(212,175,127,1)_80%)] border border-[#e3d6ff] rounded-[50px] flex items-center justify-center gap-2 px-3 text-xs">
            <TrendingUpIcon className="w-4 h-4 text-white" />
            <span className="[font-family:'Inter',Helvetica] font-normal text-white tracking-[-0.12px] leading-[14.4px]">
              INTEGRATIONS
            </span>
          </Badge>

          <div className="hidden sm:block absolute right-0 w-[150px] sm:w-[225px] bg-[linear-gradient(90deg,rgba(18,120,90,1)_0%,rgba(18,120,90,0.5)_27%,rgba(255,255,255,0.25)_81%)] h-px" />
        </div>

        <div className="flex flex-col items-center gap-3 sm:gap-4 max-w-[612px] px-4">
          <h2 className="font-inter font-semibold text-black text-3xl sm:text-4xl lg:text-[55px] tracking-[-2.20px] leading-tight text-center">
            Seamless Integrations
          </h2>

          <div className="flex flex-col items-center gap-1 sm:gap-[3.2px] max-w-[410px]">
            <p className="[font-family:'Inter',Helvetica] font-medium text-[#757575] text-sm sm:text-base lg:text-lg text-center tracking-[-0.18px] leading-relaxed">
              Works with the tools your team already uses
            </p>
            <p className="[font-family:'Inter',Helvetica] font-medium text-[#757575] text-sm sm:text-base lg:text-lg text-center tracking-[-0.18px] leading-relaxed">
              from calendars to collaboration platforms.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Infinite scrolling logos */}
      <motion.div
        className="w-full mt-8 sm:mt-10 lg:mt-[41px] overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .animate-scroll {
            animation: scroll 20s linear infinite;
          }
        `}</style>

        {/* First row */}
        <div className="flex gap-8 sm:gap-12 lg:gap-16 mb-4 sm:mb-6">
          <div className="flex gap-8 sm:gap-12 lg:gap-16 animate-scroll">
            {[...logosRow1, ...logosRow1].map((logo, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] h-12 sm:h-16 lg:h-20 bg-white rounded-lg flex items-center justify-center ${logo.opacity}`}
              >
                <Image
                  src={logo.image}
                  alt={logo.name}
                  width={160}
                  height={60}
                  className="object-contain max-w-full max-h-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Second row - reverse direction */}
        <div className="flex gap-8 sm:gap-12 lg:gap-16">
          <div
            className="flex gap-8 sm:gap-12 lg:gap-16 animate-scroll"
            style={{ animationDirection: "reverse" }}
          >
            {[...logosRow2, ...logosRow2].map((logo, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] h-12 sm:h-16 lg:h-20 bg-white rounded-lg flex items-center justify-center ${logo.opacity}`}
              >
                <Image
                  src={logo.image}
                  alt={logo.name}
                  width={160}
                  height={60}
                  className="object-contain max-w-full max-h-full"
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
