import React from "react";
import { Search, Folder, Eye } from "lucide-react";

const FileDiscoveryEvent = ({ payload, eventType, onPreviewClick }) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;

  // Get the appropriate icon and text for the operation
  const getEventDetails = (eventType) => {
    switch (eventType) {
      case "file_find":
        return {
          icon: <Search className="w-3 h-3 text-gray-400" />,
          action: "Finding",
        };
      case "file_explore":
        return {
          icon: <Folder className="w-3 h-3 text-gray-400" />,
          action: "Exploring",
        };
      default:
        return {
          icon: <Search className="w-3 h-3 text-gray-400" />,
          action: "Searching",
        };
    }
  };

  // Format display for different discovery operations
  const getDisplayContent = () => {
    if (eventType === "file_explore") {
      // For directory exploration, show just the directory name or "." for current directory
      if (!filename || filename === ".") {
        return "current directory";
      }
      // Show just the directory name, not the full path
      const dirName = filename.split("/").pop() || filename;
      return dirName;
    }
    if (eventType === "file_find") {
      // For file finding, show the search pattern or path
      return filename;
    }
    return filename;
  };

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      onPreviewClick({
        url: filename,
        content: payload.content,
        title: `${getEventDetails(eventType).action.toLowerCase()}: ${filename
          .split("/")
          .pop()}`,
        type: "text",
      });
    }
  };

  const eventDetails = getEventDetails(eventType);

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-3 py-2">
        {eventDetails.icon}
        <span className="text-xs text-gray-500 truncate max-w-md">
          {eventDetails.action} <strong>{getDisplayContent()}</strong>
        </span>
        {payload.content && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center ml-2 px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="View results"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileDiscoveryEvent;
