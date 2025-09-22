import React from "react";
import {
  FileText,
  Image,
  File,
  Code,
  Archive,
  Database,
  FileAudio,
  FileVideo,
  Eye,
} from "lucide-react";
import { getFileType } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FileUploadEventProps {
  payload?: {
    filename?: string;
    original_filename?: string;
    size?: number;
    content?: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
  timestamp?: string;
}

// File type icon utility function
const getFileTypeIcon = (filename: string) => {
  const extension = filename.split(".").pop()?.toLowerCase();
  const iconClass = "w-3.5 h-3.5";

  if (!extension) {
    return <File className={cn(iconClass, "text-slate-500")} />;
  }

  // Images
  if (
    ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(
      extension
    )
  ) {
    return <Image className={cn(iconClass, "text-blue-500")} />;
  }

  // Code files
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
      "sass",
      "html",
      "htm",
      "json",
      "xml",
      "yaml",
      "yml",
      "sh",
      "bash",
      "sql",
      "r",
      "swift",
      "kt",
      "rs",
      "dart",
      "vue",
      "svelte",
    ].includes(extension)
  ) {
    return <Code className={cn(iconClass, "text-green-500")} />;
  }

  // Documents
  if (["md", "txt", "doc", "docx", "pdf", "rtf", "odt"].includes(extension)) {
    return <FileText className={cn(iconClass, "text-orange-500")} />;
  }

  // Spreadsheets and databases
  if (
    ["csv", "xls", "xlsx", "ods", "db", "sqlite", "sql"].includes(extension)
  ) {
    return <Database className={cn(iconClass, "text-purple-500")} />;
  }

  // Archives
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(extension)) {
    return <Archive className={cn(iconClass, "text-yellow-500")} />;
  }

  // Audio
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)) {
    return <FileAudio className={cn(iconClass, "text-pink-500")} />;
  }

  // Video
  if (["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"].includes(extension)) {
    return <FileVideo className={cn(iconClass, "text-orange-500")} />;
  }

  return <File className={cn(iconClass, "text-slate-500")} />;
};

const FileUploadEvent: React.FC<FileUploadEventProps> = ({
  payload,
  onPreviewClick,
  timestamp,
}) => {
  if (!payload) return null;

  const filename = payload.filename || payload.original_filename;
  const fileSize = payload.size;

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      const fileType = getFileType(filename);

      onPreviewClick({
        filename: filename,
        title: filename,
        type: fileType,
        timestamp: timestamp,
      });
    }
  };

  // Truncate filename if too long
  const truncateFilename = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;

    const extension = name.split(".").pop();
    const nameWithoutExt = name.slice(0, name.lastIndexOf("."));

    if (extension) {
      const truncatedName =
        nameWithoutExt.slice(0, maxLength - extension.length - 4) + "...";
      return `${truncatedName}.${extension}`;
    }

    return name.slice(0, maxLength - 3) + "...";
  };

  const displayFilename = truncateFilename(filename || "");

  return (
    <div className="flex justify-end mb-1">
      <div className="max-w-xs lg:max-w-md">
        <div className="flex justify-end">
          <div
            className="flex items-center space-x-2 bg-slate-50/80 border border-slate-200/50 rounded-lg px-3 py-2 text-sm group hover:bg-slate-50 transition-colors min-w-0 cursor-pointer"
            onClick={handlePreviewClick}
          >
            {getFileTypeIcon(filename || "")}
            <div className="flex flex-col min-w-0 flex-1">
              <button
                onClick={handlePreviewClick}
                className="text-slate-800 font-medium text-left hover:text-slate-900 transition-colors truncate"
                title={`Click to open ${filename}`}
              >
                {displayFilename}
              </button>
              {fileSize && fileSize > 0 && (
                <span className="text-slate-500 text-xs">
                  {formatFileSize(fileSize)}
                </span>
              )}
            </div>
            {payload.content && (
              <button
                onClick={handlePreviewClick}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-all duration-200 p-1 rounded hover:bg-slate-100 flex-shrink-0"
                title="View content"
              >
                <Eye className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadEvent;
