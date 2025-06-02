import React from "react";
import { Globe, Search } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import MessageCard from "../ui/message-card";

const WebSearchEvent = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  return (
    <MessageCard
      content={
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-sm text-gray-900">
              Searching on the web...
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center p-2 bg-white border border-gray-300 rounded-lg shadow-sm">
              <Search className="w-4 h-4 text-gray-500 mr-2" />
              <div className="flex-grow">
                <MarkdownRenderer onPreviewClick={onPreviewClick}>
                  {payload.query}
                </MarkdownRenderer>
              </div>
            </div>
          </div>
        </div>
      }
      color="bg-orange-50 border-orange-300"
    />
  );
};

export default WebSearchEvent;
