import React from "react";
import { Globe } from "lucide-react";

interface WebNavigationResultEventProps {
  payload?: {
    url?: string;
  };
}

const WebNavigationResultEvent: React.FC<WebNavigationResultEventProps> = ({ payload }) => {
  if (!payload) return null;

  const url = payload.url || "Unknown URL";

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl max-w-full">
        <Globe className="w-3 h-3 text-orange-600 flex-shrink-0" />
        <span className="text-xs text-slate-600 font-medium truncate">
          Visited{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-800 hover:text-slate-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit font-semibold"
          >
            {getDomain(url)}
          </a>
        </span>
      </div>
    </div>
  );
};

export default WebNavigationResultEvent;
