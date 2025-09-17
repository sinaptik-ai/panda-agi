import React, { JSX, useState } from "react";
import { ChevronRight, Zap } from "lucide-react";

interface ToolUseEventProps {
  payload?: {
    tool_name?: string;
    parameters?: Record<string, unknown>;
    result?: {
      data?: string | Record<string, unknown>;
    };
    timestamp?: string | number;
  };
}

const ToolUseEvent: React.FC<ToolUseEventProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const toolName = payload.tool_name || "Unknown tool";
    const params = payload.parameters || {};
    const paramsString = Object.entries(params)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
    return `Using tool: ${toolName}${
      paramsString ? ` with ${paramsString}` : ""
    }`;
  };

  const renderExpandedContent = (): JSX.Element => {
    const { result } = payload;

    return (
      <div className="mx-3 mb-4 bg-blue-50/90 border border-blue-200/50 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center px-3 py-2 bg-blue-100 border-b border-blue-200">
          <Zap className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm font-mono text-blue-700">
            Tool used: {payload.tool_name}
          </span>
        </div>
        <div className="p-3 font-mono text-sm space-y-2">
          {result && result.data && (
            <div>
              {typeof result.data === "string" ? (
                result.data
              ) : (
                <pre className="whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!payload.tool_name || payload.tool_name === "set_idle") return null;

  return (
    <>
      <div className="flex justify-start mb-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
          <Zap className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-slate-600 font-medium">
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

export default ToolUseEvent;
