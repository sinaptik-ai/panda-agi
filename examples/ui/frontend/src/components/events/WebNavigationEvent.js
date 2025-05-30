import React from "react";
import { Globe } from "lucide-react";

const WebNavigationEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const url = payload.url || "Unknown URL";

  const getEventDetails = (eventType) => {
    switch (eventType) {
      case "web_navigation":
        return {
          icon: <Globe className="w-3 h-3 text-orange-600" />,
          action: "Navigating to",
        };
      case "web_navigation_result":
        return {
          icon: <Globe className="w-3 h-3 text-orange-600" />,
          action: "Visited",
        };
      default:
        return {
          icon: <Globe className="w-3 h-3 text-orange-600" />,
          action: "Web navigation",
        };
    }
  };

  const eventDetails = getEventDetails(eventType);

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
        {eventDetails.icon}
        <span className="text-xs text-gray-500 truncate max-w-md">
          {eventDetails.action}{" "}
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

export default WebNavigationEvent;
