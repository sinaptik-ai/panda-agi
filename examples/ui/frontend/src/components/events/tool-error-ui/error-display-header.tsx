import React from "react";
import { ChevronRight, BadgeAlert, AlertCircle } from "lucide-react";

interface ErrorDisplayHeaderProps {
  payload: {
    tool_name?: string;
    error?: string;
    isUpgradeErrorMessage?: boolean;
  };
  isExpanded: boolean;
  onToggleExpanded: () => void;
  showExpandButton?: boolean;
}

const ErrorDisplayHeader: React.FC<ErrorDisplayHeaderProps> = ({
  payload,
  isExpanded,
  onToggleExpanded,
  showExpandButton = true,
}) => {
  const getDisplayContent = () => {
    const toolName = payload.tool_name || "Unknown tool";
    const errorMessage = payload.error || "Something didn't work as expected";

    // Make error messages more user-friendly
    const friendlyMessage = getUserFriendlyErrorMessage(toolName, errorMessage);
    
    // Truncate error message for display
    const truncatedError =
      friendlyMessage.length > 120
        ? `${friendlyMessage.substring(0, 120)}...`
        : friendlyMessage;

    return { toolName, truncatedError };
  };

  const getUserFriendlyErrorMessage = (toolName: string, errorMessage: string): string => {
    const lowerToolName = toolName.toLowerCase();
    const lowerError = errorMessage.toLowerCase();

    // File operation errors
    if (lowerToolName.includes('file') || lowerToolName.includes('write') || lowerToolName.includes('read')) {
      if (lowerError.includes('permission') || lowerError.includes('access')) {
        return "Can't access this file or folder";
      }
      if (lowerError.includes('not found') || lowerError.includes('no such file')) {
        return "File or folder not found";
      }
      if (lowerError.includes('exists') || lowerError.includes('already')) {
        return "File already exists";
      }
      return "Couldn't complete the file operation";
    }

    // Shell/command errors
    if (lowerToolName.includes('shell') || lowerToolName.includes('command') || lowerToolName.includes('exec')) {
      if (lowerError.includes('not found') || lowerError.includes('command not found')) {
        return "Command not available";
      }
      if (lowerError.includes('permission')) {
        return "Don't have permission to run this command";
      }
      return "Command didn't complete successfully";
    }

    // Web/network errors
    if (lowerToolName.includes('web') || lowerToolName.includes('http') || lowerToolName.includes('url')) {
      if (lowerError.includes('timeout') || lowerError.includes('time out')) {
        return "Request took too long";
      }
      if (lowerError.includes('connection') || lowerError.includes('network')) {
        return "Couldn't connect to the website";
      }
      if (lowerError.includes('404') || lowerError.includes('not found')) {
        return "Page not found";
      }
      return "Couldn't load the webpage";
    }

    // Generic fallback for technical errors
    if (lowerError.includes('syntax error') || lowerError.includes('invalid')) {
      return "There's a problem with the format or syntax";
    }
    if (lowerError.includes('timeout')) {
      return "Operation took too long";
    }
    if (lowerError.includes('memory') || lowerError.includes('space')) {
      return "Not enough memory or storage space";
    }

    // If no specific pattern matches, return a generic friendly message
    return "Something didn't work as expected";
  };

  const { isUpgradeErrorMessage } = payload;
  const { truncatedError } = getDisplayContent();

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-orange-50/90 rounded-xl border border-orange-200/50">
        {isUpgradeErrorMessage ? (
          <AlertCircle className="w-3 h-3 text-orange-600" />
        ) : (
          <BadgeAlert className="w-3 h-3 text-orange-600" />
        )}
        <span className="text-xs text-orange-700 font-medium truncate max-w-md">
          <strong>{truncatedError}</strong>
        </span>
        {showExpandButton && (
          <button
            onClick={onToggleExpanded}
            className="flex items-center text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
        )}
      </div>
    </div>
  );
};

export default ErrorDisplayHeader;
