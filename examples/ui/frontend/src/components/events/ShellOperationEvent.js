import React, { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

const ShellOperationEvent = ({ payload, eventType }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const getEventDetails = (eventType) => {
    switch (eventType) {
      case "shell_exec":
        return {
          icon: <Terminal className="w-3 h-3 text-purple-600" />,
          action: "Executing command",
        };
      case "shell_view":
        return {
          icon: <Terminal className="w-3 h-3 text-blue-600" />,
          action: "Managing process",
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

  const getDisplayContent = () => {
    if (eventType === "shell_view") {
      const processId = payload.id || "Unknown process";
      const action = payload.kill_process ? "Terminating" : "Viewing";
      return `${action} ${processId}`;
    } else if (eventType === "shell_write") {
      const sessionId = payload.id || "Unknown session";
      const input = payload.input || "";
      const truncateInput = (input, maxLength = 40) => {
        return input.length > maxLength
          ? `${input.substring(0, maxLength)}...`
          : input;
      };
      return `Writing to ${sessionId}: ${truncateInput(input)}`;
    } else {
      const command = payload.command || "Unknown command";
      const truncateCommand = (cmd, maxLength = 50) => {
        return cmd.length > maxLength
          ? `${cmd.substring(0, maxLength)}...`
          : cmd;
      };
      return truncateCommand(command);
    }
  };

  const renderExpandedContent = () => {
    if (eventType === "shell_view") {
      return (
        <div className="mx-3 mb-4 bg-blue-50 border border-blue-200 rounded-md overflow-hidden">
          <div className="flex items-center px-3 py-2 bg-blue-100 border-b border-blue-200">
            <Terminal className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm font-mono text-blue-700">
              Process Management
            </span>
          </div>
          <div className="p-3 font-mono text-sm">
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">Process ID:</span>
                <span className="text-gray-700">{payload.id || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">Action:</span>
                <span
                  className={`${
                    payload.kill_process ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {payload.kill_process ? "Kill Process" : "View Process"}
                </span>
              </div>
              {payload.wait_seconds !== undefined && (
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">Wait Time:</span>
                  <span className="text-gray-700">
                    {payload.wait_seconds
                      ? `${payload.wait_seconds} seconds`
                      : "No wait"}
                  </span>
                </div>
              )}
              {payload.output && (
                <div className="mt-3">
                  <div className="text-blue-600 mb-1">Output:</div>
                  <div className="text-gray-700 whitespace-pre-wrap break-words bg-white p-2 rounded border">
                    {String(payload.output)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (eventType === "shell_write") {
      return (
        <div className="mx-3 mb-4 bg-yellow-50 border border-yellow-200 rounded-md overflow-hidden">
          <div className="flex items-center px-3 py-2 bg-yellow-100 border-b border-yellow-200">
            <Terminal className="w-4 h-4 mr-2 text-yellow-600" />
            <span className="text-sm font-mono text-yellow-700">
              Shell Input
            </span>
          </div>
          <div className="p-3 font-mono text-sm">
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">Session ID:</span>
                <span className="text-gray-700">{payload.id || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">Press Enter:</span>
                <span
                  className={`${
                    payload.press_enter ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  {payload.press_enter ? "Yes" : "No"}
                </span>
              </div>
              {payload.input && (
                <div className="mt-3">
                  <div className="text-yellow-600 mb-1">Input:</div>
                  <div className="bg-gray-900 text-white p-2 rounded font-mono text-xs">
                    <div className="flex items-start">
                      <span className="text-green-400 mr-2">{">"}</span>
                      <span className="text-white whitespace-pre-wrap break-words">
                        {payload.input}
                        {payload.press_enter && (
                          <span className="text-green-400"> ⏎</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {payload.output && (
                <div className="mt-3">
                  <div className="text-yellow-600 mb-1">Output:</div>
                  <div className="text-gray-700 whitespace-pre-wrap break-words bg-white p-2 rounded border">
                    {String(payload.output)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      // Original terminal view for shell_exec
      const command = payload.command || "Unknown command";
      return (
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
      );
    }
  };

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {eventDetails.icon}
          <span className="text-xs text-gray-500 truncate max-w-md">
            {eventDetails.action} <strong>{getDisplayContent()}</strong>
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
    </>
  );
};

export default ShellOperationEvent;
