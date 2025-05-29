import React from "react";
import { Upload, Eye } from "lucide-react";

const FileUploadEvent = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  const filename = payload.filename || payload.file || payload.path;
  const fileSize = payload.size;

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDisplayText = () => (
    <span>
      Uploaded <strong>{filename}</strong>{" "}
      {fileSize && `(${formatFileSize(fileSize)})`}
    </span>
  );

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      onPreviewClick({
        url: filename,
        content: payload.content,
        title: `uploaded: ${filename}`,
        type: "text",
      });
    }
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-center space-x-2 px-3 py-2">
        <Upload className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500 truncate max-w-md">
          {getDisplayText()}
        </span>
        {payload.content && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center ml-2 px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="View content"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploadEvent;
