import React from "react";
import { Eye } from "lucide-react";
import { getFileType } from "@/lib/utils";

interface FileReadEventProps {
  payload?: {
    file?: string;
    path?: string;
    content?: string;
    start_line?: number;
    end_line?: number;
  };
  onPreviewClick?: (previewData: unknown) => void;
  timestamp?: string;
}

const FileReadEvent: React.FC<FileReadEventProps> = ({
  payload,
  onPreviewClick,
  timestamp,
}) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;

  if (!filename) return null;

  const fileType = getFileType(filename);

  // Helper function to trim long strings from center
  const trimFromCenter = (str: string, maxLength: number = 50): string => {
    if (str.length <= maxLength) return str;

    const halfLength = Math.floor((maxLength - 3) / 2);
    const start = str.substring(0, halfLength);
    const end = str.substring(str.length - halfLength);

    return `${start}...${end}`;
  };

  // Format filename with line range for file_read operations
  const getDisplayFilename = (): string => {
    if (payload.start_line && payload.end_line) {
      const shortFilename = trimFromCenter(
        filename?.split("/").pop() || "",
        50
      );
      return `${shortFilename} (lines ${payload.start_line}-${payload.end_line})`;
    }
    const shortFilename = filename?.split("/").pop() || "";
    return trimFromCenter(shortFilename, 50);
  };

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      const fileType = getFileType(filename);
      onPreviewClick({
        filename: filename,
        title: filename.split("/").pop(),
        type: fileType,
        timestamp: timestamp,
      });
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
        <Eye className="w-3 h-3 text-blue-600" />
        <span className="text-xs text-slate-600 font-medium">
          Read{" "}
          <button
            onClick={handlePreviewClick}
            className="text-slate-800 hover:text-slate-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit font-semibold"
            title="Click to open file"
          >
            {getDisplayFilename()}
          </button>
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

export default FileReadEvent;
