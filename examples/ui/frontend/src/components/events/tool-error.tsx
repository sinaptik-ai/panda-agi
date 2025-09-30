import React from "react";
import { UpgradeMessage } from "./tool-error-ui";
import PremiumUpgradeInvitation from "./tool-error-ui/premium-upgrade-invitation";
import {
  findToolErrorComponent,
  ToolErrorPayload,
} from "./tool-error-ui/tool-error-registry";

interface ToolErrorEventProps {
  payload?: ToolErrorPayload;
  openUpgradeModal?: () => void;
}

const ToolErrorEvent: React.FC<ToolErrorEventProps> = ({
  payload,
  openUpgradeModal,
}) => {
  if (!payload) return null;

  const { isUpgradeErrorMessage, type } = payload;

  // Always show premium upgrade invitation if it's an upgrade error or upgrade-required type
  if (isUpgradeErrorMessage || type === "upgrade_required") {
    return <PremiumUpgradeInvitation openUpgradeModal={openUpgradeModal} />;
  }

  // Find the appropriate component using the registry
  const ErrorComponent = findToolErrorComponent(payload);

  // Render the appropriate component
  return <ErrorComponent payload={payload} />;
};

export default ToolErrorEvent;
