import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  showBrand?: boolean;
}

export function LoadingScreen({
  message = "Loading your AI canvas",
  showBrand = true
}: LoadingScreenProps = {}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#FAFBFC]">
      <div className="text-center">
        {showBrand && (
          <div className="text-[32px] font-bold text-[#095D40] mb-4">Remalt</div>
        )}
        <Loader2 className="h-8 w-8 animate-spin text-[#095D40] mx-auto mb-4" />
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