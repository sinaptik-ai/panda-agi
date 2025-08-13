import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ExternalLink,
  FileCode,
  FileText,
  FileImage,
  File,
  Globe,
  Download,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownRenderer from "./ui/markdown-renderer";
import SaveArtifactButton from "./save-artifact-button";
import Papa from "papaparse";
import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";
import { toast } from "react-hot-toast";
import { downloadWithCheck } from "@/lib/utils";

export interface PreviewData {
  title?: string;
  filename?: string;
  url?: string;
  content?: string;
  type?: string;
}

interface ContentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  previewData?: PreviewData;
  width?: number;
  onResize?: (width: number) => void;
  conversationId?: string;
}

const ContentSidebar: React.FC<ContentSidebarProps> = ({
  isOpen,
  onClose,
  previewData,
  width,
  onResize,
  conversationId,
}) => {
  // State for sidebar width - use props if provided, otherwise default to 900
  const [sidebarWidth, setSidebarWidth] = useState(width || 900);

  // Update internal state when width prop changes
  useEffect(() => {
    if (width && width !== sidebarWidth) {
      setSidebarWidth(width);
    }
  }, [width, sidebarWidth]);
  
  const [isResizing, setIsResizing] = useState(false);
  const minWidth = 400;
  const maxWidth = 1050;
  const resizeRef = useRef<HTMLDivElement>(null);

  // Add resize event listeners with improved handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width based on mouse position
      let newWidth = window.innerWidth - e.clientX;

      // Apply constraints with smoothing
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      // Always update width when resizing for smoother experience
      setSidebarWidth(newWidth);

      // Notify parent component about width changes if callback is provided
      if (onResize) {
        onResize(newWidth);
      }

      // Prevent text selection during resize
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    // Handle cases where mouse moves outside the window
    const handleMouseLeave = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  // Start resizing
  const startResizing = () => {
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Apply sidebar open class to body for main content shrinking
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("sidebar-open");
      // Add specific class to app container element for better targeting
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.add("content-shrink");
      }
    } else {
      document.body.classList.remove("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.remove("content-shrink");
      }
    }

    return () => {
      document.body.classList.remove("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.remove("content-shrink");
      }
    };
  }, [isOpen]);
  
  // Utility function to normalize filenames (remove leading './' or '/' if present)
  const normalizeFilename = (filename: string): string => {
    if (!filename) return "";
    if (filename.startsWith("./")) {
      return filename.substring(2);
    }
    if (filename.startsWith("/")) {
      return filename.substring(1);
    }
    return filename;
  };

  // State for normalized filename and content
  const [normalizedFilename, setNormalizedFilename] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch file content when previewData changes
  useEffect(() => {
    if (!previewData) {
      return;
    }

    if (previewData.filename) {
      const normalized = normalizeFilename(previewData.filename);
      setNormalizedFilename(normalized);

      // Only fetch content if it's not an image and we don't already have content
      const fileType = previewData.type || "text";
      if (fileType !== "image" && !previewData.content) {
        fetchFileContent(previewData.filename);
      } else if (previewData.content) {
        // If content was provided directly, use it
        setFileContent(previewData.content);
        setIsLoading(false);
        setError(null);
      }
    } else {
      setNormalizedFilename("");
      setFileContent(null);
      setIsLoading(false);
      setError(null);
    }
  }, [previewData]);

  // Function to fetch file content
  const fetchFileContent = async (filename: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const fileUrl = getBackendServerURL(
        `/${conversationId}/files/${encodeURIComponent(filename)}`
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiHeaders: any = await getApiHeaders();

      const response = await fetch(fileUrl, { headers: apiHeaders });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(errorMessage?.detail || `Failed to fetch file: ${response.status}!`);
      }

      const content = await response.text();
      setFileContent(content);
    } catch (err) {
      console.error("Error fetching file content:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !previewData) return null;

  // Get language for syntax highlighting
  const getLanguage = (filename: string): string => {
    if (!filename) return "text";
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      py: "python",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      txt: "markdown",
      php: "php",
      rb: "ruby",
      go: "go",
      java: "java",
      c: "c",
      cpp: "cpp",
      sh: "bash",
      sql: "sql",
    };

    return languageMap[extension] || "text";
  };

  // Check if content should use full height editor
  const isFullHeightContent = (): boolean => {
    const type = previewData.type || "text";
    return (
      type === "code" ||
      type === "html" ||
      type === "text" ||
      type === "iframe" ||
      type === "table"
    );
  };

  // Common line number styling
  const getLineNumberStyle = (): React.CSSProperties => ({
    minWidth: "3em",
    paddingRight: "1em",
    paddingLeft: "0.5em",
    color: "#9ca3af !important",
    backgroundColor: "#1f2937 !important",
    borderRight: "1px solid #374151",
    userSelect: "none" as const,
    display: "inline-block",
    textAlign: "right",
  });

  // Common syntax highlighter styling
  const getCommonStyle = () => ({
    margin: 0,
    padding: "1rem 1rem 1rem 1.5rem",
    backgroundColor: "#1f2937",
    fontSize: "0.875rem",
    lineHeight: "1.5",
    height: "100%",
  });

  // Custom styles to override syntax highlighter defaults
  const customSyntaxStyles = `
    .syntax-highlighter .linenumber {
      color: #9ca3af !important;
      background-color: #1f2937 !important;
      border-right: 1px solid #374151 !important;
      padding-right: 1em !important;
      margin-right: 1.5em !important;
      display: inline-block !important;
      text-align: right !important;
      user-select: none !important;
      min-width: 3em !important;
    }
  `;

  // CSV Parser function using PapaParse
  const parseCSV = (csvText: string): string[][] => {
    if (!csvText) return [];

    try {
      // Use PapaParse with automatic delimiter detection
      const result = Papa.parse(csvText, {
        delimiter: "", // Auto-detect delimiter
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
        complete: () => {},
      });

      // Return the parsed data as string[][]
      return result.data as string[][];
    } catch (error) {
      console.error("Error parsing CSV:", error);
      return [];
    }
  };

  // Render content based on type
  const renderContent = () => {
    const type = previewData.type || "text";
    const content = fileContent || previewData.content || "";

    // Show loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col text-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading file content...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-500">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-medium">Error loading file</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case "iframe":
        return (
          <div className="h-full">
            <iframe
              src={previewData.url}
              className="w-full h-full border-0"
              title={previewData.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        );
      case "markdown":
        const fileAbsUrl = getBackendServerURL(
          `/${conversationId}/files/${encodeURIComponent(normalizedFilename)}`
        );
        return (
          <div className="prose prose-sm max-w-none">
            
            <MarkdownRenderer baseUrl={fileAbsUrl}>{content}</MarkdownRenderer>
          </div>
        );
      case "table":
        const tableFilename = normalizedFilename || previewData.url || "";
        const tableExtension = tableFilename.split(".").pop()?.toLowerCase() || "";
        const tableData = parseCSV(content);
        
        return (
          <div className="h-full flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {tableFilename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>{tableExtension.toUpperCase()}</span>
                <span>{tableData.length} rows</span>
                {tableData.length > 0 && (
                  <span>{tableData[0].length} columns</span>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden">
              {tableData.length > 0 ? (
                <div className="w-full h-full overflow-auto">
                  <table
                    className="w-full divide-y divide-gray-200"
                    style={{ minWidth: "max-content" }}
                  >
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {tableData[0].map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                            style={{ minWidth: "150px" }}
                          >
                            <div
                              className="truncate"
                              title={header || `Column ${index + 1}`}
                            >
                              {header || `Column ${index + 1}`}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableData.slice(1).map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                              style={{ minWidth: "150px", maxWidth: "400px" }}
                              title={cell}
                            >
                              <div className="truncate">{cell}</div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 p-8">
                  <div className="text-lg mb-2">No data available</div>
                  <div className="text-sm">
                    The file appears to be empty or could not be parsed.
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "html":
        const htmlFilename = normalizedFilename || previewData.url || "";
        return (
          <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
            {/* Editor Header - same style as other code files */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-300 ml-2">
                  {htmlFilename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span>HTML</span>
                <span>{content.split("\n").length} lines</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language="html"
                style={vscDarkPlus}
                showLineNumbers={true}
                lineNumberStyle={getLineNumberStyle()}
                customStyle={getCommonStyle()}
                className="syntax-highlighter"
                codeTagProps={{
                  style: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  },
                }}
              >
                {content}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      case "image":
        // For images, construct the URL from the filename
        const imageUrl = getBackendServerURL(
          `/${conversationId}/files/${encodeURIComponent(normalizedFilename)}`
        );

        return (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const nextSibling = target.nextSibling as HTMLElement;
                if (nextSibling) nextSibling.style.display = "block";
              }}
            />
            <div className="hidden text-center text-gray-500 p-4">
              <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Image preview not available</p>
              <p className="text-xs text-gray-400 mt-1">
                File: {normalizedFilename}
              </p>
            </div>
          </div>
        );
      case "pdf":
        return (
          <div className="text-center text-gray-500 p-4">
            <File className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p>PDF file detected</p>
            <p className="text-xs text-gray-400 mt-1">
              PDF preview not available in browser
            </p>
            {previewData.url && (
              <a
                href={previewData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Open PDF in new tab
              </a>
            )}
            {content && (
              <div
                className="mt-4 editor-container bg-gray-900 text-gray-100 rounded overflow-hidden flex flex-col"
                style={{ height: "50vh" }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                  <span className="text-xs text-gray-300">
                    PDF Content (if readable)
                  </span>
                  <span className="text-xs text-gray-400">
                    {content.split("\n").length} lines
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <SyntaxHighlighter
                    language="text"
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    lineNumberStyle={getLineNumberStyle()}
                    customStyle={getCommonStyle()}
                    className="syntax-highlighter"
                  >
                    {content}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        );
      case "code":
        const filename = normalizedFilename || previewData.url || "";
        const extension = filename.split(".").pop()?.toLowerCase() || "";
        const languageMap: Record<string, string> = {
          js: "JavaScript",
          jsx: "React JSX",
          ts: "TypeScript",
          tsx: "React TSX",
          py: "Python",
          css: "CSS",
          scss: "SCSS",
          json: "JSON",
          xml: "XML",
          yaml: "YAML",
          yml: "YAML",
        };
        const language = languageMap[extension] || extension.toUpperCase();
        const syntaxLanguage = getLanguage(filename);

        return (
          <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-300 ml-2">
                  {filename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span>{language}</span>
                <span>{content.split("\n").length} lines</span>
              </div>
            </div>

            {/* Code with syntax highlighting */}
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language={syntaxLanguage}
                style={vscDarkPlus}
                showLineNumbers={true}
                lineNumberStyle={getLineNumberStyle()}
                customStyle={getCommonStyle()}
                className="syntax-highlighter"
                codeTagProps={{
                  style: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  },
                }}
              >
                {content}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center text-gray-500 p-4">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Unsupported file format</p>
            <p className="text-xs text-gray-400 mt-1">
              This file type cannot be previewed at the moment
            </p>
          </div>
        );
    }
  };

  // Get file type icon
  const getFileIcon = () => {
    const type = previewData.type || "text";

    switch (type) {
      case "code":
        return <FileCode className="w-4 h-4 text-blue-500 mr-1" />;
      case "table":
        return <FileText className="w-4 h-4 text-green-600 mr-1" />;
      case "image":
        return <FileImage className="w-4 h-4 text-green-500 mr-1" />;
      case "pdf":
        return <File className="w-4 h-4 text-red-500 mr-1" />;
      case "markdown":
        return <FileText className="w-4 h-4 text-purple-500 mr-1" />;
      case "html":
        return <FileCode className="w-4 h-4 text-orange-500 mr-1" />;
      case "iframe":
        return <Globe className="w-4 h-4 text-blue-500 mr-1" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500 mr-1" />;
    }
  };

  // Handle file download
  const handleFileDownload = async () => {
    if (!normalizedFilename || !conversationId) {
      toast.error("Missing file information");
      return;
    }
    
    try {
      const filename = previewData.filename || normalizedFilename;
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

  // Handle artifact save


  return (
    <div
      className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col"
      style={{
        width: `${sidebarWidth}px`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--sidebar-width" as any]: `${sidebarWidth}px`,
      }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50 z-50"
        onMouseDown={startResizing}
      />
      {/* Inject custom styles */}
      <style dangerouslySetInnerHTML={{ __html: customSyntaxStyles }} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate flex items-center">
            {getFileIcon()}
            {previewData.title}
          </h3>
          {(normalizedFilename || previewData.url) && (
            <a
              href={
                previewData.url ||
                getBackendServerURL(
                  `/${conversationId}/files/${encodeURIComponent(
                    normalizedFilename
                  )}`
                )
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center space-x-1 mt-1"
            >
              <span className="truncate">
                {normalizedFilename || previewData.url}
              </span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Save button - only show for markdown files */}
          {(previewData.type === "markdown" || previewData.type === "iframe") && (
            <SaveArtifactButton
              conversationId={conversationId}
              previewData={previewData}
            />
          )}
          {/* Download button - only show for actual files, not iframes */}
          {(normalizedFilename || previewData.url) &&
            previewData.type !== "iframe" && (
              <button
                onClick={handleFileDownload}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={`Download as ${((normalizedFilename || previewData.url || "")
                  .split(".")
                  .pop() || "")
                  .replace("md", "pdf")
                  .toUpperCase()}`}
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close preview"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 min-h-0 ${
          isFullHeightContent() ? "" : "overflow-y-auto p-4"
        }`}
      >
        {isFullHeightContent() ? (
          <div className="h-full p-4">{renderContent()}</div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default ContentSidebar;

// Add this to your global CSS file or inject it here
const globalStyles = `
  body.sidebar-open {
    overflow-x: hidden;
  }
  
  /* Direct targeting for main app container */
  .content-shrink {
    max-width: calc(100% - var(--sidebar-width));
    transition: max-width 0.3s ease;
  }
  
  /* Make sure chat interface and messages shrink */
  .content-shrink .max-w-4xl {
    width: 100%;
    max-width: calc(100% - 2rem) !important;
    transition: max-width 0.3s ease;
  }
  
  /* Ensure message cards shrink properly */
  .content-shrink .max-w-4xl .bg-white/70 {
    width: 100%;
  }
  
  /* Ensure the input area shrinks properly */
  .content-shrink .max-w-4xl textarea,
  .content-shrink .max-w-4xl .flex-1 {
    width: 100%;
  }
`;

// Inject the global styles
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.type = "text/css";
  styleEl.innerHTML = globalStyles;
  document.head.appendChild(styleEl);
}
