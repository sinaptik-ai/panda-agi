import React from "react";
import {
  AlertCircle,
  Eye,
  Download,
  FileText,
  Image,
  File,
  Code,
  Globe,
  ExternalLink,
} from "lucide-react";
import MarkdownRenderer from "../ui/markdown-renderer";
import { formatTimestamp } from "@/lib/date";
import { getServerHost, getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";
import { toast } from "react-hot-toast";

interface PreviewData {
  url: string;
  title: string;
  type: string;
}
export interface UserMessagePayload {
    text?: string;
    message?: string;
    error?: string;
    attachments?: string[];
}

export interface UserMessageEventProps {
  payload?: UserMessagePayload;
  onPreviewClick?: (previewData: PreviewData) => void;
  conversationId?: string;
  onFileClick?: (filename: string) => void;
  timestamp?: string;
}

const UserMessageEvent: React.FC<UserMessageEventProps> = ({
  payload,
  onPreviewClick,
  conversationId,
  onFileClick,
  timestamp,
}) => {
  if (!payload) return null;

  const isError = !!payload.error;

  const handleFileClick = (filename: string) => {
    if (onFileClick) {
      onFileClick(filename);
    }
  };

  const handleFileDownload = async (filename: string) => {
    if (!filename || !conversationId) {
      toast.error("Missing file information");
      return;
    }

    try {
      const downloadUrl = getBackendServerURL(
        `/${conversationId}/files/download?file_path=${encodeURIComponent(
          filename
        )}`
      );

      // Test the download URL first
      const response = await fetch(downloadUrl, {
        method: 'HEAD', // Use HEAD to check if file exists without downloading
        headers: await getApiHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("File not found");
        } else if (response.status === 403) {
          toast.error("Access denied to file");
        } else if (response.status === 401) {
          toast.error("Authentication required");
        } else {
          toast.error(`Download failed: Session expired try again`);
        }
        return;
      }

      // If the file exists, proceed with download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename.split("/").pop() || filename; // Get just the filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      if (error instanceof Error) {
        toast.error(`Download failed: ${error.message}`);
      } else {
        toast.error("Download failed: Unknown error");
      }
    }
  };

  const handleLocalhostPreview = (url: string) => {
    if (onPreviewClick) {
      onPreviewClick({
        url: url,
        title: `Server URL: ${url}`,
        type: "iframe",
      });
    }
  };

  // Detect localhost URLs in the notification text
  const detectLocalhostUrls = (text: string | undefined): string[] => {
    if (!text) return [];

    const localhostPatterns = [
      // Full URLs: http://localhost:3000/docs
      /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)([^\s]*)?/gi,
      // Bare host:port, like localhost:3000
      /\b(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)\b/gi,
    ];

    const urls = new Set<string>();
    const serverHost = getServerHost();

    localhostPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, , portWithColon, rawPath = ""] = match;

        // Clean up any trailing markdown/punctuation artifacts
        const cleanPath = rawPath.replace(/[`*)\]\s.,;!?]+$/, "");

        urls.add(`${serverHost}${portWithColon}${cleanPath}`);
      }
    });

    return Array.from(urls);
  };

  /**
   * Replace all localhost:port/127.0.0.1:port/0.0.0.0:port in any URL (markdown, HTML href/src, or plain text) with serverHost:port.
   * @param {string | React.ReactNode} text
   * @returns {string | React.ReactNode}
   */
  const replaceLocalhostInLinks = (text: string | React.ReactNode): string | React.ReactNode => {
    if (typeof text !== "string") return text || "";
    const serverHost = getServerHost();

    // Helper to ensure protocol is not duplicated
    function safeReplace(proto: string, host: string, port: string): string {
      let cleanHost = serverHost;
      // Always strip any protocol if proto is present
      if (proto) cleanHost = cleanHost.replace(/^https?:\/\//, "");
      return `${proto || ""}${cleanHost}${port}`;
    }

    // Replace in markdown links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const replacedUrl = url.replace(
        /(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)/gi,
        (m: string, proto = "", _host: string, port: string) => safeReplace(proto, _host, port)
      );
      return `[${linkText}](${replacedUrl})`;
    });

    if (typeof text === "string") {
      // Replace in HTML href/src attributes
      text = text.replace(
        /(href|src)=("|')(.*?)(\2)/gi,
        (match: string, attr: string, quote: string, url: string) => {
          const replacedUrl = url.replace(
            /(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)/gi,
            (m, proto = "", _host, port) => safeReplace(proto, _host, port)
          );
          return `${attr}=${quote}${replacedUrl}${quote}`;
        }
      );
    }

    // Replace raw URLs in plain text (not part of markdown or HTML)
    if (text && typeof text === "string") {
      text = text.replace(
        /(https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)([^\s)\]"']*)?)/gi,
        (url: string, ...args: string[]) => {
          return url.replace(
            /(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)/i,
            (m, proto = "", _host, port) => safeReplace(proto, _host, port)
          );
        }
      );
    }

    return text;
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

  const renderErrorContent = () => {
    return (
      <div>
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">Error</h4>
            <div className="text-sm text-gray-700 mt-1 leading-relaxed">
              <MarkdownRenderer onPreviewClick={onPreviewClick}>
                {payload.error || "An error occurred"}
              </MarkdownRenderer>
            </div>
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

  const renderStandardContent = () => {
    const replacedContent = replaceLocalhostInLinks(payload.text || "");
    return (
      <div>
        <MarkdownRenderer onPreviewClick={onPreviewClick}>
          {replacedContent as string}
        </MarkdownRenderer>

        {timestamp && (
          <p className="text-xs text-gray-400 mt-3 text-right font-medium">
            {formatTimestamp(timestamp)}
          </p> 
        )}
      </div>
    );
  };

  const cardColor = isError
    ? "bg-red-50 border-red-200/60"
    : "bg-white border-gray-200";
  const content = isError ? renderErrorContent() : renderStandardContent();

  // Detect localhost URLs in the notification text
  const notificationText = payload.text || payload.message || "";
  const localhostUrls = detectLocalhostUrls(notificationText);
  // TODO - Temporary fix for attachments
  let attachments: string[] = [];
  if (payload.attachments && typeof payload.attachments === "string") {
    const attachmentsString = payload.attachments as string;
    attachments = attachmentsString.split(",");
  }

  return (
    <>
      {/* Main Card */}
      <div className="flex justify-start">
        <div className={`event-card min-w-80 max-w-2xl ${cardColor} relative`}>
          {replaceLocalhostInLinks(content)}
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

      {/* Attachments outside the card - only show if no localhost URLs to preview */}
      {attachments &&
        attachments.length > 0 &&
        localhostUrls.length === 0 && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              {attachments.map((attachment, index) => {
                const filename = attachment.split("/").pop() || "";
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
