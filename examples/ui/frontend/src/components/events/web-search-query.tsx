import React from "react";
import { Globe, Search } from "lucide-react";
import MarkdownRenderer from "../ui/markdown-renderer";
import MessageCard from "@/components/ui/message-card";

interface WebSearchEventProps {
  payload?: {
    query: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
}

const WebSearchEvent: React.FC<WebSearchEventProps> = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  return (
    <MessageCard
      content={
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Globe className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-sm text-slate-900">
              Searching the web
            </span>
          </div>
          <div className="flex items-center p-3 bg-slate-50/80 rounded-xl border border-slate-200/50">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <div className="flex-grow text-sm font-medium text-slate-700">
              <MarkdownRenderer onPreviewClick={onPreviewClick}>
                {payload.query}
              </MarkdownRenderer>
            </div>
          </div>
        </div>
      }
      color="bg-orange-50/90 border border-orange-200/50"
    />
  );
};

export default WebSearchEvent;
