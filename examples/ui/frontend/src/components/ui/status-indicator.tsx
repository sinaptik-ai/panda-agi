import React from "react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "idle" | "loading" | "active";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusStyles = {
  idle: "bg-white",
  loading: "bg-white animate-pulse",
  active: "bg-white animate-pulse",
};

const sizeStyles = {
  sm: "w-1 h-1",
  md: "w-1.5 h-1.5",
  lg: "w-2 h-2",
};

export default function StatusIndicator({ 
  status, 
  size = "md", 
  className 
}: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        "rounded-full",
        statusStyles[status],
        sizeStyles[size],
        className
      )}
    />
  );
}