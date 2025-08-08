import React, { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

interface ShellExecEventProps {
  payload?: {
    command?: string;
    output?: string;
  };
}

const ShellExecEvent: React.FC<ShellExecEventProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const command = payload.command || "Unknown command";
    const truncateCommand = (cmd: string, maxLength = 50) => {
      return cmd.length > maxLength ? `${cmd.substring(0, maxLength)}...` : cmd;
    };
    return truncateCommand(command);
  };

  const renderExpandedContent = () => {
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
            <div 
              className="text-gray-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4B5563 #1F2937'
              }}
            >
              {String(payload.output)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          <Terminal className="w-3 h-3 text-purple-600" />
          <span className="text-xs text-gray-500 truncate max-w-md">
            Executing command <strong>{getDisplayContent()}</strong>
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

export default ShellExecEvent;
