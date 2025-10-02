import React from "react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import Image from "next/image";

export default function HeroHeaderSection() {
  const notificationText = "No credit card required · Cancel anytime";

  return (
    <section className="w-full flex items-center justify-center bg-white py-12 sm:py-16 lg:py-20">
        
      <div className="flex flex-col items-center gap-6 max-w-8xl px-4">
        <header className="flex flex-col items-center gap-4">
          <div className="relative flex flex-col items-center">
            {/* First line: "The [icon] AI ecosystem" */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-2">
              <h1 className="[font-family:'Geist',Helvetica] font-semibold text-black text-4xl sm:text-5xl lg:text-[84px] text-center tracking-[-3.36px] leading-tight">
                The
              </h1>

              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-[66px] lg:h-[66px] shadow-md rounded-lg flex items-center justify-center [transform-style:preserve-3d] [transform:translate3d(0,0,0)_scale3d(1,1,1)_rotateX(0deg)_rotateY(0deg)_rotateZ(0deg)_skew(0,0)]">
                <Image
                  src="/herocircle.svg"
                  width={100}
                  height={100}
                  alt="icon"
                />
              </div>

              <h1 className="[font-family:'Geist',Helvetica] font-semibold text-black text-4xl sm:text-5xl lg:text-[84px] text-center tracking-[-3.36px] leading-tight">
                AI ecosystem
              </h1>
            </div>

            {/* Second line: "for clarity [icon] and growth" */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              <h1 className="[font-family:'Geist',Helvetica] font-semibold text-black text-4xl sm:text-5xl lg:text-[84px] text-center tracking-[-3.36px] leading-tight">
                for clarity
              </h1>

              <div
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-[66px] lg:h-[66px] shadow-md rounded-lg flex items-center justify-center 
             [transform-style:preserve-3d] 
             [transform:translate3d(0,0,0)_scale3d(1,1,1)_rotateX(0deg)_rotateY(0deg)_rotateZ(0deg)_skew(0,0)]"
              >
                <Image src="/heromic.svg" width={100} height={100} alt="icon" />
              </div>

              <h1 className="[font-family:'Geist',Helvetica] font-semibold text-black text-4xl sm:text-5xl lg:text-[84px] text-center tracking-[-3.36px] leading-tight">
                and growth
              </h1>
            </div>
          </div>

          <p className="[font-family:'Inter',Helvetica] font-medium text-[#757575] text-base sm:text-lg lg:text-2xl text-center tracking-[-0.18px] leading-relaxed max-w-[609px] mt-4">
            No more guessing. Remalt gives founders proven frameworks, revenue
            systems, and a community to scale with confidence.
          </p>
        </header>

        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="relative w-full">
            <Input
              type="email"
              placeholder="Your Email Address"
              className="w-full h-12 bg-neutral-950 border-0 rounded-lg text-[#ffffffb2] placeholder:text-[#ffffffb2] [font-family:'Inter',Helvetica] font-normal text-sm tracking-[-0.56px] pr-32"
              defaultValue=""
            />

            <Button className="absolute right-1 top-1 h-10 px-6 bg-[linear-gradient(131deg,rgba(255,255,255,1)_0%,rgba(18,120,90,1)_48%,rgba(212,175,127,1)_80%)] hover:opacity-90 [font-family:'Inter',Helvetica] font-medium text-white text-sm text-center tracking-[-0.56px] leading-[14px] rounded-[3px]">
              Get Notified
            </Button>
          </div>

          <p className="[font-family:'Inter',Helvetica] font-normal text-[#12785a] text-sm text-center tracking-[0] leading-[16.8px]">
            {notificationText}
          </p>
        </div>
      </div>
    </section>
  );
}
