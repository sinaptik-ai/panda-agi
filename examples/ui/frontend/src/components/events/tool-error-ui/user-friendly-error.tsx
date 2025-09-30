import React, { useState, useMemo } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface UserFriendlyErrorProps {
  toolName?: string;
  error?: string;
  showExpandButton?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const UserFriendlyError: React.FC<UserFriendlyErrorProps> = ({
  toolName,
  error,
  showExpandButton = true,
  className = "",
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getUserFriendlyErrorMessage = (
    toolName: string = "",
    errorMessage: string = ""
  ): string => {
    const lowerToolName = toolName.toLowerCase();
    const lowerError = errorMessage.toLowerCase();

    // File operation errors
    if (
      lowerToolName.includes("file") ||
      lowerToolName.includes("write") ||
      lowerToolName.includes("read")
    ) {
      if (lowerError.includes("permission") || lowerError.includes("access")) {
        return "Can't access this file or folder";
      }
      if (
        (lowerError.includes('not found') && !lowerError.includes('content validation failed')) ||
        lowerError.includes("no such file")
      ) {
        return "File or folder not found";
      }
      if (lowerError.includes("exists") || lowerError.includes("already")) {
        return "File already exists";
      }
      return "Couldn't complete the file operation";
    }

    // Shell/command errors
    if (
      lowerToolName.includes("shell") ||
      lowerToolName.includes("command") ||
      lowerToolName.includes("exec")
    ) {
      if (
        lowerError.includes("not found") ||
        lowerError.includes("command not found")
      ) {
        return "Command not available";
      }
      if (lowerError.includes("permission")) {
        return "Don't have permission to run this command";
      }
      return "Command didn't complete successfully";
    }

    // Web/network errors
    if (
      lowerToolName.includes("web") ||
      lowerToolName.includes("http") ||
      lowerToolName.includes("url")
    ) {
      if (lowerError.includes("timeout") || lowerError.includes("time out")) {
        return "Request took too long";
      }
      if (lowerError.includes("connection") || lowerError.includes("network")) {
        return "Couldn't connect to the website";
      }
      if (lowerError.includes("404") || lowerError.includes("not found")) {
        return "Page not found";
      }
      return "Couldn't load the webpage";
    }

    // Generic fallback for technical errors
    if (lowerError.includes("syntax error") || lowerError.includes("invalid")) {
      return "There's a problem with the format or syntax";
    }
    if (lowerError.includes("timeout")) {
      return "Operation took too long";
    }
    if (lowerError.includes("memory") || lowerError.includes("space")) {
      return "Not enough memory or storage space";
    }

    // If no specific pattern matches, return a generic friendly message
    return "Something didn't work as expected";
  };

  const getDetailedErrorMessage = () => {
    const errorMessage = error || "Something didn't work as expected";
    return getUserFriendlyErrorMessage(toolName, errorMessage);
  };

  const detailedError = getDetailedErrorMessage();

  const displayMessage = useMemo(() => {
    const problemParts = [
      "That didn't work",
      "Hit a small bump",
      "Something went sideways",
      "That didn't go as expected",
      "Ran into an issue",
      "That approach didn't pan out",
      "Encountered a hiccup",
      "That didn't work out",
    ];

    const connectors = [
      ", but no worries",
      ", but I'm on it",
      ", but I've got this",
      ", but don't worry",
      ", but I'm handling it",
      ", but no problem",
    ];

    const solutions = [
      "trying another way.",
      "switching approaches.",
      "I've got backup plans.",
      "adapting my strategy.",
      "already working on a solution.",
      "trying something else.",
      "pivoting to a different method.",
      "course correcting now.",
      "exploring other options.",
      "adjusting my approach.",
    ];

    const randomProblem =
      problemParts[Math.floor(Math.random() * problemParts.length)];
    const randomConnector =
      connectors[Math.floor(Math.random() * connectors.length)];
    const randomSolution =
      solutions[Math.floor(Math.random() * solutions.length)];

    return `${randomProblem}${randomConnector}, ${randomSolution}`;
  }, []); // Empty dependency array means this only runs once when component mounts

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex justify-start mb-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50/90 rounded-xl border border-gray-200/50">
          <AlertTriangle className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-700 font-medium truncate max-w-md">
            {displayMessage}
          </span>
          {showExpandButton && (children || detailedError) && (
            <button
              onClick={toggleExpanded}
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

      {/* Expandable Content */}
      {(children || detailedError) && (
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mx-3 mb-4 bg-slate-900 text-white rounded-xl overflow-hidden shadow-sm border border-gray-200/20">
              <div className="p-3">
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">
                    What happened:
                  </div>
                  <div className="text-sm text-gray-200">{detailedError}</div>
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFriendlyError;
