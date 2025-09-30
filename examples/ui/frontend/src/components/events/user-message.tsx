import React from "react";
import { AlertCircle, Eye, Globe, ExternalLink } from "lucide-react";
import MarkdownRenderer from "../ui/markdown-renderer";
import { getBackendServerURL } from "@/lib/server";
import { toast } from "react-hot-toast";
import { downloadWithCheck } from "@/lib/utils";
import { PLATFORM_MODE } from "@/lib/config";
import { useSavedArtifacts } from "@/contexts/saved-artifacts-context";
import AttachmentItem from "./attachment-item";

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
  onFileClick?: (filename: string, timestamp?: string) => void;
  timestamp?: string;
  openUpgradeModal?: () => void;
}

const UserMessageEvent: React.FC<UserMessageEventProps> = ({
  payload,
  onPreviewClick,
  conversationId,
  onFileClick,
  timestamp,
  openUpgradeModal,
}) => {
  // Get saved artifacts context - must be called before any conditional returns
  const { getArtifact } = useSavedArtifacts();

  if (!payload) return null;

  const isError = !!payload.error;

  const handleFileClick = (filename: string) => {
    if (onFileClick) {
      onFileClick(filename, timestamp);
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
        await downloadWithCheck(
          downloadUrl,
          filename.split("/").pop() || "download"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Download failed: File not found or access denied";
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
        title: url,
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

  const renderErrorContent = () => {
    return (
      <div>
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">Error</h4>
            <MarkdownRenderer onPreviewClick={onPreviewClick}>
              {payload.error as string}
            </MarkdownRenderer>

            {payload.isUpgradeErrorMessage && (
              <div className="text-sm text-gray-700 mt-1 leading-relaxed">
                {!PLATFORM_MODE ? (
                  <a
                    className="text-blue-500 hover:cursor-pointer"
                    onClick={() =>
                      window.open(
                        "https://agi.pandas-ai.com/upgrade",
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Upgrade your plan
                  </a>
                ) : (
                  <a
                    className="text-blue-500 hover:cursor-pointer"
                    onClick={openUpgradeModal}
                  >
                    Upgrade your plan
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
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
      </div>
    );
  };

  const cardColor = isError
    ? "bg-orange-50/80 border-orange-200/50"
    : "bg-white/90 border-slate-200/50";
  const content = isError ? renderErrorContent() : renderStandardContent();

  // Detect hosted URLs in the notification text
  const hostedUrls = detectHostedUrls(payload.text || "");

  // TODO - Temporary fix for attachments
  let attachments: string[] = [];
  if (payload.attachments && Array.isArray(payload.attachments)) {
    attachments = payload.attachments as string[];
  }

  const getAttachmentName = (filename: string): string => {
    // Check if there's a saved artifact for this filename and timestamp
    if (timestamp) {
      const artifact = getArtifact(filename, timestamp);
      if (artifact) {
        return artifact.name;
      }
    }

    // Return the original filename if no saved artifact found
    return filename;
  };

  return (
    <>
      {/* Main Card */}
      <div className="flex justify-start mb-2">
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm min-w-80 max-w-2xl ${cardColor} relative`}
        >
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
                    className="text-left w-full group-hover:text-orange-800 transition-colors cursor-pointer"
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
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-sm cursor-pointer"
                  title="Preview in sidebar"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => window.open(hostedUrls[0], "_blank")}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-sm cursor-pointer"
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
      {attachments && attachments.length > 0 && hostedUrls.length === 0 && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <AttachmentItem
                key={index}
                attachment={attachment}
                conversationId={conversationId}
                timestamp={timestamp}
                onFileClick={handleFileClick}
                getAttachmentName={getAttachmentName}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default UserMessageEvent;
