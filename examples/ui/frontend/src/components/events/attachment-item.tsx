import React from "react";
import {
  Eye,
  FileText,
  Image,
  File,
  Code,
} from "lucide-react";
import { usePxmlChartDetection } from "@/hooks/usePxmlChartDetection";
import ChartRenderer from "./chart-renderer";

interface AttachmentItemProps {
  attachment: string;
  conversationId?: string;
  timestamp?: string;
  onFileClick?: (filename: string) => void;
  getAttachmentName: (filename: string) => string;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  conversationId,
  timestamp,
  onFileClick,
  getAttachmentName,
}) => {
  const filename = attachment.split("/").pop() || "";
  const extension = filename.split(".").pop()?.toLowerCase();
  const attachmentName = getAttachmentName(filename);
  const isSavedArtifact = attachmentName !== filename;
  const isPxmlFile = extension === 'pxml';

  // Use the hook to detect if this PXML file contains chart content
  const { isChart, isLoading: isCheckingChart, content: pxmlContent } = usePxmlChartDetection(
    isPxmlFile ? attachment : null,
    conversationId,
    timestamp
  );

  const handleFileClick = () => {
    if (onFileClick) {
      onFileClick(attachment);
    }
  };

  // Get file icon based on extension
  const getFileIcon = (filename: string | undefined) => {
    if (!filename) return <File className="w-4 h-4 text-gray-500" />;

    const extension = filename.split(".").pop()?.toLowerCase();

    if (
      extension &&
      ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension)
    ) {
      return <Image className="w-4 h-4 text-green-500" />;
    }
    if (
      extension &&
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
        "html",
        "htm",
      ].includes(extension)
    ) {
      return <Code className="w-4 h-4 text-blue-500" />;
    }
    if (extension && ["md", "markdown", "txt"].includes(extension)) {
      return <FileText className="w-4 h-4 text-purple-500" />;
    }
    if (extension && ["csv", "xlsx", "xls"].includes(extension)) {
      return <FileText className="w-4 h-4 text-green-600" />;
    }
    if (extension === "pdf") {
      return <File className="w-4 h-4 text-red-500" />;
    }
    if (extension && ["txt", "doc", "docx"].includes(extension)) {
      return <FileText className="w-4 h-4 text-gray-500" />;
    }

    return <File className="w-4 h-4 text-gray-500" />;
  };

  // If it's a PXML chart file, render it inline
  if (isPxmlFile && isChart && !isCheckingChart && pxmlContent) {
    return (
      <div className="flex justify-start">
        <div className="w-full max-w-4xl">
          <ChartRenderer pxmlContent={pxmlContent} conversationId={conversationId} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className={`group flex items-center justify-between gap-2 p-3 border rounded-lg transition-all duration-200 hover:shadow-md min-w-80 max-w-2xl ${
        isSavedArtifact 
          ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 hover:from-emerald-100 hover:to-green-100" 
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
      }`}>
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {getFileIcon(attachment)}
          </div>

          <div className="flex-1 min-w-0">
            <button
              onClick={handleFileClick}
              className={`text-left w-full transition-colors cursor-pointer ${
                isSavedArtifact 
                  ? "group-hover:text-emerald-800" 
                  : "group-hover:text-blue-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium truncate ${
                  isSavedArtifact 
                    ? "text-emerald-900 group-hover:text-emerald-900" 
                    : "text-gray-900 group-hover:text-blue-900"
                }`}>
                  {attachmentName}
                </p>
                {isSavedArtifact && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Saved
                  </span>
                )}
              </div>
              {extension && !isSavedArtifact && (
                <p className="text-xs text-gray-500 uppercase font-mono">
                  {extension} file
                </p>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleFileClick}
            className={`flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white transition-all duration-200 hover:shadow-sm cursor-pointer ${
              isSavedArtifact 
                ? "border border-emerald-200 hover:border-emerald-300 text-emerald-600 hover:text-emerald-700" 
                : "border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700"
            }`}
            title="Preview file"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachmentItem;
