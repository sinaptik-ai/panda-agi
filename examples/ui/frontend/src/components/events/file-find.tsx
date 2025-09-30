import React from "react";
import { Search, Eye } from "lucide-react";

interface FileFindEventProps {
  payload?: {
    file?: string;
    path?: string;
    content?: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
  timestamp?: string;
}

const FileFindEvent: React.FC<FileFindEventProps> = ({
  payload,
  onPreviewClick,
  timestamp,
}) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      onPreviewClick({
        filename: filename,
        title: filename.split("/").pop(),
        type: "text",
        timestamp: timestamp,
      });
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
        <Search className="w-3 h-3 text-purple-600" />
        <span className="text-xs text-slate-600 font-medium">
          Finding{" "}
          {filename ? (
            <button
              onClick={handlePreviewClick}
              className="text-slate-800 hover:text-slate-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit font-semibold"
              title="Click to open file"
            >
              {filename}
            </button>
          ) : (
            <strong>{filename}</strong>
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

export default FileFindEvent;
