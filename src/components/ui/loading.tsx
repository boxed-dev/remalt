interface LoadingScreenProps {
  message?: string;
  showBrand?: boolean;
}

/**
 * Apple-inspired logo-based loader
 * Think: Apple boot animation where the logo IS the loader
 * Features elegant shimmer and breathing effects
 */
function RemaltLogoLoader() {
  return (
    <div className="relative inline-block">
      {/* Main Remalt logo with shimmer effect */}
      <div className="relative">
        <h1 
          className="text-[56px] font-bold text-[#095D40] tracking-tight animate-pulse-scale"
          style={{
            background: 'linear-gradient(110deg, #095D40 0%, #095D40 40%, #0a7550 50%, #095D40 60%, #095D40 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <span className="inline-block animate-shimmer" style={{
            background: 'linear-gradient(110deg, #095D40 0%, #095D40 40%, #0a7550 50%, #095D40 60%, #095D40 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Remalt
          </span>
        </h1>
        
        {/* Subtle glow beneath logo */}
        <div 
          className="absolute -inset-8 blur-2xl animate-pulse-scale -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(9, 93, 64, 0.1) 0%, transparent 70%)',
          }}
        />
      </div>
      
      {/* Minimalist loading dots beneath logo */}
      <div className="flex items-center justify-center gap-1.5 mt-8">
        <div className="w-1.5 h-1.5 rounded-full bg-[#095D40] animate-loading-dot" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#095D40] animate-loading-dot" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#095D40] animate-loading-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

/**
 * Apple-inspired minimal loading screen
 * The logo itself becomes the loading indicator - like Apple's boot screen
 */
export function LoadingScreen({
  message = "Loading your AI canvas",
  showBrand = true
}: LoadingScreenProps = {}) {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFBFC] via-[#FFFFFF] to-[#F5F5F7]">
      <div className="text-center animate-fade-in-scale">
        {/* Logo as the primary loader */}
        {showBrand && <RemaltLogoLoader />}
        
        {/* Subtle loading message */}
        <p className="text-[14px] text-[#6B7280] font-medium tracking-tight opacity-70 mt-6">
          {message}
        </p>
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