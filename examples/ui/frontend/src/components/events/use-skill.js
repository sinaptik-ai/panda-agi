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
    return `Skill used: ${skillName}`;
  };

  const renderExpandedContent = () => {
    const { skill_name, parameters, result, timestamp } = payload;

    return (
      <div className="mx-3 mb-4 bg-blue-50 border border-blue-200 rounded-md overflow-hidden">
        <div className="flex items-center px-3 py-2 bg-blue-100 border-b border-blue-200">
          <Zap className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm font-mono text-blue-700">Skill Used</span>
        </div>
        <div className="p-3 font-mono text-sm space-y-2">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">Skill:</span>
            <span className="text-gray-700">{skill_name}</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">Timestamp:</span>
            <span className="text-gray-700">{timestamp}</span>
          </div>

          {parameters && (
            <div>
              <div className="text-blue-600 mb-1">Parameters:</div>
              <div className="bg-gray-100 p-2 rounded text-gray-800 text-xs">
                <pre>{JSON.stringify(parameters, null, 2)}</pre>
              </div>
            </div>
          )}

          {result && (
            <div>
              <div className="text-blue-600 mb-1">Result:</div>
              <div className="bg-white p-2 rounded border text-gray-800 text-xs whitespace-pre-wrap break-words">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
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
