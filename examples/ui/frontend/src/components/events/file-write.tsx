import React from "react";
import { FileText, Eye } from "lucide-react";
import { getFileType } from "@/lib/utils";

interface FileWriteEventProps {
  payload?: {
    file?: string;
    path?: string;
    content?: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
  timestamp?: string;
}

const FileWriteEvent: React.FC<FileWriteEventProps> = ({
  payload,
  onPreviewClick,
  timestamp,
}) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;
  const filePath = payload.path || payload.file;

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
        filename: filePath,
        title: filename.split("/").pop(),
        type: getFileType(filename),
        timestamp: timestamp,
      });
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
        <FileText className="w-3 h-3 text-green-600" />
        <span className="text-xs text-slate-600 font-medium">
          Created{" "}
          <button
            onClick={handlePreviewClick}
            className="text-slate-800 hover:text-slate-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit font-semibold"
            title="Click to open file"
          >
            {truncateFilename(filename?.split("/").pop() || filename)}
          </button>
        </span>
        {payload.content && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="View in preview"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileWriteEvent;
