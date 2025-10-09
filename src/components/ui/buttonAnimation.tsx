import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type GetStartedButtonProps = React.ComponentProps<typeof Button> & {
  iconSize?: number;
  iconStrokeWidth?: number;
};

const GetStartedButton = React.forwardRef<
  HTMLButtonElement,
  GetStartedButtonProps
>((props, ref) => {
  const {
    className,
    size = "lg",
    children = "Get Started",
    iconSize = 16,
    iconStrokeWidth = 2,
    ...restProps
  } = props;

  return (
    <Button
      ref={ref}
      size={size}
      variant="default"
      className={cn("group relative overflow-hidden bg-gradient-to-r from-black via-white-600 to-green-600", className)}
      {...restProps}
      // onClick={() => window.location.href = "/waitlist"}
    >
      <span className="mr-8 transition-opacity duration-300 group-hover:opacity-0">
        {children}
      </span>
      <span
        className="absolute right-1 top-1 bottom-1 rounded-sm z-10 flex items-center justify-center w-1/4 transition-all duration-300 bg-primary-foreground/15 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95"
        aria-hidden="true"
      >
        <ChevronRight size={iconSize} strokeWidth={iconStrokeWidth} />
      </span>
    </Button>
  );
});

GetStartedButton.displayName = "GetStartedButton";

export default GetStartedButton;
