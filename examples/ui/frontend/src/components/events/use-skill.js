import React, { useState } from "react";
import { ChevronRight, Zap } from "lucide-react";

const SkillUseEvent = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const skillName = payload.skill_name || "Unknown Skill";
    const params = payload.parameters || {};
    const paramsString = Object.entries(params)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
    return `Using skill: ${skillName}${
      paramsString ? ` with ${paramsString}` : ""
    }`;
  };

  const renderExpandedContent = () => {
    const { skill_name, parameters, result, timestamp } = payload;

    return (
      <div className="mx-3 mb-4 bg-blue-50 border border-blue-200 rounded-md overflow-hidden">
        <div className="flex items-center px-3 py-2 bg-blue-100 border-b border-blue-200">
          <Zap className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm font-mono text-blue-700">Skill used</span>
        </div>
        <div className="p-3 font-mono text-sm space-y-2">
          {result && (
            <div>
              {result["data"]}
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
          <Zap className="w-3 h-3 text-blue-600" />
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
    </>
  );
};

export default SkillUseEvent;
