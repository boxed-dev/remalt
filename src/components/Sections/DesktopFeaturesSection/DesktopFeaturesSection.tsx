"use client";
import React from "react";
import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/ui/accordion";

const faqData = [
  {
    id: "item-1",
    question: "What is Remalt?",
    answer:
      "Remalt is an AI growth ecosystem built for founders, consultants, and creators. It combines proven frameworks, scalable systems, and a supportive community — so you can grow your business 11X faster without the chaos.",
    defaultOpen: true,
  },
  {
    id: "item-2",
    question: "Who is Remalt for?",
    answer:
      "Remalt is designed for online experts, service providers, and creators who are ready to move beyond hustle mode. If you’re tired of scattered tools, endless guessing, and zero clarity — Remalt was built for you.",
    defaultOpen: false,
  },
  {
    id: "item-3",
    question: "How does Remalt help me grow?",
    answer:
      "Remalt takes your ideas and turns them into execution-ready systems. From offers and content to funnels and community growth, you’ll have pre-built AI canvases and frameworks that save time and generate predictable results.",
    defaultOpen: false,
  },
  {
    id: "item-4",
    question: "Do I need to be techy to use Remalt?",
    answer:
      "Not at all. Remalt is built founder-first — meaning everything is simple, guided, and designed to cut through noise. You’ll never need to figure out AI — the system is ready to plug into your workflow.",
    defaultOpen: false,
  },
  {
    id: "item-5",
    question: "How is Remalt different from other AI tools?",
    answer:
      "Most AI tools give you outputs. Remalt gives you growth systems. Instead of random prompts, you get structured canvases designed by and for founders — with clarity and scaling baked in.",
    defaultOpen: false,
  },
  {
    id: "item-6",
    question: "What integrations does Remalt support?",
    answer:
      "Remalt plays well with the tools you already use — from calendars to automation platforms, content systems, and CRMs. No chaos, just smooth workflows.",
    defaultOpen: false,
  },
  {
    id: "item-7",
    question: "Is my data secure?",
    answer:
      "Yes. Privacy and security are built into the foundation of Remalt. Your data stays yours — always.",
    defaultOpen: false,
  },
  {
    id: "item-8",
    question: "How much does Remalt cost?",
    answer:
      "During waitlist access, you’ll get exclusive early pricing. Once we open fully, there will be tiered plans designed to support solo founders up to scaling teams.",
    defaultOpen: false,
  },
  {
    id: "item-9",
    question: "Why should I join the waitlist now?",
    answer:
      "Early access members get founder-first community access, early pricing locked in, and priority onboarding when Remalt opens up.",
    defaultOpen: false,
  },
];


export default function DesktopFeaturesSection  () {
  return (
    <section className="w-full flex bg-white py-12 sm:py-16 lg:py-[100px] px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-4xl mx-auto w-full flex flex-col gap-8 sm:gap-10 lg:gap-[50px]"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="flex flex-col gap-6 sm:gap-8">
          <div className="relative flex items-center justify-center h-8">
            <div className="hidden sm:block absolute left-0 right-auto w-[30%] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_19%,rgba(18,120,90,0.5)_73%,rgba(18,120,90,1)_100%)] h-px" />

            <div className="bg-[linear-gradient(131deg,rgba(255,255,255,1)_0%,rgba(18,120,90,1)_48%,rgba(212,175,127,1)_80%)] px-4 py-2 h-8 rounded-[50px] border border-[#12785a] flex items-center justify-center">
              <span className="[font-family:'Inter',Helvetica] font-normal text-white text-xs tracking-[-0.12px] leading-[14.4px]">
                FAQs
              </span>
            </div>

            <div className="hidden sm:block absolute right-0 left-auto w-[30%] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_19%,rgba(18,120,90,0.5)_73%,rgba(18,120,90,1)_100%)] h-px rotate-180" />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 items-center">
            <h1 className="text-3xl sm:text-4xl lg:text-[55px] tracking-[-2.20px] leading-tight [font-family:'Geist',Helvetica] font-semibold text-black text-center">
              Frequently Asked Questions
            </h1>

            <div className="max-w-2xl flex flex-col items-center gap-1 px-4">
              <p className="[font-family:'Inter',Helvetica] font-medium text-[#757575] text-sm sm:text-base lg:text-lg text-center tracking-[-0.18px] leading-relaxed">
                Everything you need to know about using our AI assistant, from
                setup to
              </p>

              <p className="[font-family:'Inter',Helvetica] font-medium text-[#757575] text-sm sm:text-base lg:text-lg text-center tracking-[-0.18px] leading-relaxed">
                security. Still curious? Drop us a message and we&apos;ll get
                right back to you.
              </p>
            </div>
          </div>
        </header>

        <div className="w-full">
          <Accordion
            type="single"
            collapsible
            defaultValue="item-1"
            className="flex flex-col gap-2"
          >
            {faqData.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-white rounded-lg border border-solid border-gray-100 px-4 sm:px-6 py-4 sm:py-6"
              >
                <AccordionTrigger className="flex items-center justify-between w-full text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <span className="[font-family:'Geist',Helvetica] font-medium text-black text-sm sm:text-base lg:text-lg tracking-[0] leading-tight pr-4">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                {faq.answer && (
                  <AccordionContent className="pt-4 sm:pt-5">
                    <div className="[font-family:'Geist',Helvetica] font-normal text-black text-xs sm:text-sm tracking-[0] leading-relaxed">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                )}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </motion.div>
    </section>
  );
};
