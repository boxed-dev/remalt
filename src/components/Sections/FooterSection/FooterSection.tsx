"use client";
import React from "react";
import { motion } from "motion/react";
import { JSX } from "react/jsx-runtime";

export default function FooterSection  () {
  const productLinks = [
    { label: "About us", href: "#" },
    { label: "Benifits", href: "#" },
    { label: "Integrations", href: "#" },
    { label: "FAQs", href: "#" },
    { label: "Contact", href: "#" },
  ];

  const legalLinks = [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ];

  const otherLinks = [{ label: "404", href: "#" }];

  const socialLinks = [
    {
      name: "X (Twitter)",
      icon: "/icon---yd6unx7fne8utlunzkttsq61sk-svg.svg",
      href: "#",
    },
    {
      name: "Youtube",
      icon: "/icon---ifq0ihnw3cvjj5a0ieihqklxhwi-svg.svg",
      href: "#",
    },
    {
      name: "LinkedIn",
      icon: "/icon---rgpe3lm2k6iscvahhsicxixcfi-svg.svg",
      href: "#",
    },
    {
      name: "Instagram",
      icon: "/icon---8tbltcuugbvnsmq8jlgioccycs-svg.svg",
      href: "#",
    },
  ];

  return (
    <footer className="w-full bg-white relative overflow-hidden">
      <motion.div 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8  sm:py-16 "
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-12 sm:gap-16 ">
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex">
                  <div className="[font-family:'Bricolage_Grotesque',Helvetica] font-medium text-black text-2xl sm:text-3xl lg:text-[41.9px] tracking-[0] leading-tight">
                    Remalt
                  </div>
                </div>
                <div className="[font-family:'Inter',Helvetica] font-normal text-black text-sm sm:text-base tracking-[0] leading-relaxed max-w-sm">
             No more guessing. Remalt gives founders proven frameworks, revenue systems, and a community to scale with confidence.
                </div>
              </div>
              <div className="[font-family:'Inter',Helvetica] font-normal text-black text-xs sm:text-sm lg:text-base tracking-[0]">
                © 2025 Remalt. All rights reserved.
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="[font-family:'Inter',Helvetica] font-medium text-black text-base sm:text-lg tracking-[-0.18px]">
                  Product
                </div>
                <div className="flex flex-col gap-2 sm:gap-[13px]">
                  {productLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="[font-family:'Onest',Helvetica] font-medium text-black text-sm sm:text-base tracking-[-0.32px] hover:opacity-70 transition-opacity"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="[font-family:'Inter',Helvetica] font-medium text-black text-base sm:text-lg tracking-[-0.18px]">
                  Legal
                </div>
                <div className="flex flex-col gap-2 sm:gap-[13px]">
                  {legalLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="[font-family:'Onest',Helvetica] font-medium text-black text-sm sm:text-base tracking-[-0.32px] hover:opacity-70 transition-opacity"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="[font-family:'Inter',Helvetica] font-medium text-black text-base sm:text-lg tracking-[-0.18px]">
                  Others
                </div>
                <div className="flex flex-col gap-2 sm:gap-[13px]">
                  {otherLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="[font-family:'Onest',Helvetica] font-medium text-black text-sm sm:text-base tracking-[-0.32px] hover:opacity-70 transition-opacity"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div> */}

          {/* <div className="w-full rounded-xl border border-solid border-[#1a1a1a] overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {socialLinks.map((social, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-center py-6 sm:py-8 ${
                    index < socialLinks.length - 1
                      ? "border-r border-solid border-[#1a1a1a]"
                      : ""
                  }`}
                >
                  <a
                    href={social.href}
                    className="flex items-center gap-2 sm:gap-3 hover:opacity-70 transition-opacity"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">•</span>
                    </div>
                    <span className="[font-family:'Inter',Helvetica] font-medium text-black text-sm sm:text-base lg:text-lg text-center tracking-[-0.18px] leading-tight">
                      {social.name}
                    </span>
                  </a>
                </div>
              ))}
            </div>
          </div> */}

          <div className="flex items-center justify-center w-full my-10 ">
            <div className="[text-shadow:0px_4px_4px_#00000040] [-webkit-text-stroke:1px_#00000036] bg-[linear-gradient(131deg,rgba(255,255,255,1)_0%,rgba(18,120,90,1)_48%,rgba(212,175,127,1)_80%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Geist',Helvetica] font-medium text-transparent text-[100px] sm:text-[120px] md:text-[160px] lg:text-[200px] xl:text-[280px] 2xl:text-[350px] text-center tracking-[-0.18px] leading-none">
              Remalt
            </div>
          </div>
        </div>
      </motion.div>
    </footer>
  );
};
