import React from "react";
import { Sparkles } from "lucide-react";
import { PLATFORM_MODE } from "@/lib/config";
import { Button } from "@/components/ui/button";

interface PremiumUpgradeInvitationProps {
  openUpgradeModal?: () => void;
}

const PremiumUpgradeInvitation: React.FC<PremiumUpgradeInvitationProps> = ({
  openUpgradeModal,
}) => {
  return (
    <div className="inline-block ml-3 mb-3">
      <div className="bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              You&apos;re out of credits
            </h3>
            <p className="text-xs text-muted-foreground">Upgrade to continue</p>
          </div>

          {!PLATFORM_MODE ? (
            <Button
              onClick={() =>
                window.open(
                  "https://agi.pandas-ai.com/upgrade",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              size="sm"
              className="ml-2"
            >
              Upgrade
            </Button>
          ) : (
            openUpgradeModal && (
              <Button onClick={openUpgradeModal} size="sm" className="ml-2">
                Upgrade
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumUpgradeInvitation;
