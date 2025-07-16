import React from "react";
import { Folder, Eye } from "lucide-react";

interface FileExploreEventProps {
  payload?: {
    file?: string;
    path?: string;
    content?: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
}

const FileExploreEvent: React.FC<FileExploreEventProps> = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;

  const getDisplayContent = () => {
    // For directory exploration, show just the directory name or "." for current directory
    if (!filename || filename === ".") {
      return "current directory";
    }
    // Show just the directory name, not the full path
    const dirName = filename.split("/").pop() || filename;
    return dirName;
  };

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      onPreviewClick({
        filename: filename,
        title: `exploring: ${filename.split("/").pop()}`,
        type: "text",
      });
    }
  };

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-3 py-2">
        <Folder className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500 truncate max-w-md">
          Exploring{" "}
          {filename ? (
            <button
              onClick={handlePreviewClick}
              className="font-bold text-gray-700 hover:text-gray-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
              title="Click to open file"
            >
              {getDisplayContent()}
            </button>
          ) : (
            <strong>{getDisplayContent()}</strong>
          )}
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

export default FileExploreEvent;
