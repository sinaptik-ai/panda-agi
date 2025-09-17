import React from "react";
import UserFriendlyError from "./user-friendly-error";
import { ErrorMessageDisplay } from "./index";

interface WebVisitFailureProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    timestamp?: string | number;
  };
}

const WebVisitFailure: React.FC<WebVisitFailureProps> = ({ payload }) => {
  const { input_params, error, tool_name } = payload;
  const url = input_params?.url as string || "Unknown URL";

  return (
    <UserFriendlyError
      toolName={tool_name}
      error={error}
    >
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">URL:</div>
        <div 
          className="bg-gray-800 p-3 rounded-md font-mono text-sm text-blue-300 break-all"
          style={{
            wordBreak: 'break-all',
            overflowWrap: 'break-word'
          }}
        >
          {url}
        </div>
      </div>
      <ErrorMessageDisplay error={error} />
    </UserFriendlyError>
  );
};

export default WebVisitFailure; 