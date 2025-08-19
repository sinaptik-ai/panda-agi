import React, { JSX, useState } from "react";
import { ChevronRight, AlertTriangle, AlertCircle } from "lucide-react";
import { PLATFORM_MODE } from "@/lib/config";

interface ToolErrorEventProps {
  payload?: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    isUpgradeErrorMessage?: boolean;
    timestamp?: string | number;
  };
  openUpgradeModal?: () => void;
}

const ToolErrorEvent: React.FC<ToolErrorEventProps> = ({ payload, openUpgradeModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const toolName = payload.tool_name || "Unknown tool";
    const errorMessage = payload.error || "Unknown error occurred";
    
    // Truncate error message for display
    const truncatedError = errorMessage.length > 100 
      ? `${errorMessage.substring(0, 100)}...` 
      : errorMessage;
    
    return `${toolName} failed: ${truncatedError}`;
  };

  const renderExpandedContent = (): JSX.Element => {
    const { tool_name, input_params, error } = payload;

    return (
      <div className="mx-3 mb-4 bg-red-50 border border-red-200 rounded-md overflow-hidden">
        <div className="flex items-center px-3 py-2 bg-red-100 border-b border-red-200">
          <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
          <span className="text-sm font-mono text-red-700">
            Tool Error: {tool_name || "Unknown tool"}
          </span>
        </div>
        <div className="p-3 font-mono text-sm space-y-3">
          {error && (
            <div>
              <div className="font-semibold text-red-700 mb-1">Error:</div>
              <div className="text-red-600 whitespace-pre-wrap">{error}</div>
            </div>
          )}
          {input_params && Object.keys(input_params).length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 mb-1">Input Parameters:</div>
              <pre className="text-gray-600 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(input_params, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isUpgradeError = payload.isUpgradeErrorMessage;

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {isUpgradeError ? (
            <AlertCircle className="w-3 h-3 text-orange-600" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-red-600" />
          )}
          <span className="text-xs text-gray-500 truncate max-w-md">
            <strong>{getDisplayContent()}</strong>
          </span>
          <button
            onClick={toggleExpanded}
            className="flex items-center py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Hide details" : "Show details"}
          >
            <div
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
            >
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{renderExpandedContent()}</div>
      </div>

      {/* Upgrade modal trigger for upgrade errors */}
      {isUpgradeError && (
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
      )}
    </>
  );
};

export default ToolErrorEvent; 