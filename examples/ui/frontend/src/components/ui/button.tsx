import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] font-medium",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "bg-white/60 hover:bg-white/90 border border-slate-200/60 hover:border-slate-300/80 rounded-xl text-center transition-all duration-200 hover:shadow-sm text-sm font-medium text-slate-700 hover:text-slate-900",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        send: "bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-2xl transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.97] group relative overflow-hidden",
        stop: "bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.97] group relative overflow-hidden",
        github: "bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base [&_svg]:size-5",
        google: "bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base [&_svg]:size-5",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        action: "px-5 py-2.5 space-x-2",
        dashboard: "px-4 py-2",
        send: "p-3.5",
        auth: "px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
