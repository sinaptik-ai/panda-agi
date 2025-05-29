import React from "react";
import { Globe, Eye } from "lucide-react";

const WebNavigationEvent = ({ payload, eventType, onPreviewClick }) => {
  if (!payload) return null;

  const getEventInfo = (eventType) => {
    switch (eventType) {
      case "web_navigation":
        return {
          icon: <Globe className="w-4 h-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-300",
          title: "Navigating to page...",
        };
      case "web_navigation_result":
        return {
          icon: <Globe className="w-4 h-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-400",
          title: "Page visited",
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

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      onPreviewClick({
        url: payload.url,
        content: payload.content,
        title: `Preview: ${new URL(payload.url).hostname}`,
      });
    }
  };

  const content = (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        {eventInfo.icon}
        <span className="font-medium text-sm text-gray-900">
          {eventInfo.title}
        </span>
      </div>
      <div className="mt-2">
        <div className="flex flex-col">
          <a
            href={payload.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm mb-2"
          >
            {payload.url}
          </a>
          {payload.content && (
            <button
              onClick={handlePreviewClick}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors self-start"
              title="Preview content"
            >
              <Eye className="w-3 h-3" />
              <span>Show raw content</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return {
    color: eventInfo.color,
    content,
  };
};

export default WebNavigationEvent;
