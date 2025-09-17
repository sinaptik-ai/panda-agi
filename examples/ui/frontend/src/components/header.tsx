"use client";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Plus, Coins, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import UserMenu from "@/components/user-menu";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { useGlobalModals } from "@/contexts/global-modals-context";
import { getUserCredits, UserCreditsResponse } from "@/lib/api/stripe";
import { PLATFORM_MODE } from "@/lib/config";
import { useState, useEffect, useCallback } from "react";

export interface HeaderRef {
  refreshCredits: () => void;
  clearCredits: () => void;
}

interface HeaderProps {
  isInitialLoading?: boolean;
  isConnected?: boolean;
  sidebarOpen?: boolean;
  sidebarWidth?: number;
  // Custom content props
  title?: string;
  subtitle?: string;
  // Styling props
  variant?: "default" | "page";
  // Optional overrides for default behavior
  onNewConversation?: () => void;
}

const Header = forwardRef<HeaderRef, HeaderProps>(
  (
    {
      isInitialLoading = false,
      isConnected = false,
      sidebarOpen = false,
      sidebarWidth = 0,
      onNewConversation,
      title,
      subtitle,
      variant = "default",
    },
    ref
  ) => {
    const router = useRouter();
    const { handleShowLogout } = useLogout();
    const { showUpgradeModal, showLoginModal } = useGlobalModals();
    const { isAuthenticated } = useAuth();
    const [isCompact, setIsCompact] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    // Default handlers
    const handleNewConversation = onNewConversation || (() => router.push("/"));
    const handleUpgradeClick = showUpgradeModal;
    const handleShowLogin = showLoginModal;
    const handleLogout = handleShowLogout;

    // Credits state - managed internally with localStorage caching
    const [userCredits, setUserCredits] = useState<UserCreditsResponse | null>(
      () => {
        // Initialize with cached credits from localStorage if available
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("user_credits");
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch {
              // If parsing fails, remove the corrupted data
              localStorage.removeItem("user_credits");
            }
          }
        }
        return null;
      }
    );
    const [creditsLoading, setCreditsLoading] = useState(false);
    const [creditsError, setCreditsError] = useState<string | null>(null);

    // Function to fetch user credits with localStorage caching
    const fetchUserCredits = async (forceRefresh = false) => {
      // Only fetch credits if authenticated and in platform mode
      if (!PLATFORM_MODE) {
        return;
      }

      if (!isAuthenticated && !forceRefresh) {
        // Don't clear credits immediately on auth state change
        // They might be temporarily unauthenticated during token refresh
        return;
      }

      setCreditsLoading(true);
      setCreditsError(null);

      try {
        const creditsData = await getUserCredits();

        // Ensure we have valid credits data before setting
        if (creditsData && typeof creditsData.credits_left !== "undefined") {
          setUserCredits(creditsData);

          // Cache the fresh credits data in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("user_credits", JSON.stringify(creditsData));
          }

          setCreditsError(null);
        } else {
          setCreditsError("Invalid credits data received");
        }
      } catch (err) {
        console.error("Failed to fetch credits:", err);
        setCreditsError(
          err instanceof Error ? err.message : "Failed to fetch credits"
        );

        // Keep existing userCredits from cache even if refresh fails
      } finally {
        setCreditsLoading(false);
      }
    };

    // Fetch credits when authentication status changes
    useEffect(() => {
      if (isAuthenticated) {
        // Only fetch when becoming authenticated
        fetchUserCredits();
      }
      // Don't immediately clear on logout - let the logout handler do that explicitly
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    // Function to explicitly clear credits (for when user actually logs out)
    const clearCredits = useCallback(() => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user_credits");
      }
      setUserCredits(null);
      setCreditsError(null);
    }, []);

    // Function to manually refresh credits (useful for after purchases/usage)
    const refreshCredits = useCallback(() => {
      fetchUserCredits(true); // Force refresh even if temporarily not authenticated
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Expose refresh and clear functions via ref for parent components
    useImperativeHandle(
      ref,
      () => ({
        refreshCredits,
        clearCredits,
      }),
      [refreshCredits, clearCredits]
    );

    // Expose refresh function via window object for external access if needed
    useEffect(() => {
      if (typeof window !== "undefined") {
        (
          window as typeof window & { refreshCredits?: () => void }
        ).refreshCredits = refreshCredits;
      }
    }, [refreshCredits]);

    useEffect(() => {
      const checkHeaderWidth = () => {
        if (headerRef.current) {
          const headerWidth = headerRef.current.offsetWidth;
          setIsCompact(headerWidth < 500);
        }
      };

      // Check on mount
      checkHeaderWidth();

      // Check on resize and when sidebar changes
      const resizeObserver = new ResizeObserver(checkHeaderWidth);
      if (headerRef.current) {
        resizeObserver.observe(headerRef.current);
      }

      window.addEventListener('resize', checkHeaderWidth);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', checkHeaderWidth);
      };
    }, []);

    return (
      <TooltipProvider>
        <div
          ref={headerRef}
          className={`glass-header p-6 fixed top-0 left-0 right-0 z-10 backdrop-blur-3xl bg-white/60 ${
            variant === "page" ? "border-b border-border/20" : ""
          }`}
          style={{
            width:
              sidebarOpen && sidebarWidth > 0
                ? `calc(100vw - ${sidebarWidth}px)`
                : "100vw",
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar
                showStatus={!title}
                status={
                  isInitialLoading ? "loading" : isConnected ? "active" : "idle"
                }
                onClick={() => router.push("/")}
              >
                <span className="text-xl select-none">🐼</span>
              </Avatar>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {title || "Annie"}
                </h1>
                <p className="hidden sm:block text-xs text-slate-600 font-medium">
                  {subtitle || (isConnected ? "Thinking..." : "Ready to help")}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Credits Display - Hidden on mobile or when compact, shown on desktop */}
              {PLATFORM_MODE && isAuthenticated && userCredits && !isCompact && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-md transition-all duration-300 cursor-pointer ${
                        creditsError
                          ? "bg-destructive/10 hover:bg-destructive/20"
                          : creditsLoading
                          ? "bg-muted/70 scale-[0.98] opacity-80"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={handleUpgradeClick}
                    >
                      <Coins
                        className={`w-3.5 h-3.5 transition-all duration-500 ${
                          creditsError
                            ? "text-destructive"
                            : creditsLoading
                            ? "text-amber-500 animate-spin"
                            : "text-amber-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium transition-all duration-300 ${
                          creditsError
                            ? "text-destructive"
                            : creditsLoading
                            ? "opacity-75"
                            : ""
                        }`}
                      >
                        {userCredits.credits_left}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {creditsError
                        ? "Error refreshing credits - Click to manage plan"
                        : creditsLoading
                        ? "Refreshing credits..."
                        : "Credits - Click to manage plan"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {isAuthenticated && (
                <Button
                  onClick={handleNewConversation}
                  variant="default"
                  className={`px-2 py-1.5 sm:px-5 sm:py-2.5 h-8 sm:h-auto text-sm rounded-lg ${
                    isCompact ? "px-2 py-1.5" : ""
                  }`}
                >
                  <Edit3 className={`w-4 h-4 ${isCompact ? "" : "sm:hidden"}`} />
                  <Plus className={`${isCompact ? "hidden" : "hidden sm:inline"} w-4 h-4`} />
                  <span className={`${isCompact ? "hidden" : "hidden sm:inline"}`}>New Chat</span>
                </Button>
              )}

              <UserMenu
                onUpgradeClick={handleUpgradeClick}
                onShowLogin={handleShowLogin}
                onShowLogout={handleLogout}
                userCredits={userCredits}
                creditsLoading={creditsLoading}
                creditsError={creditsError}
              />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }
);

Header.displayName = "Header";

export default Header;
