import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  showBrand?: boolean;
}

function AnimatedRemaltText() {
  const letters = "Remalt".split("");

  return (
    <div className="relative inline-block">
      <div className="text-[32px] font-bold text-[#095D40] mb-4 animate-heartbeat">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="relative inline-block"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {letter}
            {/* Particle effects */}
            <span
              className="absolute inset-0 text-[#095D40] opacity-0 animate-particle-disperse pointer-events-none"
              style={{
                animationDelay: `${index * 0.15}s`,
                // @ts-ignore - CSS custom properties
                "--disperse-x": `${Math.random() * 16 - 8}px`,
                "--disperse-y": `${-Math.random() * 16}px`,
              }}
              aria-hidden="true"
            >
              {letter}
            </span>
            <span
              className="absolute inset-0 text-[#095D40] opacity-0 animate-particle-disperse pointer-events-none"
              style={{
                animationDelay: `${index * 0.15 + 0.5}s`,
                // @ts-ignore - CSS custom properties
                "--disperse-x": `${-Math.random() * 16}px`,
                "--disperse-y": `${-Math.random() * 16}px`,
              }}
              aria-hidden="true"
            >
              {letter}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LoadingScreen({
  message = "Loading your AI canvas",
  showBrand = true
}: LoadingScreenProps = {}) {
  return (
    <div className="h-screen flex items-center justify-center bg-[#FAFBFC]">
      <div className="text-center">
        {showBrand && <AnimatedRemaltText />}
        <p className="text-[14px] text-[#6B7280]">{message}</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function InlineLoading({
  message,
  size = "md",
  className = ""
}: InlineLoadingProps = {}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#095D40]`} />
      {message && (
        <span className="text-[14px] text-[#6B7280]">{message}</span>
      )}
    </div>
  );
}