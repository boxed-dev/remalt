"use client";
import React from "react";
import { motion } from "motion/react";
import Image from "next/image";

export default function ImageSection() {
  return (
    <section className="w-full flex items-center justify-center bg-gradient-to-br from-white to-[#095d40] py-16 sm:py-20 lg:py-24">
      <motion.div
        className="flex items-center justify-center max-w-7xl px-4 w-full"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Centered large image */}
        <div className="relative w-full max-w-4xl">
          <Image
            src="/section.png"
            alt="Learn from viral creators"
            width={1200}
            height={1200}
            className="w-full h-auto"
            priority
          />
        </div>
      </motion.div>
    </section>
  );
}
