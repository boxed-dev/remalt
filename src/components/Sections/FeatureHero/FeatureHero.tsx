"use client"

import { motion } from "framer-motion"
import { useEffect, useRef, useState, useCallback } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    id: "1",
    name: "🧠 Content Canvas",
    title: "Content Canvas",
    description: "Create and repurpose content that drives sales, not just likes.",
  },
  {
    id: "2",
    name: "💬 Offer Canvas",
    title: "Offer Canvas",
    description: "Turn half-baked ideas into high-converting offers and frameworks.",
  },
  {
    id: "3",
    name: "🚀 Launch Canvas",
    title: "Launch Canvas",
    description: "Build email sequences, posts, and sales pages that align and convert.",
  },
  {
    id: "4",
    name: "🧩 System Canvas",
    title: "System Canvas",
    description: "Organize your business operations and automate creative workflows.",
  },
]

function IconCheck({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={className} {...props}>
      <path d="m229.66 77.66-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69 218.34 66.34a8 8 0 0 1 11.32 11.32Z" />
    </svg>
  )
}

export default function FeatureHero() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1,
        onEnter: () => {
          gsap.to(contentRef.current, {
            y: 0,
            duration: 0.8,
            ease: "power2.out",
          })
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const handleStepChange = useCallback((index: number) => {
    setCurrentStep(index)
  }, [])

  return (
    <div ref={sectionRef} className="relative min-h-screen w-full bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
      <div 
        ref={contentRef}
        className="flex min-h-screen items-center justify-center px-4 py-20"
        style={{ transform: "translateY(20vh)" }}
      >
        <div className="mx-auto max-w-5xl text-center">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-5xl lg:text-6xl"
          >
            Your AI Workspace for Turning Ideas Into Systems That Sell
          </motion.h1>

          {/* Subcopy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-12 max-w-3xl text-lg leading-relaxed text-neutral-700 dark:text-neutral-300 md:text-xl"
          >
            Stop juggling scattered tools and half-finished ideas. This is where your content, offers, 
            launches, and systems come together in one intelligent workspace—designed to help you build, 
            launch, and scale with clarity and speed.
          </motion.p>

          {/* Steps Navigation */}
          <motion.nav
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            aria-label="Progress"
            className="flex justify-center px-4"
          >
            <ol className="flex w-full flex-wrap items-center justify-center gap-2" role="list">
              {steps.map((step, stepIdx) => {
                const isCompleted = currentStep > stepIdx
                const isCurrent = currentStep === stepIdx
                return (
                  <motion.li
                    key={step.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.3 + stepIdx * 0.1 }}
                    animate={isCurrent ? { scale: 1 } : { scale: 0.95 }}
                    className="relative"
                  >
                    <button
                      type="button"
                      className={`group flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 dark:focus-visible:ring-offset-black ${
                        isCurrent
                          ? "bg-sky-600 text-white dark:bg-sky-500"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      }`}
                      onClick={() => handleStepChange(stepIdx)}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          isCompleted
                            ? "bg-sky-600 text-white dark:bg-sky-500"
                            : isCurrent
                              ? "bg-sky-400 text-sky-900 dark:bg-sky-400 dark:text-sky-900"
                              : "bg-neutral-200 text-neutral-700 group-hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:group-hover:bg-neutral-600"
                        }`}
                      >
                        {isCompleted ? (
                          <IconCheck className="h-3.5 w-3.5" />
                        ) : (
                          <span>{stepIdx + 1}</span>
                        )}
                      </span>
                      <span className="hidden sm:inline-block">{step.name}</span>
                    </button>
                  </motion.li>
                )
              })}
            </ol>
          </motion.nav>
        </div>
      </div>
    </div>
  )
}
