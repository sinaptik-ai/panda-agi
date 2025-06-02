import React from "react";
import { Activity } from "lucide-react";
import MessageCard from "../ui/message-card";

const WebSearchResultEvent = ({ payload }) => {
  if (!payload) return null;

  const resultCount = payload.length;
  const title = `Found ${resultCount} result${resultCount !== 1 ? "s" : ""}`;

  return (
    <MessageCard
      content={
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-sm text-gray-900">{title}</span>
          </div>
          <div className="mt-2">
            <div className="space-y-3">
              {payload.results.slice(0, 5).map((result, index) => (
                <div key={index} className="text-sm text-gray-600 pb-2">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium block mb-1"
                  >
                    {result.title}
                  </a>
                  <p className="text-xs text-green-700">{result.url}</p>
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
      }
      color="bg-orange-50 border-orange-300"
    />
  );
};

export default WebSearchResultEvent;
