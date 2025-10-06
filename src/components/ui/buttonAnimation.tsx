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
      className={cn("group relative overflow-hidden", className)}
      {...restProps}
        data-tally-open="np8V18"
            data-tally-emoji-text="👋"
            data-tally-emoji-animation="wave"
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
