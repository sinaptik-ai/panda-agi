import React from "react";
import { Image, Eye } from "lucide-react";

const ImageGenerationEvent = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  const filename = payload["images"][0];

  const truncateFilename = (filename, maxLength = 50) => {
    if (!filename) return "Unknown file";
    return filename.length > maxLength
      ? `${filename.substring(0, maxLength)}...`
      : filename;
  };

  const handlePreviewClick = () => {
    if (onPreviewClick) {
      onPreviewClick({
        filename: filename,
        title: `Generated image: ${filename}`,
        type: "image",
      });
    }
  };

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-3 py-2">
        <Image className="w-3 h-3 text-green-500" />
        <span className="text-xs text-gray-500 truncate max-w-md">
          Generated image:{" "}
          <span className="font-bold text-gray-700">
            {truncateFilename(filename)}
          </span>
          {payload["images"] && payload["images"].length > 1 && (
            <span className="text-xs text-gray-500">
              and {payload["images"].length - 1} more
            </span>
          )}
        </span>
        {payload["images"] && payload["images"].length > 0 && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center ml-2 px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="View in preview"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageGenerationEvent;
