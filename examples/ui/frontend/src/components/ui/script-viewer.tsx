import React, { useState } from "react";
import { ChevronRight, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getLanguage } from "@/lib/utils";

interface ScriptViewerProps {
  code?: string;
  language?: string;
  output?: string;
  title?: string;
  showHeader?: boolean;
  maxHeight?: string;
  className?: string;
}

const ScriptViewer: React.FC<ScriptViewerProps> = ({
  code = "Unknown script",
  language,
  output,
  title,
  showHeader = true,
  maxHeight = "max-h-64",
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const truncateCode = (code: string, maxLength = 50) => {
      return code.length > maxLength
        ? `${code.substring(0, maxLength)}...`
        : code;
    };
    return truncateCode(code);
  };

  const renderExpandedContent = () => {
    const detectedLanguage = getLanguage(language);

    return (
      <div
        className={`mx-3 mb-4 bg-slate-900 text-white rounded-xl overflow-hidden shadow-sm border border-slate-200/20 ${className}`}
      >
        {showHeader && (
          <div className="flex items-center px-3 py-2 bg-gray-800 border-b border-gray-700">
            <Code className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-sm font-mono text-blue-400">
              {detectedLanguage}
            </span>
          </div>
        )}
        <div className="p-3">
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Code:</div>
            <div
              className={`${maxHeight} overflow-y-auto`}
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#4B5563 #1F2937",
              }}
            >
              <SyntaxHighlighter
                language={detectedLanguage}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
                showLineNumbers
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
          {output && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Output:</div>
              <div
                className={`bg-gray-800 p-3 rounded-md font-mono text-sm text-gray-300 whitespace-pre-wrap break-words ${maxHeight} overflow-y-auto`}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#4B5563 #1F2937",
                }}
              >
                {String(output)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-start mb-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
          <Code className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-slate-600 font-medium">
            {title || `Executing ${language || "script"}`}{" "}
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

export default ScriptViewer;
