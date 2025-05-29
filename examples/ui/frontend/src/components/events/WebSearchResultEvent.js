import React from "react";
import { Activity } from "lucide-react";

const WebSearchResultEvent = ({ payload, eventType }) => {
  if (!payload || eventType !== "web_search_result" || !Array.isArray(payload))
    return null;

  const resultCount = payload.length;
  const title = `Found ${resultCount} result${resultCount !== 1 ? "s" : ""}`;

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Activity className="w-4 h-4 text-orange-600" />
        <span className="font-medium text-sm text-gray-900">{title}</span>
      </div>
      <div className="mt-2">
        <div className="space-y-1">
          {payload.slice(0, 5).map((result, index) => (
            <div
              key={index}
              className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {result.title}
              </a>
              <p className="text-xs text-gray-500 mt-1">{result.url}</p>
            </div>
          ))}
          {payload.length > 5 && (
            <p className="text-xs text-gray-500 mt-1">
              ... and {payload.length - 5} more results
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return {
    color: "bg-orange-50 border-orange-300",
    content,
  };
};

export default WebSearchResultEvent;
