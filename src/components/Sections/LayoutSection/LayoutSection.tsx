import { ArrowRight as ArrowRightIcon, TrendingUp as TrendingUpIcon } from "lucide-react";
import React from "react";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";

const features = [
  {
    icon: "/icon-wrapper.svg",
    text: "Time-saving",
  },
  {
    icon: "/icon-wrapper-2.svg",
    text: "Team-ready features",
  },
  {
    icon: "/icon-wrapper-1.svg",
    text: "East to start",
  },
];

export default function  LayoutSection() {
  return (
    <section className="w-full min-h-[400px] sm:min-h-[450px] lg:min-h-[512px] flex items-center bg-[linear-gradient(131deg,rgba(255,255,255,1)_0%,rgba(18,120,90,1)_48%,rgba(212,175,127,1)_80%)] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto  w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:gap-8 items-center">
          <div className="flex flex-col gap-4 items-center">
            <div className="relative flex items-center justify-center w-full max-w-md">
              <div className="hidden sm:block absolute left-0 w-[25%] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_19%,rgba(198,180,237,0.5)_73%,rgba(149,115,222,1)_100%)] h-px" />

              <Badge className="h-8 bg-[#f5f1ff] text-black border-[#e3d6ff] rounded-[50px] flex items-center justify-center gap-2 px-3 sm:px-4 hover:bg-[#f5f1ff] text-xs whitespace-nowrap">
                <TrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="[font-family:'Inter',Helvetica] font-normal tracking-[-0.12px] leading-[14.4px]">
                  UPGRADE YOUR MEETINGS
                </span>
              </Badge>

              <div className="hidden sm:block absolute right-0 w-[25%] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_19%,rgba(198,180,237,0.5)_73%,rgba(149,115,222,1)_100%)] h-px rotate-180" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="[font-family:'Geist',Helvetica] font-semibold text-white text-3xl sm:text-4xl lg:text-[55px] text-center tracking-[-2.20px] leading-tight px-4">
                The ecosystem that gives founders clarity
              </h1>

              <h1 className="[font-family:'Geist',Helvetica] font-semibold text-white text-3xl sm:text-4xl lg:text-[55px] text-center tracking-[-2.20px] leading-tight px-4">
                and predictable growth.
              </h1>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <Button className="w-full sm:w-auto bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-[#7c5ac5] shadow-lg hover:bg-black/90 text-sm">
              <span className="[font-family:'Inter',Helvetica] font-normal tracking-[0]">
                Join the Waitlist
              </span>
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 mt-4 sm:mt-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-2 sm:gap-3 items-center">
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-white/20 rounded flex items-center justify-center">
                  <span className="text-white text-xs">•</span>
                </div>
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-tight">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
