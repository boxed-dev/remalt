"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionStyle,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// --- Helper Functions and Fallbacks ---

// A simple utility for class names, similar to cn/clsx
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};

// Placeholder for image assets if they are not found.
const placeholderImage = (text = "Image") =>
  `https://placehold.co/600x400/1a1a1a/ffffff?text=${text}`;

// --- Types ---
type StaticImageData = string;

type WrapperStyle = MotionStyle & {
  "--x": MotionValue<string>;
  "--y": MotionValue<string>;
};

interface CardProps {
  bgClass?: string;
}

interface ImageSet {
  step1img1: StaticImageData;
  step1img2: StaticImageData;
  step2img1: StaticImageData;
  step2img2: StaticImageData;
  step3img: StaticImageData;
  step4img: StaticImageData;
  alt: string;
}

interface FeatureCarouselProps extends CardProps {
  step1img1Class?: string;
  step1img2Class?: string;
  step2img1Class?: string;
  step2img2Class?: string;
  step3imgClass?: string;
  step4imgClass?: string;
  image: ImageSet;
}

interface StepImageProps {
  src: StaticImageData;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

interface Step {
  id: string;
  name: string;
  title: string;
  description: string;
}

// --- Constants ---
const TOTAL_STEPS = 4;

const steps: readonly Step[] = [
  {
    id: "1",
    name: "🧠 Content Canvas",
    title: "Content Canvas",
    description:
      "Create and repurpose content that drives sales, not just likes.",
  },
  {
    id: "2",
    name: "💬 Offer Canvas",
    title: "Offer Canvas",
    description:
      "Turn half-baked ideas into high-converting offers and frameworks.",
  },
  {
    id: "3",
    name: "🚀 Launch Canvas",
    title: "Launch Canvas",
    description:
      "Build email sequences, posts, and sales pages that align and convert.",
  },
  {
    id: "4",
    name: "🧩 System Canvas",
    title: "System Canvas",
    description:
      "Organize your business operations and automate creative workflows.",
  },
];

const ANIMATION_PRESETS = {
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.5 },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.5 },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.5 },
  },
} as const;

type AnimationPreset = keyof typeof ANIMATION_PRESETS;

interface AnimatedStepImageProps extends StepImageProps {
  preset?: AnimationPreset;
  delay?: number;
  onAnimationComplete?: () => void;
}

// --- Hooks ---
function useScrollSteps(totalSteps: number = TOTAL_STEPS) {
  const [currentNumber, setCurrentNumber] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !cardRef.current) return;

    const ctx = gsap.context(() => {
      // Animate card to center on scroll
      gsap.fromTo(
        cardRef.current,
        { y: "20vh", opacity: 0 },
        {
          y: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "+=50%",
            scrub: 1,
          },
        }
      );

      // Pin and change steps
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: `+=${window.innerHeight * (totalSteps + 1)}`,
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const newStep = Math.min(
            Math.floor(progress * totalSteps),
            totalSteps - 1
          );
          setCurrentNumber(newStep);
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [totalSteps]);

  const setStep = useCallback(
    (stepIndex: number) => {
      setCurrentNumber(stepIndex % totalSteps);
    },
    [totalSteps]
  );

  return { currentNumber, setStep, containerRef, cardRef };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);
  return isMobile;
}

// --- Components ---
function IconCheck({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path d="m229.66 77.66-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69 218.34 66.34a8 8 0 0 1 11.32 11.32Z" />
    </svg>
  );
}

const stepVariants: Variants = {
  inactive: { scale: 0.9, opacity: 0.7 },
  active: { scale: 1, opacity: 1 },
};

const StepImage = forwardRef<HTMLImageElement, StepImageProps>(
  ({ src, alt, className, style, ...props }, ref) => {
    return (
      <img
        ref={ref}
        alt={alt}
        className={className}
        src={src}
        style={{
          position: "absolute",
          userSelect: "none",
          maxWidth: "unset",
          ...style,
        }}
        onError={(e) => (e.currentTarget.src = placeholderImage(alt))}
        {...props}
      />
    );
  }
);
StepImage.displayName = "StepImage";

const MotionStepImage = motion(StepImage);

const AnimatedStepImage = ({
  preset = "fadeInScale",
  delay = 0,
  ...props
}: AnimatedStepImageProps) => {
  const presetConfig = ANIMATION_PRESETS[preset];
  return (
    <MotionStepImage
      {...props}
      {...presetConfig}
      transition={{ ...presetConfig.transition, delay }}
    />
  );
};

function FeatureCard({
  children,
  step,
}: {
  children: React.ReactNode;
  step: number;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isMobile = useIsMobile();
  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (isMobile) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }
  return (
    <motion.div
      className="animated-cards group relative w-full rounded-2xl"
      onMouseMove={handleMouseMove}
      style={
        {
          "--x": useMotionTemplate`${mouseX}px`,
          "--y": useMotionTemplate`${mouseY}px`,
        } as WrapperStyle
      }
    >
      <div className="relative w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white transition-colors duration-300 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="m-10 min-h-[450px] w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="flex w-full flex-col gap-4 md:w-3/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="text-sm font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-500"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.05,
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {steps[step].name}
              </motion.div>
              <motion.h2
                className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-3xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.1,
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {steps[step].title}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.15,
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <p className="text-base leading-relaxed text-neutral-700 dark:text-neutral-400">
                  {steps[step].description}
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function StepsNav({
  steps: stepItems,
  current,
  onChange,
}: {
  steps: readonly Step[];
  current: number;
  onChange: (index: number) => void;
}) {
  return (
    <nav aria-label="Progress" className="flex justify-center px-4">
      <ol
        className="flex w-full flex-wrap items-center justify-center gap-2"
        role="list"
      >
        {stepItems.map((step, stepIdx) => {
          const isCompleted = current > stepIdx;
          const isCurrent = current === stepIdx;
          return (
            <motion.li
              key={step.name}
              initial="inactive"
              animate={isCurrent ? "active" : "inactive"}
              variants={stepVariants}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <button
                type="button"
                className={cn(
                  "group flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 dark:focus-visible:ring-offset-black",
                  isCurrent
                    ? "bg-sky-600 text-white dark:bg-sky-500"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                )}
                onClick={() => onChange(stepIdx)}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                    isCompleted
                      ? "bg-sky-600 text-white dark:bg-sky-500"
                      : isCurrent
                      ? "bg-sky-400 text-sky-900 dark:bg-sky-400 dark:text-sky-900"
                      : "bg-neutral-200 text-neutral-700 group-hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:group-hover:bg-neutral-600"
                  )}
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
          );
        })}
      </ol>
    </nav>
  );
}

const defaultClasses = {
  img: "rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-black/10 dark:shadow-neutral-950/50",
  step1img1: "w-[50%] left-0 top-[15%]",
  step1img2: "w-[60%] left-[40%] top-[35%]",
  step2img1: "w-[50%] left-[5%] top-[20%]",
  step2img2: "w-[40%] left-[55%] top-[45%]",
  step3img: "w-[90%] left-[5%] top-[25%]",
  step4img: "w-[90%] left-[5%] top-[25%]",
} as const;

export function FeatureCarousel({
  image,
  step1img1Class = defaultClasses.step1img1,
  step1img2Class = defaultClasses.step1img2,
  step2img1Class = defaultClasses.step2img1,
  step2img2Class = defaultClasses.step2img2,
  step3imgClass = defaultClasses.step3img,
  step4imgClass = defaultClasses.step4img,
  ...props
}: FeatureCarouselProps) {
  const { currentNumber: step, setStep, containerRef, cardRef } = useScrollSteps();
  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="relative w-full h-full">
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step1img1Class)}
              src={image.step1img1}
              preset="slideInLeft"
            />
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step1img2Class)}
              src={image.step1img2}
              preset="slideInRight"
              delay={0.1}
            />
          </div>
        );
      case 1:
        return (
          <div className="relative w-full h-full">
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step2img1Class)}
              src={image.step2img1}
              preset="fadeInScale"
            />
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step2img2Class)}
              src={image.step2img2}
              preset="fadeInScale"
              delay={0.1}
            />
          </div>
        );
      case 2:
        return (
          <AnimatedStepImage
            alt={image.alt}
            className={cn(defaultClasses.img, step3imgClass)}
            src={image.step3img}
            preset="fadeInScale"
          />
        );
      case 3:
        return (
          <AnimatedStepImage
            alt={image.alt}
            className={cn(defaultClasses.img, step4imgClass)}
            src={image.step4img}
            preset="fadeInScale"
          />
        );
      default:
        return null;
    }
  };
  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900 py-20"
    >
      <div className="mx-auto max-w-5xl px-4">
        {/* Heading Section - Fixed at top */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-5xl lg:text-6xl"
          >
            Your AI Workspace for Turning Ideas Into Systems That Sell
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-12 max-w-3xl text-lg leading-relaxed text-neutral-700 dark:text-neutral-300 md:text-xl"
          >
           
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <StepsNav current={step} onChange={setStep} steps={steps} />
          </motion.div>
        </div>

        {/* Card Section - Animates to center */}
        <div ref={cardRef} className="flex flex-col gap-12 w-full max-w-4xl mx-auto">
          <FeatureCard {...props} step={step}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                {...ANIMATION_PRESETS.fadeInScale}
                className="w-full h-full absolute"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </FeatureCard>
        </div>
      </div>
    </div>
  );
}
