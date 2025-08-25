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
import { getBackendServerURL } from "@/lib/server";
import { toast } from "react-hot-toast";
import { downloadWithCheck } from "@/lib/utils";
import { PLATFORM_MODE } from "@/lib/config";

interface PreviewData {
  url: string;
  title: string;
  type: string;
}
export interface UserMessagePayload {
    text?: string;
    message?: string;
    error?: string;
    isUpgradeErrorMessage?: boolean;
    attachments?: string[];
}

export interface UserMessageEventProps {
  payload?: UserMessagePayload;
  onPreviewClick?: (previewData: PreviewData) => void;
  conversationId?: string;
  onFileClick?: (filename: string) => void;
  timestamp?: string;
  openUpgradeModal?: () => void;
}

const UserMessageEvent: React.FC<UserMessageEventProps> = ({
  payload,
  onPreviewClick,
  conversationId,
  onFileClick,
  timestamp,
  openUpgradeModal
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

      try {
        await downloadWithCheck(downloadUrl, filename.split("/").pop() || "download");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Download failed: File not found or access denied";
        toast.error(errorMessage);
      }
      
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

  // Rename and update the function to detect hosted URLs, including .e2b.app
  const detectHostedUrls = (text: string | undefined): string[] => {
    if (!text) return [];

    // Match all URLs (http/https)
    const urlPattern = /https?:\/\/[\w.-]+(:\d+)?[^\s)\]]*/gi;
    const urls = new Set<string>();

    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      // match[0] is the full URL
      // Clean up any trailing markdown/punctuation artifacts
      const cleanUrl = match[0].replace(/[\`*)\]\s.,;!?]+$/, "");
      try {
        const urlObj = new URL(cleanUrl);
        const host = urlObj.hostname;
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "0.0.0.0" ||
          host.endsWith(".e2b.app")
        ) {
          urls.add(cleanUrl);
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    return Array.from(urls);
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
            <MarkdownRenderer onPreviewClick={onPreviewClick}>
              {payload.error  as string}
            </MarkdownRenderer>

            {
              payload.isUpgradeErrorMessage && (
                <div className="text-sm text-gray-700 mt-1 leading-relaxed">
                   {!PLATFORM_MODE ? (
                    <a className="text-blue-500 hover:cursor-pointer" onClick={() => window.open('https://agi.pandas-ai.com/upgrade', '_blank', 'noopener,noreferrer')}>Upgrade your plan</a>
                   ) : (
                    <a className="text-blue-500 hover:cursor-pointer" onClick={openUpgradeModal}>Upgrade your plan</a>
                   )}
                </div>
              )
            }
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
    const replacedContent = payload.text || "";
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

  // Detect hosted URLs in the notification text
  const hostedUrls = detectHostedUrls(payload.text || "");

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
          {content}
        </div>
      </div>

      {/* Localhost Servers Preview */}
      {hostedUrls.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex justify-start">
            <div className="group flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg hover:from-orange-100 hover:to-amber-100 transition-all duration-200 hover:shadow-md min-w-80 max-w-2xl">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Globe className="w-4 h-4 text-orange-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleLocalhostPreview(hostedUrls[0])}
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
                  onClick={() => handleLocalhostPreview(hostedUrls[0])}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-sm"
                  title="Preview in sidebar"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => window.open(hostedUrls[0], '_blank')}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-sm"
                  title="Open in sidebar"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachments outside the card - only show if no hosted URLs to preview */}
      {attachments &&
        attachments.length > 0 &&
        hostedUrls.length === 0 && (
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
