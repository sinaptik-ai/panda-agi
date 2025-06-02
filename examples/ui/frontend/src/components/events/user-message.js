import React from "react";
import {
  AlertCircle,
  CreditCard,
  Eye,
  Download,
  FileText,
  Image,
  File,
  Code,
  Globe,
  ExternalLink,
} from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import { formatTimestamp } from "../../helpers/date";

const UserMessageEvent = ({
  payload,
  onPreviewClick,
  onFileClick,
  timestamp,
}) => {
  if (!payload) return null;

  // Check if this is an error notification
  const isError = payload.error;

  // Check specifically for token/credit related errors
  const isTokenError = isError && typeof payload.credits_left !== "undefined";

  const handleFileClick = (filename) => {
    if (onFileClick) {
      onFileClick(filename);
    }
  };

  const handleFileDownload = (filename) => {
    console.log("DEBUG: handleFileDownload called with filename:", filename);

    const downloadUrl = `${
      process.env.REACT_APP_API_URL || "http://localhost:8001"
    }/files/download?file_path=${encodeURIComponent(filename)}`;

    console.log("DEBUG: Download URL:", downloadUrl);

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename.split("/").pop(); // Get just the filename
    document.body.appendChild(link);

    console.log("DEBUG: About to click download link");
    link.click();

    document.body.removeChild(link);
    console.log("DEBUG: Download link clicked and removed");
  };

  const handleLocalhostPreview = (url) => {
    if (onPreviewClick) {
      onPreviewClick({
        url: url,
        title: `Localhost Server: ${url}`,
        type: "iframe",
      });
    }
  };

  // Detect localhost URLs in the notification text
  const detectLocalhostUrls = (text) => {
    if (!text) return [];

    const localhostPatterns = [
      // Full URLs - use negative lookahead to exclude trailing markdown syntax
      /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(?:\/[^\s]*?)?(?=\*{2,}|\s|$)/gi,
      // Just localhost:port or 127.0.0.1:port
      /(?:^|\s)((?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+)(?:\s|$)/gi,
    ];

    const urls = new Set();

    localhostPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          let url = match.trim();
          // If it's just host:port, add http://
          if (!url.startsWith("http")) {
            url = `http://${url}`;
          }
          urls.add(url);
        });
      }
    });

    return Array.from(urls);
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
    if (["md", "markdown", "txt"].includes(extension)) {
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

            {isTokenError && (
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

  // Detect localhost URLs in the notification text
  const notificationText = payload.text || payload.message || "";
  const localhostUrls = detectLocalhostUrls(notificationText);

  return (
    <>
      {/* Main Card */}
      <div className="flex justify-start">
        <div className={`event-card min-w-80 max-w-2xl ${cardColor} relative`}>
          {content}
        </div>
      </div>

      {/* Localhost Servers Preview */}
      {localhostUrls.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex justify-start">
            <div className="group flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg hover:from-orange-100 hover:to-amber-100 transition-all duration-200 hover:shadow-md min-w-80 max-w-2xl">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Globe className="w-4 h-4 text-orange-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleLocalhostPreview(localhostUrls[0])}
                    className="text-left w-full group-hover:text-orange-800 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-orange-900">
                      Preview website
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleLocalhostPreview(localhostUrls[0])}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-sm"
                  title="Preview in sidebar"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <a
                  href={localhostUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-sm"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachments outside the card */}
      {payload.attachments && payload.attachments.length > 0 && (
        <div className="mt-3 space-y-3">
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

                      <button
                        onClick={() => {
                          handleFileDownload(attachment);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:shadow-sm"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
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

export default UserMessageEvent;
