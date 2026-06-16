import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "12px",
      background = "rgba(79, 70, 229, 1)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-4 py-2.5 text-white [background:var(--bg)]",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* shimmer sweep */}
        <div
          className="absolute inset-0 -z-10 overflow-hidden [border-radius:var(--radius)]"
          style={{ "--cut": shimmerSize } as CSSProperties}
        >
          <div
            className="absolute inset-0 animate-[shimmer-slide_var(--speed)_ease-in-out_infinite_alternate] bg-[linear-gradient(to_right,transparent_0%,var(--shimmer-color)_50%,transparent_100%)] opacity-20"
            style={{ width: "200%" } as CSSProperties}
          />
        </div>

        {/* highlight glow */}
        <div
          className={cn(
            "absolute inset-0 [border-radius:var(--radius)]",
            "shadow-[inset_0_-8px_10px_#ffffff1f]",
            "transition-all duration-300 ease-in-out",
            "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
            "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
          )}
        />

        {children}
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";
