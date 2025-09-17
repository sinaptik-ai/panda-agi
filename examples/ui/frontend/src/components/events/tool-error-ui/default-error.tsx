import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import UserFriendlyError from "./user-friendly-error";
import { ErrorMessageDisplay } from "./index";

interface DefaultErrorProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    isUpgradeErrorMessage?: boolean;
    timestamp?: string | number;
  };
}

const DefaultError: React.FC<DefaultErrorProps> = ({ payload }) => {
  const { input_params, error, tool_name } = payload;

  return (
    <UserFriendlyError
      toolName={tool_name}
      error={error}
    >
      {input_params && Object.keys(input_params).length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Input Parameters:</div>
          <div 
            className="max-h-64 overflow-y-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#4B5563 #1F2937'
            }}
          >
            <SyntaxHighlighter
              language="json"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
              showLineNumbers
            >
              {JSON.stringify(input_params, null, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
      <ErrorMessageDisplay error={error} />
    </UserFriendlyError>
  );
};

export default DefaultError; 