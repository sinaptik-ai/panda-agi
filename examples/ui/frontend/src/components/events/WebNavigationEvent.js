import React, { useState } from "react";
import { Globe, ChevronRight, Eye, ExternalLink } from "lucide-react";

const WebNavigationEvent = ({ payload, eventType, onPreviewClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const truncateUrl = (url, maxLength = 50) => {
    if (!url) return "Unknown URL";
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      onPreviewClick({
        url: payload.url,
        content: payload.content,
        title: `Preview: ${getDomain(payload.url)}`,
      });
    }
  };

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {eventDetails.icon}
          <span className="text-xs text-gray-500 truncate max-w-md">
            {eventDetails.action} <strong>{getDomain(url)}</strong>
          </span>
          <button
            onClick={toggleExpanded}
            className="flex items-center py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Hide details" : "Show details"}
          >
            <div
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
            >
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
          {payload.content && (
            <button
              onClick={handlePreviewClick}
              className="flex items-center px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="View content"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-3 mb-4 bg-orange-50 border border-orange-200 rounded-md overflow-hidden">
            <div className="flex items-center px-3 py-2 bg-orange-100 border-b border-orange-200">
              <Globe className="w-4 h-4 mr-2 text-orange-600" />
              <span className="text-sm font-mono text-orange-700">
                {getDomain(url)}
              </span>
            </div>
            <div className="p-3 text-sm">
              <div className="mb-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-mono text-xs break-all"
                >
                  <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                  {url}
                </a>
              </div>
              {payload.content && (
                <div className="text-gray-700 whitespace-pre-wrap break-words font-mono text-xs bg-white p-2 rounded border max-h-48 overflow-y-auto">
                  {payload.content}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebNavigationEvent;
