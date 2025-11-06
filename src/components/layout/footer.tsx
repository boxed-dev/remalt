'use client';

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export function Footer() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Animated CTA Text */}
        <div className="relative overflow-hidden py-16">
          <Link href="/flows">
            <motion.div
              className="relative cursor-pointer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              initial={false}
            >
              {/* Fading gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/60 to-gray-50 pointer-events-none z-10" />

              {/* Text container */}
              <div className="relative text-center py-12">
                <motion.div
                  className="text-[120px] sm:text-[160px] md:text-[200px] lg:text-[240px] font-bold leading-none tracking-tight"
                  animate={{
                    color: isHovered ? "#095D40" : "#000000",
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: isHovered ? 0 : 1,
                      y: isHovered ? -20 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="inline-block"
                  >
                    {!isHovered && "Remalt"}
                  </motion.span>

                  <motion.span
                    initial={false}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      y: isHovered ? 0 : 20,
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center gap-4"
                  >
                    {isHovered && (
                      <>
                        <span>Try now</span>
                        <ArrowRight className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40" strokeWidth={1.5} />
                      </>
                    )}
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>
          </Link>

          {/* Copyright - Right aligned below text */}
          <div className="text-right pr-4 sm:pr-8">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Remalt. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}