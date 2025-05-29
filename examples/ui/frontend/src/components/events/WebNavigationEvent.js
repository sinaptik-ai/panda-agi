import React from "react";
import { Globe } from "lucide-react";

const WebNavigationEvent = ({ payload, eventType }) => {
  if (!payload) return null;

  const getEventInfo = (eventType) => {
    switch (eventType) {
      case "web_navigation":
        return {
          icon: <Globe className="w-4 h-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-300",
          title: "Web Navigation",
        };
      case "web_navigation_result":
        return {
          icon: <Globe className="w-4 h-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-400",
          title: "Web Navigation Result",
        };
      default:
        return {
          icon: <Globe className="w-4 h-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-300",
          title: "Web Navigation",
        };
    }
  };

  const eventInfo = getEventInfo(eventType);

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        {eventInfo.icon}
        <span className="font-medium text-sm text-gray-900">
          {eventInfo.title}
        </span>
      </div>
      <div className="mt-2">
        <p className="text-sm text-gray-700 font-medium">URL:</p>
        <div className="mt-1">
          <a
            href={payload.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            {payload.url}
          </a>
        </div>
        {payload.content && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 font-medium">
              Content Preview:
            </p>
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              {String(payload.content).slice(0, 200)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return {
    color: eventInfo.color,
    content,
  };
};

export default WebNavigationEvent;
