import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Wrench } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className = "", size = "md", text }, ref) => {
    const sizeClasses = {
      sm: "w-5 h-5",
      md: "w-8 h-8",
      lg: "w-12 h-12",
    };

    const iconSizes = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-6 h-6",
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-4", className)}
        role="status"
        aria-live="polite"
      >
        <div className="relative">
          {/* Outer spinning ring */}
          <div
            className={cn(
              "animate-spin rounded-full border-2 border-muted border-t-primary",
              sizeClasses[size]
            )}
            aria-hidden="true"
          />
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench 
              className={cn("text-primary animate-pulse", iconSizes[size])} 
              aria-hidden="true" 
            />
          </div>
        </div>
        {text && (
          <span className="text-muted-foreground text-sm font-medium animate-pulse">{text}</span>
        )}
        <span className="sr-only">{text || "Loading"}</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
