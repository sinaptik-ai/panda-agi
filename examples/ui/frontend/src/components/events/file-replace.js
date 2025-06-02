import React from "react";
import { FileText, Eye } from "lucide-react";

const FileReplaceEvent = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;

  const truncateFilename = (filename, maxLength = 50) => {
    if (!filename) return "Unknown file";
    return filename.length > maxLength
      ? `${filename.substring(0, maxLength)}...`
      : filename;
  };

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      const getFileType = (filePath) => {
        if (!filePath) return "text";
        const extension = filePath.split(".").pop().toLowerCase();
        if (["csv", "xls", "xlsx"].includes(extension)) return "table";
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
        if (
          ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(
            extension
          )
        )
          return "image";
        if (extension === "pdf") return "pdf";
        return "text";
      };

      onPreviewClick({
        filename: filename,
        content: payload.content,
        title: `Edited file: ${filename.split("/").pop()}`,
        type: getFileType(filename),
      });
    }
  };

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-3 py-2">
        <FileText className="w-3 h-3 text-yellow-600" />
        <span className="text-xs text-gray-500 truncate max-w-md">
          Edited file:{" "}
          <button
            onClick={handlePreviewClick}
            className="font-bold text-gray-700 hover:text-gray-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
            title="Click to open file"
          >
            {truncateFilename(filename)}
          </button>
        </span>
        {payload.content && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="View in preview"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileReplaceEvent;
