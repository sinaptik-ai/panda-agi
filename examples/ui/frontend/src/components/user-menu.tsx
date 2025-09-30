import React, { useState, useEffect } from "react";
import { LogOut, Crown, Menu, CreditCard, LogIn, Sparkles, Coins } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { isAuthRequired } from "@/lib/api/auth";
import { createCustomerPortal, getUserSubscription } from "@/lib/api/stripe";
import { PLATFORM_MODE, EXTERNAL_URLS } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";

interface UserMenuProps {
  onUpgradeClick: () => void;
  onShowLogin?: () => void;
  onShowLogout?: () => void;
  userCredits?: {
    credits_left: number;
  } | null;
  creditsLoading?: boolean;
  creditsError?: string | null;
}

const UserMenu: React.FC<UserMenuProps> = ({
  onUpgradeClick,
  onShowLogin,
  onShowLogout,
  userCredits,
  creditsLoading,
  creditsError,
}) => {
  const [hasInvoices, setHasInvoices] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkInvoicesAvailability = async () => {
      // Only check subscription if authenticated and in platform mode
      if (PLATFORM_MODE && isAuthenticated) {
        try {
          const subscription = await getUserSubscription();
          setHasInvoices(subscription.has_subscription);
        } catch (error) {
          console.error("Failed to check subscription:", error);
          setHasInvoices(false);
          // Only show toast if user is authenticated (avoid showing errors for unauthenticated users)
          if (isAuthenticated) {
            toast.error("Failed to check subscription status");
          }
        }
      } else {
        setHasInvoices(false);
      }
    };

    checkInvoicesAvailability();
  }, [isAuthenticated]); // Re-run when authentication status changes

  const handleUpgradeClick = () => {
    if (PLATFORM_MODE) {
      // In platform mode, open the upgrade modal
      onUpgradeClick();
    } else {
      // In non-platform mode, redirect to external upgrade page
      window.open(EXTERNAL_URLS.UPGRADE, "_blank");
    }
  };

  const handleInvoicesClick = async () => {
    try {
      // Get the actual portal URL
      const portalResponse = await createCustomerPortal({
        return_url: window.location.href,
      });

      window.open(portalResponse.url, "_blank");
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open billing portal. Please try again later.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[calc(100vw-1rem)] sm:w-52 mx-2 sm:mx-0 border-0 shadow-xl bg-white rounded-xl p-1"
        sideOffset={8}
      >
        {!isAuthenticated && isAuthRequired() ? (
          // Show only login option when not authenticated
          <DropdownMenuItem 
            onClick={onShowLogin}
            className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <LogIn className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-slate-900">Login</span>
          </DropdownMenuItem>
        ) : (
          <>
            {/* Credits Display - Only show on mobile when authenticated and credits available */}
            {PLATFORM_MODE && isAuthenticated && userCredits && (
              <div className="sm:hidden">
                <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg mb-1">
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-slate-600">Credits</span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {creditsLoading ? "..." : userCredits?.credits_left || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Creations link - show as first option */}
            <DropdownMenuItem
              onClick={() => (window.location.href = "/creations")}
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-900">My creations</span>
            </DropdownMenuItem>

            {/* Manage Plan option - show when authenticated or auth not required */}
            <DropdownMenuItem 
              onClick={handleUpgradeClick}
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Crown className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-900">Manage Plan</span>
            </DropdownMenuItem>

            {/* Platform mode specific options */}
            {PLATFORM_MODE && isAuthenticated && (
              <>
                {/* Invoices and Billing - only show if user has subscription */}
                {hasInvoices && (
                  <DropdownMenuItem 
                    onClick={handleInvoicesClick}
                    className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    <span className="font-medium text-slate-900">Invoices & Billing</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    if (onShowLogout) {
                      onShowLogout();
                    }
                  }}
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-600" />
                  <span className="font-medium text-slate-900">Logout</span>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
