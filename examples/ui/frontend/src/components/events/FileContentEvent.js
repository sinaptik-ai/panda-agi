import React, { useState } from "react";
import { FileText, ChevronRight, Eye } from "lucide-react";

const FileContentEvent = ({ payload, eventType, onPreviewClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const filename = payload.file || payload.path;

  const getEventDetails = (eventType) => {
    switch (eventType) {
      case "file_write":
        return {
          icon: <FileText className="w-3 h-3 text-green-600" />,
          action: "Created file",
        };
      case "file_replace":
        return {
          icon: <FileText className="w-3 h-3 text-yellow-600" />,
          action: "Edited file",
        };
      default:
        return {
          icon: <FileText className="w-3 h-3 text-blue-500" />,
          action: "File operation",
        };
    }
  };

  const eventDetails = getEventDetails(eventType);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const truncateFilename = (filename, maxLength = 50) => {
    if (!filename) return "Unknown file";
    return filename.length > maxLength
      ? `${filename.substring(0, maxLength)}...`
      : filename;
  };

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      const getFileType = (filePath) => {
        if (!filePath) return "text";
        const extension = filePath.split(".").pop().toLowerCase();
        if (["csv"].includes(extension)) return "table";
        if (["md", "markdown", "txt"].includes(extension)) return "markdown";
        if (["html", "htm"].includes(extension)) return "html";
        if (
          [
            "js",
            "jsx",
            "ts",
            "tsx",
            "py",
            "java",
            "c",
            "cpp",
            "go",
            "rb",
            "php",
            "css",
            "scss",
            "json",
            "xml",
            "yaml",
            "yml",
          ].includes(extension)
        )
          return "code";
        if (
          ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(
            extension
          )
        )
          return "image";
        if (extension === "pdf") return "pdf";
        return "not-supported";
      };

      onPreviewClick({
        url: filename,
        content: payload.content,
        title: `${eventDetails.action}: ${filename.split("/").pop()}`,
        type: getFileType(filename),
      });
    }
  };

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {eventDetails.icon}
          <span className="text-xs text-gray-500 truncate max-w-md">
            {eventDetails.action} <strong>{truncateFilename(filename)}</strong>
          </span>
          {payload.content && (
            <>
              {eventType !== "file_write" && (
                <button
                  onClick={toggleExpanded}
                  className="flex items-center py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  title={isExpanded ? "Hide content" : "Show content"}
                >
                  <div
                    className={`transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              )}
              <button
                onClick={handlePreviewClick}
                className="flex items-center px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="View in preview"
              >
                <Eye className="w-3 h-3" />
              </button>
            </>
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
          <div className="mx-3 mb-4 bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
            <div className="flex items-center px-3 py-2 bg-gray-100 border-b border-gray-200">
              <FileText className="w-4 h-4 mr-2 text-gray-600" />
              <span className="text-sm font-mono text-gray-700">
                {filename?.split("/").pop()}
              </span>
            </div>
            <div className="p-3 text-sm">
              <div className="text-gray-700 whitespace-pre-wrap break-words font-mono text-xs bg-white p-2 rounded border max-h-48 overflow-y-auto">
                {payload.content || "No content available"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileContentEvent;
