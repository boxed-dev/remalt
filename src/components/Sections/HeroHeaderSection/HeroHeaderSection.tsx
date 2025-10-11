"use client";
import React from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import GetStartedButton from "@/components/ui/buttonAnimation";
import Silk from "@/components/Silk";

export default function HeroHeaderSection() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/early-access");
  };

  return (
    <section className="w-full min-h-[100dvh] flex items-center justify-center bg-white py-4 sm:py-6 lg:py-8 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <Silk
          speed={10}
          scale={1}
          color="#399152"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      <motion.div
        className="flex flex-col items-center gap-6 sm:gap-8 lg:gap-10 max-w-7xl px-0 md:px-8 relative z-10 w-full"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="flex flex-col items-center gap-4 sm:gap-6 w-full">
          <div className="relative flex flex-col items-center w-full space-y-2 sm:space-y-3">
            {/* <p className="font-inter font-medium text-white text-[12px]  md:text-md lg:text-2xl text-center tracking-[-0.01em] leading-[1.6] max-w-3xl mt-2 sm:mt-4 px-4 [text-shadow:_0_1px_10px_rgb(0_0_0_/_40%)]">
              AI Ideation & Automation for Creators and Marketers
            </p> */}
            <h1 className="font-inter font-bold text-white text-[36px] sm:text-5xl md:text-6xl lg:text-7xl xl:text-[84px] text-center tracking-[-0.02em] leading-[1.2] [text-shadow:_0_2px_20px_rgb(0_0_0_/_50%)]  ">
              {/* AI Canvas for Content That Converts */}
              Create Content{" "}
              <span className="block sm:inline"> That Sells</span>
            </h1>
          </div>

          <p className="font-inter font-medium text-white text-base sm:text-lg md:text-xl lg:text-2xl text-center tracking-[-0.01em] leading-[1.6] max-w-3xl mt-2 sm:mt-4 px-4 [text-shadow:_0_1px_10px_rgb(0_0_0_/_40%)]">
            The AI Canvas that helps founders, creators, and marketers turn
            content into sales.
          </p>
        </header>

        <div className="flex flex-col items-center gap-4 w-full mt-2 sm:mt-4">
          <div className="relative w-full flex justify-center px-4">
            <GetStartedButton
            
              // onClick={handleGetStarted}
              className="prefinery-form-cta h-12 sm:h-14 px-8 sm:px-10 bg-white hover:opacity-90 font-inter font-semibold text-black text-base sm:text-lg text-center tracking-[-0.01em] rounded-xl shadow-2xl border border-gray-200 transition-all duration-200 w-full sm:w-auto max-w-xs"
            >
              Get Early Access
            </GetStartedButton>
            {/* <button className="prefinery-form-cta">Join!</button> */}

             <div ></div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
