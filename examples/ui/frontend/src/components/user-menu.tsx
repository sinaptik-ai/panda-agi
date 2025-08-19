import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Crown, Settings, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/auth";
import { PLATFORM_MODE } from "@/lib/config";

interface UserMenuProps {
  onUpgradeClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onUpgradeClick }) => {
  const router = useRouter();

  const handleUpgradeClick = () => {
    if (PLATFORM_MODE) {
      // In platform mode, open the upgrade modal
      onUpgradeClick();
    } else {
      // In non-platform mode, redirect to external upgrade page
      window.open("https://agi.pandas-ai.com/upgrade", "_blank");
    }
  };

  const handleManagePlanClick = () => {
    // Redirect to manage plan page (you can customize this URL)
    window.open("https://agi.pandasai.com/dashboard", "_blank");
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
        {/* Upgrade option - always show */}
        <DropdownMenuItem onClick={handleUpgradeClick}>
          <Crown className="w-4 h-4 mr-2" />
          <span>Upgrade</span>
        </DropdownMenuItem>

        {/* Platform mode specific options */}
        {PLATFORM_MODE && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleManagePlanClick}>
              <Settings className="w-4 h-4 mr-2" />
              <span>Manage Plan</span>
            </DropdownMenuItem>
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