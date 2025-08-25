import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Crown, Settings, Menu, CreditCard } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/auth";
import { createCustomerPortal, getUserSubscription } from "@/lib/api/stripe";
import { PLATFORM_MODE, EXTERNAL_URLS } from "@/lib/config";

interface UserMenuProps {
  onUpgradeClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onUpgradeClick }) => {
  const router = useRouter();
  const [hasInvoices, setHasInvoices] = useState(false);

  useEffect(() => {
    const checkInvoicesAvailability = async () => {
      if (PLATFORM_MODE) {
        try {
          const subscription = await getUserSubscription();
          setHasInvoices(subscription.has_subscription);
        } catch (error) {
          console.error("Failed to check subscription:", error);
          setHasInvoices(false);
          toast.error("Failed to check subscription status");
        }
      }
    };

    checkInvoicesAvailability();
  }, []);

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
      // First check availability
      const availabilityCheck = await createCustomerPortal({
        return_url: window.location.href,
        check_availability: true,
      });
      
      // If availability check passes, get the actual portal URL
      const portalResponse = await createCustomerPortal({
        return_url: window.location.href,
      });
      
      window.open(portalResponse.url, "_blank");
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open billing portal. Please try again later.");
    }
  };

  const handleManagePlanClick = () => {
    // Redirect to manage plan page (you can customize this URL)
    window.open(EXTERNAL_URLS.DASHBOARD, "_blank");
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
      <DropdownMenuContent align="end" className="w-48">
        {/* Manage Plan option - always show */}
        <DropdownMenuItem onClick={handleUpgradeClick}>
          <Crown className="w-4 h-4 mr-2" />
          <span>Manage Plan</span>
        </DropdownMenuItem>

        {/* Platform mode specific options */}
        {PLATFORM_MODE && (
          <>
            {/* Invoices and Billing - only show if user has subscription */}
            {hasInvoices && (
              <DropdownMenuItem onClick={handleInvoicesClick}>
                <CreditCard className="w-4 h-4 mr-2" />
                <span>Invoices & Billing</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu; 