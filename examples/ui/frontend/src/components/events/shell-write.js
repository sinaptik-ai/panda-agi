import React, { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

const ShellWriteEvent = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const sessionId = payload.id || "Unknown session";
    const input = payload.input || "";
    const truncateInput = (input, maxLength = 40) => {
      return input.length > maxLength
        ? `${input.substring(0, maxLength)}...`
        : input;
    };
    return `Writing to ${sessionId}: ${truncateInput(input)}`;
  };

  const renderExpandedContent = () => {
    return (
      <div className="mx-3 mb-4 bg-yellow-50 border border-yellow-200 rounded-md overflow-hidden">
        <div className="flex items-center px-3 py-2 bg-yellow-100 border-b border-yellow-200">
          <Terminal className="w-4 h-4 mr-2 text-yellow-600" />
          <span className="text-sm font-mono text-yellow-700">Shell Input</span>
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
  };

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          <Terminal className="w-3 h-3 text-yellow-600" />
          <span className="text-xs text-gray-500 truncate max-w-md">
            Writing to shell <strong>{getDisplayContent()}</strong>
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

export default ShellWriteEvent;
