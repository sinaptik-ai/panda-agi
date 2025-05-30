import React from "react";
import {
  AlertCircle,
  CreditCard,
  Paperclip,
  Eye,
  Download,
  FileText,
  Image,
  File,
  Code,
} from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";

const UserNotificationEvent = ({
  payload,
  eventType,
  onPreviewClick,
  onFileClick,
  timestamp,
}) => {
  if (!payload) return null;

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - eventTime) / 1000);

    if (diffInSeconds < 60) {
      return diffInSeconds <= 1 ? "just now" : `${diffInSeconds}s ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} mins ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
    }

    // For older events, fall back to date format
    return eventTime.toLocaleDateString();
  };

  // Check if this is an error notification
  const isError =
    payload.error ||
    (payload.text && payload.text.toLowerCase().includes("error"));

  // Check specifically for token/credit related errors
  const isTokenError =
    isError &&
    ((payload.error && payload.error.toLowerCase().includes("token")) ||
      (payload.error && payload.error.toLowerCase().includes("credit")) ||
      typeof payload.credits_left !== "undefined");

  const handleFileClick = (filename) => {
    if (onFileClick) {
      onFileClick(filename);
    }
  };

  // Get file icon based on extension
  const getFileIcon = (filename) => {
    if (!filename) return <File className="w-4 h-4 text-gray-500" />;

    const extension = filename.split(".").pop()?.toLowerCase();

    if (
      ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension)
    ) {
      return <Image className="w-4 h-4 text-green-500" />;
    }
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
        "html",
        "htm",
      ].includes(extension)
    ) {
      return <Code className="w-4 h-4 text-blue-500" />;
    }
    if (["md", "markdown"].includes(extension)) {
      return <FileText className="w-4 h-4 text-purple-500" />;
    }
    if (["csv", "xlsx", "xls"].includes(extension)) {
      return <FileText className="w-4 h-4 text-green-600" />;
    }
    if (extension === "pdf") {
      return <File className="w-4 h-4 text-red-500" />;
    }
    if (["txt", "doc", "docx"].includes(extension)) {
      return <FileText className="w-4 h-4 text-gray-500" />;
    }

    return <File className="w-4 h-4 text-gray-500" />;
  };

  // Format file size (if available in the future)
  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderErrorContent = () => {
    return (
      <div>
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">
              {isTokenError ? "Insufficient Credits" : "Error"}
            </h4>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
              {payload.error ||
                payload.text ||
                payload.message ||
                "An error occurred"}
            </p>

            {isTokenError && typeof payload.credits_left !== "undefined" && (
              <div className="mt-3 bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-600 font-medium">
                    <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                    Credits Remaining
                  </span>
                  <span className="font-semibold text-gray-900">
                    {payload.credits_left} / {payload.total_credits || "∞"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {timestamp && (
          <p className="text-xs text-gray-400 mt-3 text-right font-medium">
            {formatTimestamp(timestamp)}
          </p>
        )}
      </div>
    );
  };

  const renderStandardContent = () => (
    <div>
      <MarkdownRenderer onPreviewClick={onPreviewClick}>
        {payload.text || payload.message}
      </MarkdownRenderer>

      {timestamp && (
        <p className="text-xs text-gray-400 mt-3 text-right font-medium">
          {formatTimestamp(timestamp)}
        </p>
      )}
    </div>
  );

  const cardColor = isError
    ? "bg-red-50 border-red-200/60"
    : "bg-white border-gray-200";
  const content = isError ? renderErrorContent() : renderStandardContent();

  return (
    <>
      {/* Main Card */}
      <div className="flex justify-start">
        <div className={`event-card min-w-80 max-w-2xl ${cardColor} relative`}>
          {content}
        </div>
      </div>

      {/* Attachments outside the card */}
      {payload.attachments && payload.attachments.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 px-3 py-1">
              <Paperclip className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {payload.attachments.length} Attachment
                {payload.attachments.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {payload.attachments.map((attachment, index) => {
              const filename = attachment.split("/").pop();
              const extension = filename.split(".").pop()?.toLowerCase();

              return (
                <div key={index} className="flex justify-start">
                  <div className="group flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 hover:shadow-md min-w-80 max-w-2xl">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getFileIcon(attachment)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleFileClick(attachment)}
                          className="text-left w-full group-hover:text-blue-800 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-900">
                            {filename}
                          </p>
                          {extension && (
                            <p className="text-xs text-gray-500 uppercase font-mono">
                              {extension} file
                            </p>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleFileClick(attachment)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:shadow-sm"
                        title="Preview file"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* <button
                        onClick={() => {
                          // For now, we'll use the same handler. In the future, this could be a separate download handler
                          handleFileClick(attachment);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:shadow-sm"
                        title="Open file"
                      >
                        <Download className="w-4 h-4" />
                      </button> */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default UserNotificationEvent;
