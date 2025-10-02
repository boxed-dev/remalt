"use client";
import React, { useState } from "react";
import { ArrowRight as ArrowRightIcon, Play } from "lucide-react";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import Image from "next/image";
export default function BenefitsSection() {
  const benefitCards = [
    {
      icon: "/frame-2147224421-3.svg",
      title: "Founders",
      description:
        "Get clarity on offers, messaging, and systems to scale without chaos.",
      image: "/b/1.png", // Replace with actual image path
    },
    {
      icon: "/frame-2147224422.svg",
      title: "Consultants & Service Providers",
      description:
        "Stop trading time for money — productize your expertise and create predictable inbound.",
      image: "/about.png", // Replace with actual image path
    },
    {
      icon: "/frame-2147224422-1.svg",
      title: "Creators & Educators",
      description:
        "Turn your audience into a business with frameworks that grow community and revenue together.",
      image: "/about.png", // Replace with actual image path
    },
  ];

  const [selectedCard, setSelectedCard] = useState(0);

  return (
    <section className="w-full bg-white py-8 sm:py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-8 sm:mb-12">
          <div className="flex items-center gap-4 mb-8 md:mb-16">
            <Badge className="bg-brand-gradient text-white border-none px-4 py-2 rounded-full">
              <Image
                className="w-4 h-4 mr-2"
                alt="Math trend up"
                src="/arrow.svg"
                width={16}
                height={16}
              />
              <span className="badge-text">BENIFITS</span>
            </Badge>
            <div className="hidden sm:block w-[150px] sm:w-[225px] bg-[linear-gradient(90deg,rgba(18,120,90,1)_0%,rgba(18,120,90,0.5)_27%,rgba(255,255,255,0.25)_81%)] h-px" />
          </div>
          <h2 className="[font-family:'Geist',Helvetica] font-semibold text-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight mb-2">
            Built for <span className="text-[#12785a]">every kind</span> of
            online builder
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col gap-4">
              {benefitCards.map((card, index) => (
                <Card
                  key={index}
                  onClick={() => setSelectedCard(index)}
                  className={`bg-white rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    selectedCard === index
                      ? "border-2 border-[#12785a] shadow-md"
                      : "border border-gray-200"
                  }`}
                >
                  <CardContent className="p-5 sm:p-6 flex gap-4">
                    <div
                      className={`w-10 h-10 flex-shrink-0 border-2 rounded flex items-center justify-center transition-colors duration-300 ${
                        selectedCard === index
                          ? "border-[#12785a] bg-[#12785a]/10"
                          : "border-[#12785a]"
                      }`}
                    >
                      <Play
                        className={`w-4 h-4 transition-colors duration-300 ${
                          selectedCard === index
                            ? "text-[#12785a] fill-[#12785a]"
                            : "text-[#12785a] fill-[#12785a]"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="[font-family:'Geist',Helvetica] font-semibold text-black text-lg sm:text-xl tracking-tight leading-tight">
                        {card.title}
                      </h3>
                      <p className="[font-family:'Inter',Helvetica] font-normal text-[#666666] text-sm sm:text-base leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button className="bg-[#12785a] hover:bg-[#0f6b4d] text-white text-xs sm:text-sm py-2 px-4 sm:px-6 sm:py-3 rounded-lg shadow-lg border border-[#7c5ac5] flex items-center w-fit">
              <span className="hidden sm:inline">Join the Waitlist</span>
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="relative w-full h-[400px] lg:h-[500px]">
            <div className="rounded-2xl overflow-hidden relative w-full h-full">
              <Image
                src={benefitCards[selectedCard].image}
                alt={benefitCards[selectedCard].title}
                fill
                className="object-contain transition-opacity duration-500"
                key={selectedCard}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
