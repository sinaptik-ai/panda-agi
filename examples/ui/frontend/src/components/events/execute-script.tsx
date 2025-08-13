import React, { useState } from "react";
import { ChevronRight, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ExecuteScriptEventProps {
  payload?: {
    code?: string;
    language?: string;
    output?: string;
  };
}

const ExecuteScriptEvent: React.FC<ExecuteScriptEventProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const code = payload.code || "Unknown script";
    const truncateCode = (code: string, maxLength = 50) => {
      return code.length > maxLength ? `${code.substring(0, maxLength)}...` : code;
    };
    return truncateCode(code);
  };

  const getLanguage = (language?: string): string => {
    if (!language) return "javascript";
    
    const languageMap: Record<string, string> = {
      "python": "python",
      "javascript": "javascript",
      "js": "javascript",
      "typescript": "typescript",
      "ts": "typescript",
      "bash": "bash",
      "shell": "bash",
      "sh": "bash",
      "php": "php",
      "java": "java",
      "cpp": "cpp",
      "c++": "cpp",
      "c": "c",
      "go": "go",
      "rust": "rust",
      "ruby": "ruby",
      "sql": "sql",
      "html": "html",
      "css": "css",
      "json": "json",
      "yaml": "yaml",
      "yml": "yaml",
      "markdown": "markdown",
      "md": "markdown"
    };
    
    return languageMap[language.toLowerCase()] || "javascript";
  };

  const renderExpandedContent = () => {
    const code = payload.code || "Unknown script";
    const language = getLanguage(payload.language);
    
    return (
      <div className="mx-3 mb-4 bg-gray-900 text-white rounded-md overflow-hidden">
        <div className="flex items-center px-3 py-2 bg-gray-800 border-b border-gray-700">
          <Code className="w-4 h-4 mr-2 text-blue-400" />
          <span className="text-sm font-mono text-blue-400">{language}</span>
        </div>
        <div className="p-3">
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Code:</div>
            <div 
              className="max-h-64 overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4B5563 #1F2937'
              }}
            >
              <SyntaxHighlighter
                language={language}
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
          {payload.output && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Output:</div>
              <div 
                className="bg-gray-800 p-3 rounded-md font-mono text-sm text-gray-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#4B5563 #1F2937'
                }}
              >
                {String(payload.output)}
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
          <Code className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-gray-500 truncate max-w-md">
            Executing {payload.language || "script"} <strong>{getDisplayContent()}</strong>
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

export default ExecuteScriptEvent; 