import React from "react";
import { cn } from "@/lib/utils";
import StatusIndicator from "./status-indicator";

interface AvatarProps {
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  className?: string;
  showStatus?: boolean;
  status?: "idle" | "loading" | "active";
  onClick?: () => void;
}

const sizeStyles = {
  sm: "w-8 h-8",
  md: "w-11 h-11", 
  lg: "w-16 h-16",
};

const statusPositions = {
  sm: "-bottom-0.5 -right-0.5 w-2.5 h-2.5",
  md: "-bottom-0.5 -right-0.5 w-3.5 h-3.5",
  lg: "-bottom-1 -right-1 w-4 h-4",
};

export default function Avatar({
  size = "md",
  children,
  className,
  showStatus = false,
  status = "idle",
  onClick,
}: AvatarProps) {
  return (
    <div className="relative">
      <div
        className={cn(
          "bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg",
          sizeStyles[size],
          onClick && "cursor-pointer hover:scale-105 transition-transform duration-200",
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
      {showStatus && (
        <div
          className={cn(
            "absolute bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center",
            statusPositions[size]
          )}
        >
          <StatusIndicator status={status} size={size === "lg" ? "md" : "sm"} />
        </div>
      )}
    </div>
  );
}