import React from "react";
import { Eye } from "lucide-react";

const FileReadEvent = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  // Helper function to determine file type based on extension
  const getFileType = (filePath) => {
    if (!filePath) return "text";
    const extension = filePath.split(".").pop().toLowerCase();

    if (["csv"].includes(extension)) return "table";
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
    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension))
      return "image";
    if (extension === "pdf") return "pdf";
    return "not-supported";
  };

  const filename = payload.file || payload.path;
  const fileType = getFileType(filename);

  // Format filename with line range for file_read operations
  const getDisplayFilename = () => {
    if (payload.start_line && payload.end_line) {
      const shortFilename = filename.split("/").pop();
      return `${shortFilename} (lines ${payload.start_line}-${payload.end_line})`;
    }
    return filename.split("/").pop();
  };

  const handlePreviewClick = () => {
    if (payload.content && onPreviewClick) {
      onPreviewClick({
        filename: filename,
        content: payload.content,
        title: `read: ${filename.split("/").pop()}`,
        type: fileType,
      });
    }
  };

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-3 py-2">
        <Eye className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500 truncate max-w-md">
          Reading{" "}
          <button
            onClick={handlePreviewClick}
            className="font-bold text-gray-700 hover:text-gray-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
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
