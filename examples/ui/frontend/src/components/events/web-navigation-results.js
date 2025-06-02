import React from "react";
import { Globe } from "lucide-react";

const WebNavigationResultEvent = ({ payload }) => {
  if (!payload) return null;

  const url = payload.url || "Unknown URL";

  const getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-3 py-2">
        <Globe className="w-3 h-3 text-orange-600" />
        <span className="text-xs text-gray-500 truncate max-w-md">
          Visited{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gray-700 hover:text-gray-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
          >
            {getDomain(url)}
          </a>
        </span>
      </div>
    </div>
  );
};

export default WebNavigationResultEvent;
