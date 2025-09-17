import React, { JSX, useState } from "react";
import { ChevronRight, ListTodo } from "lucide-react";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

interface PlanningEventProps {
  payload?: {
    text?: string;
    timestamp?: string | number;
  };
}

const PlanningEvent: React.FC<PlanningEventProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload?.text) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const renderExpandedContent = (): JSX.Element => {
    return (
      <div className="mx-3 mb-4">
        <div className="p-3 text-sm">
          <MarkdownRenderer className="prose prose-sm max-w-none text-gray-600 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {payload.text || ""}
          </MarkdownRenderer>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-start mb-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
          <ListTodo className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-600 font-medium">Planned</span>
          <button
            onClick={toggleExpanded}
            className="flex items-center text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title={isExpanded ? "Hide plan" : "Show plan"}
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
        className={`grid transition-all duration-200 ease-in-out ${
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

export default PlanningEvent;
