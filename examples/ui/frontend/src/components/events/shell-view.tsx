import React, { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

interface ShellViewEventProps {
  payload?: {
    id?: string;
    kill_process?: boolean;
    wait_seconds?: number;
    output?: string;
  };
}

const ShellViewEvent: React.FC<ShellViewEventProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const processId = payload.id || "Unknown process";
    const action = payload.kill_process ? "terminate" : "check";
    return `${action} ${processId}`;
  };

  const renderExpandedContent = () => {
    return (
      <div className="mx-3 mb-4 bg-blue-50/90 border border-blue-200/50 rounded-xl overflow-hidden shadow-sm">
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
  };

  return (
    <>
      <div className="flex justify-start mb-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
          <Terminal className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-slate-600 font-medium">
            Managing process{" "}
            <strong className="text-slate-800">{getDisplayContent()}</strong>
          </span>
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

export default ShellViewEvent;
