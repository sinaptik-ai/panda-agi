import React from "react";
import { Image, Eye } from "lucide-react";

interface ImageGenerationEventProps {
  payload?: {
    images?: string[];
  };
  onPreviewClick?: (previewData: unknown) => void;
}

const ImageGenerationEvent: React.FC<ImageGenerationEventProps> = ({
  payload,
  onPreviewClick,
}) => {
  if (!payload) return null;

  const filename = payload["images"]?.[0];

  const truncateFilename = (
    filename: string | undefined,
    maxLength = 50
  ): string => {
    if (!filename) return "Unknown file";
    return filename.length > maxLength
      ? `${filename.substring(0, maxLength)}...`
      : filename;
  };

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      onPreviewClick({
        filename: filename,
        title: filename,
        type: "image",
      });
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
        <Image className="w-3 h-3 text-green-500" />
        <span className="text-xs text-slate-600 font-medium">
          Generated{" "}
          <span className="font-semibold text-slate-800">
            {truncateFilename(filename?.split("/").pop() || filename)}
          </span>{" "}
          {payload["images"] && payload["images"].length > 1 && (
            <span className="text-xs text-slate-600">
              and {payload["images"].length - 1} more
            </span>
          )}
        </span>
        {payload["images"] && payload["images"].length > 0 && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center ml-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
