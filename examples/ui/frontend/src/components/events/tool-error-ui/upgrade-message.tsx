import React from "react";
import { AlertCircle } from "lucide-react";
import { PLATFORM_MODE } from "@/lib/config";

interface UpgradeMessageProps {
  openUpgradeModal?: () => void;
}

const UpgradeMessage: React.FC<UpgradeMessageProps> = ({ openUpgradeModal }) => {
  return (
    <div className="mx-3 mb-2">
      {!PLATFORM_MODE ? (
        <button
          onClick={() => window.open('https://agi.pandas-ai.com/upgrade', '_blank', 'noopener,noreferrer')}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Upgrade Required
        </button>
      ) : (
        openUpgradeModal && (
          <button
            onClick={openUpgradeModal}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Upgrade Required
          </button>
        )
      )}
    </div>
  );
};

export default UpgradeMessage; 