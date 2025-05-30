import React from "react";
import { FileText, Eye, Folder } from "lucide-react";

const FileOperationEvent = ({ payload, eventType, onPreviewClick }) => {
  if (!payload) return null;

  // Helper function to determine file type based on extension
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
    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension))
      return "image";
    if (extension === "pdf") return "pdf";
    return "not-supported";
  };

  const getEventInfo = (eventType) => {
    switch (eventType) {
      case "file_read":
        return {
          icon: <FileText className="w-4 h-4 text-cyan-500" />,
          color: "bg-cyan-50 border-cyan-200",
          title: "Read file",
          verb: "read",
        };
      case "file_write":
        return {
          icon: <FileText className="w-4 h-4 text-green-600" />,
          color: "bg-green-50 border-green-300",
          title: "Created file",
          verb: "created",
        };
      case "file_replace":
        return {
          icon: <FileText className="w-4 h-4 text-yellow-600" />,
          color: "bg-yellow-50 border-yellow-300",
          title: "Replaced file",
          verb: "replaced",
        };
      case "file_find":
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          color: "bg-blue-50 border-blue-200",
          title: "Found files",
          verb: "found",
        };
      case "file_explore":
        return {
          icon: <Folder className="w-4 h-4 text-blue-600" />,
          color: "bg-blue-50 border-blue-300",
          title: "Explored directory",
          verb: "explored",
        };
      default:
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          color: "bg-blue-50 border-blue-200",
          title: "File operation",
          verb: "processed",
        };
    }
  };

  const eventInfo = getEventInfo(eventType);
  const filename = payload.file || payload.path;
  const fileType = getFileType(filename);

  // Format filename with line range for file_read operations
  const getDisplayFilename = () => {
    if (eventType === "file_read" && payload.start_line && payload.end_line) {
      return `${filename} (lines ${payload.start_line}-${payload.end_line})`;
    }
    if (eventType === "file_explore") {
      // For directory exploration, show just the directory name or "." for current directory
      if (!filename || filename === ".") {
        return "current directory";
      }
      // Show just the directory name, not the full path
      const dirName = filename.split("/").pop() || filename;
      return dirName;
    }
    return filename;
  };

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      onPreviewClick({
        url: filename,
        content: payload.content,
        title: `${eventInfo.verb}: ${filename.split("/").pop()}`,
        type: fileType,
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
        <div className="flex items-center justify-between">
          <code className="text-sm px-2 py-1 rounded flex-grow mr-2 truncate">
            {getDisplayFilename()}
          </code>
          {payload.content && (
            <button
              onClick={handlePreviewClick}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="View content"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
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

export default FileOperationEvent;
