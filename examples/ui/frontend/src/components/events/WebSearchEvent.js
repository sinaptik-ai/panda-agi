import React from "react";
import { Globe } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";

const WebSearchEvent = ({ payload, eventType }) => {
  if (!payload || eventType !== "web_search") return null;

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Globe className="w-4 h-4 text-orange-500" />
        <span className="font-medium text-sm text-gray-900">
          Searching on the web...
        </span>
      </div>
      <div className="mt-2">
        <MarkdownRenderer>{payload.query}</MarkdownRenderer>
      </div>
    </div>
  );

  return {
    color: "bg-orange-50 border-orange-200",
    content,
  };
};

export default WebSearchEvent;
