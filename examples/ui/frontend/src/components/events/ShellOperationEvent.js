import React, { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

const ShellOperationEvent = ({ payload, eventType }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const command = payload.command || "Unknown command";

  const getEventDetails = (eventType) => {
    switch (eventType) {
      case "shell_exec":
        return {
          icon: <Terminal className="w-3 h-3 text-purple-600" />,
          action: "Executing command",
        };
      case "shell_view":
        return {
          icon: <Terminal className="w-3 h-3 text-gray-600" />,
          action: "Viewing output of command",
        };
      case "shell_write":
        return {
          icon: <Terminal className="w-3 h-3 text-yellow-600" />,
          action: "Writing to shell",
        };
      default:
        return {
          icon: <Terminal className="w-3 h-3 text-purple-600" />,
          action: "Shell operation",
        };
    }
  };

  const eventDetails = getEventDetails(eventType);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const truncateCommand = (cmd, maxLength = 50) => {
    return cmd.length > maxLength ? `${cmd.substring(0, maxLength)}...` : cmd;
  };

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {eventDetails.icon}
          <span className="text-xs text-gray-500 truncate max-w-md">
            {eventDetails.action} <strong>{truncateCommand(command)}</strong>
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
        <div className="overflow-hidden">
          <div className="mx-3 mb-4 bg-gray-900 text-white rounded-md overflow-hidden">
            <div className="flex items-center px-3 py-2 bg-gray-800 border-b border-gray-700">
              <Terminal className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-mono text-green-400">terminal</span>
            </div>
            <div className="p-3 font-mono text-sm">
              <div className="flex items-center mb-2">
                <span className="text-green-400 mr-2">$</span>
                <span className="text-white">{command}</span>
              </div>
              {payload.output && (
                <div className="text-gray-300 whitespace-pre-wrap break-words">
                  {String(payload.output)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShellOperationEvent;
